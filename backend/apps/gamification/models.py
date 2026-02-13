"""
Gamification models: points, badges, and leaderboard support.
"""
from django.db import models
from django.conf import settings


class PointTransaction(models.Model):
    """Individual point-earning event for a user."""

    class Reason(models.TextChoices):
        NOTE_UPLOADED = 'note_uploaded', 'Note Uploaded'
        NOTE_APPROVED = 'note_approved', 'Note Approved'
        DOWNLOAD_RECEIVED = 'download_received', 'Download Received'
        VIEW_RECEIVED = 'view_received', 'View Received (milestone)'
        COMMENT_POSTED = 'comment_posted', 'Comment Posted'
        FIRST_UPLOAD = 'first_upload', 'First Upload Bonus'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='point_transactions',
    )
    points = models.IntegerField()
    reason = models.CharField(max_length=30, choices=Reason.choices)
    description = models.CharField(max_length=255, blank=True)
    # Optional FK to the note that triggered this
    note = models.ForeignKey(
        'notes.Note',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} +{self.points} ({self.reason})"


class UserPoints(models.Model):
    """Aggregate point balance per user — denormalized for fast leaderboard queries."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='points',
    )
    total_points = models.PositiveIntegerField(default=0)
    upload_count = models.PositiveIntegerField(default=0)
    downloads_received = models.PositiveIntegerField(default=0)
    views_received = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    ratings_received = models.PositiveIntegerField(default=0)
    five_star_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'User points'

    def __str__(self):
        return f"{self.user.username}: {self.total_points} pts"


class Badge(models.Model):
    """Badge definition — earned when user hits a threshold."""

    class Category(models.TextChoices):
        UPLOAD = 'upload', 'Upload'
        DOWNLOAD = 'download', 'Download'
        ENGAGEMENT = 'engagement', 'Engagement'
        SPECIAL = 'special', 'Special'

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, help_text='Lucide icon name')
    color = models.CharField(max_length=7, default='#F59E0B', help_text='Hex color')
    category = models.CharField(max_length=15, choices=Category.choices)
    # Threshold: the counter value needed to earn this badge
    threshold_field = models.CharField(
        max_length=30,
        help_text='UserPoints field to check, e.g. upload_count, downloads_received',
    )
    threshold_value = models.PositiveIntegerField(
        help_text='Value that field must reach to earn badge',
    )
    points_reward = models.PositiveIntegerField(
        default=0,
        help_text='Bonus points awarded when badge is earned',
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    """M2M through: records when a user earned a badge."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earned_badges',
    )
    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name='holders',
    )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')
        ordering = ['-earned_at']

    def __str__(self):
        return f"{self.user.username} earned '{self.badge.name}'"
