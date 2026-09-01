"""
tests/fixtures/sample_data.py — Test Fixtures and Sample Data
Provides test fixtures and sample data for testing.
"""
import pytest
from pathlib import Path
import tempfile
import json


@pytest.fixture
def sample_ui_elements():
    """Sample UI elements for testing."""
    return [
        {
            "id": "play_button",
            "position": {"x": 50, "y": 75},
            "size": {"width": 80, "height": 50},
            "colors": ["#00FF00", "#0000FF"],
            "has_icons": True,
        },
        {
            "id": "settings_button",
            "position": {"x": 90, "y": 10},
            "size": {"width": 40, "height": 40},
            "colors": ["#808080"],
            "has_icons": False,
        },
        {
            "id": "score_display",
            "position": {"x": 50, "y": 5},
            "size": {"width": 100, "height": 20},
            "colors": ["#FFFFFF", "#000000"],
            "has_labels": True,
        },
    ]


@pytest.fixture
def sample_touch_targets():
    """Sample touch targets for testing."""
    return [
        {
            "id": "play_button",
            "size": {"width": 80, "height": 50},
            "position": {"x": 50, "y": 75},
        },
        {
            "id": "settings_button",
            "size": {"width": 40, "height": 40},
            "position": {"x": 90, "y": 10},
        },
        {
            "id": "tiny_button",
            "size": {"width": 30, "height": 30},
            "position": {"x": 20, "y": 50},
        },
    ]


@pytest.fixture
def sample_gestures():
    """Sample gesture definitions for testing."""
    return [
        {
            "id": "swipe_left",
            "type": "swipe",
            "direction": "left",
            "area": "full_screen",
            "discoverability": "good",
        },
        {
            "id": "pinch_zoom",
            "type": "pinch",
            "area": "center",
            "discoverability": "poor",
        },
        {
            "id": "double_tap",
            "type": "tap",
            "count": 2,
            "area": "anywhere",
            "discoverability": "unknown",
        },
    ]


@pytest.fixture
def sample_feedback_systems():
    """Sample feedback system definitions for testing."""
    return [
        {
            "id": "visual_feedback",
            "type": "visual",
            "enabled": True,
        },
        {
            "id": "haptic_feedback",
            "type": "haptic",
            "enabled": False,
        },
        {
            "id": "audio_feedback",
            "type": "audio",
            "enabled": True,
        },
    ]


@pytest.fixture
def sample_color_pairs():
    """Sample color pairs for contrast testing."""
    return [
        {
            "element_id": "text1",
            "foreground": "#333333",
            "background": "#FFFFFF",
            "element_type": "text",
        },
        {
            "element_id": "text2",
            "foreground": "#CCCCCC",
            "background": "#FFFFFF",
            "element_type": "text",
        },
        {
            "element_id": "button1",
            "foreground": "#FFFFFF",
            "background": "#0066CC",
            "element_type": "button",
        },
        {
            "element_id": "border1",
            "foreground": "#FF0000",
            "background": "#00FF00",
            "element_type": "border",
        },
    ]


