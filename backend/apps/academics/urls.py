"""
URL routes for the academics app.
"""
from django.urls import path
from apps.academics.views import (
    FacultyListView,
    FacultyDetailView,
    SemesterListView,
    SemesterDetailView,
    SubjectListView,
    SubjectDetailView,
    AdminFacultyListCreateView,
    AdminFacultyDetailView,
    AdminSemesterListCreateView,
    AdminSemesterDetailView,
    AdminSubjectListCreateView,
    AdminSubjectDetailView,
    SemesterRoadmapView,
    SubjectProgressUpdateView,
)

urlpatterns = [
    # Public
    path('faculties/', FacultyListView.as_view(), name='faculty-list'),
    path('faculties/<slug:slug>/', FacultyDetailView.as_view(), name='faculty-detail'),
    path('semesters/', SemesterListView.as_view(), name='semester-list'),
    path('semesters/<int:pk>/', SemesterDetailView.as_view(), name='semester-detail'),
    path('subjects/', SubjectListView.as_view(), name='subject-list'),
    path('subjects/<int:pk>/', SubjectDetailView.as_view(), name='subject-detail'),

    # Admin
    path('admin/faculties/', AdminFacultyListCreateView.as_view(), name='admin-faculty-list'),
    path('admin/faculties/<int:pk>/', AdminFacultyDetailView.as_view(), name='admin-faculty-detail'),
    path('admin/semesters/', AdminSemesterListCreateView.as_view(), name='admin-semester-list'),
    path('admin/semesters/<int:pk>/', AdminSemesterDetailView.as_view(), name='admin-semester-detail'),
    path('admin/subjects/', AdminSubjectListCreateView.as_view(), name='admin-subject-list'),
    path('admin/subjects/<int:pk>/', AdminSubjectDetailView.as_view(), name='admin-subject-detail'),

    # Semester Roadmap Planner
    path('roadmap/', SemesterRoadmapView.as_view(), name='semester-roadmap'),
    path('roadmap/progress/', SubjectProgressUpdateView.as_view(), name='subject-progress-update'),
]
