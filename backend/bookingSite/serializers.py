from rest_framework import serializers
from .models import (
    Vehicle,
    IndemnityTemplate,
    IndemnityAgreement
)

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"
        read_only_fields = ("id",)


class IndemnityTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndemnityTemplate
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class IndemnityAgreementSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndemnityAgreement
        fields = "__all__"
        read_only_fields = (
            "id",
            "signed_at",
            "document_hash",
        )
