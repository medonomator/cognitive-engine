# Metacognitive Observer System

## What Is It

A **Personal Cognitive Observer** — a swarm of LLM agents that observes, analyzes, and learns from human-AI interactions over time.

The system watches conversations between a user and an AI assistant (Claude Code), extracts patterns, decisions, mistakes, and knowledge — then stores them in persistent vector memory (Qdrant). Over time, it builds a deep understanding of the user's work, habits, and recurring problems.

Formally, this is a **Metacognitive Agent System** — "meta" because it's a system that *thinks about how another system thinks*.

### Related Concepts

| Concept | Relation |
|---------|----------|
| **SOAR / ACT-R** | Cognitive architectures with reflection (Carnegie Mellon, 1980s) |
| **Reflective AI** | AI that analyzes its own performance |
| **Collective Metacognition** | Group of agents reflecting together |
| **Personal Knowledge Management** | Automated PKM with active agents |

## Architecture

```
Claude Code JSONL logs
        |
   [Cron trigger]
        |
   Log Parser — reads conversations, filters noise
        |
   Swarm of 6 agents (gpt-4o-mini):
   ├── pattern-detector     — recurring themes, repeated problems
   ├── decision-tracker     — decisions made and rationale
   ├── knowledge-extractor  — new facts, configs, learnings
   ├── mistake-analyzer     — errors, wasted effort, repeated mistakes
   ├── productivity-analyst — focus, context switches, trends
   └── report-compiler      — synthesizes all findings
        |
   ┌────┴────┐
   │         │
Qdrant    Telegram
(memory)  (weekly report)
```

### Data Flow

1. **Daily (23:00)**: Parse last 24h of conversations, run swarm analysis, store insights in Qdrant. No notification.
2. **Weekly (Sunday 20:00)**: Parse last 7 days, run analysis WITH memory recall from daily runs, send report to Telegram.

Each daily run enriches the memory. The weekly run benefits from accumulated context — agents recall patterns from Mon-Sat before analyzing Sunday's data.

## Memory Model

Vector memory in Qdrant with decay and reinforcement:

```
strength(t+1) = strength(t) * (1 - decayRate / (1 + log(1 + reinforcements)))
```

- **New insight**: strength = 1.0
- **Reinforced** (agents vote "agree"): strength += 0.2, decays slower
- **Unreinforced**: decays ~5% per run, evicted below 0.1
- **Heavily reinforced**: near-permanent (decay approaches 0)

This ensures valuable knowledge persists while noise fades naturally.

## Improvement Roadmap

### 1. Close the Loop — Feed Context Back to Claude

**Impact: highest.** Currently, the observer collects insights but Claude doesn't see them during conversations.

Solution: Use Claude Code hooks to inject relevant Qdrant memories at conversation start.

```
User: "Fix auth bug"
Hook → memory.search("auth bug") → 3 prior incidents
Claude sees: "Last time this was caused by missing EnvironmentObject"
```

This turns passive observation into active assistance.

### 2. Recall-Based Reinforcement

Currently, memory is reinforced only by agent votes. Better: reinforce when a memory **actually helped** — if it was recalled via search and the task was resolved successfully, boost its strength.

Useful memories survive longer. Irrelevant ones fade faster.

### 3. Anomaly Detection

A dedicated agent watching for **deviations from normal**:
- "3x more errors than usual today"
- "First time working on backend in a month"
- "Conversation lasted 4 hours — average is 40 minutes"

Anomalies often indicate problems worth flagging before they become patterns.

### 4. Predictive Context

After weeks of observation, the system recognizes temporal patterns:
- Monday-Wednesday: iOS work
- Thursday: backend
- Friday: debugging

It can **pre-load** relevant context for predicted tasks before the user even starts.

### 5. Self-Improvement Loop

The observer analyzes its own past reports:
- "Last week I predicted problem X — it happened" (reinforce this pattern)
- "My suggestion Y was ignored" (reduce confidence in similar suggestions)

The swarm learns to give better recommendations over time.

### 6. Multi-Source Integration

Beyond Claude logs, integrate:

| Source | What It Adds |
|--------|-------------|
| **Git commits** | What actually changed in code |
| **Jira/Linear** | What was planned vs what happened |
| **Sentry** | Production errors and their context |
| **Calendar** | Deadlines and scheduling pressure |

Combined view: "Deadline Thursday, no commits in 2 days, 3 new Sentry errors on that project."

### 7. User Personality Model

Over months, build a model of the user's:
- **Strengths**: deep TypeScript knowledge, fast debugging
- **Weaknesses**: forgets async patterns, skips error handling
- **Preferences**: examples over abstractions, quick fixes before refactoring
- **Work patterns**: loses focus after 3 hours, most productive in morning

This allows Claude to adapt explanations, warnings, and suggestions to the specific user.

## Cost Analysis

Using gpt-4o-mini for all agents:

| Operation | Cost |
|-----------|------|
| Daily analysis (5 conversations) | ~$0.04-0.10 |
| Weekly report (with memory recall) | ~$0.10-0.15 |
| Monthly total | ~$2-3 |
| Qdrant storage | Self-hosted, free |
| Telegram reports | Free |

The swarm of cheap models is viable precisely because the task is **analysis**, not generation — breadth matters more than depth.

## Why Swarm, Not Single Model

A single LLM call could summarize conversations. But the swarm provides:

1. **Specialization**: mistake-analyzer catches things productivity-analyst ignores
2. **Debate**: agents challenge each other's findings (groupthink detection)
3. **Memory accumulation**: insights compound across runs
4. **Shapley attribution**: know which agent type contributes most, prune the rest
5. **Self-correction**: replicator dynamics rebalance strategies between rounds

For a one-off summary, single model wins. For a system that **learns and improves over weeks**, the swarm architecture is necessary.

## Implementation

The observer is implemented as `@cognitive-swarm/observer` package:

```
packages/observer/
├── src/
│   ├── log-parser.ts    — parses Claude Code JSONL logs
│   ├── agents.ts        — 6 specialized analysis agents
│   ├── telegram.ts      — report delivery with proxy support
│   ├── providers.ts     — OpenAI LLM/embedding providers
│   ├── run.ts           — main entry point with safety caps
│   └── index.ts
├── observe-daily.sh     — cron script (analysis only)
├── observe-weekly.sh    — cron script (analysis + Telegram)
└── package.json
```

Safety limits:
- `maxRounds: 3`, `maxSignals: 50` per swarm run
- Hard timeout: 5 minutes
- Cost cap warning: $0.50
- Max 5 conversations per analysis
- Max 5 Telegram messages per report
