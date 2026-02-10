"""
Serializers for the notes app.
"""
from rest_framework import serializers
from apps.notes.models import Note, NoteApproval, NoteReport


class NoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for note lists."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    semester_number = serializers.IntegerField(source='subject.semester.number', read_only=True)
    faculty_name = serializers.CharField(source='subject.semester.faculty.name', read_only=True)
    faculty_slug = serializers.CharField(source='subject.semester.faculty.slug', read_only=True)
    file_size_display = serializers.ReadOnlyField()

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'slug', 'description', 'file_type',
            'file_size', 'file_size_display', 'thumbnail',
            'subject', 'subject_name', 'semester_number',
            'faculty_name', 'faculty_slug',
            'author', 'author_name', 'author_username',
            'status', 'views_count', 'downloads_count',
            'created_at',
        ]


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
            'created_at', 'updated_at',
        ]


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
