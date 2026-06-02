from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0006_team_manager_description"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="bet",
            name="amount",
        ),
        migrations.AlterField(
            model_name="player",
            name="points_balance",
            field=models.IntegerField(default=0),
        ),
    ]
