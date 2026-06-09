# BG-09: Digital Twin / What-If Simulation

**Status:** NOT IMPLEMENTED  
**Priority:** Very Low  
**Complexity:** VERY HIGH  
**Dependencies:** Tasks module (for dependency graph), Employees module (for capacity), Projects module (for timelines), Predictive Analytics (bg-08) — or at least the data warehouse tables from it

---

## 1. What the Feature Is

A simulation engine that creates a "digital twin" of the workspace's active projects — a live, computational model of team capacity, task dependencies, deadlines, and scope. Users can tweak parameters ("add 2 engineers," "reduce scope 20%," "start 2 weeks later") and immediately see the projected impact on delivery dates, team utilization, and critical path.

This is the difference between "knowing you're behind" and "knowing exactly what will fix it."

Think of it as a flight simulator for project management:
- Current state = actual project data
- Scenario = modified parameters
- Simulation = projected outcomes based on dependency graph + capacity model
- Comparison = side-by-side current vs simulated

## 2. Why It's Missing

- **No simulation engine exists.** There is no computational model that takes project state + scenario parameters and produces a projected timeline. Building one requires graph traversal (critical path), resource leveling (capacity allocation), Monte Carlo methods (probabilistic outcomes), and calendar logic (working days, PTO). None of this exists.
- **No dependency graph.** Task model has subtasks (`parent_id`) but no formal dependency types (finish-to-start, etc.). Without this, the simulation can't order work or find the critical path.
- **No capacity model.** Employees have no availability data, no PTO tracking, no allocation percentage per project. Simulating "add 2 engineers" is meaningless when we don't know what "current capacity" is.
- **No historical velocity data.** See bg-08. The simulation needs per-user velocity distributions for Monte Carlo sampling. Without this, all simulations are deterministic worst-guess approximations.
- **Massive performance risk.** A simulation involving 500 tasks, 20 people, and Monte Carlo sampling (1000 iterations) requires serious computation. Running this synchronously in an API request would time out. Async job infrastructure exists but isn't designed for interactive "tweak slider → see result" use cases.
- **Data accuracy problem.** The simulation is only as good as its inputs. If actual project data is incomplete or stale (which it often is in early-adopter workspaces), simulations produce misleading results that destroy trust.

This is the most technically ambitious feature on the backlog. It's also the furthest from being shippable.

## 3. Full Backend Specification

### 3.1 Prerequisites

Same data infrastructure as bg-08:
- `TaskDependency` table with proper dependency types
- `UserCapacity` table with daily availability
- `VelocityFact` table with per-user historical throughput
- `Calendar` table (working days, holidays per region)

### 3.2 Models

```csharp
// Simulation — a saved scenario with its parameters
public class Simulation
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;       // "What if we add 2 more devs?"
    public string ScenarioConfig { get; set; } = string.Empty; // JSON: all parameter overrides
    public string? Results { get; set; }                   // JSON: simulation output (nullable until run)
    public int Iterations { get; set; } = 1000;            // Monte Carlo iterations
    public string Status { get; set; } = "draft";           // "draft", "running", "completed", "failed"
    public string? ErrorMessage { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

// SimulationTemplate — reusable scenario template
public class SimulationTemplate
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;       // "Add headcount", "Reduce scope"
    public string DefaultConfig { get; set; } = string.Empty; // Default parameter structure
    public string Category { get; set; } = string.Empty;   // "capacity", "scope", "timeline"
    public bool IsBuiltIn { get; set; }                    // System templates vs custom
}

// ScenarioConfig schema (stored as JSON in Simulation.ScenarioConfig)
//
// {
//   "projectIds": ["uuid", "uuid"],
//   "teamChanges": [
//     { "userId": "uuid", "action": "remove" },
//     { "role": "developer", "action": "add", "count": 2, "velocityPercentile": 50 }
//   ],
//   "scopeChanges": [
//     { "projectId": "uuid", "action": "percent", "value": -20 },
//     { "taskId": "uuid", "action": "remove" }
//   ],
//   "timelineChanges": [
//     { "projectId": "uuid", "action": "shift", "days": 14 }
//   ],
//   "calendarOverrides": {
//     "workingDays": ["mon","tue","wed","thu","fri"],
//     "holidays": ["2026-07-04", "2026-12-25"],
//     "ptoDays": { "userId": ["2026-06-01", "2026-06-05"] }
//   },
//   "assumptions": {
//     "blockerProbability": 0.15,
//     "avgBlockerDurationDays": 2.0,
//     "meetingOverheadHoursPerDay": 1.5
//   }
// }
```

