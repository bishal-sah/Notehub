"""
Signals for the users app.
Creates notifications when relevant events occur.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(post_save, sender=User)
def welcome_notification(sender, instance, created, **kwargs):
    """Send a welcome notification when a new user registers."""
    if created:
        from apps.users.models import Notification
        Notification.objects.create(
            user=instance,
            title='Welcome to NoteHub!',
            message='Thank you for joining NoteHub. Start browsing notes or upload your own!',
            notification_type=Notification.NotificationType.SYSTEM,
            link='/',
        )
