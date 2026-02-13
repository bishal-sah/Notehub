"""
URL routes for the gamification app.
"""
from django.urls import path
from apps.gamification.views import (
    LeaderboardView,
    MyGamificationView,
    AllBadgesView,
    UserBadgesView,
)

urlpatterns = [
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('me/', MyGamificationView.as_view(), name='my-gamification'),
    path('badges/', AllBadgesView.as_view(), name='all-badges'),
    path('badges/<str:username>/', UserBadgesView.as_view(), name='user-badges'),
]
