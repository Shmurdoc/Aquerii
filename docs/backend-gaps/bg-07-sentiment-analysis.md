# BG-07: Sentiment Analysis and Burnout Detection

**Status:** NOT IMPLEMENTED  
**Priority:** Low  
**Complexity:** HIGH  
**Dependencies:** AI Chat module (for message data), Ticketing module (for ticket comments)

---

## 1. What the Feature Is

An NLP-driven layer that analyzes user-generated text (chat messages, ticket comments, task descriptions, meeting notes) to detect sentiment trends and early signs of burnout at the individual and team level. Results are surfaced as **aggregate** analytics for managers (no individual reading without consent) and as **personal wellness insights** for individual users.

The key constraint is **privacy-first**: no individual message content is exposed to managers. Only aggregate scores, trends, and anonymized alerts.

## 2. Why It's Missing

- **No NLP infrastructure.** There is no ML pipeline, no model serving layer, no text preprocessing. The backend processes structured data only. Sentiment analysis would require either an external API (OpenAI, Azure Cognitive Services) or a local model (ONNX, ML.NET). Neither is configured.
- **No text aggregation pipeline.** Chat messages, ticket comments, and other text entities are stored in isolation. There is no background job that periodically pulls new text, runs inference, and stores results. No hangfire/quartz job exists for this.
- **Privacy model doesn't exist.** The current auth model has no concept of "aggregate-only data." Audit logs expose individual actions. There's no opt-in consent table, no anonymization layer, no data retention policy for derived sentiment data.
- **No analytics data model.** The `SentimentSnapshot` and `SentimentAlert` tables don't exist. There's no place to store computed scores, trends, or thresholds.
- **High false-positive risk.** Without careful tuning, the feature would trigger false burnout alerts, eroding trust and creating liability. The team has rightly deprioritized this in favor of core features.

## 3. Full Backend Specification

### 3.1 Models

```csharp
// SentimentSnapshot — aggregate daily sentiment for a user or workspace
public class SentimentSnapshot
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid? UserId { get; set; }           // null = workspace-level aggregate
    public DateTime Date { get; set; }
    public double Score { get; set; }            // -1.0 (negative) to 1.0 (positive)
    public int Volume { get; set; }              // Number of messages analyzed
    public double Trend { get; set; }            // Slope over trailing 7 days
    public int? MessageCount { get; set; }
    public int? ResponseTimeMs { get; set; }     // Average response latency for inference
    public DateTime CreatedAt { get; set; }
}

// SentimentAlert — actionable alert triggered by threshold breach
public class SentimentAlert
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Type { get; set; } = string.Empty;   // "burnout_risk", "team_morale_drop", "sentiment_anomaly"
    public string Severity { get; set; } = "info";      // info | warning | critical
    public string Message { get; set; } = string.Empty; // "Team morale dropped 30% this week"
    public Guid? UserId { get; set; }                   // null = workspace-level alert
    public string? Metadata { get; set; }               // JSON for dashboard rendering
    public DateTime? DismissedAt { get; set; }
    public Guid? DismissedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

// SentimentConsent — opt-in for individual sentiment tracking
public class SentimentConsent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid WorkspaceId { get; set; }
    public bool OptedIn { get; set; }              // default false
    public DateTime? ConsentGivenAt { get; set; }
    public DateTime? ConsentRevokedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// SentimentFeedback — user feedback on alert accuracy (for model improvement)
public class SentimentFeedback
{
    public Guid Id { get; set; }
    public Guid AlertId { get; set; }
    public Guid UserId { get; set; }
    public bool Accurate { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### 3.2 NLP Pipeline Architecture

```
[Message Created] → [Queue: sentiment-analysis]
                         ↓
[Worker: Fetch unprocessed text from last N hours]
                         ↓
[Preprocessor: Strip PII, tokenize, normalize]
                         ↓
[Classifier: External API or local model]
                         ↓
[Postprocessor: Aggregate by user/workspace/day]
                         ↓
[Write SentimentSnapshot]
                         ↓
[Threshold Evaluator: Check trend against configurable thresholds]
                         ├── Normal → nothing
                         └── Breach → Create SentimentAlert
                              ↓
                         [Notify: In-app + optional email to manager]
                              ↓
                         [Log to Audit]
