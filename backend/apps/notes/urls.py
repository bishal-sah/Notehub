"""
URL routes for the notes app.
"""
from django.urls import path
from apps.notes.views import (
    PublicNoteListView,
    PublicNoteDetailView,
    NoteDownloadView,
    UserNoteListView,
    NoteCreateView,
    NoteUpdateView,
    NoteDeleteView,
    NoteReportCreateView,
    SemanticSearchView,
    DuplicateDetectionView,
    AdminPendingNotesView,
    AdminAllNotesView,
    AdminNoteDetailView,
    AdminApproveRejectView,
    AdminBulkApproveView,
    AdminNoteApprovalHistoryView,
    AdminNoteReportListView,
    AdminResolveReportView,
)

urlpatterns = [
    # Public
    path('', PublicNoteListView.as_view(), name='note-list'),
    path('search/', SemanticSearchView.as_view(), name='note-search'),
    path('<slug:slug>/', PublicNoteDetailView.as_view(), name='note-detail'),
    path('<slug:slug>/download/', NoteDownloadView.as_view(), name='note-download'),

    # Authenticated user
    path('user/my-notes/', UserNoteListView.as_view(), name='my-notes'),
    path('user/upload/', NoteCreateView.as_view(), name='note-upload'),
    path('user/<int:pk>/edit/', NoteUpdateView.as_view(), name='note-edit'),
    path('user/<int:pk>/delete/', NoteDeleteView.as_view(), name='note-delete'),
    path('user/report/', NoteReportCreateView.as_view(), name='note-report'),

    # Admin
    path('admin/pending/', AdminPendingNotesView.as_view(), name='admin-pending-notes'),
    path('admin/all/', AdminAllNotesView.as_view(), name='admin-all-notes'),
    path('admin/<int:pk>/', AdminNoteDetailView.as_view(), name='admin-note-detail'),
    path('admin/<int:pk>/approve/', AdminApproveRejectView.as_view(), name='admin-approve-reject'),
    path('admin/bulk-approve/', AdminBulkApproveView.as_view(), name='admin-bulk-approve'),
    path('admin/approval-history/', AdminNoteApprovalHistoryView.as_view(), name='admin-approval-history'),
    path('admin/reports/', AdminNoteReportListView.as_view(), name='admin-reports'),
    path('admin/reports/<int:pk>/resolve/', AdminResolveReportView.as_view(), name='admin-resolve-report'),
    path('admin/duplicates/', DuplicateDetectionView.as_view(), name='admin-duplicates'),
]