### 3.3 Simulation Engine Architecture

```
POST /api/simulations/{id}/run
  ↓
Validation: Are all referenced entities available? Is scenario config well-formed?
  ↓
Snapshot: Capture current state of all referenced projects, tasks, dependencies, assignments
  ↓
Apply scenario changes to snapshot (in-memory copy)
  ↓
Graph traversal:
  1. Build dependency graph from TaskDependency records
  2. Topological sort to determine execution order
  3. Forward pass: compute earliest start/finish for each task
  4. Backward pass: compute latest start/finish, find critical path
  ↓
Resource leveling (optional, configurable):
  1. For each time period, compute total demand vs available capacity
  2. Shift non-critical tasks to balance load
  3. Recompute critical path after leveling
  ↓
Monte Carlo simulation (1000 iterations):
  For each iteration:
    1. Sample task durations from velocity distribution (per-user or team average)
    2. Sample blocker probability/duration
    3. Run critical path computation
    4. Record project completion date
  ↓
Aggregate results:
  ├── P10, P50, P90 completion dates
  ├── Confidence distribution (histogram)
  ├── Critical path heatmap (which tasks are most likely to be on critical path)
  ├── Utilization report per team member
  └── Bottleneck identification
  ↓
Save Simulation.Results as JSON
  ↓
Return 200 with summary
```

### 3.4 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/simulations` | List saved simulations for workspace |
| POST | `/api/simulations` | Create a new simulation scenario |
| GET | `/api/simulations/{id}` | Get simulation details (including results if completed) |
| PUT | `/api/simulations/{id}` | Update scenario config |
| DELETE | `/api/simulations/{id}` | Delete a simulation |
| POST | `/api/simulations/{id}/run` | Execute the simulation |
| GET | `/api/simulations/{id}/results` | Get cached results |
| POST | `/api/simulations/{id}/export` | Export results as presentation slide (PNG/PDF) |
| GET | `/api/simulations/templates` | List built-in templates |

**POST /api/simulations**

Request:
```json
{
  "name": "What if we add 2 more devs?",
  "scenarioConfig": {
    "projectIds": ["uuid"],
    "teamChanges": [
      { "role": "developer", "action": "add", "count": 2, "velocityPercentile": 50 }
    ]
  }
}
```

Response (201):
```json
{
  "id": "uuid",
  "name": "What if we add 2 more devs?",
  "status": "draft",
  "createdAt": "2026-05-01T10:00:00Z"
}
```

**POST /api/simulations/{id}/run**

Response (202 — runs async; poll status field):
```json
{
  "id": "uuid",
  "status": "running",
  "estimatedDuration": "30 seconds"
}
```

After completion, GET /api/simulations/{id} includes results:

```json
{
  "id": "uuid",
  "name": "What if we add 2 more devs?",
  "status": "completed",
  "results": {
    "baseline": {
      "p50Date": "2026-06-15",
      "p10Date": "2026-06-05",
      "p90Date": "2026-07-01",
      "criticalPath": ["task-id-a", "task-id-b", "task-id-c"]
    },
    "simulated": {
      "p50Date": "2026-05-25",
      "p10Date": "2026-05-18",
      "p90Date": "2026-06-05",
      "improvement": 21,
      "criticalPath": ["task-id-b", "task-id-c"]
    },
    "histogram": [
      { "date": "2026-05-18", "probability": 0.05 },
      { "date": "2026-05-25", "probability": 0.25 },
      { "date": "2026-06-01", "probability": 0.35 },
      { "date": "2026-06-08", "probability": 0.20 },
      { "date": "2026-06-15", "probability": 0.10 },
      { "date": "2026-06-22", "probability": 0.05 }
    ],
    "utilization": {
      "baseline": { "alice": 1.1, "bob": 0.95, "charlie": 0.7 },
      "simulated": { "alice": 0.9, "bob": 0.8, "charlie": 0.6, "dev4": 0.75, "dev5": 0.75 }
    },
    "bottlenecks": [
      { "taskId": "uuid", "taskName": "API Integration", "blockingCount": 8, "criticality": 0.92 }
    ]
  }
}
```

