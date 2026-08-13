---
name: game-ui-mobile-friendly-design
description: Mobile-Friendly Game UI Design & Touch-Friendly Interaction — Bulletproof production-grade harness for Mobile Game UI/UX & Touch Interaction Design analysis with zero placeholder code. Use this skill whenever the user asks for mobile game UI evaluation, touch interaction design, gesture discoverability analysis, accessibility assessment for games, one-handed mobile usability, thumb zone layout optimization, Fitts's Law application to touch targets, colorblind accessibility in games, or any mobile game interface design question. This skill provides evidence-backed analysis with academic citations, risk disclosures, and actionable recommendations through a flexible agent architecture with chain-of-thought routing and specialized domain agents.
---

# game-ui-mobile-friendly-design — Skill Registry Documentation

## Overview

`game-ui-mobile-friendly-design` is a production-grade harness skill for Claude Code targeting the Mobile Game UI/UX & Touch Interaction Design domain. It combines real-time data aggregation, recognized domain methods, academic research integration, and a continuously-updated knowledge base into a single evidence-backed, risk-disclosed workflow.

## Skill Registration

### Skill Identity

```yaml
name: game-ui-mobile-friendly-design
tagline: Mobile-Friendly Game UI Design & Touch-Friendly Interaction
domain: Mobile Game UI/UX & Touch Interaction Design
version: 1.0.0
phase: Phase 5 — Integration & Polish (Production Ready)
```

### Triggering Criteria

The skill triggers when the user request involves:
- Mobile game UI evaluation or analysis
- Touch interaction design questions
- Gesture discoverability assessment
- Mobile accessibility (colorblind, screen reader, one-handed use)
- Thumb zone layout optimization
- Fitts's Law application to touch targets
- Mobile game interface design patterns
- Touch target sizing recommendations

### Skill Resolution

When a request matches the triggering criteria, Claude resolves the skill by:

1. **Loading SKILL.md** (metadata only, ~100 words)
2. **Loading main harness** (`skills/main.md`) if execution proceeds
3. **Loading sub-skills** on-demand during harness execution
4. **Loading bundled resources** (references, tools, schemas) as needed

## Agent Architecture

This skill implements a flexible agent architecture with chain-of-thought routing and specialized domain agents.

### Architecture Overview

```
User Request
    ↓
Agent Registry
    ├── Router Agent (Chain-of-Thought)
    ├── Specialist Agents
    │   ├── MobileUIAnalysisAgent
    │   ├── TouchInteractionAgent
    │   └── AccessibilityAgent
    └── Coordinator Agents
        ├── QualityValidator
        └── OutputSynthesizer
    ↓
Skill Resolution & Execution
    ├── Skill Registry
    ├── Execution Planner
    └── Result Aggregator
    ↓
Hook System
    ├── Lifecycle Hooks
    ├── State Synchronization
    └── Degradation Management
    ↓
Final Output
```

### Agent Types

#### Router Agent
- **Type:** Chain-of-Thought Router
- **Purpose:** Analyzes task complexity and delegates to appropriate specialists
- **Capabilities:**
  - Task analysis and domain identification
  - Agent selection with confidence scoring
  - Execution planning with fallback strategies
  - Alternative agent recommendations

#### Specialist Agents
- **MobileUIAnalysisAgent:** Analyzes UI layout, touch targets, and thumb zone optimization
- **TouchInteractionAgent:** Evaluates gestures, discoverability, and feedback systems
- **AccessibilityAgent:** Assesses color contrast, colorblind support, and WCAG compliance

#### Coordinator Agents
- **QualityValidator:** Validates output against quality gates
- **OutputSynthesizer:** Combines multi-agent results into coherent output

### Agent Registry

The agent registry provides:
- Dynamic agent registration and discovery
- Capability-based agent resolution
- Execution statistics tracking
- Priority-based routing

### State Synchronization

All components share state through:
- Pre/post execution hooks
- Degradation level coordination
- Result aggregation
- Error propagation

## Skill Architecture

