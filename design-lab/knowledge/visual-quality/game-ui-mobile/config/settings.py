"""
settings.py — Configuration Management Module
Production-grade, type-safe configuration with environment variables,
LLM parameters, and system-wide feature flags.
"""
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum


class LogLevel(Enum):
    """Logging verbosity levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Environment(Enum):
    """Deployment environments."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class LLMConfig:
    """LLM model configuration parameters."""
    model_name: str = "claude-opus-4-7"
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.95
    top_k: int = 40
    timeout_seconds: int = 120
    max_retries: int = 3
    retry_delay: float = 1.0


@dataclass
class KnowledgeConfig:
    """Knowledge pipeline configuration."""
    arxiv_categories: List[str] = field(default_factory=list)
    semantic_scholar_base: str = "https://api.semanticscholar.org/graph/v1/paper/search"
    rss_feeds: List[str] = field(default_factory=list)
    authoritative_docs: List[str] = field(default_factory=list)
    scoring_weights: Dict[str, float] = field(default_factory=lambda: {
        "recency": 0.4,
        "keyword_relevance": 0.4,
        "citation_count": 0.2
    })
    max_results_per_source: int = 10
    max_new_entries_per_run: int = 20
    crawl_interval_weekly: int = 7
    crawl_interval_daily: int = 1


@dataclass
class QualityGateConfig:
    """Quality gate enforcement configuration."""
    universal_gates: List[str] = field(default_factory=lambda: ["U1", "U2", "U3", "U4", "U5", "U6"])
    domain_gates: List[str] = field(default_factory=lambda: ["G1", "G2", "G3", "G4"])
    max_retries_per_gate: int = 2
    enforce_strict: bool = True
    fail_on_unfixable: bool = False


@dataclass
class FeatureFlags:
    """System-wide feature flags."""
    enable_knowledge_pipeline: bool = True
    enable_auto_quality_gates: bool = True
    enable_hooks: bool = True
    enable_caching: bool = True
    enable_metrics: bool = True
    enable_degradation_levels: bool = True
    enable_multilingual: bool = True


