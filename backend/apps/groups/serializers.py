"""
Serializers for the study groups app.
"""
from rest_framework import serializers
from apps.groups.models import StudyGroup, GroupMembership, GroupMessage, GroupPinnedNote


# ─── Group ───────────────────────────────────────────────

class StudyGroupListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for group lists."""
    member_count = serializers.ReadOnlyField()
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)

    class Meta:
        model = StudyGroup
        fields = [
            'id', 'name', 'description', 'subject', 'subject_name',
            'creator', 'creator_name', 'invite_code', 'avatar_color',
            'member_count', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'invite_code', 'created_at', 'updated_at']


class StudyGroupCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a study group."""

    class Meta:
        model = StudyGroup
        fields = ['name', 'description', 'subject', 'avatar_color']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['creator'] = user
        group = super().create(validated_data)
        # Auto-add creator as admin member
        GroupMembership.objects.create(group=group, user=user, role='admin')
        return group


# ─── Membership ──────────────────────────────────────────

class GroupMemberSerializer(serializers.ModelSerializer):
    """Serializer for reading group memberships."""
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'user_name', 'user_username', 'user_avatar', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']


# ─── Messages ────────────────────────────────────────────

class GroupMessageSerializer(serializers.ModelSerializer):
    """Serializer for group chat messages."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)

    class Meta:
        model = GroupMessage
        fields = [
            'id', 'group', 'author', 'author_name', 'author_username',
            'author_avatar', 'content', 'created_at',
        ]
        read_only_fields = ['id', 'author', 'created_at']


class GroupMessageCreateSerializer(serializers.Serializer):
    """Serializer for sending a message."""
    content = serializers.CharField(max_length=5000)


# ─── Pinned Notes ────────────────────────────────────────

class GroupPinnedNoteSerializer(serializers.ModelSerializer):
    """Serializer for reading pinned notes."""
    note_title = serializers.CharField(source='note.title', read_only=True)
    note_slug = serializers.CharField(source='note.slug', read_only=True)
    note_file_type = serializers.CharField(source='note.file_type', read_only=True)
    note_subject = serializers.CharField(source='note.subject.name', read_only=True, default=None)
    pinned_by_name = serializers.CharField(source='pinned_by.full_name', read_only=True)

    class Meta:
        model = GroupPinnedNote
        fields = [
            'id', 'note', 'note_title', 'note_slug', 'note_file_type', 'note_subject',
            'pinned_by', 'pinned_by_name', 'comment', 'pinned_at',
        ]
        read_only_fields = ['id', 'pinned_by', 'pinned_at']


class PinNoteSerializer(serializers.Serializer):
    """Serializer for pinning a note to a group."""
    note_id = serializers.IntegerField()
    comment = serializers.CharField(max_length=300, required=False, default='')
