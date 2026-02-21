"""
URL configuration for NoteHub project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/academics/', include('apps.academics.urls')),
    path('api/notes/', include('apps.notes.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/gamification/', include('apps.gamification.urls')),
    path('api/groups/', include('apps.groups.urls')),
    path('api/resources/', include('apps.resources.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Always serve media files regardless of DEBUG setting
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
