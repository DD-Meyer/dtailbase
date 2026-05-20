from rest_framework import serializers

from .models import SupportTicket, SupportTicketMessage


class SupportTicketMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")

    class Meta:
        model = SupportTicketMessage
        fields = [
            "id",
            "ticket",
            "sender",
            "sender_email",
            "message",
            "is_admin_reply",
            "created_at",
        ]
        read_only_fields = ["id", "ticket", "sender", "sender_email", "is_admin_reply", "created_at"]


class SupportTicketSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source="company.name")
    company_plan = serializers.ReadOnlyField(source="company.plan")
    messages = SupportTicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "company",
            "company_name",
            "company_plan",
            "created_by",
            "subject",
            "status",
            "support_lane",
            "created_at",
            "updated_at",
            "messages",
        ]
        read_only_fields = [
            "id",
            "company",
            "company_name",
            "company_plan",
            "created_by",
            "support_lane",
            "created_at",
            "updated_at",
            "messages",
        ]


class SupportTicketAdminListSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source="company.name")
    company_plan = serializers.ReadOnlyField(source="company.plan")
    latest_message = serializers.SerializerMethodField()
    assigned_to_email = serializers.ReadOnlyField(source="assigned_to.email")
    assigned_to_username = serializers.ReadOnlyField(source="assigned_to.username")
    assigned_to_id = serializers.ReadOnlyField(source="assigned_to.id")

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "company",
            "company_name",
            "company_plan",
            "subject",
            "status",
            "support_lane",
            "created_at",
            "updated_at",
            "latest_message",
            "assigned_to_id",
            "assigned_to_email",
            "assigned_to_username",
        ]

    def get_latest_message(self, obj):
        latest = obj.messages.order_by("-created_at").first()
        if not latest:
            return None
        return {
            "message": latest.message,
            "created_at": latest.created_at,
            "is_admin_reply": latest.is_admin_reply,
        }
