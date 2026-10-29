from django.db import migrations, models


def company_accounts_become_sellers(apps, schema_editor):
    Profile = apps.get_model("accounts", "Profile")
    Profile.objects.filter(role="company").update(role="seller")


def sellers_revert_to_company(apps, schema_editor):
    Profile = apps.get_model("accounts", "Profile")
    Profile.objects.filter(role="seller").update(role="company")


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="role",
            field=models.CharField(
                choices=[
                    ("customer", "Customer"),
                    ("seller", "Seller"),
                    ("management", "Company management"),
                ],
                default="customer",
                max_length=10,
            ),
        ),
        migrations.RunPython(company_accounts_become_sellers, sellers_revert_to_company),
    ]
