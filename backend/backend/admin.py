from django.contrib import admin
from backend.models import Highscore


class HighscoreAdmin(admin.ModelAdmin):
    readonly_fields = ("created_at",)
    list_display = ("name", "score", "created_at")


admin.site.register(Highscore, HighscoreAdmin)
