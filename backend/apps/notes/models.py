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