```
SKILL.md (this file)
├── Metadata (name, description, compatibility)
└── Skill Registry Documentation

skills/main.md
├── Role & Persona
├── Harness Execution Protocol (6 steps)
├── Quality Gates (U1-U6 + G1-G4)
├── Graceful Degradation (5 levels)
└── Output Format

skills/registry.py
├── SkillMetadata
├── SkillResolutionResult
├── SkillRegistry
└── SkillExecutor

skills/sub-*.md (5 sub-skills)
├── sub-gather-requirements.md
├── sub-evidence-collector.md
├── sub-core-analysis.md
├── sub-knowledge-updater.md
└── sub-advisor.md
```

## Input/Output Schemas

### Input Schema

The skill accepts free-form natural language input. The `sub-gather-requirements` sub-skill structures the input into:

```json
{
  "type": "object",
  "required": ["object", "scope", "language"],
  "properties": {
    "object": {
      "type": "string",
      "description": "The UI/element/game being analyzed"
    },
    "scope": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Aspects in scope (layout, gestures, accessibility, etc.)"
    },
    "timeframe": {
      "type": "string",
      "description": "Analysis deadline"
    },
    "available_inputs": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Screenshots, mockups, specs, or live access"
    },
    "target_audience": {
      "type": "string",
      "description": "End user description (age, gaming experience, etc.)"
    },
    "language": {
      "type": "string",
      "enum": ["en", "vi"],
      "description": "Output language"
    }
  }
}
```

### Output Schema

The skill produces a structured analysis report:

```json
{
  "type": "object",
  "required": ["verdict", "disclosure", "evidence_chain"],
  "properties": {
    "verdict": {
      "type": "string",
      "enum": [
        "Touch-Friendly & Usable",
        "Conditional (reach tweaks)",
        "Poor Ergonomics",
        "Inconclusive"
      ]
    },
    "scenarios": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "description": {"type": "string"},
          "probability": {"type": "number", "minimum": 0, "maximum": 1}
        }
      }
    },
    "key_risks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "risk": {"type": "string"},
          "mitigation": {"type": "string"},
          "priority": {"type": "string", "enum": ["P0", "P1", "P2", "P3"]}
        }
      }
    },
    "evidence_chain": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "claim": {"type": "string"},
          "source": {"type": "string"},
          "tier": {"type": "integer", "minimum": 1, "maximum": 4}
        }
      }
    },
    "disclosure": {
      "type": "object",
      "properties": {
        "limitations": {"type": "array", "items": {"type": "string"}},
        "data_availability": {"type": "string"},
        "confidence_level": {"type": "string", "enum": ["High", "Medium", "Low"]}
      }
    },
    "recommended_actions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "action": {"type": "string"},
          "priority": {"type": "string", "enum": ["P0", "P1", "P2", "P3"]},
          "effort": {"type": "string"},
          "impact": {"type": "string"}
        }
      }
    }
  }
}
```

## Agent Execution Patterns

### Pattern 1: Router-Directed Specialist Execution
```python
# 1. Router analyzes task
routing = router.execute({"task": task, "inputs": inputs})

# 2. Selected specialist executes analysis
agent = agent_registry.get_agent(routing.decision.selected_agent_id)
result = agent.execute(inputs)

# 3. Quality validation
validation = validator.validate(result, quality_gates)
```

### Pattern 2: Parallel Multi-Agent Analysis
```python
# 1. Multiple specialists analyze in parallel
specialists = [MobileUIAnalysisAgent(), TouchInteractionAgent()]
results = await asyncio.gather(*[
    agent.execute(inputs) for agent in specialists
])

# 2. Synthesizer combines results
final = synthesizer.combine(results)
```

### Pattern 3: Degradation-Aware Execution
```python
# 1. Check degradation level
level = degradation_manager.get_level()

# 2. Adapt behavior based on level
if level == DegradationLevel.FULL:
    result = execute_full_analysis(inputs)
elif level == DegradationLevel.KNOWLEDGE_BASE_ONLY:
    result = execute_kb_analysis(inputs)
else:
    result = execute_degraded_analysis(inputs)

# 3. Add limitation banner if degraded
if level != DegradationLevel.FULL:
    result["banner"] = degradation_manager.get_banner()
```

## Skill Execution Flow

### 1. Pre-Flight: Language Detection

Before Step 1, detect the user's input language:
- **Vietnamese (vi):** Characters in à á ả ã ạ ă â đ è é ê ì í ò ó ô ơ ù ú ư ý
- **English (en):** Default
- **Other:** Default to English and ask for confirmation

Store detected language as `LANG`. All output MUST be in this language.

### 2. Harness Steps (Sequential)

```
Step 1: sub-gather-requirements
  → Clarify object, scope, constraints, timeframe, inputs, audience, language
  → Gate: At least one object confirmed

Step 2: sub-evidence-collector
  → Fetch current data + authoritative docs + recent developments
  → Gate: At least current data + 1 authoritative doc OR limitation flag

Step 3: sub-core-analysis
  → Design mobile-friendly, touch-friendly UI with HCI ergonomics
  → Gate: Thumb zone + touch targets + density/readability + accessibility

Step 4: sub-knowledge-updater
  → Query SECOND-KNOWLEDGE-BRAIN.md for academic/professional evidence
  → Gate: At least 1 academic/authoritative source surfaced

Step 5: sub-advisor
  → Synthesize into risk-disclosed conclusion with evidence chain
  → Gate: Conclusion is one of 4 categories; disclosure before conclusion

Step 6: Quality Gate Review
  → Verify U1-U6 + G1-G4 gates
  → Apply auto-fix for failed gates (max 2 retries per gate)
  → Emit limitation for unfixable gates
```

### 3. Hook System Integration

At each step, hooks are emitted:

- `before_sub_skill_invoke` → HookRegistry → handlers execute
- `after_sub_skill_invoke` → HookRegistry → handlers execute
- `quality_gate_failed` → DegradationManager → possibly adjust degradation level
- `degradation_level_changed` → emit degradation banner

### 4. State Synchronization

State snapshots are saved at:
- Before harness execution
- After each sub-skill invocation
- After quality gate completion

Snapshots include: session_id, timestamp, skill_name, current_step, total_steps, data

## Quality Gates

### Universal Gates (U1-U6)

| Gate | Check | Auto-Fix | Enforcement |
|------|-------|----------|-------------|
| U1 | ≥3 sources, ≥1 academic | Fetch from KB/evidence | Append before delivery |
| U2 | Disclosure before recommendation | Prepend disclosure | Block until present |
| U3 | Evidence hierarchy (Tier 1-4) | Annotate tiers | Tag each source |
| U4 | Language matches preference | Translate output | Run language detection |
| U5 | Output uses template | Reformat | Check sections present |
| U6 | Claims traceable | Flag unsupported | Mark each claim |

### Domain Gates (G1-G4)

| Gate | Check | Auto-Fix |
|------|-------|----------|
| G1 | Thumb-zone placement (Fitts) | Apply thumb-zone placement |
| G2 | Touch targets sized (≥44-48px) | Size touch targets |
| G3 | Density/contrast/readability | Address density/readability |
| G4 | One-handed/accessibility | Address accessibility |

## Graceful Degradation

| Level | Condition | Behavior |
|-------|-----------|----------|
| 0 | All primary sources reachable | Full evidenced analysis |
| 1 | Some primary sources fail | Use secondary sources; flag substitutions |
| 2 | Most live sources fail | Knowledge base only; flag historical context |
| 3 | Required input missing/stale | Proceed with available; mark DATA UNAVAILABLE |
| 4 | Complete failure | Emit DATA UNAVAILABLE notice |

## Tool Definitions

### Available Tools

| Tool | Category | Description | Input Schema |
|------|----------|-------------|--------------|
| WebSearch | data_fetch | Search web for current info | query (string), num_results (int) |
| ReadFile | utility | Read file from filesystem | path (string), encoding (string) |
| WriteFile | output | Write content to file | path (string), content (string) |
| KnowledgeQuery | knowledge | Query knowledge base | keywords (array), max_results (int) |

### Tool Execution

Tools are executed via the ToolExecutor:
1. Validate input against schema
2. Execute with timeout (default 30s)
3. Retry on failure (max 3 retries)
4. Return result or raise ToolExecutionError

## Knowledge Base Integration

### SECOND-KNOWLEDGE-BRAIN.md Structure

