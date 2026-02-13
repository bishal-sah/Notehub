"""
Views for gamification: leaderboard, user stats, badges.
"""
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.gamification.models import UserPoints, Badge, UserBadge, PointTransaction
from apps.gamification.serializers import (
    LeaderboardEntrySerializer,
    BadgeSerializer,
    UserBadgeSerializer,
    PointTransactionSerializer,
)
from apps.gamification.services import (
    get_reputation_tier,
    get_next_tier,
    REPUTATION_TIERS,
    POINTS,
)


class LeaderboardView(generics.ListAPIView):
    """
    Public leaderboard — top contributors ranked by total_points.
    Optional ?faculty=<id> filter for per-faculty leaderboard.
    """
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = (
            UserPoints.objects
            .select_related('user', 'user__faculty')
            .filter(total_points__gt=0)
            .order_by('-total_points')
        )
        faculty_id = self.request.query_params.get('faculty')
        if faculty_id:
            qs = qs.filter(user__faculty_id=faculty_id)
        return qs[:50]


class MyGamificationView(APIView):
    """Authenticated user's gamification stats: points, rank, badges, history, reputation tier."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        up, _ = UserPoints.objects.get_or_create(user=user)

        # Calculate rank
        rank = UserPoints.objects.filter(total_points__gt=up.total_points).count() + 1

        # Badges
        earned = UserBadge.objects.filter(user=user).select_related('badge')
        badges_data = UserBadgeSerializer(earned, many=True).data

        # Recent point transactions
        recent = PointTransaction.objects.filter(user=user)[:20]
        recent_data = PointTransactionSerializer(recent, many=True).data

        # Reputation tier
        tier = get_reputation_tier(up.total_points)
        next_t = get_next_tier(up.total_points)
        if next_t:
            progress_to_next = round(
                (up.total_points - tier['min_points']) /
                (next_t['min_points'] - tier['min_points']) * 100,
                1,
            )
            points_to_next = next_t['min_points'] - up.total_points
        else:
            progress_to_next = 100.0
            points_to_next = 0

        return Response({
            'total_points': up.total_points,
            'upload_count': up.upload_count,
            'downloads_received': up.downloads_received,
            'views_received': up.views_received,
            'comments_count': up.comments_count,
            'ratings_received': up.ratings_received,
            'five_star_count': up.five_star_count,
            'rank': rank,
            'badges': badges_data,
            'recent_points': recent_data,
            'reputation': {
                'current_tier': tier,
                'next_tier': next_t,
                'progress_to_next': progress_to_next,
                'points_to_next': points_to_next,
            },
            'all_tiers': REPUTATION_TIERS,
            'point_values': POINTS,
        })


class AllBadgesView(generics.ListAPIView):
    """List all available badges (public)."""
    serializer_class = BadgeSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Badge.objects.all()


class UserBadgesView(generics.ListAPIView):
    """List badges earned by a specific user (by username)."""
    serializer_class = UserBadgeSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        username = self.kwargs['username']
        return (
            UserBadge.objects
            .filter(user__username=username)
            .select_related('badge')
        )
