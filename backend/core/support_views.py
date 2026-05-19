from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Company

from .models import SupportTicket, SupportTicketMessage
from .support_serializers import (
    SupportTicketAdminListSerializer,
    SupportTicketMessageSerializer,
    SupportTicketSerializer,
)


def is_platform_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))


class SupportTicketListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            SupportTicket.objects.filter(company=request.user.company)
            .select_related("company")
            .prefetch_related("messages")
            .order_by("-created_at")
        )
        serializer = SupportTicketSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SupportTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket = SupportTicket.objects.create(
            company=request.user.company,
            created_by=request.user,
            subject=serializer.validated_data["subject"],
            status=serializer.validated_data.get("status", "OPEN"),
        )

        initial_message = (request.data.get("message") or "").strip()
        if initial_message:
            SupportTicketMessage.objects.create(
                ticket=ticket,
                sender=request.user,
                message=initial_message,
                is_admin_reply=False,
            )

        return Response(SupportTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class SupportTicketMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_ticket(self, request, ticket_id):
        ticket = get_object_or_404(
            SupportTicket.objects.select_related("company"),
            id=ticket_id,
        )

        if not is_platform_admin(request.user) and ticket.company_id != request.user.company_id:
            return None
        return ticket

    def get(self, request, ticket_id):
        ticket = self.get_ticket(request, ticket_id)
        if ticket is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        messages = ticket.messages.select_related("sender").order_by("created_at")
        serializer = SupportTicketMessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, ticket_id):
        ticket = self.get_ticket(request, ticket_id)
        if ticket is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"message": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        message_row = SupportTicketMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            message=message,
            is_admin_reply=is_platform_admin(request.user),
        )

        if ticket.status in {"RESOLVED", "CLOSED"}:
            ticket.status = "IN_PROGRESS"
            ticket.save(update_fields=["status", "updated_at"])

        return Response(SupportTicketMessageSerializer(message_row).data, status=status.HTTP_201_CREATED)


class SupportTicketDetailUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id):
        if not is_platform_admin(request.user):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        ticket = get_object_or_404(SupportTicket, id=ticket_id)
        new_status = (request.data.get("status") or "").upper().strip()

        allowed_statuses = {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}
        if new_status not in allowed_statuses:
            return Response(
                {"status": "Invalid status. Use OPEN, IN_PROGRESS, RESOLVED, or CLOSED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = new_status
        ticket.save(update_fields=["status", "updated_at"])

        return Response(SupportTicketAdminListSerializer(ticket).data)


class AdminSupportInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_platform_admin(request.user):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        ticket_prefetch = Prefetch(
            "support_tickets",
            queryset=(
                SupportTicket.objects.all()
                .select_related("company")
                .prefetch_related("messages")
                .order_by("created_at")
            ),
        )

        companies = (
            Company.objects.filter(support_tickets__isnull=False)
            .prefetch_related(ticket_prefetch)
            .annotate(ticket_count=Count("support_tickets"))
            .distinct()
        )

        priority_lane = []
        standard_lane = []

        for company in companies:
            tickets = list(company.support_tickets.all())
            if not tickets:
                continue

            serialized_tickets = SupportTicketAdminListSerializer(tickets, many=True).data
            company_payload = {
                "company_id": str(company.id),
                "company_name": company.name,
                "company_plan": company.plan,
                "ticket_count": company.ticket_count,
                "tickets": serialized_tickets,
            }

            if company.plan == "ENTERPRISE":
                priority_lane.append(company_payload)
            else:
                standard_lane.append(company_payload)

        priority_lane.sort(key=lambda item: (item["ticket_count"] * -1, item["company_name"].lower()))
        standard_lane.sort(key=lambda item: (item["ticket_count"] * -1, item["company_name"].lower()))

        return Response(
            {
                "priority_lane": priority_lane,
                "standard_lane": standard_lane,
            }
        )
