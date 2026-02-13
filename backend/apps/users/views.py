"""
Views for user authentication, profile, and notifications.
"""
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import get_user_model

from apps.users.models import Notification
from apps.users.serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    NotificationSerializer,
    AdminUserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Generate JWT tokens for the new user
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Registration successful.',
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Authenticate user and return JWT tokens."""
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is deactivated. Contact admin.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
        })


class LogoutView(APIView):
    """Blacklist the refresh token to log out."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {'error': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update the authenticated user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change the authenticated user's password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'})


class NotificationListView(generics.ListAPIView):
    """List notifications for the authenticated user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationMarkReadView(APIView):
    """Mark a notification as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            # Mark single notification as read
            try:
                notification = Notification.objects.get(pk=pk, user=request.user)
                notification.is_read = True
                notification.save()
            except Notification.DoesNotExist:
                return Response(
                    {'error': 'Notification not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            # Mark all as read
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)

        return Response({'message': 'Notifications marked as read.'})


class NotificationUnreadCountView(APIView):
    """Get count of unread notifications."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


# ─── Admin Views ────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """Admin: List all users with filters."""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()
    filterset_fields = ['role', 'is_active', 'is_verified', 'faculty']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'username', 'email']


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Admin: View / update a user (role, active status, etc.)."""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()


class AdminUserToggleActiveView(APIView):
    """Admin: Activate or deactivate a user."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            action = 'activated' if user.is_active else 'deactivated'
            return Response({'message': f'User {action} successfully.'})
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )


class AdminUserVerifyView(APIView):
    """Admin: Verify or unverify a user."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_verified = not user.is_verified
            user.save()
            action = 'verified' if user.is_verified else 'unverified'
            return Response({'message': f'User {action} successfully.'})
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )


