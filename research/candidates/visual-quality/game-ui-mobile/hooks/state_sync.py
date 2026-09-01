"""
hooks/state_sync.py — State Synchronization Hooks
Provides hooks for synchronizing state between skill invocations,
maintaining context, and managing persistence.
"""
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
import json
import hashlib
from pathlib import Path

from . import HookContext, HookResult, HookEvent


@dataclass
class StateSnapshot:
    """Snapshot of skill execution state."""
    session_id: str
    timestamp: datetime
    skill_name: str
    current_step: int
    total_steps: int
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat(),
            "skill_name": self.skill_name,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "data": self.data,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StateSnapshot":
        """Create from dictionary."""
        return cls(
            session_id=data["session_id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            skill_name=data["skill_name"],
            current_step=data["current_step"],
            total_steps=data["total_steps"],
            data=data.get("data", {}),
            metadata=data.get("metadata", {}),
        )


class StateManager:
    """Manages state synchronization between skill invocations."""

    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path or Path(".state")
        self._current_state: Optional[StateSnapshot] = None
        self._history: list[StateSnapshot] = []
        self._subscribers: list[Callable[[StateSnapshot], None]] = []

    def create_snapshot(
        self,
        session_id: str,
        skill_name: str,
        current_step: int,
        total_steps: int,
        data: Dict[str, Any],
    ) -> StateSnapshot:
        """Create a new state snapshot."""
        snapshot = StateSnapshot(
            session_id=session_id,
            timestamp=datetime.now(),
            skill_name=skill_name,
            current_step=current_step,
            total_steps=total_steps,
            data=data,
            metadata={
                "snapshot_hash": self._compute_hash(data),
            },
        )
        return snapshot

    def save_snapshot(self, snapshot: StateSnapshot) -> None:
        """Save a snapshot to storage."""
        self._current_state = snapshot
        self._history.append(snapshot)

        self.storage_path.mkdir(parents=True, exist_ok=True)
        session_file = self.storage_path / f"{snapshot.session_id}.json"

        existing_data = {}
        if session_file.exists():
            with open(session_file, "r", encoding="utf-8") as f:
                existing_data = json.load(f)

        existing_data["snapshots"] = existing_data.get("snapshots", [])
        existing_data["snapshots"].append(snapshot.to_dict())
        existing_data["current"] = snapshot.to_dict()

        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, indent=2)

        self._notify_subscribers(snapshot)

    def load_snapshot(self, session_id: str) -> Optional[StateSnapshot]:
        """Load the latest snapshot for a session."""
        session_file = self.storage_path / f"{session_id}.json"
        if not session_file.exists():
            return None

        with open(session_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        current = data.get("current")
        if current:
            return StateSnapshot.from_dict(current)
        return None

    def get_history(self, session_id: str, limit: int = 10) -> list[StateSnapshot]:
        """Get snapshot history for a session."""
        session_file = self.storage_path / f"{session_id}.json"
        if not session_file.exists():
            return []

        with open(session_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        snapshots = data.get("snapshots", [])
        return [StateSnapshot.from_dict(s) for s in snapshots[-limit:]]

    def subscribe(self, callback: Callable[[StateSnapshot], None]) -> None:
        """Subscribe to state changes."""
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[StateSnapshot], None]) -> None:
        """Unsubscribe from state changes."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def _notify_subscribers(self, snapshot: StateSnapshot) -> None:
        """Notify all subscribers of state change."""
        for callback in self._subscribers:
            try:
                callback(snapshot)
            except Exception as e:
                print(f"[ERROR] State subscriber error: {e}")

    def _compute_hash(self, data: Dict[str, Any]) -> str:
        """Compute hash of data for change detection."""
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]


# Global state manager
_state_manager: Optional[StateManager] = None


def get_state_manager() -> StateManager:
    """Get global state manager instance."""
    global _state_manager
    if _state_manager is None:
        _state_manager = StateManager()
    return _state_manager


# State synchronization hooks
def before_execute_hook(context: HookContext) -> HookResult:
    """Hook to save state before execution."""
    manager = get_state_manager()

    if context.data and "session_id" in context.data:
        session_id = context.data["session_id"]
        skill_name = context.skill_name or "unknown"
        current_step = context.data.get("current_step", 0)
        total_steps = context.data.get("total_steps", 1)

        snapshot = manager.create_snapshot(
            session_id=session_id,
            skill_name=skill_name,
            current_step=current_step,
            total_steps=total_steps,
            data=context.data,
        )
        manager.save_snapshot(snapshot)

    return HookResult(success=True)


def after_execute_hook(context: HookContext) -> HookResult:
    """Hook to update state after execution."""
    manager = get_state_manager()

    if context.data and "session_id" in context.data:
        session_id = context.data["session_id"]
        snapshot = manager.load_snapshot(session_id)

        if snapshot:
            snapshot.current_step = context.data.get("current_step", snapshot.current_step + 1)
            snapshot.data.update(context.data)
            manager.save_snapshot(snapshot)

    return HookResult(success=True)


def register_state_sync_hooks():
    """Register state synchronization hooks."""
    from . import register_hook, HookEvent
    register_hook(HookEvent.BEFORE_SKILL_EXECUTE, before_execute_hook, priority=10)
    register_hook(HookEvent.AFTER_SKILL_EXECUTE, after_execute_hook, priority=10)
