"""
Admin configuration for the notes app.
"""
from django.contrib import admin
from apps.notes.models import Note, NoteApproval, NoteReport


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'subject', 'status', 'file_type', 'views_count', 'downloads_count', 'created_at']
    list_filter = ['status', 'file_type', 'subject__semester__faculty', 'created_at']
    search_fields = ['title', 'description', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['views_count', 'downloads_count', 'file_size', 'content_hash']
    ordering = ['-created_at']

    actions = ['approve_notes', 'reject_notes']

    @admin.action(description='Approve selected notes')
    def approve_notes(self, request, queryset):
        for note in queryset.filter(status='pending'):
            note.status = 'approved'
            note.save()
            NoteApproval.objects.create(
                note=note, admin=request.user,
                action='approved', reason='Bulk approved via admin panel.'
            )
        self.message_user(request, f'{queryset.count()} notes approved.')

    @admin.action(description='Reject selected notes')
    def reject_notes(self, request, queryset):
        for note in queryset.filter(status='pending'):
            note.status = 'rejected'
            note.rejection_reason = 'Rejected via admin panel.'
            note.save()
            NoteApproval.objects.create(
                note=note, admin=request.user,
                action='rejected', reason='Bulk rejected via admin panel.'
            )
        self.message_user(request, f'{queryset.count()} notes rejected.')


@admin.register(NoteApproval)
class NoteApprovalAdmin(admin.ModelAdmin):
    list_display = ['note', 'admin', 'action', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['note__title', 'admin__username']
    ordering = ['-created_at']


@admin.register(NoteReport)
class NoteReportAdmin(admin.ModelAdmin):
    list_display = ['note', 'reported_by', 'reason', 'is_resolved', 'created_at']
    list_filter = ['reason', 'is_resolved']
    search_fields = ['note__title', 'reported_by__username']
    ordering = ['-created_at']
