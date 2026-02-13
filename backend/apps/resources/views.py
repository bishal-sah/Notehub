"""
Views for the resources app.
"""
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.resources.models import Resource, ResourceUpvote
from apps.resources.serializers import ResourceSerializer, ResourceCreateSerializer


class ResourceListView(generics.ListAPIView):
    """List all approved resources with filtering, search, and ordering."""
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'difficulty', 'faculty']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['created_at', 'upvotes_count', 'views_count']
    ordering = ['-created_at']

    def get_queryset(self):
        return Resource.objects.filter(is_approved=True).select_related('author', 'faculty')


class ResourceDetailView(generics.RetrieveAPIView):
    """Retrieve a single resource and increment view count."""
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Resource.objects.filter(is_approved=True)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment views
        Resource.objects.filter(pk=instance.pk).update(views_count=instance.views_count + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ResourceCreateView(generics.CreateAPIView):
    """Create a new resource (authenticated users)."""
    serializer_class = ResourceCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ResourceUpdateView(generics.UpdateAPIView):
    """Update own resource."""
    serializer_class = ResourceCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Resource.objects.filter(author=self.request.user)


class ResourceDeleteView(generics.DestroyAPIView):
    """Delete own resource."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Resource.objects.filter(author=self.request.user)


class ResourceUpvoteToggleView(APIView):
    """Toggle upvote on a resource."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            resource = Resource.objects.get(pk=pk, is_approved=True)
        except Resource.DoesNotExist:
            return Response({'error': 'Resource not found.'}, status=status.HTTP_404_NOT_FOUND)

        upvote, created = ResourceUpvote.objects.get_or_create(
            user=request.user, resource=resource,
        )
        if not created:
            upvote.delete()
            Resource.objects.filter(pk=pk).update(upvotes_count=max(0, resource.upvotes_count - 1))
            return Response({'upvoted': False, 'upvotes_count': max(0, resource.upvotes_count - 1)})

        Resource.objects.filter(pk=pk).update(upvotes_count=resource.upvotes_count + 1)
        return Response({'upvoted': True, 'upvotes_count': resource.upvotes_count + 1})


class ResourceStatsView(APIView):
    """Get aggregate stats for the resource hub."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Count
        qs = Resource.objects.filter(is_approved=True)
        total = qs.count()
        by_category = dict(qs.values_list('category').annotate(c=Count('id')).values_list('category', 'c'))
        return Response({
            'total': total,
            'internship': by_category.get('internship', 0),
            'project_ideas': by_category.get('project_ideas', 0),
            'interview_qa': by_category.get('interview_qa', 0),
            'viva': by_category.get('viva', 0),
        })
