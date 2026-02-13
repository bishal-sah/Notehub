"""
Views for the notes app: CRUD, approval workflow, search, and AI features.
"""
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.db.models import Q, Avg
from django.http import FileResponse, Http404, StreamingHttpResponse
from django.utils import timezone
import zipfile
import io
import os
import re

from apps.notes.models import (
    Note, NoteApproval, NoteReport, NoteComment, CommentVote, NoteAnnotation, NoteRating,
    Collection, Bookmark, FlashcardDeck, Flashcard, FlashcardReview, NoteVersion,
    NoteLayer, NoteLayerVote, TopperVerification,
    ChatSession, ChatMessage,
)
from apps.notes.serializers import (
    NoteListSerializer,
    NoteDetailSerializer,
    NoteCreateSerializer,
    NoteUpdateSerializer,
    NoteApprovalSerializer,
    NoteApproveRejectSerializer,
    NoteReportSerializer,
    BulkApproveSerializer,
    NoteCommentSerializer,
    NoteCommentCreateSerializer,
    NoteAnnotationSerializer,
    NoteRatingSerializer,
    NoteRatingCreateSerializer,
    CollectionSerializer,
    CollectionCreateSerializer,
    BookmarkSerializer,
    BookmarkCreateSerializer,
    BookmarkMoveSerializer,
    BookmarkUpdateSerializer,
    FlashcardSerializer,
    FlashcardDeckListSerializer,
    FlashcardDeckDetailSerializer,
    FlashcardReviewSerializer,
    GenerateFlashcardsSerializer,
    NoteVersionListSerializer,
    NoteVersionDetailSerializer,
    VersionDiffSerializer,
    OcrUploadSerializer,
    OcrResultSerializer,
    OcrStatusSerializer,
    OcrRetrySerializer,
    NoteLayerSerializer,
    NoteLayerCreateSerializer,
    NoteLayerVoteSerializer,
)
from apps.notes.flashcard_generator import generate_flashcards
from apps.notes.ocr_service import ocr_from_file
from apps.notes.summary_generator import generate_summary
from apps.notes.exam_mode import generate_exam_mode
from apps.notes.concept_simplifier import simplify_concept
from apps.notes.test_generator import generate_test
from datetime import timedelta


# ─── Public Views ────────────────────────────────────────

class PublicNoteListView(generics.ListAPIView):
    """Browse all approved notes with filters and search."""
    serializer_class = NoteListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = {
        'subject': ['exact'],
        'subject__semester': ['exact'],
        'subject__semester__faculty': ['exact'],
        'file_type': ['exact'],
        'author': ['exact'],
    }
    search_fields = ['title', 'description', 'subject__name', 'author__username']
    ordering_fields = ['created_at', 'views_count', 'downloads_count', 'title', 'average_rating']

    def get_queryset(self):
        return (
            Note.objects.filter(status='approved')
            .select_related('author', 'subject__semester__faculty')
            .annotate(
                _avg_rating=Avg('ratings__rating'),
                average_rating=Avg('ratings__rating'),
            )
        )


class PublicNoteDetailView(generics.RetrieveAPIView):
    """View a single approved note (increments view count)."""
    serializer_class = NoteDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Note.objects.filter(status='approved').select_related(
            'author', 'subject__semester__faculty'
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class NoteDownloadView(APIView):
    """Track note download (increment counter and return file URL)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        try:
            note = Note.objects.get(slug=slug, status='approved')
            note.downloads_count += 1
            note.save(update_fields=['downloads_count'])
            # Award points to the note author for receiving a download
            try:
                from apps.gamification.services import increment_counter
                increment_counter(note.author, 'downloads_received', note=note)
            except Exception:
                pass  # gamification should never block downloads
            return Response({
                'file_url': request.build_absolute_uri(note.file.url),
                'downloads_count': note.downloads_count,
            })
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )


class NoteFilePreviewView(APIView):
    """Serve a note's file inline for in-browser viewing (PDF viewer)."""
    permission_classes = [permissions.AllowAny]

    CONTENT_TYPES = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }

    def get(self, request, slug):
        try:
            note = Note.objects.get(slug=slug, status='approved')
        except Note.DoesNotExist:
            raise Http404('Note not found.')

        if not note.file:
            raise Http404('File not found.')

        file_ext = (note.file_type or 'pdf').lower()
        content_type = self.CONTENT_TYPES.get(file_ext, 'application/octet-stream')

        response = FileResponse(
            note.file.open('rb'),
            content_type=content_type,
        )
        response['Content-Disposition'] = f'inline; filename="{note.title}.{file_ext}"'
        response['Access-Control-Allow-Origin'] = '*'
        return response


# ─── Authenticated User Views ───────────────────────────

class UserNoteListView(generics.ListAPIView):
    """List notes uploaded by the authenticated user."""
    serializer_class = NoteListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'subject']
    search_fields = ['title']
    ordering_fields = ['created_at', 'status']

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user).select_related(
            'author', 'subject__semester__faculty'
        )


class NoteCreateView(generics.CreateAPIView):
    """Upload a new note (requires authentication)."""
    serializer_class = NoteCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Upload attempt by {request.user} - Data keys: {list(request.data.keys())}")
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Upload failed: {str(e)}")
            raise


class NoteUpdateView(generics.RetrieveUpdateAPIView):
    """Update a note (only by its author, and only if pending)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return NoteUpdateSerializer
        return NoteDetailSerializer

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user)

    def perform_update(self, serializer):
        note = self.get_object()

        # ── Snapshot current state as a version before saving ──
        last_version = NoteVersion.objects.filter(note=note).order_by('-version_number').first()
        next_num = (last_version.version_number + 1) if last_version else 1

        # Detect what changed
        changes = []
        incoming = serializer.validated_data
        if 'title' in incoming and incoming['title'] != note.title:
            changes.append('title')
        if 'description' in incoming and incoming['description'] != note.description:
            changes.append('description')
        if 'subject' in incoming and incoming['subject'] != note.subject:
            changes.append('subject')
        if 'file' in incoming:
            changes.append('file')

        change_type = 'file_replaced' if 'file' in changes else 'edited'
        summary = f"Changed: {', '.join(changes)}" if changes else 'Minor edit'

        from django.core.files.base import ContentFile
        version = NoteVersion(
            note=note,
            version_number=next_num,
            change_type=change_type,
            change_summary=summary,
            title=note.title,
            description=note.description,
            file_type=note.file_type or '',
            file_size=note.file_size or 0,
            subject=note.subject,
            created_by=self.request.user,
        )
        # Copy the current file into the version snapshot
        if note.file:
            try:
                note.file.open('rb')
                version.file.save(
                    note.file.name.split('/')[-1],
                    ContentFile(note.file.read()),
                    save=False,
                )
                note.file.close()
            except Exception:
                pass  # file copy is best-effort
        version.save()

        if note.status == 'approved':
            # Reset to pending if an approved note is edited
            serializer.save(status='pending')
        else:
            serializer.save()


class NoteDeleteView(generics.DestroyAPIView):
    """Delete a note (only by its author)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user)


