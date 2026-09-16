import io,re
from fastapi import UploadFile
from pypdf import PdfReader
class MaterialError(ValueError):
    def __init__(self,code,message): self.code,self.message=code,message; super().__init__(message)
def normalize(text): return re.sub(r'\s+',' ',text).strip()
async def read_material(pdf:UploadFile|None,text:str|None,settings):
    clean=normalize(text or '')
    has_pdf=pdf is not None and bool(pdf.filename)
    if has_pdf==bool(clean): raise MaterialError('invalid_source','Elegí exactamente una fuente: PDF o texto.')
    if clean:
        if len(clean)>settings.max_text_chars: raise MaterialError('text_too_large',f'El texto supera {settings.max_text_chars} caracteres.')
        if len(clean)<settings.min_text_chars: raise MaterialError('insufficient_content','Necesitamos un apunte más completo.')
        return clean
    data=await pdf.read(settings.max_pdf_bytes+1)
    try:
        if len(data)>settings.max_pdf_bytes: raise MaterialError('pdf_too_large','El PDF supera el límite de 20 MB.')
        if pdf.content_type!='application/pdf' or not data.startswith(b'%PDF-'): raise MaterialError('invalid_pdf','Solo se admiten archivos PDF reconocibles.')
        try:
            reader=PdfReader(io.BytesIO(data))
            if reader.is_encrypted and reader.decrypt('')==0: raise MaterialError('protected_pdf','El PDF está protegido y no puede abrirse.')
            result=normalize(' '.join(page.extract_text() or '' for page in reader.pages))
        except MaterialError: raise
        except Exception: raise MaterialError('unreadable_pdf','No pudimos leer el PDF. Probá con otro archivo.') from None
        if len(result)<settings.min_text_chars: raise MaterialError('insufficient_content','El PDF necesita texto seleccionable; esta versión no realiza OCR.')
        return result
    finally:
        data=b''
        await pdf.close()
