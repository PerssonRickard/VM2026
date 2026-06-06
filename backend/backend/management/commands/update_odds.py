from datetime import datetime

from django.core.management.base import BaseCommand
from django.db import transaction

from odds.odds_api import get_odds
from backend.models import Match


class Command(BaseCommand):
    help = "Fetch latest odds from the odds API and update unlocked matches."

    def _ts(self):
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def handle(self, *args, **options):
        try:
            odds_data = get_odds()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"[{self._ts()}] Failed to fetch odds: {exc}"))
            return

        updated = 0
        skipped = 0

        with transaction.atomic():
            for entry in odds_data:
                home_name = entry["home_team"]
                away_name = entry["away_team"]
                odds = entry["odds"]

                try:
                    match = Match.objects.get(
                        home_team__name=home_name,
                        away_team__name=away_name,
                        is_locked=False,
                    )
                except Match.DoesNotExist:
                    self.stdout.write(
                        f"[{self._ts()}] No unlocked match found for {home_name} vs {away_name} — skipping."
                    )
                    skipped += 1
                    continue
                except Match.MultipleObjectsReturned:
                    self.stderr.write(
                        self.style.WARNING(
                            f"[{self._ts()}] Multiple unlocked matches for {home_name} vs {away_name} — skipping."
                        )
                    )
                    skipped += 1
                    continue

                match.odds_home = odds.get(home_name)
                match.odds_draw = odds.get("Draw")
                match.odds_away = odds.get(away_name)
                match.save(update_fields=["odds_home", "odds_draw", "odds_away"])
                updated += 1
                self.stdout.write(
                    f"[{self._ts()}] Updated {home_name} vs {away_name}: "
                    f"H={match.odds_home} D={match.odds_draw} A={match.odds_away}"
                )

        self.stdout.write(
            self.style.SUCCESS(f"[{self._ts()}] Done. {updated} match(es) updated, {skipped} skipped.")
        )
