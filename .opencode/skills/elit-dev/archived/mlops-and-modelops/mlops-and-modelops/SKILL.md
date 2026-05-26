---
name: mlops-and-modelops
description: Model lifecycle management, evaluation, reproducible training, model versioning, serving, drift detection, and monitoring for ML productionization.
applyTo:
	- "**/models/**"
	- "**/*.md"
keywords:
	- mlops
	- modelops
	- model-monitoring
---

# MLOps & ModelOps

## Purpose
Operationalize ML models with reproducible pipelines, evaluation standards, and production-grade serving and monitoring.

## Activation Gate
Activate for any model training, deployment, or data-drift sensitive feature.

## Workflow Contract
1. Define model evaluation metrics, holdout and validation strategies.
2. Use reproducible training pipelines with artifact provenance.
3. Provide model versioning, CI for model tests, and rollout strategies.
4. Monitor model quality, data drift, and retraining triggers.

## Hard Rules
- Training runs must be reproducible and recorded with provenance.
- Model rollouts require performance gates and rollback plans.
