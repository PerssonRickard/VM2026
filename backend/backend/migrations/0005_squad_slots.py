import django.db.models.deletion
from django.db import migrations, models


def seed_squad_slots(apps, schema_editor):
    Team = apps.get_model("backend", "Team")
    SquadSlot = apps.get_model("backend", "SquadSlot")
    for team in Team.objects.all():
        for order in range(1, 12):
            SquadSlot.objects.get_or_create(team=team, order=order, defaults={"name": ""})


def remove_squad_slots(apps, schema_editor):
    SquadSlot = apps.get_model("backend", "SquadSlot")
    SquadSlot.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0004_player_bet"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="formation",
            field=models.CharField(
                choices=[
                    ("4-3-3", "4-3-3"),
                    ("4-4-2", "4-4-2"),
                    ("4-2-3-1", "4-2-3-1"),
                    ("3-5-2", "3-5-2"),
                    ("5-3-2", "5-3-2"),
                ],
                default="4-3-3",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="player",
            name="can_edit_squads",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="SquadSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order", models.PositiveSmallIntegerField()),
                ("name", models.CharField(blank=True, default="", max_length=80)),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="squad_slots", to="backend.team")),
            ],
            options={
                "ordering": ["team", "order"],
                "unique_together": {("team", "order")},
            },
        ),
        migrations.RunPython(seed_squad_slots, remove_squad_slots),
    ]
