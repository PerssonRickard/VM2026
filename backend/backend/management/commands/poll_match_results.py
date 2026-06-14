import fcntl
import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from match_data.match_api import get_match_data
from backend.models import Match

POLL_AFTER_KICKOFF = timedelta(minutes=100)
POLL_INTERVAL = timedelta(seconds=30)
MAX_POLL_DURATION = timedelta(hours=3)
LOCK_FILE_PATH = "/tmp/poll_match_results.lock"


class Command(BaseCommand):
    help = "Poll for results of matches that should have finished and write their scores."

    def _ts(self):
        return timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    def handle(self, *args, **options):
        unfinished = list(Match.objects.filter(home_score__isnull=True, away_score__isnull=True))

        now = timezone.now()
        if not any(match.kickoff + POLL_AFTER_KICKOFF <= now for match in unfinished):
            self.stdout.write(f"[{self._ts()}] No unfinished matches past kickoff + 100 minutes.")
            return

        lock_file = open(LOCK_FILE_PATH, "w")
        try:
            fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self.stdout.write(f"[{self._ts()}] Another instance is already running — exiting.")
            lock_file.close()
            return

        try:
            self._poll(unfinished)
        finally:
            fcntl.flock(lock_file, fcntl.LOCK_UN)
            lock_file.close()

    def _poll(self, matches):
        remaining = {match.id: match for match in matches}
        deadline = timezone.now() + MAX_POLL_DURATION

        while remaining:
            now = timezone.now()
            for match_id, match in list(remaining.items()):
                if match.kickoff + POLL_AFTER_KICKOFF > now:
                    continue

                self.stdout.write(f"[{self._ts()}] Polling result for {match}...")
                try:
                    result = get_match_data(match.home_team.name, match.away_team.name, match.kickoff)
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(f"[{self._ts()}] Failed to poll result for {match}: {exc}"))
                    continue

                home_score = result["home_score"]
                away_score = result["away_score"]
                match_time = result["match_time"]
                finished = result["match_finished"]
                self.stdout.write(
                    f"[{self._ts()}] {match}: {home_score}-{away_score}"
                    f" ({match_time}, {'finished' if finished else 'in progress'})"
                )

                if not finished:
                    continue

                match.home_score = home_score
                match.away_score = away_score
                match.save(update_fields=["home_score", "away_score"])
                self.stdout.write(
                    self.style.SUCCESS(f"[{self._ts()}] {match} finished: {home_score}-{away_score}")
                )
                del remaining[match_id]

            if not remaining:
                break

            if timezone.now() + POLL_INTERVAL > deadline:
                self.stdout.write(
                    self.style.WARNING(f"[{self._ts()}] Giving up for now, still pending: {list(remaining.values())}")
                )
                break

            time.sleep(POLL_INTERVAL.total_seconds())
