"""
Celery tasks for async email notifications.
- Note approval/rejection emails
- Weekly faculty digest
- Password reset emails
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _email_context(**extra):
    """Base context for all email templates."""
    ctx = {
        'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
        'year': timezone.now().year,
    }
    ctx.update(extra)
    return ctx


# ─── Note Approval / Rejection ────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_note_approval_email(self, note_id, action, reason=''):
    """Send email when a note is approved or rejected."""
    try:
        from apps.notes.models import Note
        note = Note.objects.select_related('author', 'subject').get(pk=note_id)
        user = note.author
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

        if action == 'approved':
            template = 'emails/note_approved.html'
            subject_line = f'✅ Your note "{note.title}" has been approved!'
            context = _email_context(
                user_name=user.full_name,
                note_title=note.title,
                note_subject=note.subject.name if note.subject else 'N/A',
                note_date=note.created_at.strftime('%b %d, %Y'),
                note_url=f'{frontend_url}/notes/{note.slug}',
            )
        else:
            template = 'emails/note_rejected.html'
            subject_line = f'Note "{note.title}" needs changes'
            context = _email_context(
                user_name=user.full_name,
                note_title=note.title,
                note_subject=note.subject.name if note.subject else 'N/A',
                note_date=note.created_at.strftime('%b %d, %Y'),
                reason=reason,
                edit_url=f'{frontend_url}/dashboard/my-notes',
            )

        html_message = render_to_string(template, context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject_line,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Approval email sent to {user.email} for note #{note_id} ({action})")

    except Exception as exc:
        logger.exception(f"Failed to send approval email for note #{note_id}")
        raise self.retry(exc=exc)


# ─── Weekly Faculty Digest ─────────────────────────────────

@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def send_weekly_digest(self):
    """Send weekly digest of new notes to all users, grouped by their faculty."""
    try:
        from django.contrib.auth import get_user_model
        from apps.notes.models import Note

        User = get_user_model()
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        one_week_ago = timezone.now() - timedelta(days=7)

        # Get all faculties that have active users
        users_with_faculty = User.objects.filter(
            is_active=True,
            faculty__isnull=False,
        ).select_related('faculty')

        # Group users by faculty
        faculty_users = {}
        for user in users_with_faculty:
            fid = user.faculty_id
            if fid not in faculty_users:
                faculty_users[fid] = {
                    'faculty_name': user.faculty.name,
                    'users': [],
                }
            faculty_users[fid]['users'].append(user)

        sent_count = 0
        for fid, data in faculty_users.items():
            # Get new approved notes for this faculty
            notes = Note.objects.filter(
                status='approved',
                created_at__gte=one_week_ago,
                subject__semester__faculty_id=fid,
            ).select_related('author', 'subject').order_by('-created_at')[:15]

            notes_data = [
                {
                    'title': n.title,
                    'subject': n.subject.name if n.subject else 'N/A',
                    'author': n.author.full_name,
                    'file_type': n.file_type,
                }
                for n in notes
            ]

            for user in data['users']:
                context = _email_context(
                    user_name=user.full_name,
                    faculty_name=data['faculty_name'],
                    notes=notes_data,
                    browse_url=f'{frontend_url}/browse',
                )
                html_message = render_to_string('emails/weekly_digest.html', context)
                plain_message = strip_tags(html_message)

                try:
                    send_mail(
                        subject=f'📚 Weekly Notes Digest — {data["faculty_name"]}',
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    sent_count += 1
                except Exception as e:
                    logger.warning(f"Digest email failed for {user.email}: {e}")

        logger.info(f"Weekly digest sent to {sent_count} users")
        return f"Sent {sent_count} digest emails"

    except Exception as exc:
        logger.exception("Weekly digest task failed")
        raise self.retry(exc=exc)


# ─── Password Reset ───────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_password_reset_email(self, user_id, token, expiry_hours=24):
    """Send password reset email with token."""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(pk=user_id)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

        reset_url = f'{frontend_url}/reset-password?token={token}&email={user.email}'

        context = _email_context(
            user_name=user.full_name,
            reset_url=reset_url,
            token=token,
            expiry_hours=expiry_hours,
        )
        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject='Reset your NoteHub password',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {user.email}")

    except Exception as exc:
        logger.exception(f"Failed to send password reset email for user #{user_id}")
        raise self.retry(exc=exc)
