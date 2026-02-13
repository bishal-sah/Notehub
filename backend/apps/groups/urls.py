"""
URL routes for the study groups app.
"""
from django.urls import path
from apps.groups.views import (
    MyGroupsView,
    CreateGroupView,
    GroupDetailView,
    JoinGroupView,
    LeaveGroupView,
    RemoveMemberView,
    PromoteMemberView,
    GroupMembersView,
    GroupMessagesView,
    DeleteMessageView,
    GroupPinnedNotesView,
    UnpinNoteView,
)

urlpatterns = [
    # Groups
    path('', MyGroupsView.as_view(), name='my-groups'),
    path('create/', CreateGroupView.as_view(), name='create-group'),
    path('join/', JoinGroupView.as_view(), name='join-group'),
    path('<int:pk>/', GroupDetailView.as_view(), name='group-detail'),
    path('<int:pk>/leave/', LeaveGroupView.as_view(), name='leave-group'),

    # Members
    path('<int:pk>/members/', GroupMembersView.as_view(), name='group-members'),
    path('<int:pk>/members/<int:user_id>/remove/', RemoveMemberView.as_view(), name='remove-member'),
    path('<int:pk>/members/<int:user_id>/promote/', PromoteMemberView.as_view(), name='promote-member'),

    # Messages
    path('<int:pk>/messages/', GroupMessagesView.as_view(), name='group-messages'),
    path('<int:pk>/messages/<int:msg_id>/', DeleteMessageView.as_view(), name='delete-message'),

    # Pinned Notes
    path('<int:pk>/pins/', GroupPinnedNotesView.as_view(), name='group-pins'),
    path('<int:pk>/pins/<int:pin_id>/', UnpinNoteView.as_view(), name='unpin-note'),
]
