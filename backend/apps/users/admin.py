"""
Admin configuration for the users app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from apps.users.models import Notification

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_verified', 'is_active', 'created_at']
    list_filter = ['role', 'is_verified', 'is_active', 'faculty']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('NoteHub Fields', {
            'fields': ('role', 'avatar', 'bio', 'phone', 'faculty', 'is_verified'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('NoteHub Fields', {
            'fields': ('email', 'role', 'faculty'),
        }),
    )

    actions = ['verify_users', 'unverify_users']

    @admin.action(description='Verify selected users')
    def verify_users(self, request, queryset):
        queryset.update(is_verified=True)

    @admin.action(description='Unverify selected users')
    def unverify_users(self, request, queryset):
        queryset.update(is_verified=False)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['title', 'message', 'user__username']
    ordering = ['-created_at']
