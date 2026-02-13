"""
Models for the resources app: internship resources, project ideas,
interview Q&A, and viva questions.
"""
from django.db import models
from django.conf import settings


class Resource(models.Model):
    """A community-contributed resource entry."""

    class Category(models.TextChoices):
        INTERNSHIP = 'internship', 'Internship Resources'
        PROJECT_IDEAS = 'project_ideas', 'Project Ideas'
        INTERVIEW_QA = 'interview_qa', 'Interview Q&A'
        VIVA = 'viva', 'Viva Questions'

    class Difficulty(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'

    title = models.CharField(max_length=300)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, db_index=True)
    difficulty = models.CharField(
        max_length=15,
        choices=Difficulty.choices,
        default=Difficulty.BEGINNER,
    )
    tags = models.CharField(max_length=500, blank=True, help_text='Comma-separated tags')
    link = models.URLField(blank=True, help_text='External link (optional)')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resources',
    )
    faculty = models.ForeignKey(
        'academics.Faculty',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resources',
    )
    is_approved = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0)
    upvotes_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_category_display()}] {self.title}"

    @property
    def tags_list(self):
        return [t.strip() for t in self.tags.split(',') if t.strip()] if self.tags else []


class ResourceUpvote(models.Model):
    """Tracks upvotes on resources (one per user per resource)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resource_upvotes',
    )
    resource = models.ForeignKey(
        Resource,
        on_delete=models.CASCADE,
        related_name='upvotes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'resource')

    def __str__(self):
        return f"{self.user} upvoted {self.resource.title}"
