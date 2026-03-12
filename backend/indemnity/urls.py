from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter
from indemnity.views import *

urlpatterns = [
    path('agreements/<uuid:pk>/download/', indemnityDownloadView.as_view(), name='agreement-download'),
    path('templates/', IndemnityTemplateListCreateView.as_view(), name='template-list-create'),
    path('templates/<uuid:pk>/', IndemnityTemplateDetailView.as_view(), name='template-detail'),
    path('template/latest/', LatestIndemnityTemplateView.as_view(), name='latest-template'),
    path('agreements/', IndemnityAgreementListView.as_view(), name='agreement-list'),
    path('sign/', IndemnityAgreementCreateView.as_view(), name='agreement-create'),
]