```

**Privacy preprocessor rules:**
- Strip exact names, emails, phone numbers, and addresses before inference.
- Never store raw text alongside scores. Raw text lives in the source entity (chat message, comment) with its own retention policy.
- `SentimentSnapshot.UserId` is null for manager-facing aggregate queries. Only the individual user dashboard shows per-user scores.

### 3.3 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/analytics/sentiment/workspace` | Aggregate sentiment for workspace |
| GET | `/api/analytics/sentiment/team/{teamId}` | Aggregate sentiment for a team |
| GET | `/api/analytics/sentiment/user/{userId}` | Individual sentiment (own data only, or manager + consent) |
| GET | `/api/analytics/sentiment/alerts` | List active alerts for user's workspace |
| POST | `/api/analytics/sentiment/alerts/{id}/dismiss` | Dismiss an alert |
| GET | `/api/analytics/sentiment/trends` | Multi-week trend comparison |
| POST | `/api/analytics/sentiment/consent` | Set consent preference |
| GET | `/api/analytics/sentiment/consent` | Get consent status |
| POST | `/api/analytics/sentiment/feedback` | Submit feedback on alert accuracy |

**GET /api/analytics/sentiment/workspace**

Query params: `?period=7d&from=2026-04-01&to=2026-05-01`

Response:
```json
{
  "currentScore": 0.65,
  "trend": -0.12,
  "volume": 843,
  "dailyScores": [
    { "date": "2026-04-30", "score": 0.68, "volume": 120 },
    { "date": "2026-05-01", "score": 0.65, "volume": 98 }
  ],
  "teamBreakdown": [
    { "teamId": "uuid", "teamName": "Engineering", "score": 0.55, "trend": -0.25, "volume": 312 }
  ],
  "anomalyDetected": true
}
```

**Authorization rules:**
- Workspace-level aggregates: `workspace_admin`, `workspace_viewer`
- Team-level aggregates: `team_lead`, `workspace_admin`
- User-level individual: `self` always; managers only if user has `OptedIn = true`
- Alerts: `workspace_admin` sees all, `team_lead` sees their team, individual sees their own

### 3.4 Controller Outline

```
SentimentController
├── GetWorkspaceSentiment()
│   ├── Validate workspace access
│   ├── Query SentimentSnapshot aggregated by date
│   ├── Calculate trend via linear regression on last N days
│   └── Return snapshot + team breakdown
├── GetTeamSentiment()
│   ├── Validate team access
│   ├── Query SentimentSnapshot for team members
│   └── Return aggregated with no individual breakdown
├── GetUserSentiment()
│   ├── Check consent (if viewer !== subject)
│   ├── Query SentimentSnapshot for user
│   └── Return per-user data
├── GetAlerts()
│   ├── Apply role-based filter
│   └── Return non-dismissed alerts ordered by severity, recency
├── DismissAlert()
│   ├── Validate ownership
│   ├── Set dismissed timestamps
│   └── Log to audit
├── SetConsent()
│   ├── Upsert SentimentConsent
│   └── Clear user-level data if revoking
├── SubmitFeedback()
│   └── Create SentimentFeedback record
└── GetTrends()
    └── Compare multiple periods with statistical significance test
```

### 3.5 Threshold Configuration (Workspace-level settings)

| Setting | Default | Description |
|---------|---------|-------------|
| `sentimentDropThreshold` | -0.3 | 7-day trend drop below this triggers alert |
| `absoluteLowThreshold` | 0.2 | Absolute score below this triggers critical alert |
| `volumeMinThreshold` | 50 | Minimum messages/day to consider data reliable |
| `anomalyStdDev` | 2.5 | Standard deviations from mean to flag as anomaly |
| `alertCooldownHours` | 72 | Suppress duplicate alerts within N hours |

## 4. Frontend Design

### 4.1 Dashboards

**Team Dashboard — Sentiment Widget**
- Line chart: 30-day sentiment trend with 7-day moving average overlay
- Color bands: green (0.5–1.0), amber (0.0–0.5), red (-1.0–0.0)
- Volume annotation: dot size = message count per day
- Team breakdown bar chart (hover reveals anonymized scores)
- **No individual names.** Only team-level aggregates.

**Individual Dashboard — Personal Insights**
- Private, accessible only by the user
- Shows their personal sentiment trend
- Wellness nudges: "You've had 5 consecutive low-sentiment days. Consider taking a break."
- Links to wellness resources (configurable per workspace)
- Opt-out toggle at the top

