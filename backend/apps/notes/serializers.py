"""
Serializers for the notes app.
"""
from rest_framework import serializers
from apps.notes.models import (
    Note, NoteApproval, NoteReport, NoteComment, NoteAnnotation, NoteRating,
    Collection, Bookmark, FlashcardDeck, Flashcard, FlashcardReview, NoteVersion,
)
from django.db.models import Avg, Count


class NoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for note lists."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    semester_number = serializers.IntegerField(source='subject.semester.number', read_only=True)
    faculty_name = serializers.CharField(source='subject.semester.faculty.name', read_only=True)
    faculty_slug = serializers.CharField(source='subject.semester.faculty.slug', read_only=True)
    file_size_display = serializers.ReadOnlyField()
    average_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()
    topper_verified = serializers.SerializerMethodField()
    topper_verification_count = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'slug', 'description', 'file_type',
            'file_size', 'file_size_display', 'thumbnail',
            'subject', 'subject_name', 'semester_number',
            'faculty_name', 'faculty_slug',
            'author', 'author_name', 'author_username',
            'status', 'views_count', 'downloads_count',
            'average_rating', 'ratings_count',
            'topper_verified', 'topper_verification_count',
            'created_at',
        ]

    def get_average_rating(self, obj):
        if hasattr(obj, '_avg_rating'):
            return round(obj._avg_rating, 1) if obj._avg_rating else None
        avg = obj.ratings.aggregate(avg=Avg('rating'))['avg']
        return round(avg, 1) if avg else None

    def get_ratings_count(self, obj):
        if hasattr(obj, '_ratings_count'):
            return obj._ratings_count
        return obj.ratings.count()

    def get_topper_verified(self, obj):
        return obj.topper_verifications.exists()

    def get_topper_verification_count(self, obj):
        return obj.topper_verifications.count()


class NoteDetailSerializer(serializers.ModelSerializer):
    """Full serializer for note detail view."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    semester_number = serializers.IntegerField(source='subject.semester.number', read_only=True)
    semester_id = serializers.IntegerField(source='subject.semester.id', read_only=True)
    faculty_name = serializers.CharField(source='subject.semester.faculty.name', read_only=True)
    faculty_slug = serializers.CharField(source='subject.semester.faculty.slug', read_only=True)
    faculty_id = serializers.IntegerField(source='subject.semester.faculty.id', read_only=True)
    file_size_display = serializers.ReadOnlyField()

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'slug', 'description', 'file', 'file_type',
            'file_size', 'file_size_display', 'thumbnail',
            'subject', 'subject_name',
            'semester_number', 'semester_id',
            'faculty_name', 'faculty_slug', 'faculty_id',
            'author', 'author_name', 'author_username', 'author_avatar',
            'status', 'rejection_reason',
            'views_count', 'downloads_count',
            'average_rating', 'ratings_count',
            'topper_verified', 'topper_verification_count',
            'created_at', 'updated_at',
        ]

    average_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()
    topper_verified = serializers.SerializerMethodField()
    topper_verification_count = serializers.SerializerMethodField()

    def get_average_rating(self, obj):
        if hasattr(obj, '_avg_rating'):
            return round(obj._avg_rating, 1) if obj._avg_rating else None
        avg = obj.ratings.aggregate(avg=Avg('rating'))['avg']
        return round(avg, 1) if avg else None

    def get_ratings_count(self, obj):
        if hasattr(obj, '_ratings_count'):
            return obj._ratings_count
        return obj.ratings.count()

    def get_topper_verified(self, obj):
        return obj.topper_verifications.exists()

    def get_topper_verification_count(self, obj):
        return obj.topper_verifications.count()


class NoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for uploading/creating a note."""
    file_type = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Note
        fields = [
            'title', 'description', 'file', 'file_type',
            'subject', 'thumbnail',
        ]

    def validate_file(self, value):
        """Validate file size."""
        from django.conf import settings
        if value.size > settings.MAX_UPLOAD_SIZE:
            max_mb = settings.MAX_UPLOAD_SIZE_MB
            raise serializers.ValidationError(
                f'File size exceeds the maximum limit of {max_mb}MB.'
            )
        return value

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        validated_data['file_size'] = validated_data['file'].size
        validated_data['status'] = 'approved'
        # Auto-detect file_type from uploaded file extension
        if not validated_data.get('file_type'):
            import os
            ext = os.path.splitext(validated_data['file'].name)[1].lower().lstrip('.')
            validated_data['file_type'] = ext if ext in ('pdf', 'doc', 'docx', 'ppt', 'pptx') else 'pdf'
        # Generate slug from title
        from django.utils.text import slugify
        import uuid
        base_slug = slugify(validated_data['title'])
        validated_data['slug'] = f"{base_slug}-{uuid.uuid4().hex[:8]}"
        return super().create(validated_data)


class NoteUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a note."""

    class Meta:
        model = Note
        fields = ['title', 'description', 'subject', 'thumbnail']


class NoteApprovalSerializer(serializers.ModelSerializer):
    """Serializer for note approval actions."""
    admin_name = serializers.CharField(source='admin.full_name', read_only=True)
    note_title = serializers.CharField(source='note.title', read_only=True)

    class Meta:
        model = NoteApproval
        fields = [
            'id', 'note', 'note_title', 'admin', 'admin_name',
            'action', 'reason', 'created_at',
        ]
        read_only_fields = ['id', 'admin', 'created_at']


class NoteApproveRejectSerializer(serializers.Serializer):
    """Serializer for approve/reject action."""
    action = serializers.ChoiceField(choices=['approved', 'rejected'])
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class NoteReportSerializer(serializers.ModelSerializer):
    """Serializer for reporting a note."""
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True)
    note_title = serializers.CharField(source='note.title', read_only=True)

    class Meta:
        model = NoteReport
        fields = [
            'id', 'note', 'note_title', 'reported_by', 'reported_by_name',
            'reason', 'description', 'is_resolved', 'created_at',
        ]
        read_only_fields = ['id', 'reported_by', 'created_at']

    def create(self, validated_data):
        validated_data['reported_by'] = self.context['request'].user
        return super().create(validated_data)


class BulkApproveSerializer(serializers.Serializer):
    """Serializer for bulk approve/reject."""
    note_ids = serializers.ListField(child=serializers.IntegerField())
    action = serializers.ChoiceField(choices=['approved', 'rejected'])
    reason = serializers.CharField(required=False, allow_blank=True, default='')


# ─── Comments & Annotations ─────────────────────────────

class NoteCommentReplySerializer(serializers.ModelSerializer):
    """Serializer for a single reply (no further nesting)."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    vote_count = serializers.ReadOnlyField()
    user_has_voted = serializers.SerializerMethodField()

    class Meta:
        model = NoteComment
        fields = [
            'id', 'author', 'author_name', 'author_username', 'author_avatar',
            'parent', 'body', 'is_question', 'is_best_answer',
            'is_edited', 'is_deleted', 'vote_count', 'user_has_voted',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'is_edited', 'is_deleted', 'created_at', 'updated_at']

    def get_user_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.comment_votes.filter(user=request.user).exists()
        return False


class NoteCommentSerializer(serializers.ModelSerializer):
    """Serializer for top-level comments with nested replies."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.ReadOnlyField()
    vote_count = serializers.ReadOnlyField()
    user_has_voted = serializers.SerializerMethodField()

    class Meta:
        model = NoteComment
        fields = [
            'id', 'note', 'author', 'author_name', 'author_username', 'author_avatar',
            'parent', 'body', 'is_question', 'is_best_answer',
            'is_edited', 'is_deleted',
            'vote_count', 'user_has_voted',
            'reply_count', 'replies',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'is_edited', 'is_deleted', 'created_at', 'updated_at']

    def get_replies(self, obj):
        replies = obj.replies.filter(is_deleted=False).select_related('author')
        return NoteCommentReplySerializer(replies, many=True, context=self.context).data

    def get_user_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.comment_votes.filter(user=request.user).exists()
        return False


class NoteCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a comment or reply."""

    class Meta:
        model = NoteComment
        fields = ['note', 'parent', 'body', 'is_question']

    def validate_parent(self, value):
        if value and value.note_id != self.initial_data.get('note'):
            raise serializers.ValidationError('Parent comment must belong to the same note.')
        return value

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class NoteAnnotationSerializer(serializers.ModelSerializer):
    """Serializer for highlight-based annotations."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)

    class Meta:
        model = NoteAnnotation
        fields = [
            'id', 'note', 'author', 'author_name', 'author_username', 'author_avatar',
            'page_number', 'x', 'y', 'width', 'height',
            'selected_text', 'body', 'color', 'is_resolved',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


# ─── Ratings & Reviews ───────────────────────────────────

class NoteRatingSerializer(serializers.ModelSerializer):
    """Serializer for reading a note rating/review."""
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)

    class Meta:
        model = NoteRating
        fields = [
            'id', 'note', 'user', 'user_name', 'user_username', 'user_avatar',
            'rating', 'review', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class NoteRatingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating a rating."""

    class Meta:
        model = NoteRating
        fields = ['note', 'rating', 'review']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # Upsert: update if already rated, otherwise create
        rating, _created = NoteRating.objects.update_or_create(
            note=validated_data['note'],
            user=validated_data['user'],
            defaults={
                'rating': validated_data['rating'],
                'review': validated_data.get('review', ''),
            },
        )
        return rating


