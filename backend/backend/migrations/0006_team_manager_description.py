from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0005_squad_slots"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="manager",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="team",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
    ]
