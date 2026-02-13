"""
Celery configuration for NoteHub.
Sets up the Celery app with Django settings and autodiscovers tasks.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('notehub')

# Read config from Django settings, namespace='CELERY'
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodiscover tasks in all installed apps
app.autodiscover_tasks()

# ─── Celery Beat Schedule ─────────────────────────────────
app.conf.beat_schedule = {
    'weekly-faculty-digest': {
        'task': 'apps.notes.tasks.send_weekly_digest',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Monday 9 AM
        'options': {'queue': 'email'},
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for verifying Celery is running."""
    print(f'Request: {self.request!r}')
