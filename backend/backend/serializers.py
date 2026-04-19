# keepie/serializers.py
from rest_framework import serializers
from backend.models import Highscore


class HighscoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Highscore
        fields = ["id", "name", "score", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value[:50]

    def validate_score(self, value):
        if value < 0:
            raise serializers.ValidationError("Score cannot be negative.")
        return value
