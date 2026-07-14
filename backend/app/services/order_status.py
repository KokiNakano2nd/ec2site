from .. import models

ADMIN_STATUS_TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"processing", "shipped"}),
    "processing": frozenset({"shipped"}),
    "shipped": frozenset({"completed"}),
    "completed": frozenset(),
    "cancelled": frozenset(),
    "return_requested": frozenset(),
    "returned": frozenset(),
}


class InvalidOrderStatusError(Exception):
    pass


class InvalidOrderTransitionError(Exception):
    pass


def update_order_status(order: models.Order, new_status: str) -> None:
    allowed_next_statuses = ADMIN_STATUS_TRANSITIONS.get(order.status)
    if allowed_next_statuses is None or new_status not in ADMIN_STATUS_TRANSITIONS:
        raise InvalidOrderStatusError
    if new_status == order.status:
        return
    if new_status not in allowed_next_statuses:
        raise InvalidOrderTransitionError
    order.status = new_status
