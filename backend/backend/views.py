from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.models import Highscore, Match
from backend.serializers import (
    HighscoreSerializer,
    MatchSerializer,
)

TOP_N = 10  # how many scores to keep / return


class HighscoreListView(APIView):
    """
    GET  /api/highscores/   → return top-10 scores
    POST /api/highscores/   → submit a new score
    """

    def get(self, request: Request) -> Response:
        print(f"Got GET request {request}")
        scores = Highscore.objects.order_by("-score", "created_at")[:TOP_N]
        serializer = HighscoreSerializer(scores, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        print(f"Got POST request {request}")
        serializer = HighscoreSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_score = serializer.validated_data["score"]

        # Only store if it makes the top-10 (or the board isn't full yet)
        count = Highscore.objects.count()
        if count >= TOP_N:
            lowest = Highscore.objects.order_by("score", "-created_at").first()
            if lowest and new_score <= lowest.score:
                return Response(
                    {"detail": "Score did not make the leaderboard."},
                    status=status.HTTP_200_OK,
                )
            lowest.delete()  # drop the lowest to make room

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MatchListView(APIView):
    """GET /api/matches/ — all matches ordered by kickoff ascending"""

    def get(self, request: Request) -> Response:
        matches = Match.objects.select_related("home_team", "away_team").order_by(
            "kickoff"
        )
        serializer = MatchSerializer(matches, many=True)
        return Response(serializer.data)
