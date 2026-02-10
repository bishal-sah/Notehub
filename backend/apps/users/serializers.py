"""
Serializers for User authentication and profile management.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'faculty',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'Passwords do not match.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login request."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data."""
    full_name = serializers.ReadOnlyField()
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    total_notes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'avatar', 'bio', 'phone',
            'faculty', 'faculty_name', 'is_verified',
            'total_notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at', 'updated_at']

    def get_total_notes(self, obj):
        return obj.notes.filter(status='approved').count()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'avatar', 'bio', 'phone', 'faculty',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password_confirm': 'New passwords do not match.'}
            )
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""

    class Meta:
        model = None  # Set dynamically to avoid circular import
        fields = [
            'id', 'title', 'message', 'notification_type',
            'is_read', 'link', 'created_at',
        ]
        read_only_fields = ['id', 'title', 'message', 'notification_type', 'link', 'created_at']

    def __init__(self, *args, **kwargs):
        from apps.users.models import Notification
        self.Meta.model = Notification
        super().__init__(*args, **kwargs)


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management."""
    full_name = serializers.ReadOnlyField()
    total_notes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'is_active', 'is_verified',
            'faculty', 'total_notes', 'created_at',
        ]

    def get_total_notes(self, obj):
        return obj.notes.count()