### 3.5 Controller Outline

```
SimulationsController
├── List() → GET /api/simulations
│   └── Simple CRUD list with workspace filter
├── Create() → POST /api/simulations
│   ├── Validate scenario config schema
│   ├── Verify referenced entities exist
│   └── Create Simulation record (status: draft)
├── Get() → GET /api/simulations/{id}
│   └── Return full simulation including results
├── Update() → PUT /api/simulations/{id}
│   └── Validate + update (reset status to draft if config changed)
├── Delete() → DELETE /api/simulations/{id}
├── Run() → POST /api/simulations/{id}/run
│   ├── Validate no concurrent run (status must be draft or completed)
│   ├── Set status to running
│   ├── Enqueue background job
│   │   ├── Snapshot entities
│   │   ├── Apply scenario
│   │   ├── Build dependency graph
│   │   ├── Run Monte Carlo simulation
│   │   ├── Aggregate results
│   │   └── Save results + set status to completed
│   └── Return 202
├── GetResults() → GET /api/simulations/{id}/results
│   └── Returns just the results object (useful for polling)
├── Export() → POST /api/simulations/{id}/export
│   ├── Generate HTML report
│   ├── Convert to PDF/PNG via headless renderer
│   └── Return file download
└── GetTemplates() → GET /api/simulations/templates
    └── Return built-in + custom templates
```

### 3.6 Simulation Engine Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Projects per simulation | 1–5 | More than 5 is impractical for comparison |
| Tasks per project | Up to 1000 | Beyond that, use summary-level simulation |
| Monte Carlo iterations | 1000 | Industry standard; 5000 for high-stakes |
| Run time (1000 iter, 500 tasks) | < 30 seconds | Otherwise UX suffers |
| Run time (5000 iter) | < 2 minutes | Acceptable for overnight batch |
| Memory per simulation | < 500 MB | Important if multiple concurrent runs |
| Cached results TTL | 7 days | Or until project state changes |

If performance targets can't be met, reduce Monte Carlo iterations or switch to deterministic simulation with sensitivity analysis.

## 4. Frontend Design

### 4.1 Simulation Builder

```
┌──────────────────────────────────────────────────┐
│  What-If Simulation                             │
│  ┌────────────────────────────────────────────┐  │
│  │ Save: [What if we add 2 more devs?      ] │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ─── 1. Select Projects ───                     │
│  ☑ Mobile App v2                                │
│  ☐ Web Dashboard                                │
│  ☐ API Gateway                                  │
│                                                  │
│  ─── 2. Adjust Parameters ───                   │
│                                                  │
│  Team Changes:                                   │
│  ┌─────────────────────────────────────────┐    │
│  │ Add: [2] developers                     │    │
│  │ Remove: [None ▼]                        │    │
│  │ New hire percentile: [50th ▼]           │    │
│  │ (50th = average, 75th = senior)         │    │
│  │ [+ Add another change]                  │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Scope Changes:                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ Reduce scope by: [20%]                  │    │
│  │ [+ Exclude specific tasks]              │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Timeline Changes:                               │
│  ┌─────────────────────────────────────────┐    │
│  │ Shift start by: [14 days later ▼]       │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Assumptions:                                    │
│  ┌─────────────────────────────────────────┐    │
│  │ Blocker probability: [15%] ████░░░░░░  │    │
│  │ Meeting overhead: [1.5h/day] ███░░░░░░ │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  [Run Simulation →]                              │
└──────────────────────────────────────────────────┘
```

### 4.2 Side-by-Side Comparison View

