# Future ML Roadmap — Predictive Project Management

**Status:** FUTURE — Not implemented yet  
**Created:** 2026-05-29  
**Depends on:** 6+ months of historical data accumulation

---

## Current Implementation (Phase 1 — Rule-Based)

Already implemented in bg-08:

| Feature | Status | Method |
|---------|--------|--------|
| Task duration estimation | ✅ DONE | Rule-based (priority multiplier) |
| Delay risk scoring | ✅ DONE | Rule-based (progress vs time) |
| OKR progress forecasting | ✅ DONE | Rule-based (linear extrapolation) |

**These work immediately without any training data.**

---

## Phase 2: Simple ML Models (When Data Exists)

**Prerequisites:** 6+ months of data, 100+ completed tasks, 3+ sprints

### 2.1 Task Duration Prediction (ML)

**Model:** Linear Regression / Random Forest  
**Data needed:**
- Historical tasks with estimated_hours vs actual tracked_hours
- Task attributes: priority, complexity, assignee, board
- Completion time patterns

**Implementation:**
```python
# services/ai/app/ml/task_duration.py
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

def train_task_duration_model(historical_tasks):
    X = historical_tasks[['estimated_hours', 'priority_encoded', 'assignee_encoded', 'board_encoded']]
    y = historical_tasks['actual_hours']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    model = RandomForestRegressor(n_estimators=100)
    model.fit(X_train, y_train)
    
    return model
```

**API Endpoint:** `POST /predictions/task-duration-ml`

### 2.2 Project Delay Prediction (ML)

**Model:** XGBoost Classifier  
**Data needed:**
- Historical projects with actual completion dates vs planned
- Sprint velocity data
- Blocker frequency

**Implementation:**
```python
# services/ai/app/ml/delay_prediction.py
import xgboost as xgb

def train_delay_model(historical_projects):
    X = historical_projects[['velocity', 'blocker_count', 'scope_changes', 'team_size']]
    y = historical_projects['was_delayed']  # binary: 0 or 1
    
    model = xgb.XGBClassifier(n_estimators=100, use_label_encoder=False)
    model.fit(X, y)
    
    return model
```

### 2.3 Sprint Velocity Forecasting (ML)

**Model:** Facebook Prophet (Time Series)  
**Data needed:**
- Sprint completion data over time
- Story points completed per sprint
- Team capacity changes

**Implementation:**
```python
# services/ai/app/ml/velocity_forecast.py
from prophet import Prophet
import pandas as pd

def forecast_velocity(historical_sprints):
    df = pd.DataFrame({
        'ds': historical_sprints['sprint_end_date'],
        'y': historical_sprints['story_points_completed']
    })
    
    model = Prophet()
    model.fit(df)
    
    future = model.make_future_dataframe(periods=3, freq='W')
    forecast = model.predict(future)
    
    return forecast
```

---

## Phase 3: Advanced ML (Optional)

**Prerequisites:** 1+ year of data, dedicated ML infrastructure

### 3.1 Risk Scoring (Multi-Factor)

**Model:** Gradient Boosting (LightGBM)  
**Features:**
- Task complexity (from description NLP)
- Dependency graph analysis
- Team workload distribution
- Historical blocker patterns
- Code change frequency

### 3.2 Resource Optimization

**Model:** Linear Programming + ML  
**Features:**
- Optimal task assignment based on skills
- Workload balancing predictions
- Capacity planning forecasts

### 3.3 Meeting Effectiveness Prediction

**Model:** NLP + Classification  
**Features:**
- Meeting transcript analysis
- Action item completion rate
- OKR impact correlation
- Participant engagement metrics

### 3.4 Automatic Timeline Adjustment

**Model:** Reinforcement Learning  
**Features:**
- Learn optimal buffer times
- Adapt to team velocity changes
- Auto-reschedule based on risk

---

## Infrastructure Requirements

### Phase 2 Requirements
| Component | Requirement | Cost |
|-----------|-------------|------|
| Training data | 6+ months historical | Free (accumulates naturally) |
| ML service | Existing Python AI service | Already exists |
| Storage | 1GB for models + data | Negligible |
| Compute | CPU-only training | Free |

### Phase 3 Requirements
| Component | Requirement | Cost |
|-----------|-------------|------|
| GPU | Optional for deep learning | $50-200/mo |
| Feature store | Redis/PostgreSQL | Already exists |
| Model registry | MLflow or similar | Free (self-hosted) |
| Monitoring | Prometheus/Grafana | Already exists |

---

## Data Collection Strategy

To enable Phase 2 ML, start collecting now:

### Task Data
- [ ] Track actual_hours on completed tasks
- [ ] Track task complexity ratings
- [ ] Track blocker frequency per task
- [ ] Track scope changes per project

### Sprint Data
- [ ] Track story points per sprint
- [ ] Track velocity trends
- [ ] Track team capacity changes

### Meeting Data
- [ ] Track meeting effectiveness scores
- [ ] Track action item completion rates
- [ ] Track OKR progress after meetings

---

## GitHub Repos for Reference

| Repo | Purpose | Phase |
|------|---------|-------|
| Facebook/Prophet | Time series forecasting | Phase 2 |
| scikit-learn | General ML | Phase 2 |
| XGBoost | Gradient boosting | Phase 2 |
| LightGBM | Fast gradient boosting | Phase 3 |
| MLflow | Model management | Phase 3 |
| FastAPI ML Boilerplate | Service template | Phase 2 |

---

## Migration Path

### From Phase 1 → Phase 2
1. Start logging actual_hours on task completion
2. After 6 months, export historical data
3. Train initial models offline
4. Add ML endpoints alongside rule-based endpoints
5. A/B test ML vs rule-based predictions
6. Switch to ML when accuracy improves

### From Phase 2 → Phase 3
1. Add feature store for complex features
2. Implement model versioning
3. Add A/B testing infrastructure
4. Add model monitoring
5. Graduate to advanced models

---

## Success Metrics

| Metric | Phase 1 (Rule) | Phase 2 (ML) | Phase 3 (Advanced) |
|--------|----------------|--------------|-------------------|
| Task duration accuracy | ±40% | ±20% | ±10% |
| Delay prediction accuracy | 60% | 80% | 90% |
| OKR forecast accuracy | ±30% | ±15% | ±5% |
| User trust | Low | Medium | High |

---

## Notes

- **Don't skip Phase 1** — it gives immediate value while data accumulates
- **Don't rush to Phase 3** — Phase 2 ML is sufficient for most use cases
- **Focus on data quality** — better data beats better models
- **Monitor for bias** — ML models can amplify existing biases in historical data