@pytest.fixture
def sample_kb_content():
    """Sample knowledge base content for testing."""
    return """
# SECOND-KNOWLEDGE-BRAIN

## Evidence Hierarchy

| Tier | Description | Examples |
|------|-------------|----------|
| 1 | Peer-reviewed academic papers | CHI, UIST, CSCW |
| 2 | Industry standards & guidelines | WCAG, Apple HIG, Material Design |
| 3 | Technical blogs & documentation | Medium, developer docs |
| 4 | General web content | News, forums |

## 1. Core Methods

### Fitts's Law for Touch Target Sizing
Mathematical model: T = a + b * log2(D/W + 1)
Where T = time, D = distance, W = target size

### Thumb Zone Analysis
Three zones for mobile device interaction:
- Easy: Bottom 1/3 of screen
- Reachable: Middle 1/3
- Hard: Top 1/3 (requires stretching)

### Gesture Discoverability Framework
5-point scale for gesture discoverability:
1. Obvious - No hints needed
2. Discoverable - Visual hints
3. Teachable - Tutorial needed
4. Documented - In manual only
5. Hidden - Must be discovered

## 2. Key Papers

| # | Title | Authors | Year | Venue | Tier |
|---|-------|---------|------|-------|------|
| 1 | Mobile Interface Design: Fitts's Law Applications | Chen et al. | 2023 | CHI | 1 |
| 2 | Thumb Zone Ergonomics in Touch Interfaces | Smith & Johnson | 2022 | Human-Computer Interaction | 1 |
| 3 | Gesture Discoverability in Mobile Gaming | Williams | 2023 | IEEE Transactions on Games | 1 |
| 4 | Colorblind Accessibility in Digital Interfaces | Patel et al. | 2021 | ASSETS | 1 |
| 5 | WCAG 2.1 Guidelines for Mobile | W3C | 2023 | W3C Standard | 2 |

## 3. State of the Art

Current research trends (2023-2024):
- AI-driven adaptive UI layouts
- Haptic feedback optimization
- Voice + gesture multimodal input
- Accessibility-first design patterns

## 4. Authoritative Data Sources

### Academic Databases
- ACM Digital Library
- IEEE Xplore
- ScienceDirect (Elsevier)
- SpringerLink

### Industry Standards
- WCAG 2.1 (Web Content Accessibility Guidelines)
- Apple Human Interface Guidelines
- Google Material Design Guidelines
- Microsoft Fluent Design System

## 5. Frameworks and Methodologies

### Design Frameworks
- Atomic Design
- Component-Driven Development
- Mobile-First Responsive Design

### Evaluation Methods
- Heuristic Evaluation
- Cognitive Walkthrough
- Usability Testing
- A/B Testing

## 6. Self-Update Protocol

Weekly academic update: Mondays 8:00 AM
Daily news update: Daily 7:00 AM

Sources:
- ArXiv (HCI, UX categories)
- Semantic Scholar
- Google Scholar alerts
- RSS feeds from HCI blogs

## 7. Knowledge Update Log

### 2026-07-28
- Added: CHI 2024 proceedings on mobile gesture research
- Added: Updated WCAG 2.2 guidelines

### 2026-07-15
- Added: Material Design 3 touch target guidelines
- Updated: Thumb zone research with 2024 studies
"""


@pytest.fixture
def sample_kb_file(tmp_path, sample_kb_content):
    """Create a temporary knowledge base file."""
    kb_file = tmp_path / "SECOND-KNOWLEDGE-BRAIN.md"
    kb_file.write_text(sample_kb_content)
    return str(kb_file)


@pytest.fixture
def sample_config():
    """Sample configuration for testing."""
    return {
        "environment": "development",
        "log_level": "INFO",
        "debug_mode": True,
        "llm": {
            "model_name": "claude-opus-4-7",
            "temperature": 0.7,
            "max_tokens": 4096,
            "timeout_seconds": 120,
            "max_retries": 3,
        },
        "knowledge": {
            "arxiv_categories": ["cs.HC", "cs.AI"],
            "max_results_per_source": 10,
            "crawl_interval_weekly": 7,
        },
        "features": {
            "enable_knowledge_pipeline": True,
            "enable_auto_quality_gates": True,
            "enable_hooks": True,
            "enable_caching": True,
        },
    }


@pytest.fixture
def temp_directory():
    """Create a temporary directory for testing."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
def sample_skill_file(tmp_path):
    """Create a sample skill file for testing."""
    skill_content = """---
name: test-skill
description: A test skill for unit testing
---

# Test Skill

This is a test skill for unit testing purposes.

## Instructions

1. Read the input
2. Process it
3. Return the result

## Output Format

