"""
URL routes for the resources app.
"""
from django.urls import path
from apps.resources.views import (
    ResourceListView,
    ResourceDetailView,
    ResourceCreateView,
    ResourceUpdateView,
    ResourceDeleteView,
    ResourceUpvoteToggleView,
    ResourceStatsView,
)

urlpatterns = [
    path('', ResourceListView.as_view(), name='resource-list'),
    path('stats/', ResourceStatsView.as_view(), name='resource-stats'),
    path('create/', ResourceCreateView.as_view(), name='resource-create'),
    path('<int:pk>/', ResourceDetailView.as_view(), name='resource-detail'),
    path('<int:pk>/update/', ResourceUpdateView.as_view(), name='resource-update'),
    path('<int:pk>/delete/', ResourceDeleteView.as_view(), name='resource-delete'),
    path('<int:pk>/upvote/', ResourceUpvoteToggleView.as_view(), name='resource-upvote'),
]
