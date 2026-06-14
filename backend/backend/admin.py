import random
from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.utils import timezone

from backend.models import AnonymousVisit, Bet, Highscore, Match, Player, Team

ONLINE_THRESHOLD = timedelta(minutes=2)


@admin.register(Highscore)
class HighscoreAdmin(admin.ModelAdmin):
    readonly_fields = ("created_at",)
    list_display = ("name", "score", "created_at")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "flag_code", "formation", "manager")
    list_editable = ("formation", "manager")
    search_fields = ("name", "manager")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    actions = ["randomize_odds"]

    def randomize_odds(self, request, queryset):
        for match in queryset:
            p = [random.random() for _ in range(3)]
            total = sum(p)
            # Normalize with 5% bookmaker margin so odds are slightly above fair value
            p = [x / total * 0.95 for x in p]
            match.odds_home = round(1 / p[0], 2)
            match.odds_draw = round(1 / p[1], 2)
            match.odds_away = round(1 / p[2], 2)
            match.save()
        self.message_user(request, f"Randomized odds for {queryset.count()} match(es).")
    randomize_odds.short_description = "Apply random odds to selected matches"

    list_display = (
        "__str__",
        "stage",
        "group",
        "kickoff",
        "odds_home",
        "odds_draw",
        "odds_away",
        "home_score",
        "away_score",
        "is_locked",
    )
    list_editable = ("odds_home", "odds_draw", "odds_away", "home_score", "away_score", "is_locked")
    list_filter = ("stage", "is_locked")
    ordering = ("kickoff",)


class PlayerInline(admin.StackedInline):
    model = Player
    can_delete = False
    verbose_name_plural = "Player profile"


class CustomUserAdmin(UserAdmin):
    inlines = [PlayerInline]


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ("user", "points_balance", "can_edit_squads", "is_online", "last_seen")
    list_editable = ("can_edit_squads",)
    search_fields = ("user__username",)
    ordering = ("-last_seen",)

    @admin.display(description="Online", boolean=True)
    def is_online(self, obj):
        if not obj.last_seen:
            return False
        return timezone.now() - obj.last_seen <= ONLINE_THRESHOLD


@admin.register(AnonymousVisit)
class AnonymousVisitAdmin(admin.ModelAdmin):
    list_display = ("ip_address", "is_online", "last_seen")
    ordering = ("-last_seen",)

    @admin.display(description="Online", boolean=True)
    def is_online(self, obj):
        return timezone.now() - obj.last_seen <= ONLINE_THRESHOLD


@admin.register(Bet)
class BetAdmin(admin.ModelAdmin):
    list_display = ("player", "match", "outcome", "is_settled", "payout", "created_at", "pick_updated_at")
    list_filter = ("is_settled", "outcome")
    search_fields = ("player__user__username",)
    ordering = ("match__kickoff",)
