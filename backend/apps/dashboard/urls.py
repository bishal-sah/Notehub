"""
URL routes for the dashboard app.
"""
from django.urls import path
from apps.dashboard.views import (
    UserDashboardView,
    AdminDashboardView,
    AdminLogsView,
)

urlpatterns = [
    path('user/', UserDashboardView.as_view(), name='user-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/logs/', AdminLogsView.as_view(), name='admin-logs'),
]
