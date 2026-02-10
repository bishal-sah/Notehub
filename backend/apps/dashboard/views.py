"""
Views for dashboard analytics – both user and admin dashboards.
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone
from datetime import timedelta

from django.contrib.auth import get_user_model
from apps.notes.models import Note, NoteApproval, NoteReport
from apps.academics.models import Faculty, Semester, Subject

User = get_user_model()


class UserDashboardView(APIView):
    """Dashboard stats for an authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        notes = Note.objects.filter(author=user)

        total_notes = notes.count()
        approved_notes = notes.filter(status='approved').count()
        pending_notes = notes.filter(status='pending').count()
        rejected_notes = notes.filter(status='rejected').count()
        total_views = notes.aggregate(total=Sum('views_count'))['total'] or 0
        total_downloads = notes.aggregate(total=Sum('downloads_count'))['total'] or 0

        # Recent uploads (last 5)
        from apps.notes.serializers import NoteListSerializer
        recent = notes.order_by('-created_at')[:5]
        recent_data = NoteListSerializer(recent, many=True).data

        return Response({
            'stats': {
                'total_notes': total_notes,
                'approved_notes': approved_notes,
                'pending_notes': pending_notes,
                'rejected_notes': rejected_notes,
                'total_views': total_views,
                'total_downloads': total_downloads,
            },
            'recent_uploads': recent_data,
        })


class AdminDashboardView(APIView):
    """Dashboard stats and analytics for admin users."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Overall counts
        total_users = User.objects.count()
        total_notes = Note.objects.count()
        approved_notes = Note.objects.filter(status='approved').count()
        pending_notes = Note.objects.filter(status='pending').count()
        rejected_notes = Note.objects.filter(status='rejected').count()
        total_faculties = Faculty.objects.filter(is_active=True).count()
        total_subjects = Subject.objects.filter(is_active=True).count()

        # Totals
        total_views = Note.objects.aggregate(total=Sum('views_count'))['total'] or 0
        total_downloads = Note.objects.aggregate(total=Sum('downloads_count'))['total'] or 0

        # New users this month
        new_users_month = User.objects.filter(created_at__gte=thirty_days_ago).count()

        # Notes uploaded this month
        new_notes_month = Note.objects.filter(created_at__gte=thirty_days_ago).count()

        # Unresolved reports
        unresolved_reports = NoteReport.objects.filter(is_resolved=False).count()

        # Notes per faculty (for charts)
        notes_per_faculty = list(
            Faculty.objects.filter(is_active=True).annotate(
                note_count=Count(
                    'semesters__subjects__notes',
                    filter=Q(semesters__subjects__notes__status='approved')
                )
            ).values('name', 'note_count').order_by('-note_count')
        )

        # Uploads over time (last 30 days, grouped by date)
        uploads_over_time = list(
            Note.objects.filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        # Convert dates to strings for JSON
        for item in uploads_over_time:
            item['date'] = item['date'].isoformat()

        # User registrations over time (last 30 days)
        registrations_over_time = list(
            User.objects.filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        for item in registrations_over_time:
            item['date'] = item['date'].isoformat()

        # Top uploaders
        top_uploaders = list(
            User.objects.annotate(
                note_count=Count('notes', filter=Q(notes__status='approved'))
            ).filter(note_count__gt=0)
            .values('id', 'username', 'email', 'note_count')
            .order_by('-note_count')[:10]
        )

        # Recent approval actions
        recent_approvals = list(
            NoteApproval.objects.select_related('note', 'admin')
            .order_by('-created_at')[:10]
            .values(
                'id', 'note__title', 'admin__username',
                'action', 'reason', 'created_at',
            )
        )
        for item in recent_approvals:
            item['created_at'] = item['created_at'].isoformat()

        return Response({
            'stats': {
                'total_users': total_users,
                'total_notes': total_notes,
                'approved_notes': approved_notes,
                'pending_notes': pending_notes,
                'rejected_notes': rejected_notes,
                'total_faculties': total_faculties,
                'total_subjects': total_subjects,
                'total_views': total_views,
                'total_downloads': total_downloads,
                'new_users_month': new_users_month,
                'new_notes_month': new_notes_month,
                'unresolved_reports': unresolved_reports,
            },
            'charts': {
                'notes_per_faculty': notes_per_faculty,
                'uploads_over_time': uploads_over_time,
                'registrations_over_time': registrations_over_time,
            },
            'top_uploaders': top_uploaders,
            'recent_approvals': recent_approvals,
        })


class AdminLogsView(APIView):
    """Admin: View system activity logs (approval history)."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        offset = (page - 1) * page_size

        logs = NoteApproval.objects.select_related('note', 'admin').order_by('-created_at')
        total = logs.count()
        logs_page = logs[offset:offset + page_size]

        data = [
            {
                'id': log.id,
                'note_title': log.note.title,
                'note_id': log.note.id,
                'admin_username': log.admin.username if log.admin else 'System',
                'action': log.action,
                'reason': log.reason,
                'created_at': log.created_at.isoformat(),
            }
            for log in logs_page
        ]

        return Response({
            'logs': data,
            'total': total,
            'page': page,
            'page_size': page_size,
        })
