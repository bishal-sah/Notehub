"""
Models for the notes app: Note, NoteApproval, and related models.
"""
from django.db import models
from django.conf import settings


class Note(models.Model):
    """Represents an academic note uploaded by a user."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    class FileType(models.TextChoices):
        PDF = 'pdf', 'PDF'
        DOC = 'doc', 'DOC'
        DOCX = 'docx', 'DOCX'
        PPT = 'ppt', 'PPT'
        PPTX = 'pptx', 'PPTX'
        JPG = 'jpg', 'JPG'
        JPEG = 'jpeg', 'JPEG'
        PNG = 'png', 'PNG'

    class OcrStatus(models.TextChoices):
        NONE = 'none', 'None'
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='notes/%Y/%m/')
    file_type = models.CharField(max_length=10, choices=FileType.choices)
    file_size = models.PositiveBigIntegerField(default=0, help_text='File size in bytes')
    thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)

    # Academic categorization
    subject = models.ForeignKey(
        'academics.Subject',
        on_delete=models.CASCADE,
        related_name='notes',
    )

    # Author
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes',
    )

    # Status & moderation
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    rejection_reason = models.TextField(blank=True)

    # Metrics
    views_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)

    # AI / Duplicate detection
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    text_content = models.TextField(blank=True, help_text='Extracted text for search/AI')

    # AI Summary
    ai_summary = models.TextField(blank=True, help_text='Auto-generated summary of the note')
    summary_generated_at = models.DateTimeField(null=True, blank=True, help_text='When the summary was last generated')

    # OCR / Handwritten notes
    is_handwritten = models.BooleanField(default=False, help_text='Whether this note is a scanned/photographed handwritten note')
    ocr_status = models.CharField(
        max_length=10,
        choices=OcrStatus.choices,
        default=OcrStatus.NONE,
        help_text='Status of OCR text extraction',
    )
    ocr_text = models.TextField(blank=True, help_text='Text extracted via OCR')
    ocr_confidence = models.FloatField(null=True, blank=True, help_text='Average OCR confidence score 0-100')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def faculty(self):
        return self.subject.semester.faculty

    @property
    def semester(self):
        return self.subject.semester

    @property
    def file_size_display(self):
        """Return human-readable file size."""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


class NoteApproval(models.Model):
    """Tracks the approval/rejection history of a note."""

    class Action(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='approvals',
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='approval_actions',
    )
    action = models.CharField(max_length=10, choices=Action.choices)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.note.title} - {self.action} by {self.admin}"


class NoteReport(models.Model):
    """Reports filed against notes by users."""

    class Reason(models.TextChoices):
        INAPPROPRIATE = 'inappropriate', 'Inappropriate Content'
        DUPLICATE = 'duplicate', 'Duplicate Note'
        COPYRIGHT = 'copyright', 'Copyright Violation'
        SPAM = 'spam', 'Spam'
        OTHER = 'other', 'Other'

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='reports',
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='filed_reports',
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    description = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report on '{self.note.title}' - {self.reason}"


class NoteComment(models.Model):
    """Threaded comment on a note — supports parent-child replies, upvotes, Q&A."""

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_comments',
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
    )
    body = models.TextField()
    is_question = models.BooleanField(
        default=False,
        help_text='Whether this comment is a question / doubt',
    )
    is_best_answer = models.BooleanField(
        default=False,
        help_text='Marked as best answer by the note author',
    )
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on '{self.note.title}'"

    @property
    def reply_count(self):
        return self.replies.filter(is_deleted=False).count()

    @property
    def vote_count(self):
        return self.comment_votes.count()


class CommentVote(models.Model):
    """Upvote on a comment — one per user per comment."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_votes',
    )
    comment = models.ForeignKey(
        NoteComment,
        on_delete=models.CASCADE,
        related_name='comment_votes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'comment')

    def __str__(self):
        return f"{self.user.username} upvoted comment #{self.comment_id}"


class NoteAnnotation(models.Model):
    """Highlight-based annotation tied to a specific page and position in a note."""

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='annotations',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_annotations',
    )
    page_number = models.PositiveIntegerField()
    # Highlight rectangle as percentages (0-100) relative to the page
    x = models.FloatField(help_text='X position (% from left)')
    y = models.FloatField(help_text='Y position (% from top)')
    width = models.FloatField(help_text='Width (% of page)')
    height = models.FloatField(help_text='Height (% of page)')
    # Optional selected text that was highlighted
    selected_text = models.TextField(blank=True)
    # Annotation content
    body = models.TextField()
    color = models.CharField(max_length=7, default='#FBBF24', help_text='Hex color for highlight')
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['page_number', 'y', 'x']

    def __str__(self):
        return f"Annotation p{self.page_number} by {self.author} on '{self.note.title}'"


