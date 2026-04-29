from datetime import timedelta

from rest_framework import serializers

from backend.models import Highscore, Match, Team


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


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "flag_code"]


class MatchSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    locked_at = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "home_team",
            "away_team",
            "kickoff",
            "stage",
            "group",
            "home_score",
            "away_score",
            "odds_home",
            "odds_draw",
            "odds_away",
            "is_locked",
            "locked_at",
        ]

    def get_locked_at(self, obj):
        return (obj.kickoff - timedelta(hours=1)).isoformat()
