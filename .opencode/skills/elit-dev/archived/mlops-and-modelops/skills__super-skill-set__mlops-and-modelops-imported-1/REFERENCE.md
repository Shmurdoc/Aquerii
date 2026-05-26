# MLOps & ModelOps — Reference

Overview
- Reproducible training pipelines, model evaluation, lineage, deployment, and monitoring.

Checklist
- Define model contract, evaluation metrics, and threshold gates for rollouts.
- Record training provenance: data versions, hyperparameters, code commit, and artifacts.
- Provide CI for model tests and integration tests for inference pipelines.

Deployment
- Canary rollouts for model weights, shadow deployments for validation, and automatic rollback on metric regression.
- Serve models with versioned endpoints and A/B evaluation harnesses.

Monitoring
- Monitor model performance, data drift, input distribution, and prediction quality.
- Trigger retraining when drift crosses thresholds and log retraining decisions.

Deliverables
- Training pipeline manifests, evaluation notebooks, model cards, and deployment runbooks.
