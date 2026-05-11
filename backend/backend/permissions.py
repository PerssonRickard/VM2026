from rest_framework.permissions import BasePermission

from backend.models import Player


class CanEditSquads(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.player.can_edit_squads
        except Player.DoesNotExist:
            return False
