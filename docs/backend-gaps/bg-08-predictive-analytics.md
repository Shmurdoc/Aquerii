# BG-08: Predictive Analytics (Delivery Forecasting & Resource Suggestions)

**Status:** NOT IMPLEMENTED  
**Priority:** Very Low  
**Complexity:** VERY HIGH  
**Dependencies:** Projects module (for historical data), Tasks module (for completion data), Employees module (for velocity per user)

---

## 1. What the Feature Is

Machine learning-powered forecasting that predicts delivery dates for projects with confidence intervals, and recommends resource allocation changes to improve outcomes. This turns historical project data into actionable forward-looking intelligence.

Two core capabilities:
- **Delivery Forecast:** "Project 'Mobile App v2' has an 80% chance of delivery by June 15, with 95% confidence interval of June 10–22."
- **Resource Recommendations:** "Swap Developer A (blocked on Task X) with Developer B (completing Task Y early) to recover 3 days on the critical path."

## 2. Why It's Missing

- **No historical data pipeline.** The system stores current project state, but there's no data warehouse, no OLAP cube, no aggregated fact tables. Running predictions would require querying raw transactional tables with millions of rows — impractical for real-time API responses.
- **No ML infrastructure.** There is no model training pipeline, no feature store, no model registry, no inference endpoint. Even a simple linear regression model has nowhere to live.
- **Cold start problem.** New workspaces (under 6 months of data) would have no training data. Predictions would be worthless unless we use cross-workspace transfer learning — which introduces privacy and data isolation concerns.
- **No velocity tracking.** Per-user velocity, cycle time, and throughput are not tracked anywhere. The data model captures task assignments but doesn't compute or store any performance metrics.
- **No dependency graph.** The task model has `parent_id` for subtasks but no formal dependency model (FS, FF, SS, SF). Without dependency chains, critical path analysis is impossible.
- **No resource calendar.** Employee model has no capacity data, no PTO tracking, no utilization percentage. A resource recommendation without capacity is a guess.

The honest truth: this feature requires 6–12 months of foundational data infrastructure before it can produce anything useful. Shipping it now would generate misleading predictions that destroy user trust.

## 3. Full Backend Specification

### 3.1 Prerequisites (Must Exist Before This Feature Ships)

1. **Data Warehouse Model**
   - `TaskFact` table: snapshot of each task state change (task_id, status, assignee_id, start_date, end_date, story_points, timestamp)
   - `ProjectFact` table: weekly project snapshots (project_id, completion_percentage, total_tasks, completed_tasks, total_story_points, completed_story_points)
   - `VelocityFact` table: weekly per-user velocity (user_id, week_start, story_points_completed, tasks_completed, cycle_time_avg)
   - Retention: 2 years of historical data, summary tables forever

2. **Dependency Graph Model**
   - `TaskDependency` table: (id, task_id, depends_on_task_id, dependency_type: "finish_to_start", "finish_to_finish", "start_to_start", "start_to_finish", lag_days)
   - Critical path computation: stored procedure or in-memory graph traversal

3. **Resource Capacity Model**
   - `UserCapacity` table: (user_id, date, available_hours, planned_hours, utilization_pct)

### 3.2 Models

