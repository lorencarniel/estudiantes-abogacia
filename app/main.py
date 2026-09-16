import asyncio,time
from collections import defaultdict,deque
from pathlib import Path
from fastapi import FastAPI,File,Form,Request,UploadFile
from fastapi.responses import FileResponse,JSONResponse
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.generator import GenerationError,MissingCredentials,OpenAIGenerator
from app.material import MaterialError,read_material
STATIC_DIR=Path(__file__).parent/'static'
def create_app(generator=None,settings=None):
 s=settings or get_settings(); application=FastAPI(title=s.app_name); sem=asyncio.Semaphore(s.max_concurrent_requests); hits=defaultdict(deque)
 application.mount('/static',StaticFiles(directory=STATIC_DIR),name='static')
 @application.get('/',include_in_schema=False)
 async def home(): return FileResponse(STATIC_DIR/'index.html')
 @application.get('/api/config')
 async def config(): return {'maxPdfBytes':s.max_pdf_bytes,'maxTextChars':s.max_text_chars,'maxExportPixels':s.max_export_pixels}
 @application.post('/api/maps')
 async def maps(request:Request,pdf:UploadFile|None=File(None),text:str|None=Form(None)):
  now=time.monotonic(); q=hits[request.client.host if request.client else 'unknown']
  while q and q[0]<now-s.rate_limit_window_seconds:q.popleft()
  if len(q)>=s.rate_limit_requests:return JSONResponse(status_code=429,content={'code':'rate_limited','message':'Demasiadas solicitudes. Intentá nuevamente más tarde.'})
  q.append(now)
  try:
   async with sem:
    material=await read_material(pdf,text,s)
    service=generator or OpenAIGenerator(s)
    return await service.generate(material)
  except MaterialError as e:return JSONResponse(status_code=422,content={'code':e.code,'message':e.message})
  except MissingCredentials:return JSONResponse(status_code=503,content={'code':'service_unavailable','message':'La generación no está configurada. Intentá más tarde.'})
  except TimeoutError:return JSONResponse(status_code=504,content={'code':'generation_timeout','message':'La generación demoró demasiado. Podés reintentar.'})
  except GenerationError:return JSONResponse(status_code=502,content={'code':'generation_failed','message':'No pudimos generar el mapa. Podés reintentar.'})
  except Exception:return JSONResponse(status_code=502,content={'code':'generation_failed','message':'No pudimos generar el mapa. Podés reintentar.'})
 return application
app=create_app()
