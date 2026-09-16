import asyncio
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import get_settings
from app.generator import MissingCredentials, OpenAIGenerator
from app.material import MaterialError, read_material
from app.quiz import Difficulty, ExamStore, OpenAIQuizGenerator

STATIC_DIR = Path(__file__).parent / 'static'


class ExamAnswers(BaseModel):
    exam_id: str = Field(min_length=1, max_length=64)
    answers: list[int | None]


def create_app(generator=None, settings=None, quiz_generator=None):
    s = settings or get_settings()
    application = FastAPI(title=s.app_name)
    sem = asyncio.Semaphore(s.max_concurrent_requests)
    hits = defaultdict(deque)
    exams = ExamStore()
    application.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')

    def rate_limited(request: Request):
        now = time.monotonic()
        queue = hits[request.client.host if request.client else 'unknown']
        while queue and queue[0] < now - s.rate_limit_window_seconds:
            queue.popleft()
        if len(queue) >= s.rate_limit_requests:
            return True
        queue.append(now)
        return False

    def error_response(exc):
        if isinstance(exc, MaterialError):
            return JSONResponse(status_code=422, content={'code': exc.code, 'message': exc.message})
        if isinstance(exc, MissingCredentials):
            return JSONResponse(status_code=503, content={
                'code': 'service_unavailable', 'message': 'La generación no está configurada. Intentá más tarde.'})
        if isinstance(exc, TimeoutError):
            return JSONResponse(status_code=504, content={
                'code': 'generation_timeout', 'message': 'La generación demoró demasiado. Podés reintentar.'})
        return JSONResponse(status_code=502, content={
            'code': 'generation_failed', 'message': 'No pudimos generar el contenido. Podés reintentar.'})

    @application.get('/', include_in_schema=False)
    async def home():
        return FileResponse(STATIC_DIR / 'index.html')

    @application.get('/api/config')
    async def config():
        return {'maxPdfBytes': s.max_pdf_bytes, 'maxTextChars': s.max_text_chars,
                'maxExportPixels': s.max_export_pixels}

    @application.post('/api/maps')
    async def maps(request: Request, pdf: UploadFile | None = File(None),
                   text: str | None = Form(None)):
        if rate_limited(request):
            return JSONResponse(status_code=429, content={
                'code': 'rate_limited', 'message': 'Demasiadas solicitudes. Intentá nuevamente más tarde.'})
        try:
            async with sem:
                material = await read_material(pdf, text, s)
                service = generator or OpenAIGenerator(s)
                return await service.generate(material)
        except Exception as exc:
            return error_response(exc)

    @application.post('/api/exams')
    async def create_exam(request: Request, difficulty: Difficulty = Form(...),
                          pdf: UploadFile | None = File(None), text: str | None = Form(None)):
        if rate_limited(request):
            return JSONResponse(status_code=429, content={
                'code': 'rate_limited', 'message': 'Demasiadas solicitudes. Intentá nuevamente más tarde.'})
        try:
            async with sem:
                material = await read_material(pdf, text, s)
                service = quiz_generator or OpenAIQuizGenerator(s)
                exam = await service.generate(material, difficulty)
                return exams.create(exam, difficulty)
        except Exception as exc:
            return error_response(exc)

    @application.post('/api/exams/grade')
    async def grade_exam(submission: ExamAnswers):
        try:
            result = exams.grade(submission.exam_id, submission.answers)
        except ValueError:
            return JSONResponse(status_code=422, content={
                'code': 'invalid_answers', 'message': 'Las respuestas no son válidas.'})
        if result is None:
            return JSONResponse(status_code=410, content={
                'code': 'exam_expired', 'message': 'El examen venció o ya fue entregado. Generá otro.'})
        return result

    return application


app = create_app()