```csharp
// PredictionModel — registry entry for each trained model
public class PredictionModel
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Type { get; set; } = string.Empty;      // "delivery_forecast", "resource_recommendation"
    public string Version { get; set; } = string.Empty;    // "1.0", "1.1"
    public string ModelData { get; set; } = string.Empty;  // Serialized model (ONNX binary encoded as base64, or path to blob storage)
    public string Metrics { get; set; } = string.Empty;    // JSON: { "mae": 2.3, "rmse": 3.1, "r2": 0.87 }
    public string Features { get; set; } = string.Empty;   // JSON array of feature names
    public int TrainingDataPoints { get; set; }
    public DateTime TrainedAt { get; set; }
    public string Status { get; set; } = "active";         // "active", "stale", "retired"
}

// DeliveryForecast — prediction for a specific project
public class DeliveryForecast
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? ModelId { get; set; }                     // Which model produced this
    public DateTime PredictedDate { get; set; }
    public double ConfidenceLevel { get; set; }             // 0.0–1.0
    public string ConfidenceInterval { get; set; } = string.Empty; // JSON: { "lower": "2026-06-10", "upper": "2026-06-22" }
    public string Factors { get; set; } = string.Empty;     // JSON array of top contributing factors
    public string Assumptions { get; set; } = string.Empty; // JSON: { "velocityAssumed": 8.5, "remainingStoryPoints": 120 }
    public DateTime GeneratedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }                // Re-forecast after this date
}

// ResourceRecommendation — suggested action for resource optimization
public class ResourceRecommendation
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string RecommendationType { get; set; } = string.Empty; // "swap", "add", "remove", "reassign"
    public string Description { get; set; } = string.Empty;        // "Swap Alice (idle) with Bob (overloaded)"
    public double ExpectedImpact { get; set; }                     // Days saved
    public double Confidence { get; set; }                         // 0.0–1.0
    public string FromState { get; set; } = string.Empty;          // JSON of current allocation
    public string ToState { get; set; } = string.Empty;            // JSON of proposed allocation
    public Guid? SuggestedBy { get; set; }                         // user_id who triggered
    public string Status { get; set; } = "pending";                // "pending", "applied", "dismissed"
    public DateTime? AppliedAt { get; set; }
    public DateTime? DismissedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

// TrainingJob — track async model training
public class TrainingJob
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = "queued";          // "queued", "running", "completed", "failed"
    public int DataPointsUsed { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid? ModelId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
```

### 3.3 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/predictions/project/{projectId}/forecast` | Get delivery forecast for a project |
| GET | `/api/predictions/project/{projectId}/resource-suggestions` | Get resource recommendations |
| POST | `/api/predictions/train` | Trigger async training job |
| GET | `/api/predictions/training-jobs` | List training jobs for workspace |
| GET | `/api/predictions/training-jobs/{id}` | Get training job status |
| GET | `/api/predictions/models` | List available models |
| POST | `/api/predictions/resource-suggestions/{id}/apply` | Mark a recommendation as applied |
| POST | `/api/predictions/resource-suggestions/{id}/dismiss` | Dismiss a recommendation |

**GET /api/predictions/project/{projectId}/forecast**

Response:
```json
{
  "projectId": "uuid",
  "projectName": "Mobile App v2",
  "predictedDate": "2026-06-15",
  "confidenceLevel": 0.80,
  "confidenceInterval": {
    "lower": "2026-06-10",
    "upper": "2026-06-22"
  },
  "factors": [
    { "name": "Current velocity", "impact": 0.45, "value": "8.5 SP/week" },
    { "name": "Remaining scope", "impact": 0.30, "value": "120 SP" },
    { "name": "Team size", "impact": 0.15, "value": "4 engineers" },
    { "name": "Historical accuracy", "impact": -0.10, "value": "-2.3 days avg overrun" }
  ],
  "assumptions": {
    "velocityAssumed": 8.5,
    "remainingStoryPoints": 120,
    "avgTaskCycleTime": 3.2,
    "blockerProbability": 0.15
  },
  "dataQuality": "high",            // "high", "medium", "low", "insufficient"
  "generatedAt": "2026-05-01T10:00:00Z",
  "expiresAt": "2026-05-08T10:00:00Z"
}
```

**GET /api/predictions/project/{projectId}/resource-suggestions**