**Manager Alerts Panel**
- List of `SentimentAlert` items with severity badges
- "Team morale dropped 30% in Engineering this week" — no names
- "Unusual sentiment pattern detected in Design team"
- Dismiss button with feedback: "Accurate / Not useful"
- Drill-down shows aggregate charts only

### 4.2 Wellness Break Suggestion Modal

Triggered by sentiment threshold breach for the individual user.

```
┌─────────────────────────────────────────────┐
│  💚 Heads up                                │
│                                             │
│  Your messages have been more negative      │
│  than usual this week. That's okay —        │
│  everyone has rough weeks.                  │
│                                             │
│  Would you like to:                         │
│                                             │
│  [Take a 15-min break reminder]             │
│  [See your wellness resources]              │
│  [Dismiss this suggestion]                  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ This is private. Only you can see  │    │
│  │ this analysis.                      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

The modal fires at most once per day. It is never shown to managers.

### 4.3 Privacy Settings (User Settings Page)

```
┌──────────────────────────────────────────────┐
│  Sentiment Analysis                          │
│                                              │
│  Allow your sentiment to be anonymously      │
│  included in team analytics:                 │
│                                              │
│  [YES / NO] ← default NO                    │
│                                              │
│  When NO: your messages are never analyzed.  │
│  When YES: aggregate scores only. Managers   │
│  never see your individual messages.         │
│                                              │
│  [Clear my sentiment history]                │
│                                              │
│  ─── Data Usage ───                         │
│  4,231 messages analyzed this month          │
│  Last analyzed: 2 minutes ago                │
└──────────────────────────────────────────────┘
```

### 4.4 UX States

| State | What Shows | What Hides | Action |
|-------|------------|------------|--------|
| Consent not set | Opt-in prompt banner on analytics page | All sentiment charts | User must opt in or dismiss permanently |
| Consent = no | Empty state: "Sentiment tracking is off" | Charts, alerts | Enable in settings |
| Consent = yes, volume < 50 | "Collecting data..." placeholder | Trend lines | Wait for more data |
| Normal range | Green charts | Alerts, modals | None |
| Warning threshold | Amber trend line, alert badge | None | Manager reviews |
| Critical threshold | Red charts, critical alert, modal for individual | None | Immediate attention |
| False positive reported | Acknowledgment toast | Alert remains | Feedback recorded |

### 4.5 Ethical Guardrails (Hard Requirements)

1. **No individual surveillance.** Sentiment analysis is never used for performance review, termination decisions, or disciplinary action. This must be stated in the UI and in the product documentation.
2. **Opt-in by default.** Consent defaults to `false`. Users must explicitly enable.
3. **Right to deletion.** Users can delete their sentiment history at any time. Scores are recomputed after deletion.
4. **No gaming.** There is no score, no gamification, no "happiness leaderboard." Scores are for wellness only.
5. **Transparency.** Every alert includes "Why am I seeing this?" with explanation of threshold and data sources.

---

## 5. Model Selection Notes

| Approach | Pros | Cons |
|----------|------|------|
| Azure Cognitive Services Text Analytics | Managed, HIPAA BAA available, multilingual | Cost, external dependency, data residency |
| OpenAI GPT-4o prompt | Highest accuracy, nuanced reasoning | Cost ($/token), latency, privacy concerns |
| Local ONNX model (e.g., DistilBERT) | Free, low latency, private | Lower accuracy, maintenance burden, English-only |
| Hybrid (local for filtering, API for edge cases) | Best of both | Complex, two code paths to maintain |

**Recommendation:** Start with Azure Cognitive Services for speed of implementation. The abstraction layer should support swapping to a local model in the future.

## 6. Open Questions

- Should sentiment analysis run in real-time (per message) or batch (hourly/daily)? Batch is cheaper but real-time enables proactive intervention. **Decision:** Batch daily for aggregates, real-time only for critical individual alerts.
- How do we handle multilingual sentiment? Azure supports 120+ languages; local models typically don't.
- What if the team is very small (3 people)? Aggregates are trivially reverse-engineered. Minimum volume threshold of 50 messages/day × 5 people minimum.
- Legal review needed for EU workspaces (GDPR). Sentiment data is "derived personal data."
