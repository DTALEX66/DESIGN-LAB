"""
hooks/__init__.py — Lifecycle and Event Hook System
Provides pre/post execution hooks, state synchronization, and event emission
for the skill harness.
"""
from typing import Callable, Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import json


class HookEvent(Enum):
    """Hook event types."""
    # Skill lifecycle
    BEFORE_SKILL_LOAD = "before_skill_load"
    AFTER_SKILL_LOAD = "after_skill_load"
    BEFORE_SKILL_EXECUTE = "before_skill_execute"
    AFTER_SKILL_EXECUTE = "after_skill_execute"
    BEFORE_SUB_SKILL_INVOKE = "before_sub_skill_invoke"
    AFTER_SUB_SKILL_INVOKE = "after_sub_skill_invoke"

    # Quality gates
    BEFORE_QUALITY_GATE = "before_quality_gate"
    AFTER_QUALITY_GATE = "after_quality_gate"
    QUALITY_GATE_FAILED = "quality_gate_failed"
    QUALITY_GATE_FIXED = "quality_gate_fixed"

    # Data operations
    BEFORE_DATA_FETCH = "before_data_fetch"
    AFTER_DATA_FETCH = "after_data_fetch"
    BEFORE_DATA_WRITE = "before_data_write"
    AFTER_DATA_WRITE = "after_data_write"

    # Knowledge base
    BEFORE_KNOWLEDGE_QUERY = "before_knowledge_query"
    AFTER_KNOWLEDGE_QUERY = "after_knowledge_query"
    BEFORE_KNOWLEDGE_UPDATE = "before_knowledge_update"
    AFTER_KNOWLEDGE_UPDATE = "after_knowledge_update"

    # Degradation handling
    DEGRADATION_LEVEL_CHANGED = "degradation_level_changed"
    FALLBACK_TRIGGERED = "fallback_triggered"

    # System events
    ERROR_OCCURRED = "error_occurred"
    SHUTDOWN = "shutdown"


@dataclass
class HookContext:
    """Context passed to hook functions."""
    event: HookEvent
    timestamp: datetime
    skill_name: Optional[str] = None
    sub_skill_name: Optional[str] = None
    gate_name: Optional[str] = None
    degradation_level: Optional[int] = None
    data: Dict[str, Any] = None
    error: Optional[Exception] = None

    def __post_init__(self):
        if self.data is None:
            self.data = {}


@dataclass
class HookResult:
    """Result from hook execution."""
    success: bool
    data: Dict[str, Any] = None
    error: Optional[str] = None
    should_abort: bool = False

    def __post_init__(self):
        if self.data is None:
            self.data = {}


HookHandler = Callable[[HookContext], HookResult]


class HookRegistry:
    """Registry for skill hooks."""

    def __init__(self):
        self._hooks: Dict[HookEvent, List[HookHandler]] = {}
        self._metadata: Dict[str, Any] = {
            "registered_count": 0,
            "execution_count": 0,
            "abort_count": 0,
        }

    def register(self, event: HookEvent, handler: HookHandler, priority: int = 0) -> None:
        """Register a hook handler for an event."""
        if event not in self._hooks:
            self._hooks[event] = []
        self._hooks[event].append((handler, priority))
        self._hooks[event].sort(key=lambda x: x[1], reverse=True)
        self._metadata["registered_count"] += 1

    def unregister(self, event: HookEvent, handler: HookHandler) -> bool:
        """Unregister a hook handler."""
        if event not in self._hooks:
            return False
        for i, (h, _) in enumerate(self._hooks[event]):
            if h == handler:
                self._hooks[event].pop(i)
                return True
        return False

    def emit(self, event: HookEvent, context: HookContext) -> List[HookResult]:
        """Emit an event and execute all registered hooks."""
        results = []
        self._metadata["execution_count"] += 1

        for handler, priority in self._hooks.get(event, []):
            try:
                result = handler(context)
                results.append(result)
                if result.should_abort:
                    self._metadata["abort_count"] += 1
                    break
            except Exception as e:
                results.append(HookResult(
                    success=False,
                    error=str(e),
                ))

        return results

    def get_metadata(self) -> Dict[str, Any]:
        """Get hook registry metadata."""
        return {
            **self._metadata,
            "events_registered": len(self._hooks),
            "handlers_per_event": {
                event.value: len(handlers)
                for event, handlers in self._hooks.items()
            },
        }


# Global hook registry
_registry: Optional[HookRegistry] = None


def get_hook_registry() -> HookRegistry:
    """Get global hook registry instance."""
    global _registry
    if _registry is None:
        _registry = HookRegistry()
    return _registry


def register_hook(event: HookEvent, handler: HookHandler, priority: int = 0) -> None:
    """Register a hook handler."""
    get_hook_registry().register(event, handler, priority)


def unregister_hook(event: HookEvent, handler: HookHandler) -> bool:
    """Unregister a hook handler."""
    return get_hook_registry().unregister(event, handler)


def emit_event(event: HookEvent, context: HookContext) -> List[HookResult]:
    """Emit an event to all registered hooks."""
    return get_hook_registry().emit(event, context)


# Built-in hooks
def log_hook(context: HookContext) -> HookResult:
    """Built-in logging hook."""
    print(f"[HOOK] {context.event.value} at {context.timestamp.isoformat()}")
    if context.skill_name:
        print(f"  skill: {context.skill_name}")
    if context.sub_skill_name:
        print(f"  sub-skill: {context.sub_skill_name}")
    if context.error:
        print(f"  error: {context.error}")
    return HookResult(success=True)


def metrics_hook(context: HookContext) -> HookResult:
    """Built-in metrics collection hook."""
    # This would normally send to a metrics system
    return HookResult(
        success=True,
        data={
            "event": context.event.value,
            "timestamp": context.timestamp.isoformat(),
        }
    )


def register_builtin_hooks():
    """Register built-in hooks."""
    registry = get_hook_registry()
    for event in HookEvent:
        registry.register(event, log_hook, priority=0)
        registry.register(event, metrics_hook, priority=-10)

    # Register degradation and state sync hooks
    from .degradation import register_degradation_hooks, register_state_sync_hooks
    register_degradation_hooks()
    register_state_sync_hooks()
