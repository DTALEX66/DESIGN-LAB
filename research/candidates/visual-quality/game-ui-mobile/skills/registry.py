"""
skills/registry.py — Skill Registration and Resolution System
Provides modular skill-registry pattern with dynamic skill loading, resolution,
and execution management.
"""
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from datetime import datetime
import json
import re


@dataclass
class SkillMetadata:
    """Metadata for a registered skill."""
    skill_id: str
    name: str
    description: str
    version: str
    file_path: Path
    category: str = "general"
    priority: int = 0
    enabled: bool = True
    loaded_at: Optional[datetime] = None
    execution_count: int = 0
    success_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "skill_id": self.skill_id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "file_path": str(self.file_path),
            "category": self.category,
            "priority": self.priority,
            "enabled": self.enabled,
            "loaded_at": self.loaded_at.isoformat() if self.loaded_at else None,
            "execution_count": self.execution_count,
            "success_count": self.success_count,
            "success_rate": (self.success_count / self.execution_count * 100) if self.execution_count > 0 else 0,
        }


@dataclass
class SkillResolutionResult:
    """Result of skill resolution."""
    skill_id: Optional[str]
    confidence: float
    reasoning: List[str]
    alternative_skills: List[tuple]  # [(skill_id, confidence), ...]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "skill_id": self.skill_id,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "alternative_skills": [
                {"skill_id": sid, "confidence": conf}
                for sid, conf in self.alternative_skills
            ],
        }


