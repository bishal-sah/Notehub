"""
Signals for the notes app.
Sends notifications when notes are approved/rejected.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.notes.models import NoteApproval


@receiver(post_save, sender=NoteApproval)
def notify_user_on_approval(sender, instance, created, **kwargs):
    """Notify the note author when their note is approved or rejected."""
    if created:
        from apps.users.models import Notification

        note = instance.note
        author = note.author

        if instance.action == 'approved':
            Notification.objects.create(
                user=author,
                title='Note Approved!',
                message=f'Your note "{note.title}" has been approved and is now publicly visible.',
                notification_type=Notification.NotificationType.NOTE_APPROVED,
                link=f'/notes/{note.slug}',
            )
        elif instance.action == 'rejected':
            reason = instance.reason or 'No reason provided.'
            Notification.objects.create(
                user=author,
                title='Note Rejected',
                message=f'Your note "{note.title}" was rejected. Reason: {reason}',
                notification_type=Notification.NotificationType.NOTE_REJECTED,
                link=f'/dashboard/my-notes',
            )
