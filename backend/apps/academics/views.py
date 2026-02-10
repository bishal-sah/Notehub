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
