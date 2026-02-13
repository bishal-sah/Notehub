"""
Serializers for gamification: leaderboard, badges, point history.
"""
from rest_framework import serializers
from apps.gamification.models import PointTransaction, UserPoints, Badge, UserBadge


class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = ['id', 'points', 'reason', 'description', 'created_at']


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = [
            'id', 'slug', 'name', 'description', 'icon', 'color',
            'category', 'threshold_field', 'threshold_value', 'points_reward',
        ]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'badge', 'earned_at']


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    """Leaderboard row: user info + points + badge count."""
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    faculty_name = serializers.SerializerMethodField()
    faculty_id = serializers.SerializerMethodField()
    badge_count = serializers.SerializerMethodField()

    class Meta:
        model = UserPoints
        fields = [
            'username', 'full_name', 'avatar', 'faculty_name', 'faculty_id',
            'total_points', 'upload_count', 'downloads_received',
            'views_received', 'comments_count', 'badge_count',
        ]

    def get_full_name(self, obj):
        return obj.user.full_name

    def get_avatar(self, obj):
        if obj.user.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

    def get_faculty_name(self, obj):
        return obj.user.faculty.name if obj.user.faculty else None

    def get_faculty_id(self, obj):
        return obj.user.faculty_id

    def get_badge_count(self, obj):
        return obj.user.earned_badges.count()


class MyGamificationSerializer(serializers.Serializer):
    """Aggregated gamification data for the authenticated user."""
    total_points = serializers.IntegerField()
    upload_count = serializers.IntegerField()
    downloads_received = serializers.IntegerField()
    views_received = serializers.IntegerField()
    comments_count = serializers.IntegerField()
    rank = serializers.IntegerField()
    badges = UserBadgeSerializer(many=True)
    recent_points = PointTransactionSerializer(many=True)