# ─── Bookmarks & Collections ─────────────────────────────

class CollectionSerializer(serializers.ModelSerializer):
    """Serializer for reading a collection with note count."""
    note_count = serializers.ReadOnlyField()

    class Meta:
        model = Collection
        fields = [
            'id', 'name', 'description', 'is_default',
            'note_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_default', 'created_at', 'updated_at']


class CollectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating a collection."""

    class Meta:
        model = Collection
        fields = ['name', 'description']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BookmarkNoteSerializer(serializers.ModelSerializer):
    """Lightweight note info embedded inside a bookmark."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    faculty_name = serializers.CharField(source='subject.semester.faculty.name', read_only=True)
    file_size_display = serializers.ReadOnlyField()

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'slug', 'description', 'file_type',
            'file_size', 'file_size_display', 'thumbnail',
            'subject_name', 'faculty_name',
            'author_name', 'views_count', 'downloads_count',
            'created_at',
        ]


class BookmarkSerializer(serializers.ModelSerializer):
    """Serializer for reading a bookmark with nested note."""
    note_detail = BookmarkNoteSerializer(source='note', read_only=True)
    collection_name = serializers.CharField(source='collection.name', read_only=True, default=None)

    class Meta:
        model = Bookmark
        fields = [
            'id', 'note', 'note_detail', 'collection', 'collection_name',
            'personal_note', 'highlight_color', 'is_offline',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookmarkCreateSerializer(serializers.Serializer):
    """Serializer for toggling a bookmark on a note."""
    note_id = serializers.IntegerField()
    collection_id = serializers.IntegerField(required=False, allow_null=True, default=None)


class BookmarkMoveSerializer(serializers.Serializer):
    """Move bookmarks between collections."""
    bookmark_ids = serializers.ListField(child=serializers.IntegerField())
    collection_id = serializers.IntegerField(required=False, allow_null=True, default=None)


class BookmarkUpdateSerializer(serializers.ModelSerializer):
    """Update personal notes, highlight color, or offline flag on a bookmark."""

    class Meta:
        model = Bookmark
        fields = ['personal_note', 'highlight_color', 'is_offline']


# ─── Flashcard Serializers ───────────────────────────────

class FlashcardSerializer(serializers.ModelSerializer):
    """Serializer for individual flashcards."""

    class Meta:
        model = Flashcard
        fields = [
            'id', 'deck', 'question', 'answer', 'order',
            'ease_factor', 'interval_days', 'repetitions', 'next_review',
            'created_at',
        ]
        read_only_fields = ['id', 'deck', 'created_at']


class FlashcardDeckListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for deck lists."""
    note_title = serializers.CharField(source='note.title', read_only=True)
    note_slug = serializers.CharField(source='note.slug', read_only=True)

    class Meta:
        model = FlashcardDeck
        fields = [
            'id', 'note', 'note_title', 'note_slug', 'user', 'title',
            'status', 'card_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class FlashcardDeckDetailSerializer(serializers.ModelSerializer):
    """Full deck serializer with embedded cards."""
    note_title = serializers.CharField(source='note.title', read_only=True)
    note_slug = serializers.CharField(source='note.slug', read_only=True)
    cards = FlashcardSerializer(many=True, read_only=True)

    class Meta:
        model = FlashcardDeck
        fields = [
            'id', 'note', 'note_title', 'note_slug', 'user', 'title',
            'status', 'card_count', 'created_at', 'updated_at', 'cards',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class FlashcardReviewSerializer(serializers.ModelSerializer):
    """Serializer for recording a flashcard review."""

    class Meta:
        model = FlashcardReview
        fields = ['id', 'card', 'user', 'quality', 'reviewed_at']
        read_only_fields = ['id', 'user', 'reviewed_at']


class GenerateFlashcardsSerializer(serializers.Serializer):
    """Serializer for the generate-flashcards endpoint."""
    note_id = serializers.IntegerField()
    max_cards = serializers.IntegerField(required=False, default=20, min_value=5, max_value=50)


# ─── Version History Serializers ─────────────────────────

class NoteVersionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for version timeline."""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)

    class Meta:
        model = NoteVersion
        fields = [
            'id', 'note', 'version_number', 'change_type', 'change_summary',
            'title', 'description', 'file_type', 'file_size',
            'subject', 'subject_name',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = fields


class NoteVersionDetailSerializer(serializers.ModelSerializer):
    """Full serializer for a single version with file URL."""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = NoteVersion
        fields = [
            'id', 'note', 'version_number', 'change_type', 'change_summary',
            'title', 'description', 'file', 'file_url', 'file_type', 'file_size',
            'subject', 'subject_name',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class VersionDiffSerializer(serializers.Serializer):
    """Serializer for the diff between two versions."""
    version_a = NoteVersionDetailSerializer()
    version_b = NoteVersionDetailSerializer()
    changes = serializers.ListField(child=serializers.DictField())


# ─── OCR Serializers ────────────────────────────────────

class OcrUploadSerializer(serializers.Serializer):
    """Serializer for uploading a handwritten note for OCR processing."""
    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    file = serializers.FileField()
    subject = serializers.IntegerField()
    is_handwritten = serializers.BooleanField(default=True)


class OcrResultSerializer(serializers.Serializer):
    """Serializer for OCR result response."""
    note_id = serializers.IntegerField()
    note_slug = serializers.CharField()
    ocr_text = serializers.CharField()
    ocr_confidence = serializers.FloatField()
    ocr_status = serializers.CharField()
    message = serializers.CharField()


class OcrStatusSerializer(serializers.ModelSerializer):
    """Serializer for OCR status of a note."""

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'slug', 'is_handwritten',
            'ocr_status', 'ocr_text', 'ocr_confidence',
        ]
        read_only_fields = fields


class OcrRetrySerializer(serializers.Serializer):
    """Serializer for retrying OCR on a note."""
    note_id = serializers.IntegerField()


# ─── Collaborative Note Layers ────────────────────────────

class NoteLayerSerializer(serializers.ModelSerializer):
    """Read serializer for note layers with author info and user's vote."""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    score = serializers.IntegerField(read_only=True)
    user_vote = serializers.SerializerMethodField()

    class Meta:
        from apps.notes.models import NoteLayer
        model = NoteLayer
        fields = [
            'id', 'note', 'author', 'author_name', 'author_avatar',
            'layer_type', 'title', 'content',
            'upvotes', 'downvotes', 'score', 'is_pinned',
            'user_vote', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'note', 'author', 'upvotes', 'downvotes',
            'is_pinned', 'created_at', 'updated_at',
        ]

    def get_author_avatar(self, obj):
        if hasattr(obj.author, 'avatar') and obj.author.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.author.avatar.url)
        return None

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.vote_type if vote else None
        return None


class NoteLayerCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating a note layer."""
    class Meta:
        from apps.notes.models import NoteLayer
        model = NoteLayer
        fields = ['layer_type', 'title', 'content']

    def validate_content(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Content must be at least 10 characters.")
        return value


class NoteLayerVoteSerializer(serializers.Serializer):
    """Serializer for voting on a layer."""
    vote_type = serializers.ChoiceField(choices=['up', 'down'])
