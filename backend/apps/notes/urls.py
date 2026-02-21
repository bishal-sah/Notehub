"""
URL routes for the notes app.
"""
from django.urls import path
from apps.notes.views import (
    PublicNoteListView,
    PublicNoteDetailView,
    NoteDownloadView,
    NoteFilePreviewView,
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
    NoteCommentListView,
    NoteCommentCreateView,
    NoteCommentUpdateView,
    CommentVoteToggleView,
    CommentBestAnswerView,
    NoteAnnotationListView,
    NoteAnnotationCreateView,
    NoteAnnotationUpdateView,
    NoteRatingListView,
    NoteRatingCreateView,
    NoteRatingDeleteView,
    NoteMyRatingView,
    CollectionListCreateView,
    CollectionDetailView,
    CollectionBookmarksView,
    BookmarkToggleView,
    BookmarkStatusView,
    BookmarkMoveView,
    BookmarkUpdateView,
    AllBookmarksView,
    GenerateFlashcardsView,
    MyDecksView,
    DeckDetailView,
    DeckDueCardsView,
    ReviewCardView,
    EditCardView,
    NoteVersionListView,
    NoteVersionDetailView,
    VersionDiffView,
    RestoreVersionView,
    OcrUploadView,
    OcrStatusView,
    OcrRetryView,
    OcrSearchView,
    NoteLayerListView,
    NoteLayerCreateView,
    NoteLayerDetailView,
    NoteLayerVoteView,
    NoteLayerPinView,
    NoteSummaryView,
    ExamModeView,
    SemesterPackListView,
    SemesterPackDownloadView,
    ConceptSimplifyView,
    TestGeneratorView,
    TopperVerifyView,
    TopperStatusView,
    ChatSessionListView,
    ChatSessionDetailView,
    ChatSendMessageView,
    ChatClearAllView,
    PersonalNoteListCreateView,
    PersonalNoteDetailView,
    PersonalNotePinToggleView,
    PersonalNoteArchiveToggleView,
    PersonalNoteExportView,
)