Response:
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "type": "swap",
      "description": "Assign Alice to Task A (currently blocked) and move Bob to Task B (urgent)",
      "expectedImpact": 3.2,
      "confidence": 0.72,
      "fromState": {
        "alice": { "taskId": "x", "status": "blocked", "utilization": 0.3 },
        "bob": { "taskId": "y", "status": "in_progress", "utilization": 1.1 }
      },
      "toState": {
        "alice": { "taskId": "y", "status": "assigned", "utilization": 0.8 },
        "bob": { "taskId": "z", "status": "assigned", "utilization": 0.9 }
      },
      "status": "pending",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "dataQuality": "medium",
  "generatedAt": "2026-05-01T10:00:00Z"
}
```

**POST /api/predictions/train**

Request:
```json
{
  "type": "delivery_forecast",
  "workspaceId": "uuid"
}
```

Response (202):
```json
{
  "jobId": "uuid",
  "status": "queued",
  "estimatedDuration": "5 minutes"
}
```

### 3.4 Controller Outline

```
PredictionsController
├── GetForecast()
│   ├── Validate project access
│   ├── Run inference (synchronous for simple models; async for complex)
│   │   ├── Load model from PredictionModel
│   │   ├── Extract features from project state
│   │   ├── Run inference
│   │   └── Return DeliveryForecast
│   └── Cache result (TTL: 1 week or until project state changes)
├── GetResourceSuggestions()
│   ├── Load project dependency graph
│   ├── Identify bottlenecks (critical path + utilization)
│   ├── Simulate alternative assignments
│   └── Return ranked recommendations
├── TriggerTraining()
│   ├── Validate data sufficiency (need >= 20 completed projects)
│   ├── Create TrainingJob
│   ├── Enqueue background job
│   └── Return 202 Accepted
├── GetTrainingJobs() → list
├── GetTrainingJob() → status
├── ListModels() → list
├── ApplySuggestion()
│   ├── Validate suggestion exists
│   └── Create reassignments (soft; manager confirms in UI)
└── DismissSuggestion()
```

### 3.5 Model Training Pipeline (Background Job)

```
TriggerTraining
  ↓
Query TaskFact for workspace (last 2 years)
  ↓
Feature engineering:
  ├── Project-level: total_story_points, team_size, avg_velocity, has_blockers, ...
  ├── Task-level: complexity, dependencies_count, assignee_experience, ...
  └── Team-level: avg_cycle_time, throughput, churn_rate, ...
  ↓
Split: 80% train, 20% test
  ↓
Train model:
  ├── Type: Gradient Boosting (e.g., LightGBM) for tabular data
  ├── Target: Actual delivery date vs estimated delivery date (overrun_days)
  └── Output: regression model
  ↓
Evaluate:
  ├── MAE, RMSE, R²
  └── If R² < 0.5: mark as "low confidence", don't replace active model
  ↓
Serialize model to ONNX
  ↓
Save PredictionModel record
  ↓
