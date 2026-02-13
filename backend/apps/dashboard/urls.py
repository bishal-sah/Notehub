"""
URL routes for the dashboard app.
"""
from django.urls import path
from apps.dashboard.views import (
    UserDashboardView,
    AdminDashboardView,
    AdminLogsView,
    StudySessionPingView,
    LearningStatsView,
    WeeklyLearningReportView,
)

urlpatterns = [
    path('user/', UserDashboardView.as_view(), name='user-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/logs/', AdminLogsView.as_view(), name='admin-logs'),

    # Learning Tracker
    path('learning/ping/', StudySessionPingView.as_view(), name='study-session-ping'),
    path('learning/stats/', LearningStatsView.as_view(), name='learning-stats'),
    path('learning/weekly-report/', WeeklyLearningReportView.as_view(), name='weekly-learning-report'),
]
