from django.contrib import admin
from backend.models import Highscore, Match, Team


@admin.register(Highscore)
class HighscoreAdmin(admin.ModelAdmin):
    readonly_fields = ("created_at",)
    list_display = ("name", "score", "created_at")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "flag_code")
    search_fields = ("name",)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        "__str__",
        "stage",
        "group",
        "kickoff",
        "home_score",
        "away_score",
        "is_locked",
    )
    list_editable = ("home_score", "away_score", "is_locked")
    list_filter = ("stage", "is_locked")
    ordering = ("kickoff",)
