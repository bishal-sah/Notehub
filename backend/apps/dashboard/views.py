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
from apps.notes.models import Note, NoteApproval, NoteReport, StudySession
from apps.academics.models import Faculty, Semester, Subject

User = get_user_model()


class UserDashboardView(APIView):
    """Dashboard stats for an authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        notes = Note.objects.filter(author=user)
        now = timezone.now()
        ninety_days_ago = now - timedelta(days=90)

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

        # User upload trends (last 90 days, grouped by week)
        from django.db.models.functions import TruncWeek
        upload_trends = list(
            notes.filter(created_at__gte=ninety_days_ago)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        for item in upload_trends:
            item['date'] = item.pop('week').isoformat()

        # Views & downloads over time (last 90 days)
        views_downloads = list(
            notes.filter(created_at__gte=ninety_days_ago)
            .annotate(date=TruncMonth('created_at'))
            .values('date')
            .annotate(
                views=Sum('views_count'),
                downloads=Sum('downloads_count'),
            )
            .order_by('date')
        )
        for item in views_downloads:
            item['date'] = item['date'].isoformat()

        # Notes by status (for pie chart)
        status_distribution = [
            {'name': 'Approved', 'value': approved_notes},
            {'name': 'Pending', 'value': pending_notes},
            {'name': 'Rejected', 'value': rejected_notes},
        ]

        # Top subjects by user uploads
        top_subjects = list(
            notes.filter(subject__isnull=False)
            .values('subject__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )
        for item in top_subjects:
            item['name'] = item.pop('subject__name')

        return Response({
            'stats': {
                'total_notes': total_notes,
                'approved_notes': approved_notes,
                'pending_notes': pending_notes,
                'rejected_notes': rejected_notes,
                'total_views': total_views,
                'total_downloads': total_downloads,
            },
            'charts': {
                'upload_trends': upload_trends,
                'views_downloads': views_downloads,
                'status_distribution': status_distribution,
                'top_subjects': top_subjects,
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

        # Downloads per faculty (bar chart)
        downloads_per_faculty = list(
            Faculty.objects.filter(is_active=True).annotate(
                total_downloads=Sum(
                    'semesters__subjects__notes__downloads_count',
                    filter=Q(semesters__subjects__notes__status='approved')
                )
            ).values('name', 'total_downloads').order_by('-total_downloads')
        )
        for item in downloads_per_faculty:
            item['total_downloads'] = item['total_downloads'] or 0

        # Top subjects (pie chart)
        top_subjects = list(
            Subject.objects.filter(is_active=True).annotate(
                note_count=Count('notes', filter=Q(notes__status='approved'))
            ).filter(note_count__gt=0)
            .values('name', 'note_count')
            .order_by('-note_count')[:10]
        )

        # Note status distribution
        status_distribution = [
            {'name': 'Approved', 'value': approved_notes},
            {'name': 'Pending', 'value': pending_notes},
            {'name': 'Rejected', 'value': rejected_notes},
        ]

        # Monthly upload + download trends (last 6 months)
        six_months_ago = now - timedelta(days=180)
        monthly_trends = list(
            Note.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                uploads=Count('id'),
                views=Sum('views_count'),
                downloads=Sum('downloads_count'),
            )
            .order_by('month')
        )
        for item in monthly_trends:
            item['month'] = item['month'].strftime('%b %Y')

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
                'downloads_per_faculty': downloads_per_faculty,
                'top_subjects': top_subjects,
                'status_distribution': status_distribution,
                'uploads_over_time': uploads_over_time,
                'registrations_over_time': registrations_over_time,
                'monthly_trends': monthly_trends,
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


# ─── Time-Based Learning Tracker ─────────────────────────

class StudySessionPingView(APIView):
    """
    Called by the frontend every ~30s while a user is actively viewing a note.
    Creates or extends a StudySession for that note/user/day.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        note_id = request.data.get('note_id')
        elapsed = int(request.data.get('elapsed', 30))  # seconds since last ping
        elapsed = min(elapsed, 120)  # cap at 2 min per ping to prevent abuse

        if not note_id:
            return Response({'detail': 'note_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            note = Note.objects.select_related('subject').get(pk=note_id)
        except Note.DoesNotExist:
            return Response({'detail': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.localdate()

        # Find or create today's session for this user+note
        session, created = StudySession.objects.get_or_create(
            user=request.user,
            note=note,
            date=today,
            defaults={
                'subject': note.subject,
                'duration': elapsed,
            },
        )
        if not created:
            session.duration += elapsed
            session.save(update_fields=['duration', 'last_ping_at'])

        return Response({
            'session_id': session.id,
            'duration': session.duration,
        })


class LearningStatsView(APIView):
    """
    Returns aggregated study time per subject for the authenticated user.
    Supports ?period=week|month|all (default: week).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        now = timezone.now()

        if period == 'week':
            start = (now - timedelta(days=7)).date()
        elif period == 'month':
            start = (now - timedelta(days=30)).date()
        else:
            start = None

        qs = StudySession.objects.filter(user=request.user)
        if start:
            qs = qs.filter(date__gte=start)

        # Time per subject
        per_subject = list(
            qs.values('subject__id', 'subject__name')
            .annotate(total_seconds=Sum('duration'))
            .order_by('-total_seconds')
        )
        for item in per_subject:
            item['subject_id'] = item.pop('subject__id')
            item['subject_name'] = item.pop('subject__name')

        # Total study time
        total_seconds = sum(s['total_seconds'] for s in per_subject) or 0

        # Daily breakdown (last 7 or 30 days)
        daily = list(
            qs.values('date')
            .annotate(total_seconds=Sum('duration'))
            .order_by('date')
        )
        for item in daily:
            item['date'] = item['date'].isoformat()

        return Response({
            'period': period,
            'total_seconds': total_seconds,
            'per_subject': per_subject,
            'daily': daily,
        })


class WeeklyLearningReportView(APIView):
    """
    Generates a weekly learning report with insights:
    - Time per subject
    - Strongest vs weakest subjects
    - Comparison to previous week
    - Actionable message
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        this_week_start = (now - timedelta(days=7)).date()
        prev_week_start = (now - timedelta(days=14)).date()

        this_week = StudySession.objects.filter(
            user=request.user, date__gte=this_week_start,
        )
        prev_week = StudySession.objects.filter(
            user=request.user,
            date__gte=prev_week_start,
            date__lt=this_week_start,
        )

        # This week per subject
        this_per_subject = list(
            this_week.values('subject__id', 'subject__name')
            .annotate(total_seconds=Sum('duration'))
            .order_by('-total_seconds')
        )
        for s in this_per_subject:
            s['subject_id'] = s.pop('subject__id')
            s['subject_name'] = s.pop('subject__name')

        # Previous week per subject (for comparison)
        prev_per_subject_raw = dict(
            prev_week.values_list('subject__name')
            .annotate(total=Sum('duration'))
            .values_list('subject__name', 'total')
        )

        this_total = sum(s['total_seconds'] for s in this_per_subject) or 0
        prev_total = sum(prev_per_subject_raw.values()) or 0

        # Identify strongest and weakest
        strongest = this_per_subject[0] if this_per_subject else None
        weakest = this_per_subject[-1] if len(this_per_subject) > 1 else None

        # Build comparison
        for s in this_per_subject:
            prev_secs = prev_per_subject_raw.get(s['subject_name'], 0)
            s['prev_week_seconds'] = prev_secs
            if prev_secs > 0:
                s['change_pct'] = round(((s['total_seconds'] - prev_secs) / prev_secs) * 100, 1)
            else:
                s['change_pct'] = None

        # Generate insights
        def fmt_time(secs):
            h, rem = divmod(secs, 3600)
            m = rem // 60
            if h > 0:
                return f"{h}h {m}min"
            return f"{m}min"

        insights = []
        if strongest and weakest and strongest != weakest:
            insights.append(
                f"You spent {fmt_time(strongest['total_seconds'])} on {strongest['subject_name']} "
                f"but only {fmt_time(weakest['total_seconds'])} on {weakest['subject_name']} last week."
            )
        if this_total > prev_total and prev_total > 0:
            pct = round(((this_total - prev_total) / prev_total) * 100)
            insights.append(f"Great work! Your study time increased by {pct}% compared to last week.")
        elif this_total < prev_total and prev_total > 0:
            pct = round(((prev_total - this_total) / prev_total) * 100)
            insights.append(f"Heads up — your study time dropped by {pct}% compared to last week.")
        if this_total == 0:
            insights.append("You haven't logged any study time this week. Open some notes to start tracking!")

        # Daily breakdown for chart
        daily = list(
            this_week.values('date')
            .annotate(total_seconds=Sum('duration'))
            .order_by('date')
        )
        for d in daily:
            d['date'] = d['date'].isoformat()

        return Response({
            'this_week_total': this_total,
            'prev_week_total': prev_total,
            'per_subject': this_per_subject,
            'strongest': strongest,
            'weakest': weakest,
            'insights': insights,
            'daily': daily,
        })
