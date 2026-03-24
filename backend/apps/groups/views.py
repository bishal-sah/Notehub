"""
Views for the study groups app: CRUD groups, membership, chat, pinned notes.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from apps.groups.models import StudyGroup, GroupMembership, GroupMessage, GroupPinnedNote
from apps.groups.serializers import (
    StudyGroupListSerializer,
    StudyGroupCreateSerializer,
    GroupMemberSerializer,
    GroupMessageSerializer,
    GroupMessageCreateSerializer,
    GroupPinnedNoteSerializer,
    PinNoteSerializer,
)
from apps.notes.models import Note


# ─── Helpers ─────────────────────────────────────────────

def _is_member(user, group):
    return group.memberships.filter(user=user).exists()


def _is_admin(user, group):
    return group.memberships.filter(user=user, role='admin').exists()


# ─── Group CRUD ──────────────────────────────────────────

class MyGroupsView(generics.ListAPIView):
    """List groups the authenticated user belongs to."""
    serializer_class = StudyGroupListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return StudyGroup.objects.filter(
            memberships__user=self.request.user, is_active=True
        ).distinct()


class CreateGroupView(generics.CreateAPIView):
    """Create a new study group."""
    serializer_class = StudyGroupCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = serializer.save()
        return Response(
            StudyGroupListSerializer(group).data,
            status=status.HTTP_201_CREATED,
        )


class GroupDetailView(APIView):
    """Retrieve, update, or delete a study group."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_member(request.user, group):
            return Response({'error': 'Not a member.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(StudyGroupListSerializer(group).data)

    def patch(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_admin(request.user, group):
            return Response({'error': 'Only admins can edit.'}, status=status.HTTP_403_FORBIDDEN)
        for field in ('name', 'description', 'avatar_color'):
            if field in request.data:
                setattr(group, field, request.data[field])
        if 'subject' in request.data:
            group.subject_id = request.data['subject'] or None
        group.save()
        return Response(StudyGroupListSerializer(group).data)

    def delete(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_admin(request.user, group):
            return Response({'error': 'Only admins can delete.'}, status=status.HTTP_403_FORBIDDEN)
        group.is_active = False
        group.save()
        return Response({'message': 'Group deleted.'})


# ─── Invite / Join / Leave ───────────────────────────────

class JoinGroupView(APIView):
    """Join a group via invite code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('invite_code', '')
        try:
            group = StudyGroup.objects.get(invite_code=code, is_active=True)
        except (StudyGroup.DoesNotExist, ValueError):
            return Response({'error': 'Invalid invite code.'}, status=status.HTTP_404_NOT_FOUND)

        if _is_member(request.user, group):
            return Response({'error': 'Already a member.'}, status=status.HTTP_400_BAD_REQUEST)

        GroupMembership.objects.create(group=group, user=request.user, role='member')
        return Response(StudyGroupListSerializer(group).data, status=status.HTTP_201_CREATED)


class LeaveGroupView(APIView):
    """Leave a group."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            membership = GroupMembership.objects.get(group_id=pk, user=request.user)
        except GroupMembership.DoesNotExist:
            return Response({'error': 'Not a member.'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent the last admin from leaving
        group = membership.group
        if membership.role == 'admin' and group.memberships.filter(role='admin').count() == 1:
            return Response(
                {'error': 'You are the only admin. Promote another member first or delete the group.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.delete()
        return Response({'message': 'Left the group.'})


class RemoveMemberView(APIView):
    """Remove a member from a group (admin only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, user_id):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_admin(request.user, group):
            return Response({'error': 'Only admins can remove members.'}, status=status.HTTP_403_FORBIDDEN)
        if user_id == request.user.id:
            return Response({'error': 'Cannot remove yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            membership = GroupMembership.objects.get(group=group, user_id=user_id)
        except GroupMembership.DoesNotExist:
            return Response({'error': 'User is not a member.'}, status=status.HTTP_404_NOT_FOUND)
        membership.delete()
        return Response({'message': 'Member removed.'})


class PromoteMemberView(APIView):
    """Promote a member to admin (admin only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, user_id):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_admin(request.user, group):
            return Response({'error': 'Only admins can promote.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            membership = GroupMembership.objects.get(group=group, user_id=user_id)
        except GroupMembership.DoesNotExist:
            return Response({'error': 'User is not a member.'}, status=status.HTTP_404_NOT_FOUND)
        membership.role = 'admin'
        membership.save()
        return Response({'message': 'Member promoted to admin.'})


# ─── Members List ────────────────────────────────────────

class GroupMembersView(generics.ListAPIView):
    """List all members of a group."""
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return GroupMembership.objects.filter(
            group_id=self.kwargs['pk'],
            group__is_active=True,
            group__memberships__user=self.request.user,
        ).select_related('user').distinct()


# ─── Messages ────────────────────────────────────────────

class GroupMessagesView(APIView):
    """List messages or send a message in a group."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_member(request.user, group):
            return Response({'error': 'Not a member.'}, status=status.HTTP_403_FORBIDDEN)

        # Get last N messages (default 100)
        limit = int(request.query_params.get('limit', 100))
        before_id = request.query_params.get('before')
        qs = GroupMessage.objects.filter(group=group).select_related('author')
        if before_id:
            qs = qs.filter(id__lt=before_id)
        messages = qs.order_by('-created_at')[:limit]
        # Return in chronological order
        return Response(GroupMessageSerializer(reversed(list(messages)), many=True).data)

    def post(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_member(request.user, group):
            return Response({'error': 'Not a member.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = GroupMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        msg = GroupMessage.objects.create(
            group=group,
            author=request.user,
            content=serializer.validated_data['content'],
        )
        # Touch group updated_at so it sorts to top
        group.save(update_fields=['updated_at'])
        return Response(GroupMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class DeleteMessageView(APIView):
    """Delete own message or any message (admin)."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, msg_id):
        try:
            msg = GroupMessage.objects.get(pk=msg_id, group_id=pk)
        except GroupMessage.DoesNotExist:
            return Response({'error': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)
        if msg.author != request.user and not _is_admin(request.user, msg.group):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        msg.delete()
        return Response({'message': 'Message deleted.'})


# ─── Pinned Notes ────────────────────────────────────────

class GroupPinnedNotesView(APIView):
    """List or pin a note in a group."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_member(request.user, group):
            return Response({'error': 'Not a member.'}, status=status.HTTP_403_FORBIDDEN)
        pins = GroupPinnedNote.objects.filter(group=group).select_related(
            'note__subject', 'pinned_by',
        )
        return Response(GroupPinnedNoteSerializer(pins, many=True).data)

    def post(self, request, pk):
        try:
            group = StudyGroup.objects.get(pk=pk, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_member(request.user, group):
            return Response({'error': 'Not a member.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PinNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note_id = serializer.validated_data['note_id']

        try:
            note = Note.objects.get(pk=note_id, status='approved')
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        if GroupPinnedNote.objects.filter(group=group, note=note).exists():
            return Response({'error': 'Note already pinned.'}, status=status.HTTP_400_BAD_REQUEST)

        pin = GroupPinnedNote.objects.create(
            group=group, note=note, pinned_by=request.user,
            comment=serializer.validated_data.get('comment', ''),
        )
        return Response(GroupPinnedNoteSerializer(pin).data, status=status.HTTP_201_CREATED)


class UnpinNoteView(APIView):
    """Unpin a note from a group (pinner or admin)."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, pin_id):
        try:
            pin = GroupPinnedNote.objects.get(pk=pin_id, group_id=pk)
        except GroupPinnedNote.DoesNotExist:
            return Response({'error': 'Pin not found.'}, status=status.HTTP_404_NOT_FOUND)
        if pin.pinned_by != request.user and not _is_admin(request.user, pin.group):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        pin.delete()
        return Response({'message': 'Note unpinned.'})
