import json,pytest
from app.config import Settings
from app.generator import GenerationError,OpenAIGenerator,prompt,schema
class Response:
 def __init__(self,value):self.output_text=value
class Responses:
 def __init__(self,values):self.values=iter(values);self.calls=[]
 async def create(self,**kw):self.calls.append(kw);return Response(next(self.values))
class Client:
 def __init__(self,values):self.responses=Responses(values)
GOOD=json.dumps({'nodes':[{'id':'a','label':'A'},{'id':'b','label':'B'}],'edges':[{'source':'a','target':'b','label':'relación'}]})
@pytest.mark.anyio
async def test_valid_and_contract():
 c=Client([GOOD]);result=await OpenAIGenerator(Settings(),c).generate('texto suficiente')
 assert result.nodes[0].label=='A'
 assert 'DATOS NO CONFIABLES' in prompt('x');assert schema()['additionalProperties'] is False
@pytest.mark.anyio
async def test_one_retry():
 c=Client(['bad',GOOD]);assert (await OpenAIGenerator(Settings(),c).generate('texto')).nodes;assert len(c.responses.calls)==2
@pytest.mark.anyio
async def test_second_failure():
 with pytest.raises(GenerationError):await OpenAIGenerator(Settings(),Client(['bad','still bad'])).generate('texto')
