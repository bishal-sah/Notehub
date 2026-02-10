"""
Views for the notes app: CRUD, approval workflow, search, and AI features.
"""
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from apps.notes.models import Note, NoteApproval, NoteReport
from apps.notes.serializers import (
    NoteListSerializer,
    NoteDetailSerializer,
    NoteCreateSerializer,
    NoteUpdateSerializer,
    NoteApprovalSerializer,
    NoteApproveRejectSerializer,
    NoteReportSerializer,
    BulkApproveSerializer,
)


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
    ordering_fields = ['created_at', 'views_count', 'downloads_count', 'title']

    def get_queryset(self):
        return Note.objects.filter(status='approved').select_related(
            'author', 'subject__semester__faculty'
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
            return Response({
                'file_url': request.build_absolute_uri(note.file.url),
                'downloads_count': note.downloads_count,
            })
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )


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