```
┌─────────── Current ───────────┬─────────── Simulated ──────────┐
│                                │                                │
│  P50: Jun 15                  │  P50: May 25 (-21 days) 🎉    │
│  P10: Jun 5                   │  P10: May 18                  │
│  P90: Jul 1                   │  P90: Jun 5                   │
│                                │                                │
│  Confidence Distribution:      │  Confidence Distribution:      │
│  ██░░░░░░░░░░░░░░░░░░░        │  ████████░░░░░░░░░░░░░░░      │
│  (wide spread, low confidence) │  (tighter, higher confidence) │
│                                │                                │
│  Utilization:                  │  Utilization:                  │
│  Alice: ██████████░ 110%      │  Alice: ████████░░░ 90%        │
│  Bob:   █████████░░ 95%       │  Bob:   ████████░░░ 80%        │
│  Charlie: █████░░░░░ 70%      │  Charlie: ██████░░░░░ 60%      │
│                                │  Dev4:  ███████░░░░ 75%        │
│                                │  Dev5:  ███████░░░░ 75%        │
│                                │                                │
│  Critical Path:                │  Critical Path:                │
│  [API]─[Auth]─[Payments]─[QA] │  [Auth]─[Payments]─[QA]       │
│  (4 tasks, 45 days)           │  (3 tasks, 30 days)            │
└────────────────────────────────┴────────────────────────────────┘
```

### 4.3 Timeline Overlay (Gantt-style)

Interactive Gantt chart showing baseline vs simulated:
- Baseline bars: gray with diagonal hatch pattern
- Simulated bars: green (if shorter) or red (if longer)
- Critical path tasks: bold border
- Bottleneck tasks: warning icon

Clicking a task shows: "This task is on the critical path in 85% of simulations. Consider splitting or adding resources."

### 4.4 Export as Presentation Slide

Poster-style summary of the comparison, designed for stakeholder presentations:
- Title: "Scenario: Add 2 Developers — Mobile App v2"
- Key metric: "21 days faster delivery (P50)"
- Side-by-side date comparison
- Utilization heatmap
- Callout: "Recommended action: Hire 2 senior devs, estimated cost: $X, estimated return: 21 days earlier launch"

### 4.5 UX States

| State | Handling |
|-------|----------|
| No projects | "Create a project first to run simulations." |
| No dependencies | "Add task dependencies to enable simulations. Without dependencies, we can't model the critical path." |
| No capacity data | "Add team availability information for accurate simulations." |
| Simulation running | Progress bar with estimated time; poll for completion |
| Simulation completed | Show comparison view with baseline vs simulated |
| Simulation failed | Error message with specific failure reason; suggest data fixes |
| Stale simulation ( > 7 days) | Warning: "This simulation is based on data from [date]. Re-run for current results." |
| Saved simulation list | Card grid with simulation name, status, quick "Re-run" button |

## 5. Ethical Guardrails

1. **Simulations are not guarantees.** Every output includes: "This is a simulation based on historical data and assumptions. Actual results may differ."
2. **No automated decision-making.** Simulations never directly trigger actions (hiring, firing, scope changes). They inform human decisions.
3. **Assumptions must be visible.** All configurable assumptions (blocker probability, overhead, etc.) must be shown alongside results.
4. **Baseline always shown.** Never show only the simulated result — always show current state + projected state comparison.
5. **Data freshness warning.** If source data is > 1 week old, display a stale-data warning.

---

## 5. Implementation Roadmap

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| 0 | Months 1–3 | Data foundation (same as bg-08 Phase 0–2) |
| 1 | Months 3–4 | Deterministic simulation (single path, no Monte Carlo) |
| 2 | Months 4–5 | Monte Carlo engine + async execution |
| 3 | Months 5–6 | Resource leveling algorithm |
| 4 | Months 6–7 | Side-by-side comparison frontend |
| 5 | Months 7–8 | Scenario builder UI + templates |
| 6 | Months 8–9 | Export to presentation |
| 7 | Months 9–10 | Performance optimization + caching |

**Total time to first useful simulation: ~6 months.**

## 6. Open Questions

- Should simulations run entirely on the server or can some computation be offloaded to WebAssembly on the client? Client-side could be faster for simple scenarios but introduces data privacy concerns (project data leaves the server).
- How do we handle concurrent simulations on the same project state? Locking or isolation levels?
- Should there be a "compare simulations" feature (SaaS A vs SaaS B vs Do Nothing)?
- How do we validate simulation accuracy? Track predicted vs actual outcomes and compute calibration score?
- What if the dependency graph has cycles? Need cycle detection + user notification + graceful degradation (treat cyclic tasks as sequential).
