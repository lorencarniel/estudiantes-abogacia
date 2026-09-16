from app.config import Settings
from app.main import create_app
from app.models import ConceptMap
from app.quiz import Exam
class FakeGenerator:
 async def generate(self,text):
  return ConceptMap.model_validate({'nodes':[{'id':'norma','label':'Norma jurídica'},{'id':'sancion','label':'Sanción'}],'edges':[{'source':'norma','target':'sancion','label':'prevé'}]})
class FakeQuizGenerator:
 async def generate(self,text,difficulty):
  return Exam.model_validate({'questions':[
   {'statement':f'¿Qué establece el concepto jurídico número {index+1}?',
    'options':['La norma','La sanción','El contrato','El proceso'],
    'correct_index':0,'explanation':'El apunte describe ese concepto como una norma.'}
   for index in range(10)
  ]})

app=create_app(FakeGenerator(),Settings(min_text_chars=10,rate_limit_requests=100),FakeQuizGenerator())
