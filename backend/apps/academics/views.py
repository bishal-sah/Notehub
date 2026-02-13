"""
Views for academic structure management (Faculty, Semester, Subject).
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.academics.models import Faculty, Semester, Subject
from apps.academics.serializers import (
    FacultySerializer,
    FacultyDetailSerializer,
    SemesterSerializer,
    SemesterListSerializer,
    SubjectSerializer,
    AdminFacultySerializer,
    AdminSemesterSerializer,
    AdminSubjectSerializer,
)


# ─── Public Views ────────────────────────────────────────

class FacultyListView(generics.ListAPIView):
    """List all active faculties."""
    serializer_class = FacultySerializer
    permission_classes = [permissions.AllowAny]
    queryset = Faculty.objects.filter(is_active=True)
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    pagination_class = None


class FacultyDetailView(generics.RetrieveAPIView):
    """Get faculty details with semesters and subjects."""
    serializer_class = FacultyDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Faculty.objects.filter(is_active=True)
    lookup_field = 'slug'


class SemesterListView(generics.ListAPIView):
    """List semesters, optionally filtered by faculty."""
    serializer_class = SemesterListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['faculty']
    pagination_class = None

    def get_queryset(self):
        return Semester.objects.filter(is_active=True).select_related('faculty')


class SemesterDetailView(generics.RetrieveAPIView):
    """Get semester details with subjects."""
    serializer_class = SemesterSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Semester.objects.filter(is_active=True).prefetch_related('subjects')


class SubjectListView(generics.ListAPIView):
    """List subjects, optionally filtered by semester."""
    serializer_class = SubjectSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['semester', 'semester__faculty']
    search_fields = ['name', 'code']
    pagination_class = None

    def get_queryset(self):
        return Subject.objects.filter(is_active=True).select_related('semester__faculty')


class SubjectDetailView(generics.RetrieveAPIView):
    """Get subject details."""
    serializer_class = SubjectSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Subject.objects.filter(is_active=True).select_related('semester__faculty')


# ─── Admin Views ────────────────────────────────────────

class AdminFacultyListCreateView(generics.ListCreateAPIView):
    """Admin: List all faculties or create a new one."""
    serializer_class = AdminFacultySerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Faculty.objects.all()
    search_fields = ['name']


class AdminFacultyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: Get, update, or delete a faculty."""
    serializer_class = AdminFacultySerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Faculty.objects.all()


class AdminSemesterListCreateView(generics.ListCreateAPIView):
    """Admin: List all semesters or create a new one."""
    serializer_class = AdminSemesterSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Semester.objects.all()
    filterset_fields = ['faculty']


class AdminSemesterDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: Get, update, or delete a semester."""
    serializer_class = AdminSemesterSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Semester.objects.all()


class AdminSubjectListCreateView(generics.ListCreateAPIView):
    """Admin: List all subjects or create a new one."""
    serializer_class = AdminSubjectSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Subject.objects.all()
    filterset_fields = ['semester', 'semester__faculty']
    search_fields = ['name', 'code']


class AdminSubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: Get, update, or delete a subject."""
    serializer_class = AdminSubjectSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Subject.objects.all()


# ─── Semester Roadmap Planner ──────────────────────────────────

from rest_framework.views import APIView
from django.db.models import Count, Q, Avg
from apps.academics.models import SubjectProgress