```markdown
# SECOND-KNOWLEDGE-BRAIN

## Evidence Hierarchy
| Tier | Description | Examples |

## 1. Core Methods
- Fitts's Law for Touch Target Sizing
- Thumb Zone Analysis
- Gesture Discoverability Framework

## 2. Key Papers (with DOIs)
| # | Title | Authors | Year | Venue | Tier |

## 3. State of the Art
- Touch Interaction Research
- Accessibility Standards

## 4. Authoritative Data Sources
- Academic Databases
- Industry Documentation

## 5. Frameworks and Methodologies
- Design Frameworks
- Evaluation Methods

## 6. Self-Update Protocol
- Schedule
- Update Process
- Manual Update

## 7. Knowledge Update Log
- Auto-appended entries from knowledge_updater.py
```

### Knowledge Pipeline

```
Scheduler (Cron)
    ↓
Fetchers (ArXiv, Semantic Scholar, RSS)
    ↓
Scoring & Deduplication
    ↓
Append to SECOND-KNOWLEDGE-BRAIN.md
```

## Validation

### Skill Validation Checklist

- [ ] SKILL.md has valid frontmatter (name, description)
- [ ] skills/main.md has all sections
- [ ] All 5 sub-skills exist with valid frontmatter
- [ ] All sub-skills have Role, Workflow, Output Format, Quality Gates
- [ ] SECOND-KNOWLEDGE-BRAIN.md has all 7 sections
- [ ] tools/knowledge_updater.py exists and is runnable
- [ ] tools/run_test_scenarios.py passes all checks
- [ ] tests/test-scenarios.md has ≥5 scenarios
- [ ] PROJECT-DEVELOPMENT-PHASE-TRACKING.md shows 100% complete

### Run Validation

```bash
python tools/run_test_scenarios.py
python tools/test_knowledge_updater.py
python scripts/setup.py
```

## Compatibility

### Required Tools

- **WebSearch** / **WebFetch** — Fetch domain sources
- **Read** / **Write** — Read/write files
- **Bash** — Run knowledge_updater.py
- **Skill** — Invoke sub-skills
- **Image analysis** — For UI screenshot analysis (optional)

### Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- requests≥2.31.0
- feedparser≥6.0.10
- python-dateutil≥2.8.2

## Installation

1. Copy skill to `~/.claude/skills/game-ui-mobile-friendly-design/`
2. Or install via project CLAUDE.md
3. Run setup: `python scripts/setup.py`
4. Test: `/game-ui-mobile-friendly-design help`

## Usage Examples

### Basic UI Analysis
```
/game-ui-mobile-friendly-design Analyze this mobile game menu for touch-friendliness
```

### Accessibility Assessment
```
/game-ui-mobile-friendly-design Is this game UI accessible for colorblind players?
```

### Gesture Design Review
```
/game-ui-mobile-friendly-design Review the gesture discoverability in this game
```

## Output Template

```
# Mobile-Friendly Game UI Design & Touch-Friendly Interaction — Report

## Executive Summary
[2-3 sentences; verdict + headline action]

## Inputs & Scope
[object of analysis, constraints, timeframe, available inputs]

## Evidence Collected
[real-time data + authoritative docs with source + tier per item]

## Analysis / Scorecard
[domain method results, metrics/scenarios with units]

## Action / Control Plan
[concrete actions with magnitude + safety limits]

## Academic & Research Evidence
[3-5 entries from SECOND-KNOWLEDGE-BRAIN.md with citations]

## ⚠️ Disclosure / Limitations
[mandatory notice before recommendation]

## Recommendation / Conclusion
[verdict category, scenarios, key risks, evidence chain, remediation]

## Post-Execution Gate Checklist
[U1✓ U2✓ U3✓ U4✓ U5✓ U6✓ G1✓ G2✓ G3✓ G4✓]
```

## Version History

- **1.0.0** (2025-01-15) — Production ready, Phase 5 complete
- All 8-file contract satisfied
- Knowledge pipeline operational
- Quality gates implemented with auto-fix
- Hook system with lifecycle, state sync, degradation
- Modular directory structure (/config, /scripts, /references, /assets, /hooks)

## License

MIT — see LICENSE file in project root.

## Citation

```bibtex
@software{game-ui-mobile-friendly-design,
  title = {game-ui-mobile-friendly-design: Mobile-Friendly Game UI Design \& Touch-Friendly Interaction},
  author = {Claude Code},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/972026/265-game-ui-mobile-friendly-design}
}
```

---

**End of SKILL.md**
