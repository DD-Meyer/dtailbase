from rest_framework import generics, permissions
from .models import *
from .serializers import *
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
import hashlib
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from .utils import generate_agreement_pdf  # Import your utility function for PDF generation


class LatestIndemnityTemplateView(generics.RetrieveAPIView):
    serializer_class = IndemnityTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # We filter by company and active status, then grab the newest version
        return IndemnityTemplate.objects.filter(
            company=self.request.user.company,
            is_active=True
        ).order_by('-version').first()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            # This returns a clean 404 error instead of a 500 crash
            return Response(
                {"error": "No active indemnity template found for your company."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
class IndemnityAgreementListView(generics.ListAPIView):
    serializer_class = IndemnityAgreementSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Override get_queryset to apply the history limit based on the user's plan
    # This ensures that even if they have agreements, they only see the number allowed by their plan.
    def get_queryset(self):
        company = self.request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        history_limit = plan_limits.get('indemnity_history_limit', 0)
        
        # Start with all agreements for this company
        queryset = IndemnityAgreement.objects.filter(company=company).order_by('-created_at')

        # 🛡️If limit is 0, return an empty QuerySet immediately
        if history_limit == 0:
            return queryset.none()

        # If there's a specific numeric limit (e.g., 50), slice it
        if history_limit and history_limit != float('inf'):
            return queryset[:history_limit]
            
        return queryset
    


class IndemnityAgreementCreateView(generics.CreateAPIView):
    serializer_class = IndemnityAgreementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def perform_create(self, serializer):
        # 1. Get IP Address (handles proxies/load balancers if present)
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')

        # 2. Get User Agent
        user_agent = self.request.META.get('HTTP_USER_AGENT', 'Unknown')

        # 3. Save with these extra values
        # This will override anything sent by the frontend for these specific fields
        serializer.save(
            signer_ip=ip,
            signer_user_agent=user_agent
        )

class IndemnityTemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = IndemnityTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company = user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        
        queryset = IndemnityTemplate.objects.filter(company=company).order_by('-created_at')

        # 🛡️ If STARTER, they only see the currently ACTIVE template.
        # This prevents them from seeing the "History" list in your screenshot.
        if plan_limits.get('indemnity_history_limit', 0) == 0:
            return queryset.filter(is_active=True)
        if plan_limits.get('indemnity_history_limit', 0) != float('inf'):
            return queryset[:plan_limits.get('indemnity_history_limit', 0)]

        return queryset

    def perform_create(self, serializer):
        # lock creation if Starter and they already have a template
        # (since they can't have history)
        company = self.request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        if plan_limits.get('indemnity_history_limit', 0) == 0:
            if IndemnityTemplate.objects.filter(company=company).count() >= 1:
                raise PermissionDenied("Starter plan is limited to one active template. Upgrade to manage multiple versions.")
        
        # If this new one is active, deactivate other templates for this company
        if serializer.validated_data.get('is_active', True):
            IndemnityTemplate.objects.filter(
                company=self.request.user.company, 
                is_active=True
            ).update(is_active=False)
        
        serializer.save(company=self.request.user.company)

class IndemnityTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = IndemnityTemplateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk' # This ensures it looks for the UUID/ID

    def get_queryset(self):
        return IndemnityTemplate.objects.filter(company=self.request.user.company)

    def update(self, request, *args, **kwargs):
        # 🛡️ LOCK EDITING: Check plan before allowing an update
        company = request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        
        if plan_limits.get('indemnity_history_limit', 0) == 0:
            return Response(
                {"error": "Editing templates is a Pro feature. Please delete this and create a new one, or upgrade to Professional."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)

class indemnityDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            # Look up the agreement
            agreement = IndemnityAgreement.objects.get(id=pk, company=request.user.company)
            
            # --- LOGIC: Auto-generate if file is missing ---
            if not agreement.pdf_file or not agreement.pdf_file.storage.exists(agreement.pdf_file.name):
                print(f"PDF missing for {pk}. Attempting to generate...")
                success = generate_agreement_pdf(agreement)
                if not success:
                    return Response({"error": "Failed to generate PDF document."}, status=500)
                
                # Refresh from DB to get the new file field
                agreement.refresh_from_db()

            # --- SERVE FILE: Use FileResponse for stability ---
            # 'rb' is important for reading binary files
            file_handle = agreement.pdf_file.open('rb')
            response = FileResponse(file_handle, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Agreement_{agreement.id}.pdf"'
            return response

        except IndemnityAgreement.DoesNotExist:
            return Response({"error": "Indemnity agreement not found."}, status=404)
        except Exception as e:
            # This will print the actual error to your Django terminal
            print(f"CRITICAL PDF ERROR: {str(e)}")
            return Response({"error": f"Internal server error: {str(e)}"}, status=500)