class NoteRating(models.Model):
    """Star rating (1-5) with optional written review on a note."""

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='ratings',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_ratings',
    )
    rating = models.PositiveSmallIntegerField(
        help_text='Star rating 1-5',
    )
    review = models.TextField(blank=True, help_text='Optional written review')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('note', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} rated '{self.note.title}' {self.rating}★"


class Collection(models.Model):
    """User-created collection for organizing bookmarked notes."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='collections',
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(
        default=False,
        help_text='Every user has one default "All Bookmarks" collection',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['is_default', '-updated_at']
        unique_together = ('user', 'name')

    def __str__(self):
        return f"{self.user.username} / {self.name}"

    @property
    def note_count(self):
        return self.bookmarks.count()


class Bookmark(models.Model):
    """A bookmarked note, optionally placed into one or more collections."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookmarks',
    )
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='bookmarks',
    )
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name='bookmarks',
        null=True,
        blank=True,
    )
    personal_note = models.TextField(
        blank=True,
        max_length=2000,
        help_text='Personal notes or highlights for this bookmark',
    )
    highlight_color = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Color tag: yellow, green, blue, red, purple, or empty',
    )
    is_offline = models.BooleanField(
        default=False,
        help_text='Whether the user has saved this note for offline reading',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'note', 'collection')

    def __str__(self):
        col = self.collection.name if self.collection else 'uncategorized'
        return f"{self.user.username} bookmarked '{self.note.title}' in {col}"


