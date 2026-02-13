"""
Django signals that trigger point awards for gamification events.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notes.models import NoteApproval, NoteComment, NoteRating
from apps.gamification.services import increment_counter, ensure_first_upload_bonus


@receiver(post_save, sender=NoteApproval)
def on_note_approval(sender, instance, created, **kwargs):
    """Award points when a note is approved."""
    if not created:
        return
    if instance.action != 'approved':
        return
    note = instance.note
    author = note.author
    # +1 upload_count → awards 'note_uploaded' points
    increment_counter(author, 'upload_count', note=note)
    # Extra points for approval itself
    from apps.gamification.services import award_points, POINTS
    award_points(
        author,
        reason='note_approved',
        points=POINTS['note_approved'],
        note=note,
        description=f'Note "{note.title}" approved',
    )
    # First-upload bonus check
    ensure_first_upload_bonus(author, note)


@receiver(post_save, sender=NoteComment)
def on_comment_posted(sender, instance, created, **kwargs):
    """Award points when a user posts a comment."""
    if not created or instance.is_deleted:
        return
    increment_counter(instance.author, 'comments_count', note=instance.note)


@receiver(post_save, sender=NoteRating)
def on_rating_received(sender, instance, created, **kwargs):
    """Award points to the note author when their note receives a rating."""
    if not created:
        return
    note = instance.note
    author = note.author
    # Don't award points for self-ratings
    if instance.user == author:
        return
    # +1 ratings_received
    increment_counter(author, 'ratings_received', note=note)
    # Extra points for 5-star ratings
    if instance.rating == 5:
        increment_counter(author, 'five_star_count', note=note)
