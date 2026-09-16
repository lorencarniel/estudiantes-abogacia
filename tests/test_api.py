from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from app.models import ConceptMap
class Fake:
 async def generate(self,text):return ConceptMap.model_validate({'nodes':[{'id':'1','label':'Uno'},{'id':'2','label':'Dos'}],'edges':[{'source':'1','target':'2','label':'vínculo'}]})
def client(**kw):return TestClient(create_app(Fake(),Settings(min_text_chars=5,rate_limit_requests=20,**kw)))
def test_success_and_no_secret_in_assets():
 c=client(openai_api_key='super-secret');r=c.post('/api/maps',data={'text':'texto bastante largo'});assert r.status_code==200;assert 'super-secret' not in c.get('/').text+c.get('/static/app.js').text
def test_validation_public_error():
 r=client().post('/api/maps',data={});assert r.status_code==422;assert set(r.json())=={'code','message'}
def test_rate_limit():
 c=TestClient(create_app(Fake(),Settings(min_text_chars=2,rate_limit_requests=1)));assert c.post('/api/maps',data={'text':'hola'}).status_code==200;assert c.post('/api/maps',data={'text':'hola'}).status_code==429
