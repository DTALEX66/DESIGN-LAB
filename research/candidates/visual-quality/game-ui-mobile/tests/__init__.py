"""
tests/__init__.py — Test Package Initialization
Configuration and fixtures for the test suite.
"""
import pytest
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Shared fixtures
@pytest.fixture(scope="session")
def project_root_path():
    """Get project root path."""
    return Path(__file__).parent.parent


@pytest.fixture(scope="session")
def skills_path(project_root_path):
    """Get skills directory path."""
    return project_root_path / "skills"


@pytest.fixture(scope="session")
def tools_path(project_root_path):
    """Get tools directory path."""
    return project_root_path / "tools"


@pytest.fixture(scope="session")
def hooks_path(project_root_path):
    """Get hooks directory path."""
    return project_root_path / "hooks"


@pytest.fixture(scope="session")
def tests_path(project_root_path):
    """Get tests directory path."""
    return project_root_path / "tests"


# Configure pytest
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "unit: Unit tests (fast, isolated)"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests (slower, may use external resources)"
    )
    config.addinivalue_line(
        "markers", "e2e: End-to-end tests (slowest, full workflow)"
    )
    config.addinivalue_line(
        "markers", "slow: Slow tests that take more than 1 second"
    )