urlpatterns = [
    # Public
    path('', PublicNoteListView.as_view(), name='note-list'),
    path('search/', SemanticSearchView.as_view(), name='note-search'),

    # AI Concept Simplifier (must be above <slug:slug>/ catch-all)
    path('simplify/', ConceptSimplifyView.as_view(), name='concept-simplify'),

    # Semester Packs (must be above <slug:slug>/ catch-all)
    path('semester-packs/', SemesterPackListView.as_view(), name='semester-pack-list'),
    path('semester-packs/<int:semester_id>/download/', SemesterPackDownloadView.as_view(), name='semester-pack-download'),

    # Personal Notes (must be above <slug:slug>/ catch-all)
    path('personal/', PersonalNoteListCreateView.as_view(), name='personal-notes'),
    path('personal/<int:pk>/', PersonalNoteDetailView.as_view(), name='personal-note-detail'),
    path('personal/<int:pk>/pin/', PersonalNotePinToggleView.as_view(), name='personal-note-pin'),
    path('personal/<int:pk>/archive/', PersonalNoteArchiveToggleView.as_view(), name='personal-note-archive'),
    path('personal/<int:pk>/export/', PersonalNoteExportView.as_view(), name='personal-note-export'),

    path('<slug:slug>/', PublicNoteDetailView.as_view(), name='note-detail'),
    path('<slug:slug>/download/', NoteDownloadView.as_view(), name='note-download'),
    path('<slug:slug>/preview/', NoteFilePreviewView.as_view(), name='note-preview'),

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

    # Comments & Discussion
    path('<slug:slug>/comments/', NoteCommentListView.as_view(), name='note-comments'),
    path('comments/create/', NoteCommentCreateView.as_view(), name='comment-create'),
    path('comments/<int:pk>/', NoteCommentUpdateView.as_view(), name='comment-update'),
    path('comments/<int:pk>/vote/', CommentVoteToggleView.as_view(), name='comment-vote'),
    path('comments/<int:pk>/best-answer/', CommentBestAnswerView.as_view(), name='comment-best-answer'),

    # Annotations
    path('<slug:slug>/annotations/', NoteAnnotationListView.as_view(), name='note-annotations'),
    path('annotations/create/', NoteAnnotationCreateView.as_view(), name='annotation-create'),
    path('annotations/<int:pk>/', NoteAnnotationUpdateView.as_view(), name='annotation-update'),

    # Ratings & Reviews
    path('<slug:slug>/ratings/', NoteRatingListView.as_view(), name='note-ratings'),
    path('<slug:slug>/my-rating/', NoteMyRatingView.as_view(), name='note-my-rating'),
    path('ratings/create/', NoteRatingCreateView.as_view(), name='rating-create'),
    path('ratings/<int:pk>/', NoteRatingDeleteView.as_view(), name='rating-delete'),

    # Bookmarks & Collections
    path('collections/', CollectionListCreateView.as_view(), name='collection-list-create'),
    path('collections/<int:pk>/', CollectionDetailView.as_view(), name='collection-detail'),
    path('collections/<int:pk>/bookmarks/', CollectionBookmarksView.as_view(), name='collection-bookmarks'),
    path('bookmarks/', AllBookmarksView.as_view(), name='all-bookmarks'),
    path('bookmarks/toggle/', BookmarkToggleView.as_view(), name='bookmark-toggle'),
    path('bookmarks/status/<int:note_id>/', BookmarkStatusView.as_view(), name='bookmark-status'),
    path('bookmarks/move/', BookmarkMoveView.as_view(), name='bookmark-move'),
    path('bookmarks/<int:pk>/', BookmarkUpdateView.as_view(), name='bookmark-update'),

    # Flashcards
    path('flashcards/generate/', GenerateFlashcardsView.as_view(), name='flashcard-generate'),
    path('flashcards/decks/', MyDecksView.as_view(), name='flashcard-decks'),
    path('flashcards/decks/<int:pk>/', DeckDetailView.as_view(), name='flashcard-deck-detail'),
    path('flashcards/decks/<int:pk>/due/', DeckDueCardsView.as_view(), name='flashcard-deck-due'),
    path('flashcards/cards/<int:card_id>/review/', ReviewCardView.as_view(), name='flashcard-review'),
    path('flashcards/cards/<int:card_id>/', EditCardView.as_view(), name='flashcard-card-edit'),

    # Version History
    path('<int:note_id>/versions/', NoteVersionListView.as_view(), name='note-versions'),
    path('<int:note_id>/versions/<int:version_id>/', NoteVersionDetailView.as_view(), name='note-version-detail'),
    path('<int:note_id>/versions/diff/', VersionDiffView.as_view(), name='note-version-diff'),
    path('<int:note_id>/versions/<int:version_id>/restore/', RestoreVersionView.as_view(), name='note-version-restore'),

    # OCR
    path('ocr/upload/', OcrUploadView.as_view(), name='ocr-upload'),
    path('ocr/status/<int:note_id>/', OcrStatusView.as_view(), name='ocr-status'),
    path('ocr/retry/', OcrRetryView.as_view(), name='ocr-retry'),
    path('ocr/search/', OcrSearchView.as_view(), name='ocr-search'),

    # Collaborative Layers
    path('<slug:slug>/layers/', NoteLayerListView.as_view(), name='note-layers'),
    path('<slug:slug>/layers/create/', NoteLayerCreateView.as_view(), name='layer-create'),
    path('layers/<int:pk>/', NoteLayerDetailView.as_view(), name='layer-detail'),
    path('layers/<int:pk>/vote/', NoteLayerVoteView.as_view(), name='layer-vote'),
    path('layers/<int:pk>/pin/', NoteLayerPinView.as_view(), name='layer-pin'),

    # AI Summary
    path('<slug:slug>/summary/', NoteSummaryView.as_view(), name='note-summary'),

    # Exam Mode
    path('<slug:slug>/exam-mode/', ExamModeView.as_view(), name='note-exam-mode'),

    # Topper Verification
    path('<slug:slug>/topper-verify/', TopperVerifyView.as_view(), name='note-topper-verify'),
    path('<slug:slug>/topper-status/', TopperStatusView.as_view(), name='note-topper-status'),

    # Instant Test Generator
    path('<slug:slug>/generate-test/', TestGeneratorView.as_view(), name='note-generate-test'),

    # AI Study Assistant
    path('chat/sessions/', ChatSessionListView.as_view(), name='chat-sessions'),
    path('chat/sessions/<int:pk>/', ChatSessionDetailView.as_view(), name='chat-session-detail'),
    path('chat/sessions/<int:pk>/send/', ChatSendMessageView.as_view(), name='chat-send'),
    path('chat/clear/', ChatClearAllView.as_view(), name='chat-clear-all'),

]