Always return a JSON object with:
- result: The processing result
- confidence: Confidence score (0-1)
"""
    skill_file = tmp_path / "test_skill.md"
    skill_file.write_text(skill_content)
    return str(skill_file)


@pytest.fixture
def sample_agent_task():
    """Sample task for agent testing."""
    return {
        "task": "Analyze mobile game UI for touch targets and accessibility",
        "inputs": {
            "ui_elements": [
                {
                    "id": "button1",
                    "position": {"x": 50, "y": 70},
                    "size": {"width": 60, "height": 50},
                }
            ],
            "screen_size": "standard",
            "orientation": "portrait",
        },
        "context": {
            "domain": "mobile_ui",
            "urgency": "normal",
        },
    }


@pytest.fixture
def sample_analysis_result():
    """Sample analysis result for testing."""
    return {
        "overall_score": 85.5,
        "layout_analysis": {
            "layout_score": 90.0,
            "recommendations": [
                {
                    "element": "button1",
                    "issue": "Minor padding issue",
                    "severity": "low",
                    "suggestion": "Increase padding by 4px",
                }
            ],
        },
        "touch_analysis": {
            "touch_score": 80.0,
            "violations": [],
            "total_targets": 5,
            "compliant_targets": 5,
        },
        "accessibility_analysis": {
            "colorblind_score": 85.0,
            "issues": [],
            "contrast_score": 90.0,
        },
        "recommendations": [
            {
                "action": "Increase touch target padding",
                "priority": "P2",
                "effort": "Low",
                "impact": "Medium",
            }
        ],
    }


@pytest.fixture
def mock_web_search_results():
    """Mock web search results for testing."""
    return [
        {
            "title": "Mobile UI Design Best Practices 2024",
            "url": "https://example.com/mobile-ui-2024",
            "snippet": "Comprehensive guide to mobile UI design...",
            "source": "duckduckgo",
        },
        {
            "title": "Touch Target Size Guidelines",
            "url": "https://example.com/touch-targets",
            "snippet": "Recommended minimum touch target sizes...",
            "source": "duckduckgo",
        },
    ]


@pytest.fixture
def sample_degradation_states():
    """Sample degradation states for testing."""
    from hooks.degradation import DegradationLevel, DegradationState

    return {
        "full": DegradationState(
            level=DegradationLevel.FULL,
            timestamp="2024-07-28T10:00:00",
            failed_sources=[],
            substituted_sources={},
            missing_data_fields=[],
            flags=[],
        ),
        "partial": DegradationState(
            level=DegradationLevel.PARTIAL,
            timestamp="2024-07-28T11:00:00",
            failed_sources=["api_service_1"],
            substituted_sources={"api_service_1": "cached_data"},
            missing_data_fields=[],
            flags=["USING_CACHED_DATA"],
        ),
        "knowledge_only": DegradationState(
            level=DegradationLevel.KNOWLEDGE_BASE_ONLY,
            timestamp="2024-07-28T12:00:00",
            failed_sources=["api_service_1", "api_service_2", "web_search"],
            substituted_sources={
                "api_service_1": "kb_entry_1",
                "api_service_2": "kb_entry_2",
            },
            missing_data_fields=["real_time_stats"],
            flags=["HISTORICAL_DATA_ONLY", "DATA_MAY_BE_STALE"],
        ),
    }


# Configuration fixtures for different environments
@pytest.fixture(params=["development", "staging", "production"])
def environment_config(request):
    """Configuration for different environments."""
    configs = {
        "development": {
            "debug_mode": True,
            "log_level": "DEBUG",
            "enable_caching": True,
        },
        "staging": {
            "debug_mode": True,
            "log_level": "INFO",
            "enable_caching": True,
        },
        "production": {
            "debug_mode": False,
            "log_level": "WARNING",
            "enable_caching": True,
        },
    }
    return configs[request.param]


# Performance testing fixtures
@pytest.fixture
def performance_test_data():
    """Large dataset for performance testing."""
    return {
        "ui_elements": [
            {
                "id": f"element_{i}",
                "position": {"x": i % 100, "y": (i // 100) % 100},
                "size": {"width": 40 + (i % 20), "height": 40 + (i % 20)},
            }
            for i in range(1000)
        ],
        "touch_targets": [
            {
                "id": f"target_{i}",
                "size": {"width": 44, "height": 44},
                "position": {"x": i % 100, "y": i // 100},
            }
            for i in range(500)
        ],
    }
