"""
Seed default badges for the Contributor Reputation System.
"""
from django.db import migrations


def seed_badges(apps, schema_editor):
    Badge = apps.get_model('gamification', 'Badge')

    badges = [
        # Upload badges
        {
            'slug': 'first-upload',
            'name': 'First Upload',
            'description': 'Uploaded your first note',
            'icon': 'Upload',
            'color': '#3B82F6',
            'category': 'upload',
            'threshold_field': 'upload_count',
            'threshold_value': 1,
            'points_reward': 15,
            'sort_order': 1,
        },
        {
            'slug': 'note-sharer',
            'name': 'Note Sharer',
            'description': 'Uploaded 5 notes',
            'icon': 'FolderUp',
            'color': '#3B82F6',
            'category': 'upload',
            'threshold_field': 'upload_count',
            'threshold_value': 5,
            'points_reward': 25,
            'sort_order': 2,
        },
        {
            'slug': 'prolific-uploader',
            'name': 'Prolific Uploader',
            'description': 'Uploaded 20 notes',
            'icon': 'Rocket',
            'color': '#8B5CF6',
            'category': 'upload',
            'threshold_field': 'upload_count',
            'threshold_value': 20,
            'points_reward': 50,
            'sort_order': 3,
        },
        {
            'slug': 'knowledge-vault',
            'name': 'Knowledge Vault',
            'description': 'Uploaded 50 notes',
            'icon': 'Library',
            'color': '#9333EA',
            'category': 'upload',
            'threshold_field': 'upload_count',
            'threshold_value': 50,
            'points_reward': 100,
            'sort_order': 4,
        },
        # Download badges
        {
            'slug': 'helpful-notes',
            'name': 'Helpful Notes',
            'description': 'Your notes were downloaded 10 times',
            'icon': 'Download',
            'color': '#10B981',
            'category': 'download',
            'threshold_field': 'downloads_received',
            'threshold_value': 10,
            'points_reward': 20,
            'sort_order': 5,
        },
        {
            'slug': 'popular-contributor',
            'name': 'Popular Contributor',
            'description': 'Your notes were downloaded 50 times',
            'icon': 'TrendingUp',
            'color': '#10B981',
            'category': 'download',
            'threshold_field': 'downloads_received',
            'threshold_value': 50,
            'points_reward': 50,
            'sort_order': 6,
        },
        {
            'slug': 'download-magnet',
            'name': 'Download Magnet',
            'description': 'Your notes were downloaded 200 times',
            'icon': 'Flame',
            'color': '#EF4444',
            'category': 'download',
            'threshold_field': 'downloads_received',
            'threshold_value': 200,
            'points_reward': 100,
            'sort_order': 7,
        },
        # Rating badges
        {
            'slug': 'first-five-star',
            'name': 'First 5-Star',
            'description': 'Received your first 5-star rating',
            'icon': 'Star',
            'color': '#F59E0B',
            'category': 'engagement',
            'threshold_field': 'five_star_count',
            'threshold_value': 1,
            'points_reward': 10,
            'sort_order': 8,
        },
        {
            'slug': 'quality-creator',
            'name': 'Quality Creator',
            'description': 'Received 10 five-star ratings',
            'icon': 'Star',
            'color': '#F59E0B',
            'category': 'engagement',
            'threshold_field': 'five_star_count',
            'threshold_value': 10,
            'points_reward': 50,
            'sort_order': 9,
        },
        {
            'slug': 'five-star-legend',
            'name': '5-Star Legend',
            'description': 'Received 50 five-star ratings',
            'icon': 'Star',
            'color': '#FFD700',
            'category': 'special',
            'threshold_field': 'five_star_count',
            'threshold_value': 50,
            'points_reward': 150,
            'sort_order': 10,
        },
        # Engagement badges
        {
            'slug': 'commentator',
            'name': 'Commentator',
            'description': 'Posted 10 comments',
            'icon': 'MessageSquare',
            'color': '#6366F1',
            'category': 'engagement',
            'threshold_field': 'comments_count',
            'threshold_value': 10,
            'points_reward': 15,
            'sort_order': 11,
        },
        {
            'slug': 'community-voice',
            'name': 'Community Voice',
            'description': 'Posted 50 comments',
            'icon': 'MessagesSquare',
            'color': '#6366F1',
            'category': 'engagement',
            'threshold_field': 'comments_count',
            'threshold_value': 50,
            'points_reward': 40,
            'sort_order': 12,
        },
    ]

    for b in badges:
        Badge.objects.update_or_create(
            slug=b['slug'],
            defaults=b,
        )


def reverse_badges(apps, schema_editor):
    Badge = apps.get_model('gamification', 'Badge')
    Badge.objects.filter(slug__in=[
        'first-upload', 'note-sharer', 'prolific-uploader', 'knowledge-vault',
        'helpful-notes', 'popular-contributor', 'download-magnet',
        'first-five-star', 'quality-creator', 'five-star-legend',
        'commentator', 'community-voice',
    ]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('gamification', '0003_userpoints_five_star_count_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_badges, reverse_badges),
    ]
