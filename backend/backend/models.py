from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Highscore(models.Model):
    name = models.CharField(max_length=50)
    score = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score", "created_at"]

    def __str__(self):
        return f"{self.name} — {self.score}"


class Team(models.Model):
    name = models.CharField(max_length=60)
    flag_code = models.CharField(
        max_length=10
    )  # ISO 3166-1 alpha-2 or subdivision, e.g. "BR", "GB-ENG"

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Match(models.Model):
    STAGE_CHOICES = [
        ("Group", "Group Stage"),
        ("R32", "Round of 32"),
        ("R16", "Round of 16"),
        ("QF", "Quarter-Final"),
        ("SF", "Semi-Final"),
        ("3rd", "Third Place"),
        ("Final", "Final"),
    ]

    home_team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="home_matches",
        null=True,
        blank=True,
    )
    away_team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="away_matches",
        null=True,
        blank=True,
    )
    home_label = models.CharField(max_length=60, blank=True, default="")
    away_label = models.CharField(max_length=60, blank=True, default="")
    kickoff = models.DateTimeField()
    stage = models.CharField(max_length=10, choices=STAGE_CHOICES, default="Group")
    group = models.CharField(
        max_length=1, blank=True, default=""
    )  # "A"–"L", group stage only
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    odds_home = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    odds_draw = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    odds_away = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    is_locked = models.BooleanField(default=False)

    class Meta:
        ordering = ["kickoff"]
        verbose_name_plural = "matches"

    def __str__(self):
        stage_label = f"[{self.stage}{self.group}]" if self.group else f"[{self.stage}]"
        return f"{stage_label} {self.home_team} vs {self.away_team} — {self.kickoff:%Y-%m-%d %H:%M} UTC"


class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="player")
    points_balance = models.IntegerField(default=1000)

    def __str__(self):
        return self.user.username


class Bet(models.Model):
    OUTCOME_CHOICES = [("H", "Home Win"), ("D", "Draw"), ("A", "Away Win")]

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="bets")
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="bets")
    outcome = models.CharField(max_length=1, choices=OUTCOME_CHOICES)
    amount = models.PositiveIntegerField()
    odds_at_bet = models.DecimalField(max_digits=5, decimal_places=2)
    is_settled = models.BooleanField(default=False)
    payout = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("player", "match")]

    def __str__(self):
        return f"{self.player} → {self.match} ({self.outcome}, {self.amount}p)"


def settle_match(match):
    """Settle (or re-settle) all bets for a match that has a final score.

    Safe to call multiple times — reverses any previous settlement before
    recalculating, so admin corrections to scores are handled correctly.
    """
    if match.home_score is None or match.away_score is None:
        return

    # TODO: can this handle overtime + penalties?
    if match.home_score > match.away_score:
        winning_outcome = "H"
    elif match.home_score == match.away_score:
        winning_outcome = "D"
    else:
        winning_outcome = "A"

    bets = list(match.bets.select_related("player").all())

    # Reverse any previous settlement so corrections work correctly.
    for bet in bets:
        if bet.is_settled:
            if bet.payout and bet.payout > 0:
                bet.player.points_balance -= bet.payout
            else:
                # Loser had their stake deducted at bet time; refund it.
                bet.player.points_balance += bet.amount
            bet.player.save(update_fields=["points_balance"])
            bet.is_settled = False
            bet.payout = None
            bet.save(update_fields=["is_settled", "payout"])

    # Settle with the (possibly new) result.
    for bet in bets:
        if bet.outcome == winning_outcome:
            bet.payout = round(bet.amount * float(bet.odds_at_bet))
            bet.player.points_balance += bet.payout
        else:
            bet.payout = 0
        bet.is_settled = True
        bet.save(update_fields=["is_settled", "payout"])
        bet.player.save(update_fields=["points_balance"])


@receiver(post_save, sender=Match)
def on_match_save(sender, instance, **kwargs):
    if instance.home_score is not None and instance.away_score is not None:
        settle_match(instance)
