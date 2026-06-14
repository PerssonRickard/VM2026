import hashlib
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from backend.models import AnonymousVisit, Player

LAST_SEEN_UPDATE_INTERVAL = timedelta(seconds=30)


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class TrackLastSeenMiddleware:
    """Tracks recently-active visitors for the admin "who's online" view.

    Logged-in users update Player.last_seen. Anonymous visitors are
    fingerprinted by IP + user agent and tracked in AnonymousVisit.
    Both are throttled to avoid a write on every request.

    Runs after the view, since DRF authenticates the request during
    dispatch and sets request.user on the underlying Django request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        now = timezone.now()
        cutoff = now - LAST_SEEN_UPDATE_INTERVAL
        user = getattr(request, "user", None)

        if user is not None and user.is_authenticated:
            Player.objects.filter(user=user).filter(
                Q(last_seen__isnull=True) | Q(last_seen__lt=cutoff)
            ).update(last_seen=now)
        else:
            ip = get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]
            visitor_key = hashlib.sha256(f"{ip}:{user_agent}".encode()).hexdigest()

            try:
                visit = AnonymousVisit.objects.get(visitor_key=visitor_key)
                if visit.last_seen < cutoff:
                    visit.last_seen = now
                    visit.ip_address = ip
                    visit.save(update_fields=["last_seen", "ip_address"])
            except AnonymousVisit.DoesNotExist:
                AnonymousVisit.objects.create(
                    visitor_key=visitor_key, ip_address=ip, last_seen=now
                )

        return response
