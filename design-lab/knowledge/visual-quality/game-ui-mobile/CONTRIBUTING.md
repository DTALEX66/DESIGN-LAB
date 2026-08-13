# Contributing to game-ui-mobile-friendly-design

Thank you for your interest in contributing to the game-ui-mobile-friendly-design skill! This document provides guidelines and instructions for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and professional in all interactions.

### Standards

- **Be respectful:** Value different viewpoints and experiences
- **Be constructive:** Focus on what is best for the community
- **Be collaborative:** Work together to improve the project
- **Be inclusive:** Welcome contributors from diverse backgrounds

### Reporting Issues

If you experience or witness unacceptable behavior, please contact the project maintainers.

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Git
- Familiarity with Claude Code skills

### Setup Development Environment

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/265-game-ui-mobile-friendly-design.git
   cd 265-game-ui-mobile-friendly-design
   ```

2. **Install dependencies:**
   ```bash
   python -m pip install -r requirements.txt
   python -m pip install pytest pytest-cov beautifulsoup4
   ```

3. **Run setup script:**
   ```bash
   python scripts/setup.py
   ```

4. **Run tests to verify setup:**
   ```bash
   pytest tests/ -v
   ```

## Development Workflow

### Branch Strategy

- **main:** Production-ready code
- **develop:** Development integration branch
- **feature/*:** Feature branches
- **fix/*:** Bug fix branches
- **docs/*:** Documentation updates

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Run tests locally:**
   ```bash
   # Run all tests
   pytest tests/ -v

   # Run specific test file
   pytest tests/unit/test_agents.py -v

   # Run with coverage
   pytest tests/ --cov=agents --cov=hooks --cov=tools
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Examples:
```
feat: add colorblind accessibility analysis
fix: resolve touch target sizing edge case
docs: update AGENT_ARCHITECTURE.md
test: add integration tests for multi-agent workflow
```

## Testing Guidelines

### Test Structure

Tests are organized into:
- **Unit tests** (`tests/unit/`): Test individual components in isolation
- **Integration tests** (`tests/integration/`): Test component interactions
- **Fixtures** (`tests/fixtures/`): Shared test data

### Writing Tests

```python
# tests/unit/test_new_feature.py
import pytest

class TestNewFeature:
    """Test new feature functionality."""

    def test_basic_functionality(self):
        """Test basic feature operation."""
        result = new_feature({"input": "test"})
        assert result["success"] is True

    def test_edge_case_handling(self, sample_data):
        """Test edge cases with sample data."""
        result = new_feature(sample_data)
        assert result["status"] == "expected"
```

### Test Coverage

- Aim for >80% code coverage
- All new features must have tests
- Critical paths should have 100% coverage

### Running Tests

```bash
# Quick test run (unit tests only)
pytest tests/unit/ -v

# Full test suite
pytest tests/ -v

# With coverage report
pytest tests/ --cov=. --cov-report=html

# Specific markers
pytest tests/ -m integration -v
```

## Documentation Standards

### Code Documentation

- All modules should have docstrings
- Public functions/classes require comprehensive documentation
- Use Google style docstrings

```python
def analyze_ui_layout(ui_elements: List[Dict]) -> Dict[str, Any]:
    """Analyze UI layout for touch optimization.

    Args:
        ui_elements: List of UI element dictionaries with position and size

    Returns:
        Dictionary containing layout_score and recommendations

    Raises:
        ValueError: If ui_elements is empty

    Example:
        >>> result = analyze_ui_layout([{"position": {"x": 50, "y": 50}}])
        >>> print(result["layout_score"])
        85.0
    """
```

### Skill Documentation

Skills must include:
- Clear description of purpose
- Triggering criteria
- Input/output schemas
- Usage examples

### Architecture Documentation

Architecture changes require:
- Updated AGENT_ARCHITECTURE.md
- Component diagrams
- Data flow documentation
- Migration guides if breaking changes

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass:**
   ```bash
   pytest tests/ -v
   ```

2. **Update documentation:**
   - README.md for user-facing changes
   - AGENT_ARCHITECTURE.md for architecture changes
   - Inline code documentation

3. **Check code quality:**
   - No placeholder code
   - Follow existing patterns
   - Proper error handling

### Submitting a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create pull request on GitHub:**
   - Clear title describing the change
   - Detailed description in the body
   - Reference related issues
   - Include screenshots if applicable

3. **PR Description Template:**
   ```markdown
   ## Summary
   Brief description of changes

   ## Type
   - [ ] Feature
   - [ ] Bug fix
   - [ ] Documentation
   - [ ] Refactoring
   - [ ] Other (please describe)

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] All tests pass locally

   ## Documentation
   - [ ] README.md updated
   - [ ] Code documentation updated
   - [ ] Architecture docs updated

   ## Checklist
   - [ ] No placeholder code
   - [ ] Follows existing patterns
   - [ ] Error handling implemented
   - [ ] Tests have adequate coverage

   ## Related Issues
   Fixes #
   Related to #
   ```

### Review Process

1. **Automated checks:**
   - All tests must pass
   - Code coverage threshold met
   - No linting errors

2. **Code review:**
   - At least one maintainer approval required
   - Address all review comments
   - Update tests as needed

3. **Merge:**
   - Squash commits to maintain clean history
   - Delete feature branch after merge
   - Update version if needed

### Review Guidelines

When reviewing PRs:
- Be constructive and respectful
- Focus on objective criteria (tests, docs, patterns)
- Explain reasoning for suggestions
- Approve when criteria are met

## Additional Resources

### Documentation

- [PROJECT-detail.md](PROJECT-detail.md): Technical specification
- [AGENT_ARCHITECTURE.md](agents/ARCHITECTURE.md): Agent system design
- [SKILL.md](SKILL.md): Skill documentation

### Tools and Scripts

- `scripts/setup.py`: Project setup
- `scripts/seed_knowledge.py`: Knowledge base seeding
- `tools/run_test_scenarios.py`: Test scenario runner
- `tools/knowledge_updater.py`: Knowledge pipeline

### Questions?

- Open an issue for bug reports or feature requests
- Start a discussion for questions
- Check existing issues and discussions first

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to game-ui-mobile-friendly-design!
