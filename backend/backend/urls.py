from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from backend.views import (
    BetListCreateView,
    CurrentUserView,
    HighscoreListView,
    MatchListView,
    PlayerLeaderboardView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/highscores/", HighscoreListView.as_view(), name="highscores"),
    path("api/matches/", MatchListView.as_view(), name="matches"),
    path("api/players/", PlayerLeaderboardView.as_view(), name="players"),
    path("api/bets/", BetListCreateView.as_view(), name="bets"),
    path("api/auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/token/", TokenObtainPairView.as_view(), name="token-obtain"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
