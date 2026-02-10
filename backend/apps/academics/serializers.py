"""
Serializers for the academics app (Faculty, Semester, Subject).
"""
from rest_framework import serializers
from apps.academics.models import Faculty, Semester, Subject


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer for Subject model."""
    total_notes = serializers.ReadOnlyField()
    semester_number = serializers.IntegerField(source='semester.number', read_only=True)
    faculty_name = serializers.CharField(source='semester.faculty.name', read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'slug', 'code', 'description',
            'credit_hours', 'semester', 'semester_number',
            'faculty_name', 'total_notes', 'is_active', 'created_at',
        ]


class SemesterSerializer(serializers.ModelSerializer):
    """Serializer for Semester with nested subjects."""
    subjects = SubjectSerializer(many=True, read_only=True)
    subject_count = serializers.SerializerMethodField()

    class Meta:
        model = Semester
        fields = [
            'id', 'faculty', 'number', 'name',
            'subjects', 'subject_count', 'is_active', 'created_at',
        ]

    def get_subject_count(self, obj):
        return obj.subjects.filter(is_active=True).count()


class SemesterListSerializer(serializers.ModelSerializer):
    """Lightweight semester serializer for lists."""
    subject_count = serializers.SerializerMethodField()

    class Meta:
        model = Semester
        fields = ['id', 'faculty', 'number', 'name', 'subject_count', 'is_active']

    def get_subject_count(self, obj):
        return obj.subjects.filter(is_active=True).count()


class FacultySerializer(serializers.ModelSerializer):
    """Serializer for Faculty with semester count."""
    total_notes = serializers.ReadOnlyField()
    semester_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Faculty
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'image',
            'total_notes', 'semester_count', 'user_count',
            'is_active', 'created_at', 'updated_at',
        ]

    def get_semester_count(self, obj):
        return obj.semesters.filter(is_active=True).count()

    def get_user_count(self, obj):
        return obj.users.count()


class FacultyDetailSerializer(FacultySerializer):
    """Faculty serializer with nested semesters."""
    semesters = SemesterSerializer(many=True, read_only=True)

    class Meta(FacultySerializer.Meta):
        fields = FacultySerializer.Meta.fields + ['semesters']


# ─── Admin Serializers ──────────────────────────────────

class AdminFacultySerializer(serializers.ModelSerializer):
    """Admin serializer for creating/updating faculties."""

    class Meta:
        model = Faculty
        fields = [
            'id', 'name', 'slug', 'description', 'icon',
            'image', 'is_active',
        ]


class AdminSemesterSerializer(serializers.ModelSerializer):
    """Admin serializer for creating/updating semesters."""

    class Meta:
        model = Semester
        fields = ['id', 'faculty', 'number', 'name', 'is_active']


class AdminSubjectSerializer(serializers.ModelSerializer):
    """Admin serializer for creating/updating subjects."""

    class Meta:
        model = Subject
        fields = [
            'id', 'semester', 'name', 'slug', 'code',
            'description', 'credit_hours', 'is_active',
        ]
