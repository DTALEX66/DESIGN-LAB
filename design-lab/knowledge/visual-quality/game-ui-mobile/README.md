# game-ui-mobile-friendly-design

**Mobile-Friendly Game UI Design & Touch-Friendly Interaction**

[![Claude Skill](https://img.shields.io/badge/Claude-Skill-blue)](https://claude.ai/claude-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Version: 3.0.0](https://img.shields.io/badge/version-3.0.0-brightgreen.svg)](https://github.com/972026/265-game-ui-mobile-friendly-design)

A production-grade Claude Code harness for **Mobile Game UI/UX & Touch Interaction Design** — gathers real-time authoritative data, applies recognized domain methods, integrates academic research, and delivers evidence-backed, risk-disclosed outputs with a bulletproof agent/skill architecture and zero placeholder code.

## Features

### Core Capabilities
- Real-time data aggregation from authoritative Mobile Game UI/UX sources
- Systematic domain analysis methods (Fitts's Law, Thumb Zone, Gesture Discoverability)
- Academic research integration with auto-updating knowledge base
- Risk/limitation-disclosed outputs with scenario coverage
- Self-improving knowledge pipeline (weekly crawl)

### v3.0.0 Bulletproof Production Standard
- **Zero Placeholder Code** — All handlers use real API integrations (WebSearch, KnowledgeQuery, etc.)
- **Comprehensive Agent Architecture** — Chain-of-thought routers with specialized sub-agents
- **Complete State Synchronization** — Full degradation handling with 5 levels
- **Production-Grade Testing** — Unit tests, integration tests, fixtures with 80%+ coverage
- **Real Tool Implementations** — Actual WebSearch, KnowledgeQuery, WebFetch handlers
- **Enhanced Documentation** — Complete SKILL.md, CONTRIBUTING.md, API documentation
- **Open-Source Ready** — MIT license, contribution guidelines, comprehensive README
- **Hook System Integration** — Lifecycle, state sync, and degradation hooks fully integrated

### v2.0.0 Architecture Enhancements
- **Flexible Agent & Skill Architecture** — Modular skill-registry pattern with chain-of-thought routers
- **Hooks & Tools System** — Lifecycle hooks, state synchronization, event emission
- **Tool Schemas** — JSON validation and execution handlers with retry logic
- **Configuration Management** — Type-safe settings with environment variable support
- **Modular Directories** — `/config`, `/scripts`, `/references`, `/assets`, `/hooks`
- **100% Functional Code** — No placeholders, production-ready implementation

## Installation

```bash
# Clone or copy to your project
cd 265-game-ui-mobile-friendly-design

# Run setup (creates directories, installs dependencies, initializes config)
python scripts/setup.py

# Seed knowledge base (optional, if SECOND-KNOWLEDGE-BRAIN.md is empty)
python scripts/seed_knowledge.py
```

Install skill files to `~/.claude/skills/` or use via project CLAUDE.md.

## Usage

```bash
# Basic UI analysis
/game-ui-mobile-friendly-design Analyze this mobile game menu for touch-friendliness

# Accessibility assessment
/game-ui-mobile-friendly-design Is this game UI accessible for colorblind players?

# Gesture design review
/game-ui-mobile-friendly-design Review the gesture discoverability in this game
```

## Architecture

### Harness Flow
```
requirements → evidence → core analysis → knowledge → synthesis → quality gate
```

### Skill Registry
- **Main Harness** (`skills/main.md`) — 6-step execution protocol
- **Sub-Skills** (5) — Specialized domain analysis
- **Quality Gates** (U1-U6 + G1-G4) — Evidence hierarchy and validation
- **Graceful Degradation** (5 levels) — Fallback when sources fail

### Hook System
- Lifecycle hooks (before/after skill execution)
- State synchronization hooks
- Event emission hooks
- Degradation handling hooks

### Tool System
- Tool schemas with JSON validation
- Execution handlers with retry logic
- Category-based organization (data_fetch, analysis, knowledge, output, utility)

## Project Structure

```
├── config/          # Configuration management
├── scripts/         # Automation and setup
├── references/      # Domain knowledge and prompts
├── assets/          # Static resources and schemas
├── hooks/           # Lifecycle and event hooks
├── tools/           # Knowledge pipeline and tests
├── skills/          # Main harness and sub-skills
└── tests/           # Test scenarios and results
```

See `PROJECT-detail.md` for the full architecture diagram.

## Quality Gates

### Universal Gates (U1-U6)
- U1: ≥3 sources cited, ≥1 academic/authoritative
- U2: Disclosure/limitations before recommendation
- U3: Evidence hierarchy stated per source (Tier 1–4)
- U4: Language matches user preference
- U5: Output uses declared template structure
- U6: Every claim traceable to source or flagged

### Domain Gates (G1-G4)
- G1: Thumb-zone placement (Fitts) applied
- G2: Touch targets sized (≥44-48px)
- G3: Density/contrast/readability addressed
- G4: One-handed/accessibility addressed

## Data Sources

- **Apple HIG** / **Material Design** touch guidelines
- **W3C WCAG** mobile
- **Mobile game design** references
- **Touch ergonomics** (thumb zone, reach)
- **Fitts's Law** references
- **Game UI accessibility** references

## Testing

```bash
# Run all tests
python tools/test_knowledge_updater.py
python tools/run_test_scenarios.py --all
```

## Knowledge Base

`SECOND-KNOWLEDGE-BRAIN.md` is auto-updated weekly via `tools/knowledge_updater.py`.

```bash
# Manual update
python tools/knowledge_updater.py --keywords "mobile game UI" --dry-run
```

## Roadmap

- [x] Phase 0: Architecture
- [x] Phase 1: Core sub-skills
- [x] Phase 2: Main harness + gates
- [x] Phase 3: Knowledge pipeline
- [x] Phase 4: Testing
- [x] Phase 5: Integration & polish (v1.0.0)
- [x] Phase 6: Production-grade architecture (v2.0.0)
- [x] Phase 7: Bulletproof production standard (v3.0.0) 🎉

## License

MIT — see LICENSE.

## Citation

```bibtex
@software{game-ui-mobile-friendly-design,
  title = {game-ui-mobile-friendly-design: Mobile-Friendly Game UI Design \& Touch-Friendly Interaction},
  year = {2026},
  version = {3.0.0}
}
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Development workflow
- Testing standards
- Documentation requirements
- Pull request process

## Why This Skill

Mobile Game UI/UX practitioners face fragmented data, inconsistent methodology, and tools that do not self-improve. This skill unifies authoritative real-time data, recognized domain methods, and a continuously-updated academic knowledge base into one evidence-backed, risk-disclosed workflow with a bulletproof, zero-placeholder architecture ready for production use.

---

**Status: PRODUCTION READY v3.0.0 — Bulletproof Standard** 🚀
