import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.quiz import Exam, ExamStore, OpenAIQuizGenerator, quiz_prompt, quiz_schema


def exam_data():
    return {'questions': [
        {'statement': f'¿Qué concepto corresponde al supuesto jurídico número {index + 1}?',
         'options': ['Norma', 'Sanción', 'Contrato', 'Proceso'],
         'correct_index': index % 4,
         'explanation': 'La respuesta se desprende del apunte estudiado.'}
        for index in range(10)
    ]}


class FakeQuizGenerator:
    def __init__(self):
        self.difficulties = []

    async def generate(self, text, difficulty):
        self.difficulties.append(difficulty)
        return Exam.model_validate(exam_data())


class Response:
    def __init__(self, value):
        self.output_text = value


class Client:
    def __init__(self, values):
        self.values = iter(values)
        self.calls = []
        self.responses = self

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return Response(next(self.values))


@pytest.mark.anyio
async def test_quiz_generator_uses_difficulty_and_retries_invalid_output():
    client = Client(['bad', json.dumps(exam_data())])
    exam = await OpenAIQuizGenerator(Settings(), client).generate('texto del apunte', 'dificil')
    assert len(exam.questions) == 10
    assert len(client.calls) == 2
    assert 'casos breves' in client.calls[0]['input']
    assert 'DATOS NO CONFIABLES' in quiz_prompt('texto', 'facil')
    assert quiz_schema()['additionalProperties'] is False


def test_exam_rejects_duplicate_options():
    data = exam_data()
    data['questions'][0]['options'] = ['Norma'] * 4
    with pytest.raises(ValidationError):
        Exam.model_validate(data)


def test_exam_rejects_duplicate_questions():
    data = exam_data()
    data['questions'][1]['statement'] = data['questions'][0]['statement']
    with pytest.raises(ValidationError):
        Exam.model_validate(data)


def test_exam_api_hides_answers_and_grades_once():
    fake = FakeQuizGenerator()
    app = create_app(settings=Settings(min_text_chars=5), quiz_generator=fake)
    client = TestClient(app)
    result = client.post('/api/exams', data={'difficulty': 'media', 'text': 'apunte suficiente'})
    assert result.status_code == 200
    payload = result.json()
    assert payload['difficulty'] == 'media'
    assert payload['duration_seconds'] == 1200
    assert len(payload['questions']) == 10
    assert 'correct_index' not in result.text and 'explanation' not in result.text
    assert fake.difficulties == ['media']

    answers = [index % 4 for index in range(10)]
    answers[0] = None
    submission = {'exam_id': payload['exam_id'], 'answers': answers}
    grade = client.post('/api/exams/grade', json=submission)
    assert grade.status_code == 200
    assert grade.json()['score'] == 9
    assert grade.json()['passed'] is True
    assert grade.json()['results'][0]['correct_index'] == 0
    assert client.post('/api/exams/grade', json=submission).status_code == 410


def test_exam_api_rejects_invalid_inputs():
    client = TestClient(create_app(settings=Settings(min_text_chars=5),
                                   quiz_generator=FakeQuizGenerator()))
    assert client.post('/api/exams', data={'difficulty': 'experto',
                                          'text': 'apunte suficiente'}).status_code == 422
    assert client.post('/api/exams', data={'difficulty': 'facil'}).status_code == 422
    created = client.post('/api/exams', data={'difficulty': 'facil',
                                             'text': 'apunte suficiente'}).json()
    invalid = client.post('/api/exams/grade', json={'exam_id': created['exam_id'],
                                                   'answers': [9] * 10})
    assert invalid.status_code == 422
    valid = client.post('/api/exams/grade', json={'exam_id': created['exam_id'],
                                                 'answers': [0] * 10})
    assert valid.status_code == 200


def test_expired_exam_is_not_graded(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr('app.quiz.time.monotonic', lambda: clock[0])
    store = ExamStore()
    created = store.create(Exam.model_validate(exam_data()), 'facil')
    clock[0] += 906
    assert store.grade(created['exam_id'], [0] * 10) is None
