from django.db import models


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
        Team, on_delete=models.PROTECT, related_name="home_matches",
        null=True, blank=True
    )
    away_team = models.ForeignKey(
        Team, on_delete=models.PROTECT, related_name="away_matches",
        null=True, blank=True
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
