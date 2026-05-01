from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.models import Bet, Highscore, Match, Player
from backend.serializers import (
    BetCreateSerializer,
    BetSerializer,
    HighscoreSerializer,
    MatchSerializer,
    PlayerSerializer,
)

TOP_N = 10


class HighscoreListView(APIView):
    def get(self, request: Request) -> Response:
        scores = Highscore.objects.order_by("-score", "created_at")[:TOP_N]
        serializer = HighscoreSerializer(scores, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = HighscoreSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_score = serializer.validated_data["score"]
        count = Highscore.objects.count()
        if count >= TOP_N:
            lowest = Highscore.objects.order_by("score", "-created_at").first()
            if lowest and new_score <= lowest.score:
                return Response(
                    {"detail": "Score did not make the leaderboard."},
                    status=status.HTTP_200_OK,
                )
            lowest.delete()

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MatchListView(APIView):
    def get(self, request: Request) -> Response:
        matches = (
            Match.objects.select_related("home_team", "away_team")
            .prefetch_related("bets__player__user")
            .order_by("kickoff")
        )
        serializer = MatchSerializer(matches, many=True)
        return Response(serializer.data)


class PlayerLeaderboardView(APIView):
    def get(self, request: Request) -> Response:
        players = Player.objects.select_related("user").order_by(
            "-points_balance", "user__username"
        )
        serializer = PlayerSerializer(players, many=True)
        return Response(serializer.data)


class BetListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        try:
            player = request.user.player
        except Player.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)
        bets = player.bets.select_related(
            "match__home_team", "match__away_team"
        ).order_by("match__kickoff")
        serializer = BetSerializer(bets, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        try:
            request.user.player
        except Player.DoesNotExist:
            return Response(
                {"detail": "No player profile found for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BetCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        player = data["player"]
        match = data["match"]

        # TODO: does not allow to bet change
        if Bet.objects.filter(player=player, match=match).exists():
            return Response(
                {"detail": "You have already placed a bet on this match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        player.points_balance -= data["amount"]
        player.save(update_fields=["points_balance"])

        bet = Bet.objects.create(
            player=player,
            match=match,
            outcome=data["outcome"],
            amount=data["amount"],
            odds_at_bet=data["odds_at_bet"],
        )
        return Response(BetSerializer(bet).data, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        try:
            player = request.user.player
            points_balance = player.points_balance
        except Player.DoesNotExist:
            points_balance = None
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "points_balance": points_balance,
            }
        )
