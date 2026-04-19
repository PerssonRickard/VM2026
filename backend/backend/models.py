# keepie/models.py
from django.db import models


class Highscore(models.Model):
    name = models.CharField(max_length=50)
    score = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score", "created_at"]

    def __str__(self):
        return f"{self.name} — {self.score}"