class SemesterRoadmapView(APIView):
    """
    GET /api/academics/roadmap/?faculty=<id>&semester=<id>
    Returns subjects for the selected semester with:
      - available note counts
      - user's progress (if authenticated)
      - suggested study timeline based on credit hours
      - overall semester completion %
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        faculty_id = request.query_params.get('faculty')
        semester_id = request.query_params.get('semester')

        if not semester_id:
            return Response(
                {'error': 'semester query param is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            sem = Semester.objects.select_related('faculty').get(
                pk=semester_id, is_active=True,
            )
        except Semester.DoesNotExist:
            return Response({'error': 'Semester not found.'}, status=status.HTTP_404_NOT_FOUND)

        subjects = Subject.objects.filter(
            semester=sem, is_active=True,
        ).order_by('name')

        # Get user progress if authenticated
        progress_map = {}
        if request.user.is_authenticated:
            progress_qs = SubjectProgress.objects.filter(
                user=request.user,
                subject__in=subjects,
            )
            progress_map = {p.subject_id: p for p in progress_qs}

        # Build timeline: distribute weeks across subjects proportionally by credit hours
        total_credits = sum(s.credit_hours for s in subjects) or 1
        # Assume a ~16-week semester
        total_weeks = 16
        week_cursor = 1

        subject_list = []
        for subj in subjects:
            # Calculate weeks for this subject
            weeks_alloc = max(1, round((subj.credit_hours / total_credits) * total_weeks))
            start_week = week_cursor
            end_week = min(week_cursor + weeks_alloc - 1, total_weeks)
            week_cursor = end_week + 1

            # Note count
            note_count = subj.notes.filter(status='approved').count()

            # User progress
            prog = progress_map.get(subj.id)
            progress_data = None
            if prog:
                progress_data = {
                    'percent_complete': prog.percent_complete,
                    'status': prog.status,
                    'notes_studied': prog.notes_studied,
                    'target_date': prog.target_date,
                    'notes_text': prog.notes_text,
                    'updated_at': prog.updated_at,
                }

            subject_list.append({
                'id': subj.id,
                'name': subj.name,
                'slug': subj.slug,
                'code': subj.code,
                'description': subj.description,
                'credit_hours': subj.credit_hours,
                'note_count': note_count,
                'timeline': {
                    'start_week': start_week,
                    'end_week': end_week,
                    'weeks': weeks_alloc,
                },
                'progress': progress_data,
            })

        # Overall semester stats
        total_subjects = len(subject_list)
        if request.user.is_authenticated and progress_map:
            completed = sum(1 for p in progress_map.values() if p.status == 'completed')
            in_progress = sum(1 for p in progress_map.values() if p.status == 'in_progress')
            avg_percent = (
                sum(p.percent_complete for p in progress_map.values()) / total_subjects
                if total_subjects > 0 else 0
            )
        else:
            completed = 0
            in_progress = 0
            avg_percent = 0

        return Response({
            'semester': {
                'id': sem.id,
                'number': sem.number,
                'name': sem.name,
                'faculty_id': sem.faculty.id,
                'faculty_name': sem.faculty.name,
                'faculty_slug': sem.faculty.slug,
            },
            'subjects': subject_list,
            'stats': {
                'total_subjects': total_subjects,
                'completed': completed,
                'in_progress': in_progress,
                'not_started': total_subjects - completed - in_progress,
                'overall_percent': round(avg_percent, 1),
                'total_notes': sum(s['note_count'] for s in subject_list),
            },
        })


class SubjectProgressUpdateView(APIView):
    """
    POST /api/academics/roadmap/progress/
    Body: {
      "subject_id": 5,
      "percent_complete": 60,
      "status": "in_progress",   // optional, auto-derived if not given
      "notes_studied": 3,        // optional
      "target_date": "2026-04-15", // optional
      "notes_text": "Focus on ch 3-5" // optional
    }
    Creates or updates the user's progress for a subject.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subject_id = request.data.get('subject_id')
        if not subject_id:
            return Response({'error': 'subject_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subject = Subject.objects.get(pk=subject_id, is_active=True)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found.'}, status=status.HTTP_404_NOT_FOUND)

        percent = request.data.get('percent_complete', 0)
        try:
            percent = max(0, min(100, int(percent)))
        except (ValueError, TypeError):
            percent = 0

        # Auto-derive status from percent if not explicitly given
        explicit_status = request.data.get('status')
        if explicit_status and explicit_status in dict(SubjectProgress.Status.choices):
            prog_status = explicit_status
        else:
            if percent >= 100:
                prog_status = 'completed'
            elif percent > 0:
                prog_status = 'in_progress'
            else:
                prog_status = 'not_started'

        progress, created = SubjectProgress.objects.update_or_create(
            user=request.user,
            subject=subject,
            defaults={
                'percent_complete': percent,
                'status': prog_status,
                'notes_studied': request.data.get('notes_studied', 0) or 0,
                'target_date': request.data.get('target_date') or None,
                'notes_text': (request.data.get('notes_text', '') or '')[:500],
            },
        )

        return Response({
            'message': 'Progress updated.',
            'progress': {
                'subject_id': subject.id,
                'subject_name': subject.name,
                'percent_complete': progress.percent_complete,
                'status': progress.status,
                'notes_studied': progress.notes_studied,
                'target_date': progress.target_date,
                'notes_text': progress.notes_text,
                'updated_at': progress.updated_at,
            },
        }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
