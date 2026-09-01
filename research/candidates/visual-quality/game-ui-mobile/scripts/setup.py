"""
scripts/setup.py — Project Setup and Initialization
Automates project setup, dependency installation, and initial configuration.
"""
import sys
import subprocess
import json
from pathlib import Path
from typing import List, Tuple


def run_command(cmd: List[str], description: str) -> Tuple[bool, str]:
    """Run a command and return success status and output."""
    print(f"\n[SETUP] {description}...")
    print(f"  Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            print(f"  [ERROR] Command failed with exit code {result.returncode}")
            print(f"  stderr: {result.stderr}")
            return False, result.stderr

        print(f"  [OK] Completed successfully")
        return True, result.stdout

    except Exception as e:
        print(f"  [ERROR] Exception: {e}")
        return False, str(e)


def install_dependencies() -> bool:
    """Install Python dependencies from requirements.txt."""
    project_root = Path(__file__).parent.parent
    requirements_file = project_root / "requirements.txt"

    if not requirements_file.exists():
        print(f"[WARN] requirements.txt not found, creating with defaults")
        default_requirements = """# game-ui-mobile-friendly-design dependencies
requests>=2.31.0
feedparser>=6.0.10
python-dateutil>=2.8.2
"""
        requirements_file.write_text(default_requirements)

    success, _ = run_command(
        [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
        "Installing dependencies"
    )

    return success


def create_directories() -> bool:
    """Create required project directories."""
    print("\n[SETUP] Creating project directories...")

    project_root = Path(__file__).parent.parent
    directories = [
        "config",
        "scripts",
        "references",
        "assets",
        "hooks",
        "tools/schemas",
        "skills",
        "tests",
        "logs",
        ".state",
    ]

    for dir_name in directories:
        dir_path = project_root / dir_name
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"  [OK] {dir_name}/")

    print("[OK] All directories created")
    return True


def initialize_config() -> bool:
    """Initialize configuration files."""
    print("\n[SETUP] Initializing configuration...")

    project_root = Path(__file__).parent.parent
    config_dir = project_root / "config"

    # Create default settings.json
    settings_file = config_dir / "settings.json"
    if not settings_file.exists():
        default_settings = {
            "environment": "development",
            "log_level": "INFO",
            "debug_mode": False,
            "llm": {
                "model_name": "claude-opus-4-7",
                "temperature": 0.7,
                "max_tokens": 4096,
                "top_p": 0.95,
                "top_k": 40,
                "timeout_seconds": 120,
                "max_retries": 3,
                "retry_delay": 1.0,
            },
            "knowledge": {
                "arxiv_categories": [],
                "semantic_scholar_base": "https://api.semanticscholar.org/graph/v1/paper/search",
                "rss_feeds": [],
                "authoritative_docs": [
                    "International Journal of Human-Computer Studies — Elsevier",
                    "Interacting with Computers — Oxford",
                    "Computers in Human Behavior — Elsevier",
                    "IEEE Transactions on Games",
                    "Entertainment Computing — Elsevier",
                    "Human Factors — SAGE",
                ],
                "scoring_weights": {
                    "recency": 0.4,
                    "keyword_relevance": 0.4,
                    "citation_count": 0.2,
                },
                "max_results_per_source": 10,
                "max_new_entries_per_run": 20,
                "crawl_interval_weekly": 7,
                "crawl_interval_daily": 1,
            },
            "quality_gates": {
                "universal_gates": ["U1", "U2", "U3", "U4", "U5", "U6"],
                "domain_gates": ["G1", "G2", "G3", "G4"],
                "max_retries_per_gate": 2,
                "enforce_strict": True,
                "fail_on_unfixable": False,
            },
            "features": {
                "enable_knowledge_pipeline": True,
                "enable_auto_quality_gates": True,
                "enable_hooks": True,
                "enable_caching": True,
                "enable_metrics": True,
                "enable_degradation_levels": True,
                "enable_multilingual": True,
            },
            "domain_keywords": [
                "mobile game UI design",
                "thumb zone touch ergonomics",
                "Fitts law touch target",
                "mobile UI density contrast",
                "gesture discoverability game",
                "one-handed accessibility mobile",
            ],
        }

        with open(settings_file, "w", encoding="utf-8") as f:
            json.dump(default_settings, f, indent=2)

        print(f"  [OK] Created config/settings.json")

    print("[OK] Configuration initialized")
    return True


def validate_installation() -> bool:
    """Validate that the installation is correct."""
    print("\n[SETUP] Validating installation...")

    project_root = Path(__file__).parent.parent
    required_files = [
        "CLAUDE.md",
        "PROJECT-detail.md",
        "PROJECT-DEVELOPMENT-PHASE-TRACKING.md",
        "README.md",
        "SECOND-KNOWLEDGE-BRAIN.md",
        "skills/main.md",
        "config/settings.py",
        "hooks/__init__.py",
        "tools/schemas/__init__.py",
    ]

    missing_files = []
    for file_path in required_files:
        full_path = project_root / file_path
        if not full_path.exists():
            missing_files.append(file_path)
        else:
            print(f"  [OK] {file_path}")

    if missing_files:
        print(f"\n[WARN] Missing files: {', '.join(missing_files)}")
        return False

    print("\n[OK] Installation validated successfully")
    return True


def run_tests() -> bool:
    """Run the test suite to verify everything works."""
    print("\n[SETUP] Running test suite...")

    project_root = Path(__file__).parent.parent

    # Run knowledge updater tests
    success, _ = run_command(
        [sys.executable, str(project_root / "tools" / "test_knowledge_updater.py")],
        "Testing knowledge updater"
    )

    if not success:
        print("[WARN] Knowledge updater tests failed, but continuing...")

    # Run scenario tests
    success, _ = run_command(
        [sys.executable, str(project_root / "tools" / "run_test_scenarios.py")],
        "Running test scenarios"
    )

    if not success:
        print("[WARN] Scenario tests failed, but continuing...")

    print("[OK] Test suite completed")
    return True


def main() -> int:
    """Main setup routine."""
    print("=" * 60)
    print("game-ui-mobile-friendly-design - Project Setup")
    print("=" * 60)

    steps = [
        ("Creating directories", create_directories),
        ("Installing dependencies", install_dependencies),
        ("Initializing configuration", initialize_config),
        ("Validating installation", validate_installation),
        ("Running tests", run_tests),
    ]

    failed_steps = []
    for step_name, step_func in steps:
        print(f"\n{'=' * 60}")
        print(f"Step: {step_name}")
        print('=' * 60)

        try:
            if not step_func():
                failed_steps.append(step_name)
        except Exception as e:
            print(f"[ERROR] Step failed with exception: {e}")
            failed_steps.append(step_name)

    print("\n" + "=" * 60)
    print("Setup Summary")
    print("=" * 60)

    if failed_steps:
        print(f"\n[WARN] {len(failed_steps)} step(s) failed:")
        for step in failed_steps:
            print(f"  - {step}")
        print("\nPlease review the errors above and fix any issues.")
        return 1
    else:
        print("\n[OK] Setup completed successfully!")
        print("\nYou can now use the skill by invoking:")
        print("  /game-ui-mobile-friendly-design [your query]")
        return 0


if __name__ == "__main__":
    sys.exit(main())
