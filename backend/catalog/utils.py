from django.utils.text import slugify


def unique_slug(model, value: str, max_length: int = 120) -> str:
    """Slugify `value`, adding -2, -3 … until it is unique for `model`."""
    base = slugify(value)[: max_length - 8] or "item"
    slug, n = base, 2
    while model.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug
