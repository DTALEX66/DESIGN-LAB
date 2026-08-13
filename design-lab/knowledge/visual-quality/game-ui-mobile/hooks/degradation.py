"""
hooks/degradation.py — Degradation Level Handling Hooks
Provides hooks for managing graceful degradation when data sources fail.
"""
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from . import HookContext, HookResult, HookEvent


class DegradationLevel(Enum):
    """Degradation levels for graceful failure handling."""
    FULL = 0
    """All primary sources reachable - full evidenced analysis."""

    PARTIAL = 1
    """Some primary sources fail - use secondary/aggregate sources with flags."""

    KNOWLEDGE_BASE_ONLY = 2
    """Most live sources fail - use knowledge base with historical context flag."""

    DATA_UNAVAILABLE = 3
    """Required input missing/stale - proceed with available, mark missing fields."""

    COMPLETE_FAILURE = 4
    """All sources AND knowledge base fail - emit DATA UNAVAILABLE notice."""


@dataclass
class DegradationState:
    """Current degradation state."""
    level: DegradationLevel
    timestamp: datetime
    failed_sources: List[str]
    substituted_sources: Dict[str, str]
    missing_data_fields: List[str]
    flags: List[str]

    def __post_init__(self):
        if self.failed_sources is None:
            self.failed_sources = []
        if self.substituted_sources is None:
            self.substituted_sources = {}
        if self.missing_data_fields is None:
            self.missing_data_fields = []
        if self.flags is None:
            self.flags = []


class DegradationManager:
    """Manages degradation levels and graceful failure handling."""

    def __init__(self):
        self._state: Optional[DegradationState] = None
        self._history: list[DegradationState] = []

    def get_level(self) -> DegradationLevel:
        """Get current degradation level."""
        if self._state is None:
            return DegradationLevel.FULL
        return self._state.level

    def set_level(self, level: DegradationLevel, reason: str = "") -> None:
        """Set degradation level and emit event."""
        old_level = self.get_level()
        if old_level == level:
            return

        self._state = DegradationState(
            level=level,
            timestamp=datetime.now(),
            failed_sources=[],
            substituted_sources={},
            missing_data_fields=[],
            flags=[reason] if reason else [],
        )
        self._history.append(self._state)

        # Emit degradation level changed event
        from . import emit_event, HookEvent
        context = HookContext(
            event=HookEvent.DEGRADATION_LEVEL_CHANGED,
            timestamp=datetime.now(),
            degradation_level=level.value,
            data={
                "old_level": old_level.value,
                "new_level": level.value,
                "reason": reason,
            },
        )
        emit_event(HookEvent.DEGRADATION_LEVEL_CHANGED, context)

    def record_failure(self, source: str) -> None:
        """Record a source failure."""
        if self._state is None:
            self.set_level(DegradationLevel.PARTIAL, f"Source failure: {source}")
        self._state.failed_sources.append(source)

    def record_substitution(self, original: str, substitute: str) -> None:
        """Record a source substitution."""
        if self._state is None:
            return
        self._state.substituted_sources[original] = substitute

    def record_missing_data(self, field: str) -> None:
        """Record a missing data field."""
        if self._state is None:
            return
        self._state.missing_data_fields.append(field)

    def add_flag(self, flag: str) -> None:
        """Add a flag to the current state."""
        if self._state is None:
            return
        self._state.flags.append(flag)

    def get_banner(self) -> str:
        """Get the limitation banner for current degradation level."""
        level = self.get_level()
        if level == DegradationLevel.FULL:
            return ""

        flags_text = ""
        if self._state and self._state.flags:
            flags_text = " " + " ".join(self._state.flags)

        return (
            "---\n"
            f"⚠️ LIMITATION NOTICE\n"
            f"This output was generated with reduced data availability (Level {level.value}).{flags_text}\n"
            f"Cross-check with current data before acting on it. "
        )

    def should_proceed(self) -> bool:
        """Check if execution should proceed given current degradation level."""
        return self.get_level() != DegradationLevel.COMPLETE_FAILURE

    def get_history(self, limit: int = 10) -> List[DegradationState]:
        """Get degradation history."""
        return self._history[-limit:]


# Global degradation manager
_degradation_manager: Optional[DegradationManager] = None


def get_degradation_manager() -> DegradationManager:
    """Get global degradation manager instance."""
    global _degradation_manager
    if _degradation_manager is None:
        _degradation_manager = DegradationManager()
    return _degradation_manager


# Degradation handling hooks
def source_failure_hook(context: HookContext) -> HookResult:
    """Hook to handle source failures."""
    manager = get_degradation_manager()

    if context.data and "failed_source" in context.data:
        source = context.data["failed_source"]
        manager.record_failure(source)

        # Auto-escalate degradation level based on failure count
        if len(manager._state.failed_sources) >= 3:
            manager.set_level(DegradationLevel.KNOWLEDGE_BASE_ONLY, "Multiple source failures")
        elif len(manager._state.failed_sources) >= 1:
            manager.set_level(DegradationLevel.PARTIAL, "Source failure occurred")

    return HookResult(success=True)


def fallback_triggered_hook(context: HookContext) -> HookResult:
    """Hook to handle fallback triggers."""
    manager = get_degradation_manager()

    if context.data and "fallback_type" in context.data:
        fallback_type = context.data["fallback_type"]
        original = context.data.get("original", "unknown")
        manager.record_substitution(original, fallback_type)

        # Emit fallback triggered event
        from . import emit_event, HookEvent
        fallback_context = HookContext(
            event=HookEvent.FALLBACK_TRIGGERED,
            timestamp=datetime.now(),
            degradation_level=manager.get_level().value,
            data={
                "fallback_type": fallback_type,
                "original": original,
            },
        )
        emit_event(HookEvent.FALLBACK_TRIGGERED, fallback_context)

    return HookResult(success=True)


def register_degradation_hooks():
    """Register degradation handling hooks."""
    from . import register_hook, HookEvent
    register_hook(HookEvent.ERROR_OCCURRED, source_failure_hook, priority=10)
    register_hook(HookEvent.FALLBACK_TRIGGERED, fallback_triggered_hook, priority=10)


class StateSynchronizer:
    """Synchronizes state across components with degradation awareness."""

    def __init__(self, degradation_manager: Optional[DegradationManager] = None):
        self.degradation_manager = degradation_manager or get_degradation_manager()
        self._snapshots: Dict[str, Dict[str, Any]] = {}
        self._subscribers: Dict[str, List[Callable]] = {}

    def create_snapshot(
        self,
        component: str,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a state snapshot."""
        snapshot_id = f"{component}_{datetime.now().isoformat()}"

        self._snapshots[snapshot_id] = {
            "component": component,
            "data": data.copy(),
            "metadata": metadata or {},
            "timestamp": datetime.now(),
            "degradation_level": self.degradation_manager.get_level().value,
        }

        # Notify subscribers
        self._notify_subscribers(component, "snapshot_created", snapshot_id)

        return snapshot_id

    def get_snapshot(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Get a snapshot by ID."""
        return self._snapshots.get(snapshot_id)

    def get_latest_snapshot(self, component: str) -> Optional[Dict[str, Any]]:
        """Get the latest snapshot for a component."""
        component_snapshots = [
            (sid, s) for sid, s in self._snapshots.items()
            if s["component"] == component
        ]

        if not component_snapshots:
            return None

        # Sort by timestamp and return latest
        component_snapshots.sort(key=lambda x: x[1]["timestamp"], reverse=True)
        return component_snapshots[0][1]

    def subscribe(self, component: str, callback: Callable) -> None:
        """Subscribe to state changes for a component."""
        if component not in self._subscribers:
            self._subscribers[component] = []
        self._subscribers[component].append(callback)

    def unsubscribe(self, component: str, callback: Callable) -> bool:
        """Unsubscribe from state changes."""
        if component not in self._subscribers:
            return False

        try:
            self._subscribers[component].remove(callback)
            return True
        except ValueError:
            return False

    def _notify_subscribers(
        self, component: str, event_type: str, data: Any
    ) -> None:
        """Notify subscribers of state changes."""
        if component not in self._subscribers:
            return

        for callback in self._subscribers[component]:
            try:
                callback(event_type, data)
            except Exception:
                # Continue notifying even if one callback fails
                pass

    def synchronize_with_degradation(self, component: str) -> Dict[str, Any]:
        """Synchronize component state with current degradation level."""
        level = self.degradation_manager.get_level()

        # Get latest snapshot
        snapshot = self.get_latest_snapshot(component)

        # Prepare sync data
        sync_data = {
            "component": component,
            "degradation_level": level.value,
            "degradation_flags": self.degradation_manager._state.flags if self.degradation_manager._state else [],
            "failed_sources": self.degradation_manager._state.failed_sources if self.degradation_manager._state else [],
            "substituted_sources": self.degradation_manager._state.substituted_sources if self.degradation_manager._state else {},
            "last_snapshot": snapshot,
            "sync_timestamp": datetime.now().isoformat(),
        }

        # Notify subscribers
        self._notify_subscribers(component, "degradation_sync", sync_data)

        return sync_data

    def cleanup_old_snapshots(self, max_age_seconds: int = 3600) -> int:
        """Clean up snapshots older than max_age_seconds."""
        cutoff = datetime.now() - timedelta(seconds=max_age_seconds)

        to_remove = [
            sid for sid, snapshot in self._snapshots.items()
            if snapshot["timestamp"] < cutoff
        ]

        for sid in to_remove:
            del self._snapshots[sid]

        return len(to_remove)

    def get_stats(self) -> Dict[str, Any]:
        """Get state synchronizer statistics."""
        component_counts = {}
        for snapshot in self._snapshots.values():
            component = snapshot["component"]
            component_counts[component] = component_counts.get(component, 0) + 1

        return {
            "total_snapshots": len(self._snapshots),
            "snapshots_by_component": component_counts,
            "total_subscribers": sum(len(subs) for subs in self._subscribers.values()),
            "degradation_level": self.degradation_manager.get_level().value,
        }


# Global state synchronizer
_state_synchronizer: Optional[StateSynchronizer] = None


def get_state_synchronizer() -> StateSynchronizer:
    """Get global state synchronizer instance."""
    global _state_synchronizer
    if _state_synchronizer is None:
        _state_synchronizer = StateSynchronizer()
    return _state_synchronizer


def before_skill_sync(context: HookContext) -> HookResult:
    """Sync state before skill execution."""
    synchronizer = get_state_synchronizer()

    if context.skill_name:
        synchronizer.synchronize_with_degradation(context.skill_name)

    return HookResult(success=True)


def after_skill_sync(context: HookContext) -> HookResult:
    """Sync state after skill execution."""
    synchronizer = get_state_synchronizer()

    if context.skill_name and context.data:
        # Create snapshot of post-execution state
        synchronizer.create_snapshot(
            context.skill_name,
            context.data,
            {"phase": "after_execution"}
        )

    return HookResult(success=True)


def register_state_sync_hooks():
    """Register state synchronization hooks."""
    from . import register_hook, HookEvent
    register_hook(HookEvent.BEFORE_SKILL_EXECUTE, before_skill_sync, priority=5)
    register_hook(HookEvent.AFTER_SKILL_EXECUTE, after_skill_sync, priority=5)


__all__ = [
    "DegradationLevel",
    "DegradationState",
    "DegradationManager",
    "get_degradation_manager",
    "register_degradation_hooks",
    "StateSynchronizer",
    "get_state_synchronizer",
    "register_state_sync_hooks",
]