class FlashcardDeck(models.Model):
    """A deck of flashcards auto-generated from a note."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        READY = 'ready', 'Ready'
        FAILED = 'failed', 'Failed'

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='flashcard_decks',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcard_decks',
    )
    title = models.CharField(max_length=300)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    card_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.card_count} cards)"


class Flashcard(models.Model):
    """A single Q&A flashcard belonging to a deck."""

    deck = models.ForeignKey(
        FlashcardDeck,
        on_delete=models.CASCADE,
        related_name='cards',
    )
    question = models.TextField()
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)

    # Spaced-repetition fields (SM-2 inspired)
    ease_factor = models.FloatField(default=2.5, help_text='Easiness factor (SM-2)')
    interval_days = models.PositiveIntegerField(default=0, help_text='Current interval in days')
    repetitions = models.PositiveIntegerField(default=0, help_text='Consecutive correct answers')
    next_review = models.DateTimeField(null=True, blank=True, help_text='When this card is next due')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q: {self.question[:60]}"


class FlashcardReview(models.Model):
    """Records each review attempt on a flashcard."""

    class Quality(models.IntegerChoices):
        WRONG = 0, 'Wrong'
        HARD = 3, 'Hard'
        CORRECT = 4, 'Correct'
        EASY = 5, 'Easy'

    card = models.ForeignKey(
        Flashcard,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcard_reviews',
    )
    quality = models.PositiveSmallIntegerField(choices=Quality.choices)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reviewed_at']

    def __str__(self):
        return f"{self.user.username} reviewed card {self.card_id} q={self.quality}"


class NoteVersion(models.Model):
    """Snapshot of a note at a point in time, created before each edit."""

    class ChangeType(models.TextChoices):
        CREATED = 'created', 'Created'
        EDITED = 'edited', 'Edited'
        FILE_REPLACED = 'file_replaced', 'File Replaced'
        RESTORED = 'restored', 'Restored'

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='versions',
    )
    version_number = models.PositiveIntegerField()
    change_type = models.CharField(
        max_length=20, choices=ChangeType.choices, default=ChangeType.EDITED,
    )
    change_summary = models.CharField(max_length=500, blank=True)

    # Snapshot of note fields at this version
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='note_versions/%Y/%m/', blank=True)
    file_type = models.CharField(max_length=10, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    subject = models.ForeignKey(
        'academics.Subject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='note_versions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('note', 'version_number')

    def __str__(self):
        return f"{self.note.title} v{self.version_number} ({self.change_type})"


class NoteLayer(models.Model):
    """
    A community-contributed layer on top of an existing note.
    The original note stays untouched — layers add clarifications,
    examples, or alternate explanations on top.
    """

    class LayerType(models.TextChoices):
        CLARIFICATION = 'clarification', 'Clarification'
        EXAMPLE = 'example', 'Example'
        EXPLANATION = 'explanation', 'Alternate Explanation'
        SUMMARY = 'summary', 'Summary'
        CORRECTION = 'correction', 'Correction'
        RESOURCE = 'resource', 'Additional Resource'

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='layers',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_layers',
    )
    layer_type = models.CharField(
        max_length=20,
        choices=LayerType.choices,
        default=LayerType.CLARIFICATION,
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    upvotes = models.PositiveIntegerField(default=0)
    downvotes = models.PositiveIntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-upvotes', '-created_at']

    def __str__(self):
        return f"[{self.get_layer_type_display()}] {self.title}"

    @property
    def score(self):
        return self.upvotes - self.downvotes


class NoteLayerVote(models.Model):
    """Tracks individual user votes on layers to prevent duplicate voting."""

    class VoteType(models.TextChoices):
        UP = 'up', 'Upvote'
        DOWN = 'down', 'Downvote'

    layer = models.ForeignKey(
        NoteLayer,
        on_delete=models.CASCADE,
        related_name='votes',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='layer_votes',
    )
    vote_type = models.CharField(max_length=4, choices=VoteType.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('layer', 'user')


class StudySession(models.Model):
    """
    Tracks time a user spends studying a particular note/subject.
    Sessions are recorded when a user views a note — the frontend pings
    periodically to extend the duration while the tab is active.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_sessions',
    )
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='study_sessions',
    )
    subject = models.ForeignKey(
        'academics.Subject',
        on_delete=models.CASCADE,
        related_name='study_sessions',
    )
    duration = models.PositiveIntegerField(
        default=0,
        help_text='Total seconds spent in this session',
    )
    started_at = models.DateTimeField(auto_now_add=True)
    last_ping_at = models.DateTimeField(auto_now=True)
    date = models.DateField(
        help_text='Calendar date of the session (for daily aggregation)',
    )

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'subject']),
        ]

    def __str__(self):
        mins = self.duration // 60
        return f"{self.user.username} — {self.subject.name} — {mins}min on {self.date}"


class TopperVerification(models.Model):
    """
    Tracks when a high-scoring student verifies a note's quality.
    A note is considered "Topper Verified" once it has at least one
    verification from a qualifying topper.

    Topper criteria (any one):
    - User has uploaded ≥ 10 approved notes, OR
    - User's own notes have an average rating ≥ 4.0 (with ≥ 3 ratings), OR
    - User is verified by admin (is_verified=True)
    """
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='topper_verifications',
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='topper_verifications',
    )
    comment = models.TextField(
        blank=True,
        help_text='Optional comment from the topper about why this note is good',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('note', 'verified_by')
        ordering = ['-created_at']

    def __str__(self):
        return f"Topper {self.verified_by.username} verified '{self.note.title}'"


class ChatSession(models.Model):
    """A conversation session between a user and the AI Study Assistant."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions',
    )
    title = models.CharField(max_length=200, default='New Chat')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat #{self.pk} — {self.user.username}"


class ChatMessage(models.Model):
    """A single message in a chat session."""

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"
