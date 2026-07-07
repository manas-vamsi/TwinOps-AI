from twinops.core.ratelimit import _check, _hits


def test_sliding_window_allows_then_blocks_then_recovers() -> None:
    _hits.clear()
    # 5 calls allowed in the window
    for _ in range(5):
        assert _check("t", max_calls=5, window_s=60, now=100.0) is True
    # 6th is blocked
    assert _check("t", max_calls=5, window_s=60, now=100.0) is False
    # once the window passes, calls are allowed again
    assert _check("t", max_calls=5, window_s=60, now=161.0) is True


def test_limits_are_per_key() -> None:
    _hits.clear()
    assert _check("a", max_calls=1, window_s=60, now=0.0) is True
    assert _check("a", max_calls=1, window_s=60, now=0.0) is False
    assert _check("b", max_calls=1, window_s=60, now=0.0) is True  # different key unaffected