# ─── Password Reset ─────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """Request a password reset email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'message': 'If an account exists with that email, a reset link has been sent.'})

        import secrets
        from datetime import timedelta as td
        from django.utils import timezone
        from apps.users.models import PasswordResetToken

        # Invalidate any existing tokens
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        token = secrets.token_urlsafe(48)
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + td(hours=24),
        )

        # Send email asynchronously via Celery
        from apps.notes.tasks import send_password_reset_email
        send_password_reset_email.delay(user_id=user.id, token=token, expiry_hours=24)

        return Response({'message': 'If an account exists with that email, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token and set new password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')

        if not token_str or not new_password:
            return Response(
                {'error': 'Token and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.users.models import PasswordResetToken

        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        if not token_obj.is_valid:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.set_password(new_password)
        user.save()

        # Mark token as used
        token_obj.is_used = True
        token_obj.save(update_fields=['is_used'])

        return Response({'message': 'Password has been reset successfully. You can now log in.'})


# ─── Study Buddy Matching ──────────────────────────────────────

from django.db.models import Q, Count, Avg, F
from apps.users.models import StudyBuddyRequest


def _compute_buddy_matches(user, limit=20):
    """
    Find potential study buddies for a user ranked by compatibility.
    Scoring:
      +40  Same faculty
      +30  Studied same subjects (via notes uploaded)
      +20  Notes in same semester
      +10  Active user (uploaded ≥ 1 approved note)
      +5   per shared subject (bonus, capped at +25)
    Excludes: the user themselves, existing buddies, pending requests.
    """
    if not user.faculty_id:
        # Can still match on subjects, but lower quality
        pass

    # Users already connected or with pending requests
    excluded_ids = set()
    excluded_ids.add(user.id)
    existing = StudyBuddyRequest.objects.filter(
        Q(sender=user) | Q(receiver=user)
    ).exclude(status='rejected').values_list('sender_id', 'receiver_id')
    for s, r in existing:
        excluded_ids.add(s)
        excluded_ids.add(r)

    # User's subjects (from notes they uploaded)
    from apps.notes.models import Note
    user_subject_ids = set(
        Note.objects.filter(author=user, status='approved')
        .values_list('subject_id', flat=True).distinct()
    )
    # User's semesters
    from apps.academics.models import Subject
    user_semester_ids = set(
        Subject.objects.filter(id__in=user_subject_ids)
        .values_list('semester_id', flat=True).distinct()
    )

    candidates = (
        User.objects.filter(is_active=True)
        .exclude(id__in=excluded_ids)
        .exclude(role='admin')
        .select_related('faculty')
        .prefetch_related('notes')
    )

    scored = []
    for c in candidates[:200]:  # cap candidates for performance
        score = 0
        reasons = []

        # Same faculty
        if user.faculty_id and c.faculty_id == user.faculty_id:
            score += 40
            reasons.append('Same faculty')

        # Shared subjects
        c_subject_ids = set(
            Note.objects.filter(author=c, status='approved')
            .values_list('subject_id', flat=True).distinct()
        )
        shared = user_subject_ids & c_subject_ids
        if shared:
            bonus = min(len(shared) * 5, 25)
            score += 30 + bonus
            reasons.append(f'{len(shared)} shared subject{"s" if len(shared) > 1 else ""}')

        # Same semester
        c_semester_ids = set(
            Subject.objects.filter(id__in=c_subject_ids)
            .values_list('semester_id', flat=True).distinct()
        )
        shared_sems = user_semester_ids & c_semester_ids
        if shared_sems:
            score += 20
            reasons.append('Same semester')

        # Active contributor
        approved_count = Note.objects.filter(author=c, status='approved').count()
        if approved_count >= 1:
            score += 10
            reasons.append(f'{approved_count} note{"s" if approved_count != 1 else ""} uploaded')

        if score > 0:
            # Get shared subject names for display
            shared_subject_names = list(
                Subject.objects.filter(id__in=shared).values_list('name', flat=True)
            ) if shared else []
            scored.append({
                'user': {
                    'id': c.id,
                    'username': c.username,
                    'full_name': c.full_name,
                    'avatar': c.avatar.url if c.avatar else None,
                    'faculty_name': c.faculty.name if c.faculty else None,
                    'bio': c.bio or '',
                    'notes_count': approved_count,
                },
                'score': score,
                'reasons': reasons,
                'shared_subjects': shared_subject_names[:5],
            })

    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored[:limit]


class StudyBuddyMatchView(APIView):
    """
    GET /api/auth/study-buddies/matches/
    Returns ranked list of potential study buddy matches for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        matches = _compute_buddy_matches(request.user)
        return Response({
            'matches': matches,
            'total': len(matches),
        })


class StudyBuddyRequestView(APIView):
    """
    POST /api/auth/study-buddies/request/
    Body: { "receiver_id": 5, "message": "Hey, let's study together!", "subject_id": 3 }

    Sends a study buddy request to another user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        message = (request.data.get('message', '') or '').strip()[:300]
        subject_id = request.data.get('subject_id')

        if not receiver_id:
            return Response({'error': 'receiver_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if int(receiver_id) == request.user.id:
            return Response({'error': 'Cannot send a request to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(pk=receiver_id, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check for existing request in either direction
        existing = StudyBuddyRequest.objects.filter(
            Q(sender=request.user, receiver=receiver) |
            Q(sender=receiver, receiver=request.user)
        ).exclude(status='rejected').first()

        if existing:
            if existing.status == 'accepted':
                return Response({'error': 'You are already study buddies!'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': 'A pending request already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        subject = None
        if subject_id:
            from apps.academics.models import Subject
            subject = Subject.objects.filter(pk=subject_id).first()

        buddy_req = StudyBuddyRequest.objects.create(
            sender=request.user,
            receiver=receiver,
            message=message,
            subject=subject,
        )

        # Create notification for receiver
        Notification.objects.create(
            user=receiver,
            title='New Study Buddy Request',
            message=f'{request.user.full_name} wants to be your study buddy!',
            notification_type='system',
            link='/dashboard/study-buddies',
        )

        return Response({
            'message': f'Study buddy request sent to {receiver.full_name}!',
            'request_id': buddy_req.id,
        }, status=status.HTTP_201_CREATED)


class StudyBuddyRespondView(APIView):
    """
    POST /api/auth/study-buddies/respond/<id>/
    Body: { "action": "accept" | "reject" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get('action', '').lower()
        if action not in ('accept', 'reject'):
            return Response({'error': 'action must be "accept" or "reject".'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            buddy_req = StudyBuddyRequest.objects.get(pk=pk, receiver=request.user, status='pending')
        except StudyBuddyRequest.DoesNotExist:
            return Response({'error': 'Request not found or already handled.'}, status=status.HTTP_404_NOT_FOUND)

        buddy_req.status = 'accepted' if action == 'accept' else 'rejected'
        buddy_req.save()

        if action == 'accept':
            Notification.objects.create(
                user=buddy_req.sender,
                title='Study Buddy Request Accepted!',
                message=f'{request.user.full_name} accepted your study buddy request!',
                notification_type='system',
                link='/dashboard/study-buddies',
            )

        return Response({
            'message': f'Request {buddy_req.status}.',
            'status': buddy_req.status,
        })


class StudyBuddyListView(APIView):
    """
    GET /api/auth/study-buddies/
    Returns accepted buddies + pending incoming/outgoing requests.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        def _serialize_user(u):
            return {
                'id': u.id,
                'username': u.username,
                'full_name': u.full_name,
                'avatar': u.avatar.url if u.avatar else None,
                'faculty_name': u.faculty.name if u.faculty else None,
                'bio': u.bio or '',
            }

        # Accepted buddies
        accepted = StudyBuddyRequest.objects.filter(
            Q(sender=user) | Q(receiver=user),
            status='accepted',
        ).select_related(
            'sender__faculty', 'receiver__faculty', 'subject',
        ).order_by('-updated_at')

        buddies = []
        for r in accepted:
            other = r.receiver if r.sender == user else r.sender
            buddies.append({
                'request_id': r.id,
                'user': _serialize_user(other),
                'subject_name': r.subject.name if r.subject else None,
                'message': r.message,
                'connected_at': r.updated_at,
            })

        # Pending incoming
        incoming = StudyBuddyRequest.objects.filter(
            receiver=user, status='pending',
        ).select_related('sender__faculty', 'subject').order_by('-created_at')

        incoming_list = [{
            'request_id': r.id,
            'user': _serialize_user(r.sender),
            'subject_name': r.subject.name if r.subject else None,
            'message': r.message,
            'sent_at': r.created_at,
        } for r in incoming]

        # Pending outgoing
        outgoing = StudyBuddyRequest.objects.filter(
            sender=user, status='pending',
        ).select_related('receiver__faculty', 'subject').order_by('-created_at')

        outgoing_list = [{
            'request_id': r.id,
            'user': _serialize_user(r.receiver),
            'subject_name': r.subject.name if r.subject else None,
            'message': r.message,
            'sent_at': r.created_at,
        } for r in outgoing]

        return Response({
            'buddies': buddies,
            'incoming_requests': incoming_list,
            'outgoing_requests': outgoing_list,
            'total_buddies': len(buddies),
        })
