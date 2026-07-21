from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Company

from .models import SupportTicket, SupportTicketMessage
from .notifications import broadcast_support_message, broadcast_support_ticket_created
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
        message_row = None
        if initial_message:
            message_row = SupportTicketMessage.objects.create(
                ticket=ticket,
                sender=request.user,
                message=initial_message,
                is_admin_reply=False,
            )

        # Live notify both parties
        broadcast_support_ticket_created(ticket, request.user)
        if message_row is not None:
            broadcast_support_message(ticket, message_row, request.user)

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

        broadcast_support_message(ticket, message_row, request.user)

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


class SupportTicketClaimView(APIView):
    """Claim or release a ticket as the attending platform admin."""

    permission_classes = [IsAuthenticated]

    def post(self, request, ticket_id):
        if not is_platform_admin(request.user):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        ticket = get_object_or_404(SupportTicket, id=ticket_id)

        if ticket.assigned_to_id and ticket.assigned_to_id != request.user.id:
            return Response(
                {
                    "detail": "Ticket is already being attended.",
                    "assigned_to_email": ticket.assigned_to.email if ticket.assigned_to else None,
                },
                status=status.HTTP_409_CONFLICT,
            )

        ticket.assigned_to = request.user
        if ticket.status == "OPEN":
            ticket.status = "IN_PROGRESS"
            ticket.save(update_fields=["assigned_to", "status", "updated_at"])
        else:
            ticket.save(update_fields=["assigned_to", "updated_at"])

        return Response(SupportTicketAdminListSerializer(ticket).data)

    def delete(self, request, ticket_id):
        if not is_platform_admin(request.user):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        ticket = get_object_or_404(SupportTicket, id=ticket_id)

        if ticket.assigned_to_id and ticket.assigned_to_id != request.user.id and not request.user.is_superuser:
            return Response(
                {"detail": "Only the attending admin (or a superuser) can release this ticket."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ticket.assigned_to = None
        ticket.save(update_fields=["assigned_to", "updated_at"])

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


class AdminSupportOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_platform_admin(request.user):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        notifications = []

        recent_tickets = (
            SupportTicket.objects.select_related("company", "created_by")
            .order_by("-created_at")[:12]
        )
        for ticket in recent_tickets:
            opener = ""
            if ticket.created_by:
                opener = (
                    ticket.created_by.username
                    or ticket.created_by.email
                    or ""
                )
            subject = ticket.subject or "Support ticket"
            message = f"New support ticket opened: {subject}"
            if opener:
                message += f" — by {opener}"
            notifications.append(
                {
                    "type": "ticket_created",
                    "company_name": ticket.company.name if ticket.company_id else "Unknown company",
                    "message": message,
                    "created_at": ticket.created_at,
                    "ticket_id": str(ticket.id),
                    "ticket_subject": subject,
                    "ticket_status": ticket.status,
                }
            )

        recent_customer_messages = (
            SupportTicketMessage.objects.select_related("sender", "ticket", "ticket__company")
            .filter(is_admin_reply=False)
            .order_by("-created_at")[:12]
        )
        for msg in recent_customer_messages:
            ticket = msg.ticket
            sender_label = ""
            if msg.sender:
                sender_label = msg.sender.username or msg.sender.email or ""
            snippet = (msg.message or "").strip().replace("\n", " ")
            if len(snippet) > 140:
                snippet = snippet[:137] + "..."
            subject = ticket.subject or "Support ticket"
            prefix = f"New reply on “{subject}”"
            if sender_label:
                prefix += f" from {sender_label}"
            notifications.append(
                {
                    "type": "ticket_reply",
                    "company_name": ticket.company.name if ticket.company_id else "Unknown company",
                    "message": f"{prefix}: {snippet}" if snippet else prefix,
                    "created_at": msg.created_at,
                    "ticket_id": str(ticket.id),
                    "ticket_subject": subject,
                    "ticket_status": ticket.status,
                }
            )

        notifications.sort(key=lambda row: row["created_at"], reverse=True)
        notifications = notifications[:15]

        recent_messages = (
            SupportTicketMessage.objects.select_related("sender", "ticket", "ticket__company", "ticket__assigned_to")
            .order_by("-created_at")[:80]
        )

        # Group messages by ticket so each row represents a chat room rather than
        # individual messages. Show whether another platform admin is attending.
        rooms_by_ticket = {}
        for message in recent_messages:
            ticket = message.ticket
            tid = str(ticket.id)
            if tid in rooms_by_ticket:
                continue
            rooms_by_ticket[tid] = {
                "ticket_id": tid,
                "ticket_subject": ticket.subject,
                "ticket_status": ticket.status,
                "company_name": ticket.company.name,
                "company_plan": ticket.company.plan,
                "support_lane": ticket.support_lane,
                "last_message": message.message,
                "last_sender_email": message.sender.email if message.sender else "Unknown",
                "last_is_admin_reply": message.is_admin_reply,
                "last_message_at": message.created_at,
                "assigned_to_id": str(ticket.assigned_to.id) if ticket.assigned_to_id else None,
                "assigned_to_email": ticket.assigned_to.email if ticket.assigned_to_id else None,
                "assigned_to_username": ticket.assigned_to.username if ticket.assigned_to_id else None,
                "is_mine": bool(ticket.assigned_to_id and ticket.assigned_to_id == request.user.id),
            }

        chat_room_feed = sorted(
            rooms_by_ticket.values(),
            key=lambda row: row["last_message_at"],
            reverse=True,
        )

        return Response(
            {
                "notifications": notifications,
                "chat_room": chat_room_feed,
            }
        )
