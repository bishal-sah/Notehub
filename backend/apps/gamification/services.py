"""
Core gamification logic: awarding points, checking badge thresholds.
"""
from django.db import transaction
from django.db.models import F

from apps.gamification.models import PointTransaction, UserPoints, Badge, UserBadge


# ─── Point values ─────────────────────────────────────────
POINTS = {
    'note_uploaded': 5,
    'note_approved': 10,
    'download_received': 2,
    'comment_posted': 1,
    'first_upload': 15,
    'rating_received': 3,
    'five_star_received': 5,
}

# ─── Reputation tiers (sorted ascending by min_points) ────
REPUTATION_TIERS = [
    {'key': 'contributor',        'name': 'Contributor',        'emoji': '🥉', 'min_points': 0,    'color': '#CD7F32'},
    {'key': 'senior_contributor', 'name': 'Senior Contributor', 'emoji': '🥈', 'min_points': 100,  'color': '#A0A0A0'},
    {'key': 'top_educator',       'name': 'Top Educator',       'emoji': '🥇', 'min_points': 500,  'color': '#FFD700'},
    {'key': 'campus_hero',        'name': 'Campus Hero',        'emoji': '👑', 'min_points': 1500, 'color': '#9333EA'},
]


def get_reputation_tier(total_points):
    """Return the current reputation tier dict for a given point total."""
    tier = REPUTATION_TIERS[0]
    for t in REPUTATION_TIERS:
        if total_points >= t['min_points']:
            tier = t
    return tier


def get_next_tier(total_points):
    """Return the next tier dict (or None if at max)."""
    for t in REPUTATION_TIERS:
        if total_points < t['min_points']:
            return t
    return None


def _get_or_create_user_points(user):
    """Return (or create) the UserPoints row for a user."""
    obj, _ = UserPoints.objects.get_or_create(user=user)
    return obj


def award_points(user, reason, points=None, note=None, description=''):
    """
    Award points to a user and update their aggregate counters.
    Automatically checks for newly earned badges.
    """
    pts = points if points is not None else POINTS.get(reason, 0)
    if pts == 0:
        return

    with transaction.atomic():
        # Record the transaction
        PointTransaction.objects.create(
            user=user,
            points=pts,
            reason=reason,
            note=note,
            description=description,
        )

        # Update aggregate
        up = _get_or_create_user_points(user)
        up.total_points = F('total_points') + pts
        up.save(update_fields=['total_points'])
        up.refresh_from_db()

    # Check badges (outside the atomic block to avoid long locks)
    check_badges(user)


def increment_counter(user, field, amount=1, note=None):
    """
    Increment a specific counter on UserPoints and award points
    according to the matching reason.
    """
    reason_map = {
        'upload_count': 'note_uploaded',
        'downloads_received': 'download_received',
        'views_received': 'view_received',
        'comments_count': 'comment_posted',
        'ratings_received': 'rating_received',
        'five_star_count': 'five_star_received',
    }

    with transaction.atomic():
        up = _get_or_create_user_points(user)
        setattr(up, field, F(field) + amount)
        up.save(update_fields=[field])
        up.refresh_from_db()

        reason = reason_map.get(field)
        if reason and reason in POINTS:
            pts = POINTS[reason] * amount
            PointTransaction.objects.create(
                user=user,
                points=pts,
                reason=reason,
                note=note,
                description=f'+{amount} {field}',
            )
            up.total_points = F('total_points') + pts
            up.save(update_fields=['total_points'])
            up.refresh_from_db()

    check_badges(user)
    return up


def check_badges(user):
    """
    Compare user's counters against every Badge threshold.
    Award any badges not yet earned.
    """
    up = _get_or_create_user_points(user)
    earned_ids = set(
        UserBadge.objects.filter(user=user).values_list('badge_id', flat=True)
    )

    for badge in Badge.objects.all():
        if badge.id in earned_ids:
            continue
        current = getattr(up, badge.threshold_field, 0)
        if current >= badge.threshold_value:
            UserBadge.objects.create(user=user, badge=badge)
            # Award bonus points for earning the badge
            if badge.points_reward:
                PointTransaction.objects.create(
                    user=user,
                    points=badge.points_reward,
                    reason='first_upload',  # generic badge reward
                    description=f'Badge earned: {badge.name}',
                )
                UserPoints.objects.filter(user=user).update(
                    total_points=F('total_points') + badge.points_reward,
                )


def ensure_first_upload_bonus(user, note):
    """Award the first-upload bonus if this is the user's first approved note."""
    from apps.notes.models import Note
    approved_count = Note.objects.filter(author=user, status='approved').count()
    if approved_count == 1:
        award_points(
            user,
            reason='first_upload',
            points=POINTS['first_upload'],
            note=note,
            description='First upload bonus!',
        )
