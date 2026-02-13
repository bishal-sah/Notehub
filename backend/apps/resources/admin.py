from django.contrib import admin
from apps.resources.models import Resource, ResourceUpvote


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'difficulty', 'author', 'upvotes_count', 'views_count', 'is_approved', 'created_at']
    list_filter = ['category', 'difficulty', 'is_approved', 'created_at']
    search_fields = ['title', 'description', 'tags']
    list_editable = ['is_approved']


@admin.register(ResourceUpvote)
class ResourceUpvoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'resource', 'created_at']
