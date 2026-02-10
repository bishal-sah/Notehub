"""
Admin configuration for the academics app.
"""
from django.contrib import admin
from apps.academics.models import Faculty, Semester, Subject


class SemesterInline(admin.TabularInline):
    model = Semester
    extra = 1


class SubjectInline(admin.TabularInline):
    model = Subject
    extra = 1


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'total_notes', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [SemesterInline]


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'faculty', 'number', 'is_active']
    list_filter = ['faculty', 'is_active']
    inlines = [SubjectInline]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'semester', 'credit_hours', 'total_notes', 'is_active']
    list_filter = ['semester__faculty', 'semester', 'is_active']
    search_fields = ['name', 'code']
    prepopulated_fields = {'slug': ('name',)}
