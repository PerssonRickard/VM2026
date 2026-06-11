from collections import defaultdict
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from backend.models import Match, Player


def _team_name(team, label):
    return team.name if team else (label or "?")


def _match_label(match):
    home = _team_name(match.home_team, match.home_label)
    away = _team_name(match.away_team, match.away_label)
    return f"{home} vs {away} ({match.kickoff:%Y-%m-%d %H:%M} UTC)"


class Command(BaseCommand):
    help = "List players who haven't placed a bet on matches kicking off within 24 hours."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Look at matches kicking off within this many hours (default: 24).",
        )

    def handle(self, *args, **options):
        hours = options["hours"]
        now = timezone.now()
        window = now + timedelta(hours=hours)

        upcoming = Match.objects.filter(
            kickoff__gte=now, kickoff__lte=window, is_locked=False
        )

        if not upcoming.exists():
            self.stdout.write(f"No unlocked matches kicking off in the next {hours} hours.")
            return

        missing = defaultdict(list)
        for match in upcoming:
            bettor_ids = match.bets.values_list("player_id", flat=True)
            for player in Player.objects.exclude(id__in=bettor_ids):
                missing[player].append(match)

        if not missing:
            self.stdout.write(self.style.SUCCESS("Everyone has bet on all upcoming matches."))
            return

        self.stdout.write(self.style.WARNING("Players missing bets"))
        for player, matches in sorted(missing.items(), key=lambda kv: kv[0].user.username):
            self.stdout.write(self.style.WARNING(f"{player.user.username}:"))
            for match in matches:
                self.stdout.write(f"  - {_match_label(match)}")
