from fastapi.testclient import TestClient

from app.main import app


def test_home_responds() -> None:
    response = TestClient(app).get("/")
    assert response.status_code == 200
    assert "Mapas conceptuales" in response.text
