
from django.utils import timezone
from rest_framework import serializers

from backend.models import Bet, Highscore, Match, Player, Team


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


class PlayerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Player
        fields = ["id", "username", "points_balance"]


class PublicBetSerializer(serializers.ModelSerializer):
    player_username = serializers.CharField(
        source="player.user.username", read_only=True
    )

    class Meta:
        model = Bet
        fields = [
            "id",
            "player_username",
            "outcome",
            "amount",
            "odds_at_bet",
            "is_settled",
            "payout",
        ]


class BetSerializer(serializers.ModelSerializer):
    player_username = serializers.CharField(
        source="player.user.username", read_only=True
    )
    match_id = serializers.IntegerField(source="match.id", read_only=True)

    class Meta:
        model = Bet
        fields = [
            "id",
            "player_username",
            "match_id",
            "outcome",
            "amount",
            "odds_at_bet",
            "is_settled",
            "payout",
            "created_at",
        ]


class BetCreateSerializer(serializers.Serializer):
    match_id = serializers.IntegerField()
    outcome = serializers.ChoiceField(choices=["H", "D", "A"])
    amount = serializers.IntegerField(min_value=1000)

    def validate(self, data):
        now = timezone.now()
        try:
            match = Match.objects.get(pk=data["match_id"])
        except Match.DoesNotExist:
            raise serializers.ValidationError({"match_id": "Match not found."})

        betting_closed = match.is_locked or now >= match.kickoff
        if betting_closed:
            raise serializers.ValidationError(
                {"match_id": "Betting is closed for this match."}
            )

        outcome = data["outcome"]
        odds_map = {"H": match.odds_home, "D": match.odds_draw, "A": match.odds_away}
        if odds_map[outcome] is None:
            raise serializers.ValidationError(
                {"outcome": "No odds available for this outcome."}
            )

        player = self.context["request"].user.player
        if data["amount"] > player.points_balance:
            raise serializers.ValidationError(
                {"amount": "Insufficient points balance."}
            )

        data["match"] = match
        data["odds_at_bet"] = odds_map[outcome]
        data["player"] = player
        return data


def _is_betting_closed(match):
    now = timezone.now()
    return match.is_locked or now >= match.kickoff


class MatchSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    locked_at = serializers.SerializerMethodField()
    betting_closed = serializers.SerializerMethodField()
    bets = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "home_team",
            "away_team",
            "home_label",
            "away_label",
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
            "betting_closed",
            "bets",
        ]

    def get_locked_at(self, obj):
        return obj.kickoff.isoformat()

    def get_betting_closed(self, obj):
        return _is_betting_closed(obj)

    def get_bets(self, obj):
        if not _is_betting_closed(obj):
            return []
        return PublicBetSerializer(
            obj.bets.select_related("player__user"), many=True
        ).data
