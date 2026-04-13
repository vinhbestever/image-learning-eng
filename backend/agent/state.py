from dataclasses import dataclass, field


@dataclass
class SessionInfo:
    """Tracks session metadata for the API layer."""
    thread_id: str
    step: int = 0
    total: int = 5
    questions_asked: list[str] = field(default_factory=list)