class SkillRegistry:
    """Registry for managing and resolving skills."""

    def __init__(self, skills_dir: Optional[Path] = None):
        self._skills: Dict[str, SkillMetadata] = {}
        self._skills_dir = skills_dir or Path.cwd() / "skills"
        self._resolution_cache: Dict[str, SkillResolutionResult] = {}
        self._cache_hits = 0
        self._cache_misses = 0

    def register_skill(
        self,
        skill_id: str,
        name: str,
        description: str,
        file_path: Path,
        version: str = "1.0.0",
        category: str = "general",
        priority: int = 0,
    ) -> SkillMetadata:
        """Register a skill with metadata."""
        metadata = SkillMetadata(
            skill_id=skill_id,
            name=name,
            description=description,
            version=version,
            file_path=file_path,
            category=category,
            priority=priority,
            loaded_at=datetime.now(),
        )

        self._skills[skill_id] = metadata
        return metadata

    def unregister_skill(self, skill_id: str) -> bool:
        """Unregister a skill."""
        if skill_id not in self._skills:
            return False

        del self._skills[skill_id]
        # Clear cache entries that might reference this skill
        self._resolution_cache = {
            k: v for k, v in self._resolution_cache.items()
            if v.skill_id != skill_id and
               not any(sid == skill_id for sid, _ in v.alternative_skills)
        }
        return True

    def get_skill(self, skill_id: str) -> Optional[SkillMetadata]:
        """Get skill metadata by ID."""
        return self._skills.get(skill_id)

    def list_skills(
        self,
        category: Optional[str] = None,
        enabled_only: bool = True,
    ) -> List[SkillMetadata]:
        """List all registered skills, optionally filtered."""
        skills = list(self._skills.values())

        if category:
            skills = [s for s in skills if s.category == category]

        if enabled_only:
            skills = [s for s in skills if s.enabled]

        # Sort by priority (descending) then name
        skills.sort(key=lambda s: (-s.priority, s.name))

        return skills

    def resolve_skill(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
    ) -> SkillResolutionResult:
        """Resolve the best skill for a given task."""
        # Check cache first
        cache_key = self._make_cache_key(task, context)
        if use_cache and cache_key in self._resolution_cache:
            self._cache_hits += 1
            return self._resolution_cache[cache_key]

        self._cache_misses += 1

        # Get enabled skills
        enabled_skills = [s for s in self._skills.values() if s.enabled]

        if not enabled_skills:
            return SkillResolutionResult(
                skill_id=None,
                confidence=0.0,
                reasoning=["No skills registered or enabled"],
                alternative_skills=[],
            )

        # Score each skill
        scored_skills = []
        for skill in enabled_skills:
            score = self._score_skill_for_task(skill, task, context)
            if score > 0:
                scored_skills.append((skill, score))

        # Sort by score
        scored_skills.sort(key=lambda x: x[1], reverse=True)

        if not scored_skills:
            return SkillResolutionResult(
                skill_id=None,
                confidence=0.0,
                reasoning=["No confident skill match found"],
                alternative_skills=[],
            )

        # Get best and alternatives
        best_skill, best_score = scored_skills[0]
        alternatives = [(s.skill_id, score) for s, score in scored_skills[1:4]]

        # Build reasoning
        reasoning = self._build_resolution_reasoning(scored_skills, task, context)

        result = SkillResolutionResult(
            skill_id=best_skill.skill_id,
            confidence=best_score,
            reasoning=reasoning,
            alternative_skills=alternatives,
        )

        # Cache the result
        if use_cache:
            self._resolution_cache[cache_key] = result

        return result

    def _score_skill_for_task(
        self,
        skill: SkillMetadata,
        task: str,
        context: Optional[Dict[str, Any]],
    ) -> float:
        """Score a skill's relevance to a task."""
        task_lower = task.lower()
        description_lower = skill.description.lower()

        # Base score from keyword overlap
        task_words = set(re.findall(r'\w+', task_lower))
        desc_words = set(re.findall(r'\w+', description_lower))

        if not task_words:
            return 0.0

        overlap = len(task_words & desc_words)
        base_score = overlap / len(task_words)

        # Boost for exact phrase matches
        if any(phrase in task_lower for phrase in skill.name.lower().split()):
            base_score += 0.2

        # Factor in priority
        priority_boost = skill.priority / 100.0
        base_score += priority_boost

        # Factor in past success rate
        if skill.execution_count > 0:
            success_rate = skill.success_count / skill.execution_count
            base_score = base_score * 0.7 + success_rate * 0.3

        # Clamp to valid range
        return max(0.0, min(1.0, base_score))

    def _build_resolution_reasoning(
        self,
        scored_skills: List[tuple],
        task: str,
        context: Optional[Dict[str, Any]],
    ) -> List[str]:
        """Build reasoning chain for resolution."""
        reasoning = []

        reasoning.append(f"Task: '{task}'")
        reasoning.append(f"Evaluated {len(scored_skills)} candidate skills")

        if scored_skills:
            best_skill, best_score = scored_skills[0]
            reasoning.append(
                f"Best match: {best_skill.name} (confidence: {best_score:.2f})"
            )

            if len(scored_skills) > 1:
                second_skill, second_score = scored_skills[1]
                reasoning.append(
                    f"Second choice: {second_skill.name} (confidence: {second_score:.2f})"
                )

        return reasoning

    def _make_cache_key(self, task: str, context: Optional[Dict[str, Any]]) -> str:
        """Create cache key for resolution."""
        # Simple hash-based key
        import hashlib
        key_str = task + json.dumps(context or {}, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()[:16]

    def clear_cache(self) -> None:
        """Clear the resolution cache."""
        self._resolution_cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0

    def record_execution(self, skill_id: str, success: bool) -> None:
        """Record a skill execution for statistics."""
        if skill_id not in self._skills:
            return

        skill = self._skills[skill_id]
        skill.execution_count += 1
        if success:
            skill.success_count += 1

    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics."""
        total_executions = sum(s.execution_count for s in self._skills.values())
        total_successes = sum(s.success_count for s in self._skills.values())

        return {
            "total_skills": len(self._skills),
            "enabled_skills": sum(1 for s in self._skills.values() if s.enabled),
            "categories": len(set(s.category for s in self._skills.values())),
            "total_executions": total_executions,
            "total_successes": total_successes,
            "overall_success_rate": (total_successes / total_executions * 100) if total_executions > 0 else 0,
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "cache_hit_rate": (self._cache_hits / (self._cache_hits + self._cache_misses) * 100)
                if (self._cache_hits + self._cache_misses) > 0 else 0,
        }

    def discover_skills(self, directory: Optional[Path] = None) -> int:
        """Discover and register skills from markdown files."""
        search_dir = directory or self._skills_dir

        if not search_dir.exists():
            return 0

        discovered = 0
        for md_file in search_dir.glob("*.md"):
            # Skip main.md which is the orchestrator
            if md_file.name == "main.md":
                continue

            try:
                # Parse frontmatter and content
                content = md_file.read_text(encoding="utf-8")

                # Extract frontmatter
                if content.startswith("---"):
                    frontmatter_end = content.find("---", 3)
                    if frontmatter_end > 0:
                        frontmatter_text = content[3:frontmatter_end]
                        frontmatter = self._parse_frontmatter(frontmatter_text)

                        skill_id = frontmatter.get("name", md_file.stem)
                        name = frontmatter.get("name", md_file.stem)
                        description = frontmatter.get("description", "")
                        version = frontmatter.get("version", "1.0.0")

                        # Determine category
                        category = "general"
                        if md_file.name.startswith("sub-"):
                            category = "sub_skill"
                        elif md_file.name == "main.md":
                            category = "main"

                        self.register_skill(
                            skill_id=skill_id,
                            name=name,
                            description=description,
                            file_path=md_file,
                            version=version,
                            category=category,
                        )
                        discovered += 1
            except Exception as e:
                # Skip files that can't be parsed
                continue

        return discovered

    def _parse_frontmatter(self, frontmatter_text: str) -> Dict[str, Any]:
        """Parse YAML frontmatter."""
        frontmatter = {}
        for line in frontmatter_text.strip().split("\n"):
            if ":" in line:
                key, value = line.split(":", 1)
                frontmatter[key.strip()] = value.strip()
        return frontmatter


class SkillExecutor:
    """Executes skills with proper context and error handling."""

    def __init__(self, registry: SkillRegistry):
        self.registry = registry
        self._execution_history: List[Dict[str, Any]] = []

    def execute_skill(
        self,
        skill_id: str,
        inputs: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute a skill by ID."""
        skill = self.registry.get_skill(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        if not skill.enabled:
            raise ValueError(f"Skill is disabled: {skill_id}")

        execution_start = datetime.now()
        result = {"success": False, "output": None, "error": None}

        try:
            # Read skill content
            skill_content = skill.file_path.read_text(encoding="utf-8")

            # In a real implementation, this would invoke the skill
            # For now, we simulate execution
            result["output"] = self._simulate_skill_execution(
                skill_content, inputs, context
            )
            result["success"] = True

        except Exception as e:
            result["error"] = str(e)

        execution_end = datetime.now()

        # Record execution
        execution_record = {
            "skill_id": skill_id,
            "started_at": execution_start.isoformat(),
            "completed_at": execution_end.isoformat(),
            "duration_ms": (execution_end - execution_start).total_seconds() * 1000,
            "success": result["success"],
        }
        self._execution_history.append(execution_record)

        # Update skill statistics
        self.registry.record_execution(skill_id, result["success"])

        return result

    def _simulate_skill_execution(
        self,
        skill_content: str,
        inputs: Dict[str, Any],
        context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Simulate skill execution (placeholder)."""
        # In production, this would actually execute the skill
        return {
            "status": "simulated",
            "inputs_received": inputs,
            "context": context,
            "skill_length": len(skill_content),
        }

    def get_execution_history(self, skill_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get execution history, optionally filtered by skill."""
        if skill_id is None:
            return self._execution_history.copy()

        return [
            record for record in self._execution_history
            if record["skill_id"] == skill_id
        ]


# Global registry and executor
_registry: Optional[SkillRegistry] = None
_executor: Optional[SkillExecutor] = None


def get_skill_registry() -> SkillRegistry:
    """Get global skill registry instance."""
    global _registry
    if _registry is None:
        project_dir = Path.cwd()
        while project_dir.name != "265-game-ui-mobile-friendly-design":
            parent = project_dir.parent
            if parent == project_dir:
                # Reached root, use current directory
                break
            project_dir = parent

        skills_dir = project_dir / "skills"
        _registry = SkillRegistry(skills_dir)
    return _registry


def get_skill_executor() -> SkillExecutor:
    """Get global skill executor instance."""
    global _executor
    if _executor is None:
        _executor = SkillExecutor(get_skill_registry())
    return _executor


def initialize_skills() -> int:
    """Initialize and discover all skills."""
    registry = get_skill_registry()
    return registry.discover_skills()


__all__ = [
    "SkillMetadata",
    "SkillResolutionResult",
    "SkillRegistry",
    "SkillExecutor",
    "get_skill_registry",
    "get_skill_executor",
    "initialize_skills",
]
