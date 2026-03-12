from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

# Create your views here.

from .models import (
    Vehicle,
    IndemnityTemplate,
    IndemnityAgreement
)
from .serializers import (
    VehicleSerializer,
    IndemnityTemplateSerializer,
    IndemnityAgreementSerializer
)


class CompanyScopedViewSet(viewsets.ModelViewSet):
    """
    Base class to enforce company isolation.
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.model.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class VehicleViewSet(CompanyScopedViewSet):
    model = Vehicle
    serializer_class = VehicleSerializer


class IndemnityTemplateViewSet(CompanyScopedViewSet):
    model = IndemnityTemplate
    serializer_class = IndemnityTemplateSerializer


class IndemnityAgreementViewSet(CompanyScopedViewSet):
    model = IndemnityAgreement
    serializer_class = IndemnityAgreementSerializer
