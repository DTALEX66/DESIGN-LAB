# System Architecture Diagrams

This document contains architecture diagrams for the game-ui-mobile-friendly-design skill system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Skill Harness Architecture](#skill-harness-architecture)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Hook System Architecture](#hook-system-architecture)
5. [Quality Gate Architecture](#quality-gate-architecture)
6. [Knowledge Pipeline Architecture](#knowledge-pipeline-architecture)


## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Invocation                              │
│                   /game-ui-mobile-friendly-design              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Main Harness (main.md)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Pre-Flight: Language Detection                            │ │
│  │  Detect: Vietnamese (vi) / English (en) / Other             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Hook System                                                │ │
│  │  before_skill_load → emit_event → HookRegistry             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐            │
│  │ Step │   1  │   2  │   3  │   4  │   5  │   6  │            │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤            │
│  │ Name │ Gather│Ev-i- │Core  │Know- │Advi- │Qual- │            │
│  │      │Reqs  │dence │Anal  │ledge │sor   │ity   │            │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤            │
│  │ Sub- │sub-  │sub-  │sub-  │sub-  │sub-  │Gate  │            │
│  │ skill│gather│evi- │core │know-│adv- │Re-   │            │
│  │      │      │dence│anal │ledge│isor │view  │            │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Graceful Degradation System                               │ │
│  │  Level 0: All sources reachable                            │ │
│  │  Level 1: Some sources fail → secondary                    │ │
│  │  Level 2: Most fail → knowledge base only                 │ │
│  │  Level 3: Missing inputs → mark unavailable               │ │
│  │  Level 4: Complete failure → DATA UNAVAILABLE notice       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Final Output                                │
│  Analysis Report with Evidence + Disclosure + Recommendations   │
└─────────────────────────────────────────────────────────────────┘
```


## Skill Harness Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skill Registry                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SKILL.md (Skill Metadata)                               │ │
│  │  - Name: game-ui-mobile-friendly-design                    │ │
│  │  - Description: When to trigger                           │ │
│  │  - Compatibility: Required tools                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Main Skill (skills/main.md)                             │ │
│  │  - Role: Senior UI/UX Specialist                         │ │
│  │  - Harness: 6-step execution protocol                    │ │
│  │  - Quality Gates: U1-U6 + G1-G4                          │ │
│  │  - Graceful Degradation: 5 levels                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Sub-Skills (skills/sub-*.md)                           │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ sub-gather-requirements      → Requirements Spec     │ │ │
│  │  │ sub-evidence-collector       → Evidence Bundle      │ │ │
│  │  │ sub-core-analysis            → Analysis Scorecard   │ │ │
│  │  │ sub-knowledge-updater        → Knowledge Citations  │ │ │
│  │  │ sub-advisor                   → Final Synthesis      │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```


## Data Flow Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User Input │────>│ Main Harness  │────>│ Requirements  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │   Evidence    │
                   │   Collector   │
                   └──────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌──────────────┐           ┌──────────────┐
     │  Web Sources │           │  Knowledge   │
     │  - Apple HIG │           │     Base     │
     │  - Material  │           │              │
     │  - WCAG      │           └──────────────┘
     └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  Core        │
                   │  Analysis    │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  Knowledge   │
                   │  Query       │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │   Advisor    │
                   │  Synthesize  │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  Quality     │
                   │  Gates       │
                   └──────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌──────────────┐           ┌──────────────┐
     │   Output     │           │  Auto-Fix    │
     │  Generation  │           │  Loop        │
     └──────────────┘           └──────────────┘
```


## Hook System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HookRegistry                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Event Registration                                     │ │
│  │  - register(event, handler, priority)                │ │
│  │  - unregister(event, handler)                          │ │
│  │  - emit(event, context) → List[HookResult]            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Hook Events                                          │ │
│  │  Skill Lifecycle:                                     │ │
│  │  - BEFORE_SKILL_LOAD, AFTER_SKILL_LOAD               │ │
│  │  - BEFORE_SKILL_EXECUTE, AFTER_SKILL_EXECUTE          │ │
│  │  - BEFORE_SUB_SKILL_INVOKE, AFTER_SUB_SKILL_INVOKE    │ │
│  │                                                        │ │
│  │  Quality Gates:                                        │ │
│  │  - BEFORE_QUALITY_GATE, AFTER_QUALITY_GATE            │ │
│  │  - QUALITY_GATE_FAILED, QUALITY_GATE_FIXED             │ │
│  │                                                        │ │
│  │  Data Operations:                                      │ │
│  │  - BEFORE_DATA_FETCH, AFTER_DATA_FETCH                │ │
│  │  - BEFORE_DATA_WRITE, AFTER_DATA_WRITE                │ │
│  │  - BEFORE_KNOWLEDGE_QUERY, AFTER_KNOWLEDGE_QUERY       │ │
│  │  - BEFORE_KNOWLEDGE_UPDATE, AFTER_KNOWLEDGE_UPDATE    │ │
│  │                                                        │ │
│  │  Degradation:                                          │ │
│  │  - DEGRADATION_LEVEL_CHANGED, FALLBACK_TRIGGERED       │ │
│  │  - ERROR_OCCURRED                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Built-in Hooks                                        │ │
│  │  - log_hook: Emit events to log                       │ │
│  │  - metrics_hook: Collect execution metrics            │ │
│  │  - state_sync_hook: Synchronize state between calls   │ │
│  │  - degradation_hook: Manage graceful degradation      │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```


## Quality Gate Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Quality Gate Enforcement System                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Universal Gates (U1-U6)                            │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ U1: Source Count                                │ │   │
│  │  │   Check: >=3 sources, >=1 academic              │ │   │
│  │  │   Auto-Fix: Fetch from knowledge base            │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ U2: Disclosure First                             │ │   │
│  │  │   Check: Limitations before recommendations      │ │   │
│  │  │   Auto-Fix: Prepend disclosure section           │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ U3: Evidence Hierarchy                           │ │   │
│  │  │   Check: Tier labels on all sources              │ │   │
│  │  │   Auto-Fix: Classify and tag sources              │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ U4: Language Match                              │ │   │
│  │  │   Check: Output matches user language           │ │   │
│  │  │   Auto-Fix: Translate output                     │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ U5: Template Structure                           │ │   │
│  │  │   Check: All sections present                   │ │   │
│  │  │   Auto-Fix: Reformat to template                 │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ U6: Claim Traceability                          │ │   │
│  │  │   Check: Every claim cited or flagged           │ │   │
│  │  │   Auto-Fix: Mark claims with sources              │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Domain Gates (G1-G4)                               │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ G1: Thumb Zone Placement                       │ │   │
│  │  │   Check: Fitts's Law applied                     │ │   │
│  │  │   Auto-Fix: Apply thumb zone placement          │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ G2: Touch Target Sizing                         │ │   │
│  │  │   Check: >=44-48px for interactive elements     │ │   │
│  │  │   Auto-Fix: Size to minimum                      │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ G3: Density/Readability                          │ │   │
│  │  │   Check: Balanced information density            │ │   │
│  │  │   Auto-Fix: Adjust spacing and contrast          │ │   │
│  │  ├─────────────────────────────────────────────────┤ │   │
│  │  │ G4: One-Handed/Accessibility                      │ │   │
│  │  │   Check: One-handed use considered                │ │   │
│  │  │   Auto-Fix: Add accessibility features            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Enforcement Logic:                                          │
│  1. Execute gate check                                      │
│  2. If failed, run auto-fix (max 2 retries)                │
│  3. If still failed, emit limitation and continue          │
│  4. Track gate execution in metadata                       │
└─────────────────────────────────────────────────────────────┘
```


## Knowledge Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Knowledge Update Pipeline                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Scheduler (Cron)                                    │   │
│  │  - Weekly: Monday 8:00 AM (Academic update)          │   │
│  │  - Daily: 7:00 AM (News update)                      │   │
│  │  - Manual: python tools/knowledge_updater.py         │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Fetchers                                            │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │ ArXiv Fetcher                                   │ │   │
│  │  │ - Query: cs.HC + domain keywords                │   │
│  │  │ - Max results: 10 per category                   │   │
│  │  │ - Format: XML parsing                             │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │ Semantic Scholar Fetcher                       │ │   │
│  │  │ - Query: domain keywords                         │   │
│  │  │ - Fields: title,authors,year,venue,citationCount│   │
│  │  │ - Format: JSON                                   │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │ RSS Feed Fetcher                                │   │
│  │  │ - Sources: Configured RSS feeds                  │   │
│  │  │ - Max results: 10 per feed                      │   │
│  │  │ - Format: feedparser                             │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Scoring & Deduplication                            │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │ Scoring Formula:                                │ │   │
│  │  │ score = (recency × 0.4) + (relevance × 0.4)     │ │   │
│  │  │         + (citation × 0.2)                      │ │   │
│  │  │                                                   │ │   │
│  │  │ Deduplication:                                   │ │   │
│  │  │ - SHA256 hash of DOI/URL                         │ │   │
│  │  │ - Skip if already present                         │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Append to Knowledge Base                            │   │
│  │  - Target: SECOND-KNOWLEDGE-BRAIN.md                 │   │
│  │  - Section: ## 7. Knowledge Update Log               │   │
│  │  - Format: Standard entry template                    │   │
│  │  - Limit: max_new_entries_per_run (default: 20)      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```


## State Synchronization Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              State Synchronization System                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  StateManager                                        │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │ State Snapshot                                  │ │   │
│  │  │ - session_id: Unique identifier                 │ │   │
│  │  │ - timestamp: When snapshot created              │ │   │
│  │  │ - skill_name: Current skill                     │   │
│  │  │ - current_step: Execution progress               │   │
│  │  │ - total_steps: Total steps in harness           │   │
│  │  │ - data: Key-value state data                    │ │   │
│  │  │ - metadata: Additional context                   │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  State Hooks                                         │   │
│  │  - before_skill_execute → Create snapshot            │   │
│  │  - after_skill_execute → Update snapshot             │   │
│  │  - before_sub_skill_invoke → Save intermediate state │   │
│  │  - after_sub_skill_invoke → Restore next step        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Storage (.state/)                                    │   │
│  │  - session_id.json: Snapshots for session             │   │
│  │  - Format: {current: {...}, snapshots: [...]}        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