class NoteReportCreateView(generics.CreateAPIView):
    """Report a note for inappropriate content."""
    serializer_class = NoteReportSerializer
    permission_classes = [permissions.IsAuthenticated]


# ─── Semantic Search View ────────────────────────────────

class SemanticSearchView(APIView):
    """Search notes using semantic similarity (LangChain)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})

        try:
            from apps.notes.ai_services import semantic_search
            results = semantic_search(query)
            return Response({'results': results})
        except Exception as e:
            # Fallback to basic text search if AI service is unavailable
            notes = Note.objects.filter(
                status='approved'
            ).filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(text_content__icontains=query)
            )[:20]
            serializer = NoteListSerializer(notes, many=True)
            return Response({
                'results': serializer.data,
                'fallback': True,
                'message': 'Using text search (semantic search unavailable).',
            })


# ─── Duplicate Detection View ───────────────────────────

class DuplicateDetectionView(APIView):
    """Detect potentially duplicate notes using cosine similarity."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try:
            from apps.notes.ai_services import detect_duplicates
            threshold = float(request.query_params.get('threshold', 0.85))
            duplicates = detect_duplicates(threshold=threshold)
            return Response({'duplicates': duplicates})
        except Exception as e:
            return Response(
                {'error': f'Duplicate detection failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Admin Views ────────────────────────────────────────

class AdminPendingNotesView(generics.ListAPIView):
    """Admin: List all pending notes for approval."""
    serializer_class = NoteListSerializer
    permission_classes = [permissions.IsAdminUser]
    search_fields = ['title', 'author__username']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return Note.objects.filter(status='pending').select_related(
            'author', 'subject__semester__faculty'
        )


class AdminAllNotesView(generics.ListAPIView):
    """Admin: List all notes with filters."""
    serializer_class = NoteListSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['status', 'file_type', 'subject__semester__faculty']
    search_fields = ['title', 'author__username', 'subject__name']
    ordering_fields = ['created_at', 'views_count', 'downloads_count']

    def get_queryset(self):
        return Note.objects.all().select_related(
            'author', 'subject__semester__faculty'
        )


class AdminNoteDetailView(generics.RetrieveAPIView):
    """Admin: View any note's details."""
    serializer_class = NoteDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Note.objects.all()


class AdminApproveRejectView(APIView):
    """Admin: Approve or reject a single note."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            note = Note.objects.get(pk=pk)
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = NoteApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        reason = serializer.validated_data.get('reason', '')

        note.status = action
        if action == 'rejected':
            note.rejection_reason = reason
        note.save()

        # Create approval record
        NoteApproval.objects.create(
            note=note,
            admin=request.user,
            action=action,
            reason=reason,
        )

        return Response({
            'message': f'Note {action} successfully.',
            'note_id': note.id,
        })


class AdminBulkApproveView(APIView):
    """Admin: Bulk approve or reject multiple notes."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = BulkApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        note_ids = serializer.validated_data['note_ids']
        action = serializer.validated_data['action']
        reason = serializer.validated_data.get('reason', '')

        notes = Note.objects.filter(pk__in=note_ids)
        updated_count = 0

        for note in notes:
            note.status = action
            if action == 'rejected':
                note.rejection_reason = reason
            note.save()

            NoteApproval.objects.create(
                note=note,
                admin=request.user,
                action=action,
                reason=reason,
            )
            updated_count += 1

        return Response({
            'message': f'{updated_count} notes {action} successfully.',
        })


class AdminNoteApprovalHistoryView(generics.ListAPIView):
    """Admin: View approval/rejection history."""
    serializer_class = NoteApprovalSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = NoteApproval.objects.all().select_related('note', 'admin')
    filterset_fields = ['action']
    ordering_fields = ['created_at']


class AdminNoteReportListView(generics.ListAPIView):
    """Admin: View all reports filed against notes."""
    serializer_class = NoteReportSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = NoteReport.objects.all().select_related('note', 'reported_by')
    filterset_fields = ['reason', 'is_resolved']


class AdminResolveReportView(APIView):
    """Admin: Mark a report as resolved."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            report = NoteReport.objects.get(pk=pk)
            report.is_resolved = True
            report.save()
            return Response({'message': 'Report resolved successfully.'})
        except NoteReport.DoesNotExist:
            return Response(
                {'error': 'Report not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )


# ─── Comments & Annotations ─────────────────────────────

class NoteCommentListView(generics.ListAPIView):
    """List top-level comments (with nested replies) for a note."""
    serializer_class = NoteCommentSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            NoteComment.objects
            .filter(note__slug=self.kwargs['slug'], parent__isnull=True, is_deleted=False)
            .select_related('author')
            .prefetch_related('replies__author')
        )


class NoteCommentCreateView(generics.CreateAPIView):
    """Create a comment or reply on a note."""
    serializer_class = NoteCommentCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class NoteCommentUpdateView(APIView):
    """Edit or soft-delete a comment (author only)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            comment = NoteComment.objects.get(pk=pk, author=request.user)
        except NoteComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        body = request.data.get('body')
        if body is not None:
            comment.body = body
            comment.is_edited = True
            comment.save()

        return Response(NoteCommentSerializer(comment, context={'request': request}).data)

    def delete(self, request, pk):
        try:
            comment = NoteComment.objects.get(pk=pk, author=request.user)
        except NoteComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment.is_deleted = True
        comment.body = '[deleted]'
        comment.save()
        return Response({'message': 'Comment deleted.'}, status=status.HTTP_200_OK)


class CommentVoteToggleView(APIView):
    """Toggle upvote on a comment. POST /api/notes/comments/<id>/vote/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            comment = NoteComment.objects.get(pk=pk)
        except NoteComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        vote, created = CommentVote.objects.get_or_create(
            user=request.user,
            comment=comment,
        )
        if not created:
            vote.delete()
            voted = False
        else:
            voted = True

        return Response({
            'voted': voted,
            'vote_count': comment.comment_votes.count(),
        })


class CommentBestAnswerView(APIView):
    """Mark/unmark a reply as best answer. Only the note author can do this.
    POST /api/notes/comments/<id>/best-answer/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            comment = NoteComment.objects.select_related('note').get(pk=pk)
        except NoteComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only the note author can mark best answer
        if comment.note.author != request.user:
            return Response(
                {'error': 'Only the note author can mark a best answer.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        comment.is_best_answer = not comment.is_best_answer
        comment.save(update_fields=['is_best_answer'])

        return Response({
            'is_best_answer': comment.is_best_answer,
            'comment_id': comment.id,
        })


class NoteAnnotationListView(generics.ListAPIView):
    """List all annotations for a note."""
    serializer_class = NoteAnnotationSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            NoteAnnotation.objects
            .filter(note__slug=self.kwargs['slug'])
            .select_related('author')
        )


class NoteAnnotationCreateView(generics.CreateAPIView):
    """Create an annotation on a note."""
    serializer_class = NoteAnnotationSerializer
    permission_classes = [permissions.IsAuthenticated]


class NoteAnnotationUpdateView(APIView):
    """Update or delete an annotation (author only)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            annotation = NoteAnnotation.objects.get(pk=pk, author=request.user)
        except NoteAnnotation.DoesNotExist:
            return Response({'error': 'Annotation not found.'}, status=status.HTTP_404_NOT_FOUND)

        for field in ('body', 'color', 'is_resolved'):
            if field in request.data:
                setattr(annotation, field, request.data[field])
        annotation.save()
        return Response(NoteAnnotationSerializer(annotation).data)

    def delete(self, request, pk):
        try:
            annotation = NoteAnnotation.objects.get(pk=pk, author=request.user)
        except NoteAnnotation.DoesNotExist:
            return Response({'error': 'Annotation not found.'}, status=status.HTTP_404_NOT_FOUND)

        annotation.delete()
        return Response({'message': 'Annotation deleted.'}, status=status.HTTP_200_OK)


# ─── Ratings & Reviews ──────────────────────────────────

class NoteRatingListView(generics.ListAPIView):
    """List all ratings/reviews for a note."""
    serializer_class = NoteRatingSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            NoteRating.objects
            .filter(note__slug=self.kwargs['slug'])
            .select_related('user')
        )


class NoteRatingCreateView(generics.CreateAPIView):
    """Create or update a rating (upsert by user+note)."""
    serializer_class = NoteRatingCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class NoteRatingDeleteView(APIView):
    """Delete own rating."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            rating = NoteRating.objects.get(pk=pk, user=request.user)
        except NoteRating.DoesNotExist:
            return Response({'error': 'Rating not found.'}, status=status.HTTP_404_NOT_FOUND)
        rating.delete()
        return Response({'message': 'Rating deleted.'}, status=status.HTTP_200_OK)


class NoteMyRatingView(APIView):
    """Get the current user's rating for a specific note."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        try:
            rating = NoteRating.objects.get(note__slug=slug, user=request.user)
            return Response(NoteRatingSerializer(rating).data)
        except NoteRating.DoesNotExist:
            return Response(None, status=status.HTTP_204_NO_CONTENT)


# ─── Bookmarks & Collections ────────────────────────────

def _ensure_default_collection(user):
    """Get or create the user's default 'All Bookmarks' collection."""
    col, _ = Collection.objects.get_or_create(
        user=user, is_default=True,
        defaults={'name': 'All Bookmarks'},
    )
    return col


class CollectionListCreateView(APIView):
    """List all collections for the authenticated user, or create a new one."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _ensure_default_collection(request.user)
        collections = Collection.objects.filter(user=request.user)
        return Response(CollectionSerializer(collections, many=True).data)

    def post(self, request):
        serializer = CollectionCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        collection = serializer.save()
        return Response(CollectionSerializer(collection).data, status=status.HTTP_201_CREATED)


class CollectionDetailView(APIView):
    """Retrieve, update, or delete a collection."""
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, pk):
        try:
            return Collection.objects.get(pk=pk, user=request.user)
        except Collection.DoesNotExist:
            return None

    def get(self, request, pk):
        collection = self._get(request, pk)
        if not collection:
            return Response({'error': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CollectionSerializer(collection).data)

    def patch(self, request, pk):
        collection = self._get(request, pk)
        if not collection:
            return Response({'error': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)
        if collection.is_default:
            return Response({'error': 'Cannot edit the default collection.'}, status=status.HTTP_400_BAD_REQUEST)
        for field in ('name', 'description'):
            if field in request.data:
                setattr(collection, field, request.data[field])
        collection.save()
        return Response(CollectionSerializer(collection).data)

    def delete(self, request, pk):
        collection = self._get(request, pk)
        if not collection:
            return Response({'error': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)
        if collection.is_default:
            return Response({'error': 'Cannot delete the default collection.'}, status=status.HTTP_400_BAD_REQUEST)
        collection.delete()
        return Response({'message': 'Collection deleted.'}, status=status.HTTP_200_OK)


class CollectionBookmarksView(generics.ListAPIView):
    """List all bookmarks in a specific collection."""
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Bookmark.objects
            .filter(user=self.request.user, collection_id=self.kwargs['pk'])
            .select_related('note__author', 'note__subject__semester__faculty', 'collection')
        )


class BookmarkToggleView(APIView):
    """Toggle a bookmark on a note. If already bookmarked, remove it; otherwise add it."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BookmarkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note_id = serializer.validated_data['note_id']
        collection_id = serializer.validated_data.get('collection_id')

        try:
            note = Note.objects.get(pk=note_id, status='approved')
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Resolve collection
        collection = None
        if collection_id:
            try:
                collection = Collection.objects.get(pk=collection_id, user=request.user)
            except Collection.DoesNotExist:
                return Response({'error': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            collection = _ensure_default_collection(request.user)

        # Toggle
        existing = Bookmark.objects.filter(user=request.user, note=note, collection=collection)
        if existing.exists():
            existing.delete()
            return Response({'bookmarked': False, 'message': 'Bookmark removed.'})
        else:
            bookmark = Bookmark.objects.create(user=request.user, note=note, collection=collection)
            return Response(
                {'bookmarked': True, 'bookmark': BookmarkSerializer(bookmark).data},
                status=status.HTTP_201_CREATED,
            )


class BookmarkStatusView(APIView):
    """Check if the current user has bookmarked a specific note."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, note_id):
        bookmarks = Bookmark.objects.filter(
            user=request.user, note_id=note_id
        ).select_related('collection')
        return Response({
            'is_bookmarked': bookmarks.exists(),
            'collections': [
                {'bookmark_id': b.id, 'collection_id': b.collection_id, 'collection_name': b.collection.name if b.collection else None}
                for b in bookmarks
            ],
        })


class BookmarkMoveView(APIView):
    """Move bookmarks to a different collection."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BookmarkMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bookmark_ids = serializer.validated_data['bookmark_ids']
        collection_id = serializer.validated_data.get('collection_id')

        collection = None
        if collection_id:
            try:
                collection = Collection.objects.get(pk=collection_id, user=request.user)
            except Collection.DoesNotExist:
                return Response({'error': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            collection = _ensure_default_collection(request.user)

        updated = Bookmark.objects.filter(
            pk__in=bookmark_ids, user=request.user
        ).update(collection=collection)
        return Response({'moved': updated})


class AllBookmarksView(generics.ListAPIView):
    """List all bookmarks for the user across all collections."""
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Bookmark.objects
            .filter(user=self.request.user)
            .select_related('note__author', 'note__subject__semester__faculty', 'collection')
        )


class BookmarkUpdateView(APIView):
    """PATCH /api/notes/bookmarks/<id>/ — update personal_note, highlight_color, is_offline."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            bookmark = Bookmark.objects.select_related(
                'note__author', 'note__subject__semester__faculty', 'collection'
            ).get(pk=pk, user=request.user)
        except Bookmark.DoesNotExist:
            return Response({'error': 'Bookmark not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookmarkUpdateSerializer(bookmark, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BookmarkSerializer(bookmark).data)


# ─── Flashcard Views ─────────────────────────────────────

class GenerateFlashcardsView(APIView):
    """Auto-generate a flashcard deck from a note's uploaded file."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GenerateFlashcardsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note_id = serializer.validated_data['note_id']
        max_cards = serializer.validated_data.get('max_cards', 20)

        try:
            note = Note.objects.get(pk=note_id, status='approved')
        except Note.DoesNotExist:
            return Response({'error': 'Note not found or not approved.'}, status=status.HTTP_404_NOT_FOUND)

        # Create deck
        deck = FlashcardDeck.objects.create(
            note=note,
            user=request.user,
            title=f"Flashcards: {note.title}",
            status='pending',
        )

        try:
            file_path = note.file.path
            cards_data = generate_flashcards(file_path, note.file_type, max_cards=max_cards)

            if not cards_data:
                deck.status = 'failed'
                deck.save()
                return Response(
                    {'error': 'Could not generate flashcards. The note may not have extractable text.'},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            cards = []
            for i, cd in enumerate(cards_data):
                cards.append(Flashcard(
                    deck=deck,
                    question=cd['question'],
                    answer=cd['answer'],
                    order=i,
                ))
            Flashcard.objects.bulk_create(cards)
            deck.card_count = len(cards)
            deck.status = 'ready'
            deck.save()

            return Response(
                FlashcardDeckDetailSerializer(deck).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            deck.status = 'failed'
            deck.save()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MyDecksView(generics.ListAPIView):
    """List all flashcard decks for the authenticated user."""
    serializer_class = FlashcardDeckListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return FlashcardDeck.objects.filter(
            user=self.request.user
        ).select_related('note')


class DeckDetailView(APIView):
    """Retrieve or delete a flashcard deck."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            deck = FlashcardDeck.objects.prefetch_related('cards').get(
                pk=pk, user=request.user
            )
        except FlashcardDeck.DoesNotExist:
            return Response({'error': 'Deck not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FlashcardDeckDetailSerializer(deck).data)

    def delete(self, request, pk):
        try:
            deck = FlashcardDeck.objects.get(pk=pk, user=request.user)
        except FlashcardDeck.DoesNotExist:
            return Response({'error': 'Deck not found.'}, status=status.HTTP_404_NOT_FOUND)
        deck.delete()
        return Response({'message': 'Deck deleted.'})


class DeckDueCardsView(APIView):
    """Get cards that are due for review (spaced-repetition)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            deck = FlashcardDeck.objects.get(pk=pk, user=request.user)
        except FlashcardDeck.DoesNotExist:
            return Response({'error': 'Deck not found.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        due = Flashcard.objects.filter(deck=deck).filter(
            models.Q(next_review__isnull=True) | models.Q(next_review__lte=now)
        ).order_by('order')
        return Response(FlashcardSerializer(due, many=True).data)


class ReviewCardView(APIView):
    """Submit a review for a flashcard (SM-2 spaced-repetition algorithm)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, card_id):
        try:
            card = Flashcard.objects.get(
                pk=card_id, deck__user=request.user
            )
        except Flashcard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)

        quality = request.data.get('quality')
        if quality is None or int(quality) not in (0, 3, 4, 5):
            return Response(
                {'error': 'quality must be 0 (wrong), 3 (hard), 4 (correct), or 5 (easy).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quality = int(quality)

        # Record the review
        FlashcardReview.objects.create(card=card, user=request.user, quality=quality)

        # SM-2 algorithm
        ef = card.ease_factor
        reps = card.repetitions
        interval = card.interval_days

        if quality < 3:
            # Wrong answer: reset
            reps = 0
            interval = 0
        else:
            if reps == 0:
                interval = 1
            elif reps == 1:
                interval = 6
            else:
                interval = max(1, int(interval * ef))
            reps += 1

        # Adjust ease factor
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ef = max(1.3, ef)

        card.ease_factor = ef
        card.repetitions = reps
        card.interval_days = interval
        card.next_review = timezone.now() + timedelta(days=interval) if interval > 0 else None
        card.save()

        return Response(FlashcardSerializer(card).data)


class EditCardView(APIView):
    """Edit a flashcard's question/answer."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, card_id):
        try:
            card = Flashcard.objects.get(pk=card_id, deck__user=request.user)
        except Flashcard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'question' in request.data:
            card.question = request.data['question']
        if 'answer' in request.data:
            card.answer = request.data['answer']
        card.save()
        return Response(FlashcardSerializer(card).data)

    def delete(self, request, card_id):
        try:
            card = Flashcard.objects.get(pk=card_id, deck__user=request.user)
        except Flashcard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)
        deck = card.deck
        card.delete()
        deck.card_count = deck.cards.count()
        deck.save()
        return Response({'message': 'Card deleted.'})


# ─── Version History Views ──────────────────────────────

class NoteVersionListView(generics.ListAPIView):
    """List all versions for a note (accessible by author or admin)."""
    serializer_class = NoteVersionListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        note_id = self.kwargs['note_id']
        user = self.request.user
        # Allow note author or staff
        return NoteVersion.objects.filter(
            note_id=note_id,
        ).filter(
            models.Q(note__author=user) | models.Q(created_by__is_staff=True) if not user.is_staff
            else models.Q()
        ).select_related('created_by', 'subject')


class NoteVersionDetailView(APIView):
    """Get a specific version's full detail."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, note_id, version_id):
        try:
            version = NoteVersion.objects.select_related(
                'created_by', 'subject', 'note'
            ).get(pk=version_id, note_id=note_id)
        except NoteVersion.DoesNotExist:
            return Response({'error': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        note = version.note
        if note.author != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(NoteVersionDetailSerializer(version, context={'request': request}).data)


class VersionDiffView(APIView):
    """Compare two versions of a note and return a structured diff."""
    permission_classes = [permissions.IsAuthenticated]

    DIFF_FIELDS = ['title', 'description', 'file_type', 'file_size', 'subject']

    def get(self, request, note_id):
        va_id = request.query_params.get('a')
        vb_id = request.query_params.get('b')
        if not va_id or not vb_id:
            return Response(
                {'error': 'Provide both ?a=<version_id>&b=<version_id> query params.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            va = NoteVersion.objects.select_related('created_by', 'subject', 'note').get(
                pk=va_id, note_id=note_id,
            )
            vb = NoteVersion.objects.select_related('created_by', 'subject', 'note').get(
                pk=vb_id, note_id=note_id,
            )
        except NoteVersion.DoesNotExist:
            return Response({'error': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        note = va.note
        if note.author != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Build diff
        changes = []
        for field in self.DIFF_FIELDS:
            old_val = getattr(va, field)
            new_val = getattr(vb, field)
            # For FK fields, compare IDs
            if hasattr(old_val, 'pk'):
                old_display = str(old_val) if old_val else None
                new_display = str(new_val) if new_val else None
                old_val = old_val.pk if old_val else None
                new_val = new_val.pk if new_val else None
            else:
                old_display = old_val
                new_display = new_val

            if old_val != new_val:
                changes.append({
                    'field': field,
                    'old_value': old_display,
                    'new_value': new_display,
                })

        # Description diff (line-level)
        if va.description != vb.description:
            import difflib
            old_lines = (va.description or '').splitlines(keepends=True)
            new_lines = (vb.description or '').splitlines(keepends=True)
            diff_lines = list(difflib.unified_diff(
                old_lines, new_lines,
                fromfile=f'v{va.version_number}', tofile=f'v{vb.version_number}',
                lineterm='',
            ))
            # Replace the generic description change with a detailed diff
            for c in changes:
                if c['field'] == 'description':
                    c['diff'] = diff_lines
                    break

        ctx = {'request': request}
        return Response({
            'version_a': NoteVersionDetailSerializer(va, context=ctx).data,
            'version_b': NoteVersionDetailSerializer(vb, context=ctx).data,
            'changes': changes,
        })


class RestoreVersionView(APIView):
    """Restore a note to a specific version (author only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, note_id, version_id):
        try:
            version = NoteVersion.objects.select_related('note', 'subject').get(
                pk=version_id, note_id=note_id,
            )
        except NoteVersion.DoesNotExist:
            return Response({'error': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        note = version.note
        if note.author != request.user:
            return Response({'error': 'Only the author can restore.'}, status=status.HTTP_403_FORBIDDEN)

        # Snapshot current state before restoring
        last_ver = NoteVersion.objects.filter(note=note).order_by('-version_number').first()
        next_num = (last_ver.version_number + 1) if last_ver else 1

        from django.core.files.base import ContentFile
        pre_restore = NoteVersion(
            note=note,
            version_number=next_num,
            change_type='restored',
            change_summary=f'Restored to v{version.version_number}',
            title=note.title,
            description=note.description,
            file_type=note.file_type or '',
            file_size=note.file_size or 0,
            subject=note.subject,
            created_by=request.user,
        )
        if note.file:
            try:
                note.file.open('rb')
                pre_restore.file.save(
                    note.file.name.split('/')[-1],
                    ContentFile(note.file.read()),
                    save=False,
                )
                note.file.close()
            except Exception:
                pass
        pre_restore.save()

        # Apply restoration
        note.title = version.title
        note.description = version.description
        if version.subject:
            note.subject = version.subject
        if version.file:
            try:
                version.file.open('rb')
                note.file.save(
                    version.file.name.split('/')[-1],
                    ContentFile(version.file.read()),
                    save=False,
                )
                version.file.close()
                note.file_type = version.file_type
                note.file_size = version.file_size
            except Exception:
                pass
        note.save()

        return Response({
            'message': f'Restored to version {version.version_number}.',
            'version_created': next_num,
        })


# ─── OCR Views ──────────────────────────────────────────

class OcrUploadView(APIView):
    """Upload a scanned/handwritten note and run OCR to extract text."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OcrUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uploaded_file = data['file']
        ext = uploaded_file.name.rsplit('.', 1)[-1].lower() if '.' in uploaded_file.name else ''
        if ext not in ('jpg', 'jpeg', 'png', 'pdf'):
            return Response(
                {'error': 'Unsupported file type. Upload JPG, PNG, or scanned PDF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate subject
        from apps.academics.models import Subject
        try:
            subject = Subject.objects.get(pk=data['subject'])
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Create the note
        from django.utils.text import slugify
        import uuid
        base_slug = slugify(data['title'])
        slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"

        note = Note.objects.create(
            title=data['title'],
            slug=slug,
            description=data.get('description', ''),
            file=uploaded_file,
            file_type=ext,
            file_size=uploaded_file.size,
            subject=subject,
            author=request.user,
            status='approved',
            is_handwritten=data.get('is_handwritten', True),
            ocr_status='pending',
        )

        # Run OCR
        result = ocr_from_file(note.file.path, note.file_type)

        if result.success:
            note.ocr_status = 'completed'
            note.ocr_text = result.text
            note.ocr_confidence = result.confidence
            note.text_content = result.text  # also populate text_content for search
            note.save()

            return Response({
                'note_id': note.id,
                'note_slug': note.slug,
                'ocr_text': result.text,
                'ocr_confidence': result.confidence,
                'ocr_status': 'completed',
                'message': f'OCR completed with {result.confidence}% average confidence.',
            }, status=status.HTTP_201_CREATED)
        else:
            note.ocr_status = 'failed'
            note.save()
            return Response({
                'note_id': note.id,
                'note_slug': note.slug,
                'ocr_text': '',
                'ocr_confidence': 0,
                'ocr_status': 'failed',
                'message': result.error,
            }, status=status.HTTP_201_CREATED)


class OcrStatusView(APIView):
    """Get the OCR status and extracted text for a note."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, note_id):
        try:
            note = Note.objects.get(pk=note_id)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        if note.author != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(OcrStatusSerializer(note).data)


class OcrRetryView(APIView):
    """Re-run OCR on an existing note (e.g. after a previous failure)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        note_id = request.data.get('note_id')
        if not note_id:
            return Response({'error': 'note_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            note = Note.objects.get(pk=note_id, author=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not note.file:
            return Response({'error': 'Note has no file.'}, status=status.HTTP_400_BAD_REQUEST)

        note.ocr_status = 'pending'
        note.save(update_fields=['ocr_status'])

        result = ocr_from_file(note.file.path, note.file_type)

        if result.success:
            note.ocr_status = 'completed'
            note.ocr_text = result.text
            note.ocr_confidence = result.confidence
            note.text_content = result.text
            note.save()
            return Response({
                'note_id': note.id,
                'note_slug': note.slug,
                'ocr_text': result.text,
                'ocr_confidence': result.confidence,
                'ocr_status': 'completed',
                'message': f'OCR completed with {result.confidence}% average confidence.',
            })
        else:
            note.ocr_status = 'failed'
            note.save(update_fields=['ocr_status'])
            return Response({
                'note_id': note.id,
                'note_slug': note.slug,
                'ocr_text': '',
                'ocr_confidence': 0,
                'ocr_status': 'failed',
                'message': result.error,
            })


class OcrSearchView(APIView):
    """Search through OCR-extracted text across handwritten notes."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response({'results': []})

        from apps.notes.serializers import NoteListSerializer
        notes = Note.objects.filter(
            status='approved',
            is_handwritten=True,
            ocr_status='completed',
        ).filter(
            Q(ocr_text__icontains=q) | Q(title__icontains=q)
        ).select_related(
            'author', 'subject__semester__faculty'
        )[:20]

        return Response({
            'results': NoteListSerializer(notes, many=True).data,
            'count': len(notes),
        })


# ─── Collaborative Note Layers ───────────────────────────

class NoteLayerListView(APIView):
    """List all layers for a note. Public read, authenticated create."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        note = generics.get_object_or_404(Note, slug=slug, status='approved')
        layers = NoteLayer.objects.filter(note=note).select_related('author')
        serializer = NoteLayerSerializer(layers, many=True, context={'request': request})
        return Response({
            'layers': serializer.data,
            'count': layers.count(),
        })


class NoteLayerCreateView(APIView):
    """Create a new layer on a note."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        note = generics.get_object_or_404(Note, slug=slug, status='approved')
        serializer = NoteLayerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        layer = serializer.save(note=note, author=request.user)
        return Response(
            NoteLayerSerializer(layer, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class NoteLayerDetailView(APIView):
    """Update or delete a layer (author only)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        layer = generics.get_object_or_404(NoteLayer, pk=pk)
        if layer.author != request.user and not request.user.is_staff:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = NoteLayerCreateSerializer(layer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(NoteLayerSerializer(layer, context={'request': request}).data)

    def delete(self, request, pk):
        layer = generics.get_object_or_404(NoteLayer, pk=pk)
        if layer.author != request.user and not request.user.is_staff:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        layer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteLayerVoteView(APIView):
    """Upvote or downvote a layer. Toggle off if same vote repeated."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        layer = generics.get_object_or_404(NoteLayer, pk=pk)
        serializer = NoteLayerVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vote_type = serializer.validated_data['vote_type']

        existing = NoteLayerVote.objects.filter(layer=layer, user=request.user).first()

        if existing:
            if existing.vote_type == vote_type:
                # Toggle off — remove vote
                if vote_type == 'up':
                    layer.upvotes = max(0, layer.upvotes - 1)
                else:
                    layer.downvotes = max(0, layer.downvotes - 1)
                layer.save(update_fields=['upvotes', 'downvotes'])
                existing.delete()
                return Response(NoteLayerSerializer(layer, context={'request': request}).data)
            else:
                # Switch vote direction
                if existing.vote_type == 'up':
                    layer.upvotes = max(0, layer.upvotes - 1)
                    layer.downvotes += 1
                else:
                    layer.downvotes = max(0, layer.downvotes - 1)
                    layer.upvotes += 1
                existing.vote_type = vote_type
                existing.save(update_fields=['vote_type'])
                layer.save(update_fields=['upvotes', 'downvotes'])
        else:
            # New vote
            NoteLayerVote.objects.create(layer=layer, user=request.user, vote_type=vote_type)
            if vote_type == 'up':
                layer.upvotes += 1
            else:
                layer.downvotes += 1
            layer.save(update_fields=['upvotes', 'downvotes'])

        return Response(NoteLayerSerializer(layer, context={'request': request}).data)


class NoteLayerPinView(APIView):
    """Pin/unpin a layer (note author or admin only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        layer = generics.get_object_or_404(NoteLayer, pk=pk)
        if layer.note.author != request.user and not request.user.is_staff:
            return Response({'detail': 'Only the note author or admin can pin layers.'}, status=status.HTTP_403_FORBIDDEN)
        layer.is_pinned = not layer.is_pinned
        layer.save(update_fields=['is_pinned'])
        return Response(NoteLayerSerializer(layer, context={'request': request}).data)


# ─── AI Summary Views ──────────────────────────────────

class NoteSummaryView(APIView):
    """
    GET  — Return the existing AI summary for a note (public).
    POST — Generate (or regenerate) the AI summary (authenticated).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            note = Note.objects.get(slug=slug, status='approved')
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        if note.ai_summary:
            return Response({
                'summary': note.ai_summary,
                'generated_at': note.summary_generated_at,
                'has_summary': True,
            })

        return Response({
            'summary': '',
            'generated_at': None,
            'has_summary': False,
        })

    def post(self, request, slug):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Login required to generate summaries.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            note = Note.objects.get(slug=slug, status='approved')
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Rate-limit: don't regenerate if generated within the last 5 minutes
        if note.summary_generated_at:
            elapsed = timezone.now() - note.summary_generated_at
            if elapsed < timedelta(minutes=5):
                return Response({
                    'summary': note.ai_summary,
                    'generated_at': note.summary_generated_at,
                    'has_summary': True,
                    'source': 'cached',
                    'word_count': len(note.ai_summary.split()),
                })

        result = generate_summary(note)

        if result['success']:
            note.ai_summary = result['summary']
            note.summary_generated_at = timezone.now()
            note.save(update_fields=['ai_summary', 'summary_generated_at'])

            return Response({
                'summary': result['summary'],
                'generated_at': note.summary_generated_at,
                'has_summary': True,
                'source': result['source'],
                'word_count': result['word_count'],
            })
        else:
            return Response({
                'summary': '',
                'generated_at': None,
                'has_summary': False,
                'error': result['error'],
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


# ─── Exam Mode Views ───────────────────────────────────

class ExamModeView(APIView):
    """
    POST — Generate exam-mode rapid-revision content for a note.
    Extracts definitions, formulas, key points, diagrams, and code syntax.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        try:
            note = Note.objects.get(slug=slug, status='approved')
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        result = generate_exam_mode(note)

        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


# ─── Semester Pack Downloads ────────────────────────────

class SemesterPackListView(APIView):
    """
    GET — List available semester packs with metadata (note count, total size).
    Optional query param: ?faculty=<id>
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from apps.academics.models import Semester, Faculty

        faculty_id = request.query_params.get('faculty')
        semesters = Semester.objects.filter(is_active=True).select_related('faculty')
        if faculty_id:
            semesters = semesters.filter(faculty_id=faculty_id)

        packs = []
        for sem in semesters.prefetch_related('subjects__notes'):
            notes = Note.objects.filter(
                subject__semester=sem,
                status='approved',
            ).select_related('subject')

            if not notes.exists():
                continue

            subjects = {}
            total_size = 0
            for note in notes:
                subj_name = note.subject.name
                subjects.setdefault(subj_name, 0)
                subjects[subj_name] += 1
                total_size += note.file_size or 0

            packs.append({
                'semester_id': sem.id,
                'semester_number': sem.number,
                'semester_name': sem.name,
                'faculty_id': sem.faculty_id,
                'faculty_name': sem.faculty.name,
                'note_count': notes.count(),
                'total_size': total_size,
                'total_size_display': self._size_display(total_size),
                'subjects': [
                    {'name': name, 'note_count': count}
                    for name, count in sorted(subjects.items())
                ],
            })

        return Response(packs)

    @staticmethod
    def _size_display(size_bytes: int) -> str:
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"


class SemesterPackDownloadView(APIView):
    """
    GET /notes/semester-pack/<semester_id>/download/
    Generates and streams a ZIP file containing all approved notes
    organized into subject folders.

    Structure:
      <Faculty> - Semester <N>/
        ├── <Subject A>/
        │   ├── note1.pdf
        │   └── note2.docx
        └── <Subject B>/
            └── note3.pdf
    """
    permission_classes = [permissions.AllowAny]

    @staticmethod
    def _safe_filename(name: str) -> str:
        """Sanitize a string for use as a filename/folder name."""
        name = re.sub(r'[<>:"/\\|?*]', '', name)
        name = name.strip('. ')
        return name[:80] or 'Untitled'

    def get(self, request, semester_id):
        from apps.academics.models import Semester

        try:
            semester = Semester.objects.select_related('faculty').get(
                id=semester_id, is_active=True,
            )
        except Semester.DoesNotExist:
            return Response({'error': 'Semester not found.'}, status=status.HTTP_404_NOT_FOUND)

        notes = (
            Note.objects
            .filter(subject__semester=semester, status='approved')
            .select_related('subject')
            .order_by('subject__name', 'title')
        )

        if not notes.exists():
            return Response(
                {'error': 'No approved notes in this semester.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Build ZIP in memory
        buf = io.BytesIO()
        folder_root = self._safe_filename(
            f"{semester.faculty.name} - Semester {semester.number}"
        )

        used_names: dict[str, int] = {}  # track duplicates

        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for note in notes:
                subject_folder = self._safe_filename(note.subject.name)

                # Build unique filename
                ext = (note.file_type or 'pdf').lower()
                base = self._safe_filename(note.title)
                fname = f"{base}.{ext}"
                full_path = f"{folder_root}/{subject_folder}/{fname}"

                # Handle duplicate names
                if full_path.lower() in used_names:
                    used_names[full_path.lower()] += 1
                    fname = f"{base} ({used_names[full_path.lower()]}).{ext}"
                    full_path = f"{folder_root}/{subject_folder}/{fname}"
                else:
                    used_names[full_path.lower()] = 0

                try:
                    if note.file and os.path.isfile(note.file.path):
                        zf.write(note.file.path, full_path)
                except Exception:
                    continue  # skip files that can't be read

        buf.seek(0)
        zip_name = f"{folder_root}.zip"

        response = StreamingHttpResponse(
            buf,
            content_type='application/zip',
        )
        response['Content-Disposition'] = f'attachment; filename="{zip_name}"'
        response['Content-Length'] = buf.getbuffer().nbytes
        return response


# ─── AI Concept Simplifier ──────────────────────────────

class ConceptSimplifyView(APIView):
    """
    POST — "Explain This Like I'm 10"
    Body: { "text": "...", "note_slug": "optional-slug" }
    Returns simplified explanation + real-world analogy.
    Uses curated DB for known concepts, Gemini AI for everything else.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        text = request.data.get('text', '').strip()
        note_slug = request.data.get('note_slug', '').strip()

        if not text:
            return Response(
                {'error': 'Please provide text to simplify.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(text) > 5000:
            return Response(
                {'error': 'Text is too long. Please select a shorter passage (max 5000 characters).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Pull note context if a slug is provided
        note_context = ''
        if note_slug:
            try:
                note = Note.objects.filter(slug=note_slug, status='approved').first()
                if note:
                    note_context = (note.text_content or note.ocr_text or '')[:2000]
            except Exception:
                pass

        result = simplify_concept(text, note_context=note_context)
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


# ─── Topper Verification ─────────────────────────────────

def _is_topper(user) -> bool:
    """
    Determine if a user qualifies as a "topper".
    Criteria (any one):
    1. Admin-verified user (is_verified=True)
    2. Uploaded ≥ 10 approved notes
    3. Their own notes have avg rating ≥ 4.0 with ≥ 3 ratings total
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_verified', False):
        return True
    approved_count = Note.objects.filter(author=user, status='approved').count()
    if approved_count >= 10:
        return True
    agg = NoteRating.objects.filter(
        note__author=user, note__status='approved'
    ).aggregate(avg=Avg('rating'), cnt=models.Count('id'))
    if (agg['cnt'] or 0) >= 3 and (agg['avg'] or 0) >= 4.0:
        return True
    return False


class TopperVerifyView(APIView):
    """
    POST /api/notes/<slug>/topper-verify/
    Body: { "comment": "optional" }
    Allows a topper to verify a note's quality.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        note = Note.objects.filter(slug=slug, status='approved').first()
        if not note:
            return Response(
                {'error': 'Note not found or not approved.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if note.author == request.user:
            return Response(
                {'error': 'You cannot verify your own note.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not _is_topper(request.user):
            return Response(
                {'error': 'You do not qualify as a topper yet. Keep uploading quality notes!'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if TopperVerification.objects.filter(note=note, verified_by=request.user).exists():
            return Response(
                {'error': 'You have already verified this note.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get('comment', '').strip()[:500]
        TopperVerification.objects.create(
            note=note,
            verified_by=request.user,
            comment=comment,
        )

        count = note.topper_verifications.count()
        return Response({
            'message': 'Note verified successfully!',
            'topper_verified': True,
            'verification_count': count,
        })

    def delete(self, request, slug):
        """Allow a topper to remove their own verification."""
        note = Note.objects.filter(slug=slug, status='approved').first()
        if not note:
            return Response(
                {'error': 'Note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        deleted, _ = TopperVerification.objects.filter(
            note=note, verified_by=request.user
        ).delete()
        if not deleted:
            return Response(
                {'error': 'You have not verified this note.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        count = note.topper_verifications.count()
        return Response({
            'message': 'Verification removed.',
            'topper_verified': count > 0,
            'verification_count': count,
        })


class TopperStatusView(APIView):
    """
    GET /api/notes/<slug>/topper-status/
    Returns verification info for a note + whether current user is a topper.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        note = Note.objects.filter(slug=slug, status='approved').first()
        if not note:
            return Response(
                {'error': 'Note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        verifications = note.topper_verifications.select_related('verified_by').all()
        user = request.user
        is_authenticated = user.is_authenticated

        return Response({
            'topper_verified': verifications.exists(),
            'verification_count': verifications.count(),
            'verifiers': [
                {
                    'username': v.verified_by.username,
                    'full_name': v.verified_by.full_name,
                    'comment': v.comment,
                    'verified_at': v.created_at,
                }
                for v in verifications[:10]
            ],
            'current_user_is_topper': _is_topper(user) if is_authenticated else False,
            'current_user_has_verified': (
                verifications.filter(verified_by=user).exists()
                if is_authenticated else False
            ),
        })


# ─── Instant Test Generator ─────────────────────────────

class TestGeneratorView(APIView):
    """
    POST /api/notes/<slug>/generate-test/
    Body: { "num_mcqs": 5, "num_short": 3, "num_long": 2 }
    Returns generated MCQs, short questions, and long questions.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        try:
            note = Note.objects.filter(slug=slug, status='approved').first()
        except Exception:
            note = None

        if not note:
            return Response(
                {'error': 'Note not found or not approved.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        num_mcqs = request.data.get('num_mcqs', 5)
        num_short = request.data.get('num_short', 3)
        num_long = request.data.get('num_long', 2)

        try:
            num_mcqs = int(num_mcqs)
            num_short = int(num_short)
            num_long = int(num_long)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Question counts must be numbers.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = num_mcqs + num_short + num_long
        if total <= 0:
            return Response(
                {'error': 'Please request at least one question.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if total > 200:
            return Response(
                {'error': 'Maximum 200 questions total per request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = generate_test(
            note,
            num_mcqs=num_mcqs,
            num_short=num_short,
            num_long=num_long,
        )

        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


# ─── AI Study Assistant ────────────────────────────────────

class ChatSessionListView(APIView):
    """List user's chat sessions or create a new one."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.user)
        data = [
            {
                'id': s.id,
                'title': s.title,
                'created_at': s.created_at.isoformat(),
                'updated_at': s.updated_at.isoformat(),
                'message_count': s.messages.count(),
            }
            for s in sessions
        ]
        return Response(data)

    def post(self, request):
        session = ChatSession.objects.create(user=request.user)
        return Response({
            'id': session.id,
            'title': session.title,
            'created_at': session.created_at.isoformat(),
            'updated_at': session.updated_at.isoformat(),
            'message_count': 0,
        }, status=status.HTTP_201_CREATED)


class ChatSessionDetailView(APIView):
    """Get messages for a session, or delete the session."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        messages_qs = session.messages.all()
        data = {
            'id': session.id,
            'title': session.title,
            'created_at': session.created_at.isoformat(),
            'messages': [
                {
                    'id': m.id,
                    'role': m.role,
                    'content': m.content,
                    'created_at': m.created_at.isoformat(),
                }
                for m in messages_qs
            ],
        }
        return Response(data)

    def delete(self, request, pk):
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatSendMessageView(APIView):
    """Send a message to the AI Study Assistant and get a response."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(user_message) > 5000:
            return Response({'error': 'Message too long (max 5000 chars).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Save user message
        user_msg_obj = ChatMessage.objects.create(session=session, role='user', content=user_message)

        # Build history for AI context
        history = list(
            session.messages.order_by('created_at').values('role', 'content')
        )

        # Auto-title the session from the first user message
        if session.title == 'New Chat' and session.messages.filter(role='user').count() == 1:
            session.title = user_message[:80] + ('...' if len(user_message) > 80 else '')
            session.save(update_fields=['title'])

        # Call AI
        from apps.notes.ai_chat import chat_with_ai
        ai_response = chat_with_ai(history[:-1], user_message)

        # Save assistant response
        assistant_msg = ChatMessage.objects.create(
            session=session, role='assistant', content=ai_response,
        )

        # Touch session updated_at
        session.save(update_fields=['updated_at'])

        return Response({
            'user_message': {
                'id': user_msg_obj.id,
                'role': 'user',
                'content': user_message,
                'created_at': user_msg_obj.created_at.isoformat(),
            },
            'assistant_message': {
                'id': assistant_msg.id,
                'role': 'assistant',
                'content': ai_response,
                'created_at': assistant_msg.created_at.isoformat(),
            },
            'session_title': session.title,
        })


class ChatClearAllView(APIView):
    """Delete all chat sessions for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        ChatSession.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
