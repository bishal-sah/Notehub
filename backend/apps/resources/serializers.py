"""
Serializers for the resources app.
"""
from rest_framework import serializers
from apps.resources.models import Resource, ResourceUpvote


class ResourceSerializer(serializers.ModelSerializer):
    """Read serializer for resource listings."""
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    faculty_name = serializers.CharField(source='faculty.name', read_only=True, default=None)
    tags_list = serializers.ListField(read_only=True)
    user_has_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id', 'title', 'description', 'category', 'category_display',
            'difficulty', 'difficulty_display', 'tags', 'tags_list', 'link',
            'author', 'author_name', 'author_username', 'author_avatar',
            'faculty', 'faculty_name', 'is_approved',
            'views_count', 'upvotes_count', 'user_has_upvoted',
            'created_at', 'updated_at',
        ]

    def get_user_has_upvoted(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return ResourceUpvote.objects.filter(user=request.user, resource=obj).exists()
        return False


class ResourceCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating/updating resources."""

    class Meta:
        model = Resource
        fields = ['title', 'description', 'category', 'difficulty', 'tags', 'link', 'faculty']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)
