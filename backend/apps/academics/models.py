"""
Models for academic structure: Faculty → Semester → Subject.
"""
from django.db import models


class Faculty(models.Model):
    """Represents an academic faculty/department (e.g., BCA, BIT, BBS)."""
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text='Lucide icon name')
    image = models.ImageField(upload_to='faculties/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Faculties'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def total_notes(self):
        return sum(
            subject.notes.filter(status='approved').count()
            for semester in self.semesters.all()
            for subject in semester.subjects.all()
        )


class Semester(models.Model):
    """Represents a semester within a faculty."""
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name='semesters',
    )
    number = models.PositiveIntegerField()
    name = models.CharField(max_length=100, blank=True, help_text='e.g., "First Semester"')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['faculty', 'number']
        ordering = ['faculty', 'number']

    def __str__(self):
        return f"{self.faculty.name} - Semester {self.number}"

    def save(self, *args, **kwargs):
        if not self.name:
            ordinals = {
                1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth',
                5: 'Fifth', 6: 'Sixth', 7: 'Seventh', 8: 'Eighth',
            }
            self.name = f"{ordinals.get(self.number, str(self.number))} Semester"
        super().save(*args, **kwargs)


class Subject(models.Model):
    """Represents a subject within a semester."""
    semester = models.ForeignKey(
        Semester,
        on_delete=models.CASCADE,
        related_name='subjects',
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    credit_hours = models.PositiveIntegerField(default=3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['semester', 'slug']
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.semester})"

    @property
    def total_notes(self):
        return self.notes.filter(status='approved').count()


class SubjectProgress(models.Model):
    """
    Tracks a user's study progress for a specific subject.
    Used by the Semester Roadmap Planner.
    """

    class Status(models.TextChoices):
        NOT_STARTED = 'not_started', 'Not Started'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='subject_progress',
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='user_progress',
    )
    percent_complete = models.PositiveIntegerField(
        default=0,
        help_text='0-100 syllabus completion percentage',
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.NOT_STARTED,
    )
    notes_studied = models.PositiveIntegerField(default=0)
    target_date = models.DateField(
        null=True,
        blank=True,
        help_text='Target completion date set by user',
    )
    notes_text = models.TextField(
        blank=True,
        max_length=500,
        help_text='Personal notes/reminders for this subject',
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'subject')
        ordering = ['subject__name']

    def __str__(self):
        return f"{self.user.username} — {self.subject.name}: {self.percent_complete}%"