Mark old model as "stale"
```

## 4. Frontend Design

### 4.1 Forecast Badge (Project Overview)

Small badge next to the completion date on the project card:

```
┌────────────────────────────────────────────┐
│  Mobile App v2                             │
│  Status: In Progress ▓▓▓▓▓▓░░░░ 62%        │
│                                             │
│  Estimated: Jun 10 – Jun 22                │
│  🔮 80% confidence by Jun 15               │
│  [View Forecast →]                         │
│                                             │
│  ⚠ Data quality: High                      │
└────────────────────────────────────────────┘
```

Color coding:
- Green: confidence >= 80%
- Amber: confidence >= 60%
- Red: confidence < 60%
- Gray: insufficient data

### 4.2 Forecast Detail Panel

Full-width panel or new page:

```
┌─────────────────────────────────────────────┐
│  Delivery Forecast — Mobile App v2          │
│                                             │
│  📅 Predicted: Jun 15 ±5 days              │
│  🎯 Confidence: 80%                         │
│                                             │
│  ┌─── Confidence Interval ───────────────┐  │
│  │  Jun 10 ●────●────────●─────●── Jun 22│  │
│  │         10%  50%    80%  95%          │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ─── Top Factors ───                       │
│  │ Factor                │ Impact │ Value  │
│  │───────────────────────┼────────┼─────── │
│  │ Current velocity      │ +45%   │ 8.5 SP │
│  │ Remaining scope       │ +30%   │ 120 SP │
│  │ Team size             │ +15%   │ 4 devs │
│  │ Historical overrun    │ -10%   │ -2.3d  │
│                                             │
│  ─── What-if Sliders ───                   │
│  │ Team size:    [4] ──────────○──── [+2] │
│  │ Scope:   [-20%] ○─────────────── [+10%]│
│  │                                │         │
│  │  New prediction: Jun 8 ±4 days │         │
│  │  [Apply scenario →]           │         │
│  └─────────────────────────────────────────┘
```

### 4.3 Resource Suggestion Card

List of cards in a "Suggestions" panel on the project page:

```
┌──────────────────────────────────────────────┐
│  💡 Resource Suggestion                     │
│                                              │
│  Swap Alice → Task B (urgent)               │
│  Move Bob → Task A (currently blocked)      │
│                                              │
│  Expected impact: Save 3.2 days              │
│  Confidence: 72%                             │
│                                              │
│  [Apply Suggestion]  [Dismiss]  [Why?]       │
└──────────────────────────────────────────────┘
```

**"Why?" drawer:**
> "Alice is at 30% utilization (blocked on Task A). Bob is at 110% utilization (overloaded). Alice has the skills for Task B and Bob's Task Y can be split. Estimated recovery: 3.2 days."

### 4.4 What-if Scenario Planner

Dedicated view with interactive sliders:

| Slider | Range | Effect |
|--------|-------|--------|
| Team size | -2 to +5 | Adjusts velocity assumption |
| Scope | -50% to +50% | Adjusts remaining story points |
| Start date | -30d to +30d | Shifts timeline |
| Velocity | 50% to 200% | Multiplier on current velocity |
| Blockers | 0 to 10 | Adds delay per blocker (avg 2d) |

Each change recalculates forecast in real-time (client-side estimation model + server-side verification on save).

### 4.5 UX States

| State | Handling |
|-------|----------|
| Insufficient data (new workspace) | "Not enough historical data to generate predictions. Track 5+ projects to enable." |
| Low data quality | Forecast available but shown with warning: "Low data quality — predictions may be inaccurate" |
| Model training in progress | "Training model... estimated 5 minutes remaining" with progress bar |
| Training failed | "Model training failed: [reason]. Check data quality and retry." |
| Stale model ( > 3 months old) | "Forecast based on data from February 2026. Retrain for better accuracy." |
| No open projects | Empty state: "Create a project to see delivery forecasts." |
| Suggestion applied | Toast: "Suggestion applied! Changes will reflect in the next forecast." |

### 4.6 Ethical Guardrails

1. **Forecasts are estimates, not promises.** Every forecast display includes: "Predictions are estimates based on historical data. Actual results may vary significantly."
2. **No automatic enforcement.** Resource suggestions are just suggestions. Managers must manually apply them.
3. **Confidence must be shown.** Never show a point prediction without a confidence interval.
4. **Low-quality data warning.** If training data is insufficient or model R² < 0.5, predictions must display a warning.
5. **No individual performance evaluation.** Predictions are at the project level. Velocity data is never used for individual performance reviews.

---

## 5. Implementation Roadmap

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| 0 | Months 1–3 | Data warehouse tables (TaskFact, ProjectFact, VelocityFact) + backfill job |
| 1 | Months 3–4 | TaskDependency model + critical path computation |
| 2 | Months 4–5 | UserCapacity model + PTO/availability tracking |
| 3 | Months 5–6 | Basic linear regression forecast (no ML infra yet) |
| 4 | Months 6–8 | ML pipeline with ONNX + LightGBM |
| 5 | Months 8–9 | Resource suggestion engine |
| 6 | Months 9–10 | What-if scenario planner frontend |
| 7 | Months 10–11 | Cross-workspace cold-start fallback (optional) |

**Total time to first useful prediction: ~6 months minimum.**

## 6. Open Questions

- Should we use Azure ML, AWS SageMaker, or self-hosted ONNX? Self-hosted = free but operational overhead.
- Cold start: use industry benchmarks (e.g., "average team of 4 delivers 8 SP/week") for new workspaces?
- How do we handle scope creep? Forecast assumes current scope — should we detect scope changes and flag them?
- Should forecasts be recalculated on every project update (expensive) or on-demand + cached?
- How do we validate predictions? Track predicted vs actual, provide feedback loop for model improvement.
