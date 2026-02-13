"""
Models for the study groups app: groups, memberships, messages, and pinned notes.
"""
import uuid
from django.db import models
from django.conf import settings


class StudyGroup(models.Model):
    """An invite-only study group / sharing room."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    subject = models.ForeignKey(
        'academics.Subject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='study_groups',
        help_text='Optional subject this group is focused on',
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_groups',
    )
    invite_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    avatar_color = models.CharField(
        max_length=7, default='#6366f1',
        help_text='Hex color for the group avatar',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        return self.memberships.count()


class GroupMembership(models.Model):
    """Tracks which users belong to which groups and their role."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        MEMBER = 'member', 'Member'

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='group_memberships',
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.group.name} ({self.role})"


class GroupMessage(models.Model):
    """A chat message within a study group."""

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='group_messages',
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author.username}: {self.content[:50]}"


class GroupPinnedNote(models.Model):
    """A note pinned/shared to a study group."""

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='pinned_notes',
    )
    note = models.ForeignKey(
        'notes.Note',
        on_delete=models.CASCADE,
        related_name='group_pins',
    )
    pinned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='group_pinned_notes',
    )
    comment = models.CharField(max_length=300, blank=True, help_text='Why this note is pinned')
    pinned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'note')
        ordering = ['-pinned_at']

    def __str__(self):
        return f"'{self.note.title}' pinned in {self.group.name}"
