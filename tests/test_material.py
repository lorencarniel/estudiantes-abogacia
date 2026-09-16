import io,pytest
from fastapi import UploadFile
from pypdf import PdfWriter
from app.config import Settings
from app.material import MaterialError,read_material
S=Settings(min_text_chars=10,max_pdf_bytes=1000,max_text_chars=50)
@pytest.mark.anyio
@pytest.mark.parametrize('pdf,text,code',[(None,None,'invalid_source'),(UploadFile(io.BytesIO(b'%PDF-x'),filename='x.pdf',headers={'content-type':'application/pdf'}),'suficiente texto','invalid_source'),(UploadFile(io.BytesIO(b'no'),filename='x.txt',headers={'content-type':'text/plain'}),None,'invalid_pdf'),(UploadFile(io.BytesIO(b'%PDF-'+b'x'*1000),filename='x.pdf',headers={'content-type':'application/pdf'}),None,'pdf_too_large')])
async def test_input_errors(pdf,text,code):
 with pytest.raises(MaterialError) as e:await read_material(pdf,text,S)
 assert e.value.code==code
@pytest.mark.anyio
async def test_normalizes_text(): assert await read_material(None,'  contenido   suficiente  ',S)=='contenido suficiente'
@pytest.mark.anyio
async def test_empty_pdf():
 b=io.BytesIO();w=PdfWriter();w.add_blank_page(100,100);w.write(b);b.seek(0)
 with pytest.raises(MaterialError) as e:await read_material(UploadFile(b,filename='empty.pdf',headers={'content-type':'application/pdf'}),None,Settings(min_text_chars=2,max_pdf_bytes=9999))
 assert e.value.code=='insufficient_content'
@pytest.mark.anyio
async def test_corrupt_pdf():
 with pytest.raises(MaterialError) as e:await read_material(UploadFile(io.BytesIO(b'%PDF-bad'),filename='bad.pdf',headers={'content-type':'application/pdf'}),None,S)
 assert e.value.code=='unreadable_pdf'
