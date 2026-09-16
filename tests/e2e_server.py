from app.config import Settings
from app.main import create_app
from app.models import ConceptMap
class FakeGenerator:
 async def generate(self,text):
  return ConceptMap.model_validate({'nodes':[{'id':'norma','label':'Norma jurídica'},{'id':'sancion','label':'Sanción'}],'edges':[{'source':'norma','target':'sancion','label':'prevé'}]})
app=create_app(FakeGenerator(),Settings(min_text_chars=10,rate_limit_requests=100))
