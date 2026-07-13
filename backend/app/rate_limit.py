import time
from collections import defaultdict

from .logging_config import get_logger

logger = get_logger(__name__)

_hits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Returns True if the request is allowed, False if the limit is exceeded.

    Fixed-window-ish in-memory counter, keyed by caller (e.g. "login:1.2.3.4").
    Not safe across multiple processes; see NFR-022 for the accepted scope.
    """
    now = time.time()
    hits = _hits[key]
    cutoff = now - window_seconds
    while hits and hits[0] < cutoff:
        hits.pop(0)

    if len(hits) >= max_requests:
        logger.warning("レート制限超過(key=%s)", key)
        return False

    hits.append(now)
    return True


def reset() -> None:
    _hits.clear()
