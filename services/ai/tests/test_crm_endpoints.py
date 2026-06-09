"""
Tests for AI CRM enhancement endpoints.

Covers:
- POST /crm/deal-summary -> 200 with valid mock response
- POST /crm/churn-risk   -> 200 with valid mock response
- POST /crm/anomaly-detection -> 200 with valid mock response
"""

import json
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    mock_json = AsyncMock()
    mock_json.return_value = {
        "summary": "Test deal summary.",
        "key_points": ["Key point 1"],
        "recommended_action": "Follow up",
    }

    with patch("app.core.providers.generate_json", mock_json):
        from app.main import app

        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


class TestDealSummary:
    ENDPOINT = "/crm/deal-summary"

    def test_success(self, client):
        resp = client.post(
            self.ENDPOINT,
            json={
                "workspace_id": "w-1",
                "deal_title": "Big Corp Deal",
                "deal_value": 50000,
                "stage": "Negotiation",
                "contact_name": "Alice",
                "company_name": "Big Corp",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert isinstance(data["key_points"], list)
        assert "recommended_action" in data

    def test_returns_422_on_missing_required_fields(self, client):
        resp = client.post(self.ENDPOINT, json={"workspace_id": "w-1"})
        assert resp.status_code == 422


class TestChurnRisk:
    ENDPOINT = "/crm/churn-risk"

    def test_success(self, client):
        resp = client.post(
            self.ENDPOINT,
            json={
                "workspace_id": "w-1",
                "contact_name": "Bob",
                "days_since_last_contact": 45,
                "open_deals_value": 10000,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "risk_score" in data
        assert "risk_level" in data
        assert "suggested_actions" in data

    def test_returns_422_on_missing_contact_name(self, client):
        resp = client.post(self.ENDPOINT, json={"workspace_id": "w-1"})
        assert resp.status_code == 422


class TestAnomalyDetection:
    ENDPOINT = "/crm/anomaly-detection"

    def test_success(self, client):
        resp = client.post(
            self.ENDPOINT,
            json={
                "workspace_id": "w-1",
                "data_type": "deals",
                "data": json.dumps([{"amount": 100}, {"amount": 99999}]),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "anomalies" in data
        assert "risk_level" in data

    def test_returns_422_on_missing_data(self, client):
        resp = client.post(self.ENDPOINT, json={"workspace_id": "w-1"})
        assert resp.status_code == 422