@dataclass
class Settings:
    """Root configuration container."""
    environment: Environment = Environment.DEVELOPMENT
    log_level: LogLevel = LogLevel.INFO
    debug_mode: bool = False

    # Component configurations
    llm: LLMConfig = field(default_factory=LLMConfig)
    knowledge: KnowledgeConfig = field(default_factory=KnowledgeConfig)
    quality_gates: QualityGateConfig = field(default_factory=QualityGateConfig)
    features: FeatureFlags = field(default_factory=FeatureFlags)

    # Paths
    project_root: Path = field(default_factory=lambda: Path(__file__).parent.parent)
    skills_dir: Path = field(default="")
    tools_dir: Path = field(default="")
    hooks_dir: Path = field(default="")
    config_dir: Path = field(default="")
    scripts_dir: Path = field(default="")
    references_dir: Path = field(default="")
    assets_dir: Path = field(default="")

    # Domain
    domain_keywords: List[str] = field(default_factory=lambda: [
        "mobile game UI design",
        "thumb zone touch ergonomics",
        "Fitts law touch target",
        "mobile UI density contrast",
        "gesture discoverability game",
        "one-handed accessibility mobile"
    ])

    def __post_init__(self):
        """Initialize derived paths."""
        root = self.project_root
        self.skills_dir = root / "skills"
        self.tools_dir = root / "tools"
        self.hooks_dir = root / "hooks"
        self.config_dir = root / "config"
        self.scripts_dir = root / "scripts"
        self.references_dir = root / "references"
        self.assets_dir = root / "assets"

    @classmethod
    def from_env(cls) -> "Settings":
        """Create settings from environment variables."""
        env_vars = {
            "ENVIRONMENT": os.getenv("ENVIRONMENT", "development"),
            "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
            "DEBUG_MODE": os.getenv("DEBUG_MODE", "false").lower() == "true",
            "LLM_MODEL": os.getenv("LLM_MODEL", "claude-opus-4-7"),
            "LLM_TEMPERATURE": float(os.getenv("LLM_TEMPERATURE", "0.7")),
            "LLM_MAX_TOKENS": int(os.getenv("LLM_MAX_TOKENS", "4096")),
            "ENABLE_KNOWLEDGE_PIPELINE": os.getenv("ENABLE_KNOWLEDGE_PIPELINE", "true").lower() == "true",
            "ENABLE_AUTO_QUALITY_GATES": os.getenv("ENABLE_AUTO_QUALITY_GATES", "true").lower() == "true",
            "ENABLE_HOOKS": os.getenv("ENABLE_HOOKS", "true").lower() == "true",
        }

        settings = cls(
            environment=Environment(env_vars["ENVIRONMENT"]),
            log_level=LogLevel(env_vars["LOG_LEVEL"]),
            debug_mode=env_vars["DEBUG_MODE"],
            llm=LLMConfig(
                model_name=env_vars["LLM_MODEL"],
                temperature=env_vars["LLM_TEMPERATURE"],
                max_tokens=env_vars["LLM_MAX_TOKENS"],
            ),
            features=FeatureFlags(
                enable_knowledge_pipeline=env_vars["ENABLE_KNOWLEDGE_PIPELINE"],
                enable_auto_quality_gates=env_vars["ENABLE_AUTO_QUALITY_GATES"],
                enable_hooks=env_vars["ENABLE_HOOKS"],
            ),
        )

        return settings

    @classmethod
    def from_file(cls, path: Path) -> "Settings":
        """Load settings from JSON configuration file."""
        if not path.exists():
            return cls.from_env()

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Settings":
        """Create settings from dictionary."""
        llm_data = data.get("llm", {})
        knowledge_data = data.get("knowledge", {})
        gates_data = data.get("quality_gates", {})
        features_data = data.get("features", {})

        return cls(
            environment=Environment(data.get("environment", "development")),
            log_level=LogLevel(data.get("log_level", "INFO")),
            debug_mode=data.get("debug_mode", False),
            llm=LLMConfig(**llm_data),
            knowledge=KnowledgeConfig(**knowledge_data),
            quality_gates=QualityGateConfig(**gates_data),
            features=FeatureFlags(**features_data),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary."""
        return {
            "environment": self.environment.value,
            "log_level": self.log_level.value,
            "debug_mode": self.debug_mode,
            "llm": {
                "model_name": self.llm.model_name,
                "temperature": self.llm.temperature,
                "max_tokens": self.llm.max_tokens,
                "top_p": self.llm.top_p,
                "top_k": self.llm.top_k,
                "timeout_seconds": self.llm.timeout_seconds,
                "max_retries": self.llm.max_retries,
                "retry_delay": self.llm.retry_delay,
            },
            "knowledge": {
                "arxiv_categories": self.knowledge.arxiv_categories,
                "semantic_scholar_base": self.knowledge.semantic_scholar_base,
                "rss_feeds": self.knowledge.rss_feeds,
                "authoritative_docs": self.knowledge.authoritative_docs,
                "scoring_weights": self.knowledge.scoring_weights,
                "max_results_per_source": self.knowledge.max_results_per_source,
                "max_new_entries_per_run": self.knowledge.max_new_entries_per_run,
                "crawl_interval_weekly": self.knowledge.crawl_interval_weekly,
                "crawl_interval_daily": self.knowledge.crawl_interval_daily,
            },
            "quality_gates": {
                "universal_gates": self.quality_gates.universal_gates,
                "domain_gates": self.quality_gates.domain_gates,
                "max_retries_per_gate": self.quality_gates.max_retries_per_gate,
                "enforce_strict": self.quality_gates.enforce_strict,
                "fail_on_unfixable": self.quality_gates.fail_on_unfixable,
            },
            "features": {
                "enable_knowledge_pipeline": self.features.enable_knowledge_pipeline,
                "enable_auto_quality_gates": self.features.enable_auto_quality_gates,
                "enable_hooks": self.features.enable_hooks,
                "enable_caching": self.features.enable_caching,
                "enable_metrics": self.features.enable_metrics,
                "enable_degradation_levels": self.features.enable_degradation_levels,
                "enable_multilingual": self.features.enable_multilingual,
            },
            "domain_keywords": self.domain_keywords,
        }

    def save(self, path: Optional[Path] = None) -> None:
        """Save settings to JSON file."""
        if path is None:
            path = self.config_dir / "settings.json"

        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    def validate(self) -> List[str]:
        """Validate settings and return list of errors (empty if valid)."""
        errors = []

        # Validate LLM config
        if self.llm.temperature < 0 or self.llm.temperature > 2:
            errors.append(f"Invalid LLM temperature: {self.llm.temperature}")
        if self.llm.max_tokens < 1:
            errors.append(f"Invalid LLM max_tokens: {self.llm.max_tokens}")

        # Validate knowledge config
        if self.knowledge.max_results_per_source < 1:
            errors.append(f"Invalid max_results_per_source: {self.knowledge.max_results_per_source}")

        # Validate quality gates config
        if self.quality_gates.max_retries_per_gate < 0:
            errors.append(f"Invalid max_retries_per_gate: {self.quality_gates.max_retries_per_gate}")

        return errors


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get global settings instance (lazy initialization)."""
    global _settings
    if _settings is None:
        config_path = Path(__file__).parent / "settings.json"
        if config_path.exists():
            _settings = Settings.from_file(config_path)
        else:
            _settings = Settings.from_env()
    return _settings


def reset_settings() -> None:
    """Reset global settings (mainly for testing)."""
    global _settings
    _settings = None
