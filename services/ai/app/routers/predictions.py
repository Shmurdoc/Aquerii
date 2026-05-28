# app/routers/predictions.py — Rule-based predictive project management
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import structlog

from app.security.auth import verify_internal_token

logger = structlog.get_logger()
router = APIRouter()


class TaskDurationRequest(BaseModel):
    assignee_id: str
    board_id: str
    task_title: Optional[str] = None
    estimated_hours: Optional[float] = None
    priority: Optional[str] = None


class TaskDurationResponse(BaseModel):
    estimated_hours: float
    confidence: str  # low, medium, high
    basis: str


class DelayRiskRequest(BaseModel):
    project_id: str
    total_tasks: int
    completed_tasks: int
    days_elapsed: int
    total_days: int
    overdue_tasks: int = 0


class DelayRiskResponse(BaseModel):
    risk_score: float  # 0-100
    risk_level: str  # low, medium, high, critical
    factors: dict
    recommendation: str


class OKRProgressRequest(BaseModel):
    goal_id: str
    current_progress: float  # 0-100
    days_elapsed: int
    total_days: int
    key_results_completed: int
    key_results_total: int


class OKRProgressResponse(BaseModel):
    projected_completion: float  # 0-100
    on_track: bool
    days_remaining: int
    daily_velocity: float
    recommendation: str


@router.post("/task-duration", response_model=TaskDurationResponse)
async def predict_task_duration(
    req: TaskDurationRequest,
    dep=Depends(verify_internal_token),
):
    """Estimate task duration based on historical patterns and task attributes."""
    
    # Rule-based estimation (no ML needed)
    base_hours = req.estimated_hours or 4.0  # default 4 hours
    
    # Adjust based on priority
    priority_multiplier = {
        "critical": 1.5,  # critical tasks often take longer (more scrutiny)
        "high": 1.2,
        "medium": 1.0,
        "low": 0.8,
    }
    multiplier = priority_multiplier.get(req.priority or "medium", 1.0)
    
    estimated = base_hours * multiplier
    
    # Confidence based on whether we have historical data
    confidence = "low"  # without historical data, confidence is low
    basis = "rule-based estimate (no historical data)"
    
    return TaskDurationResponse(
        estimated_hours=round(estimated, 1),
        confidence=confidence,
        basis=basis,
    )


@router.post("/delay-risk", response_model=DelayRiskResponse)
async def predict_delay_risk(
    req: DelayRiskRequest,
    dep=Depends(verify_internal_token),
):
    """Predict project delay risk based on current velocity and progress."""
    
    factors = {}
    
    # Factor 1: Progress vs Time (0-40 points)
    if req.total_days > 0:
        time_progress = (req.days_elapsed / req.total_days) * 100
        task_progress = (req.completed_tasks / req.total_tasks) * 100 if req.total_tasks > 0 else 0
        progress_gap = time_progress - task_progress
        progress_score = min(40, max(0, progress_gap * 2))
    else:
        progress_score = 20
    factors["progress_vs_time"] = round(progress_score, 1)
    
    # Factor 2: Overdue tasks (0-30 points)
    overdue_score = min(30, (req.overdue_tasks / max(1, req.total_tasks)) * 100)
    factors["overdue_tasks"] = round(overdue_score, 1)
    
    # Factor 3: Velocity trend (0-30 points)
    if req.days_elapsed > 0:
        daily_velocity = req.completed_tasks / req.days_elapsed
        remaining_tasks = req.total_tasks - req.completed_tasks
        days_needed = remaining_tasks / daily_velocity if daily_velocity > 0 else 999
        days_remaining = req.total_days - req.days_elapsed
        
        if days_needed > days_remaining:
            velocity_score = min(30, ((days_needed - days_remaining) / max(1, days_remaining)) * 30)
        else:
            velocity_score = 0
    else:
        velocity_score = 15
    factors["velocity_risk"] = round(velocity_score, 1)
    
    # Total risk score
    total_score = progress_score + overdue_score + velocity_score
    total_score = min(100, max(0, total_score))
    
    # Risk level
    if total_score >= 70:
        risk_level = "critical"
        recommendation = "Project is at high risk of delay. Consider scope reduction or adding resources."
    elif total_score >= 50:
        risk_level = "high"
        recommendation = "Project is trending toward delay. Review priorities and remove blockers."
    elif total_score >= 30:
        risk_level = "medium"
        recommendation = "Project is at moderate risk. Monitor velocity closely this week."
    else:
        risk_level = "low"
        recommendation = "Project is on track. Continue current pace."
    
    return DelayRiskResponse(
        risk_score=round(total_score, 1),
        risk_level=risk_level,
        factors=factors,
        recommendation=recommendation,
    )


@router.post("/okr-progress", response_model=OKRProgressResponse)
async def predict_okr_progress(
    req: OKRProgressRequest,
    dep=Depends(verify_internal_token),
):
    """Forecast OKR progress based on current velocity and timeline."""
    
    # Calculate daily velocity
    daily_velocity = req.current_progress / max(1, req.days_elapsed)
    
    # Project completion
    days_remaining = max(0, req.total_days - req.days_elapsed)
    projected_additional = daily_velocity * days_remaining
    projected_completion = min(100, req.current_progress + projected_additional)
    
    # On track check
    expected_progress = (req.days_elapsed / req.total_days) * 100 if req.total_days > 0 else 0
    on_track = req.current_progress >= expected_progress * 0.9  # 90% of expected
    
    # Recommendation
    if projected_completion >= 100:
        recommendation = "OKR is on track to complete. Maintain current pace."
    elif projected_completion >= 80:
        recommendation = "OKR is close but may need a push in the final stretch."
    elif projected_completion >= 50:
        recommendation = "OKR is behind. Consider increasing focus or adjusting scope."
    else:
        recommendation = "OKR is significantly behind. Escalate and reassess priorities."
    
    return OKRProgressResponse(
        projected_completion=round(projected_completion, 1),
        on_track=on_track,
        days_remaining=days_remaining,
        daily_velocity=round(daily_velocity, 2),
        recommendation=recommendation,
    )
