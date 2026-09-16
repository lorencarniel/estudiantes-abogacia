import pytest
from pydantic import ValidationError
from app.models import ConceptMap
GOOD={'nodes':[{'id':'a','label':'A'},{'id':'b','label':'B'}],'edges':[{'source':'a','target':'b','label':'causa'}]}
def test_valid(): assert ConceptMap.model_validate(GOOD).nodes[0].id=='a'
@pytest.mark.parametrize('change',[lambda x:x['nodes'].append({'id':'a','label':'otra'}),lambda x:x['edges'].append({'source':'a','target':'z','label':''})])
def test_invalid(change):
 import copy;x=copy.deepcopy(GOOD);change(x)
 with pytest.raises(ValidationError):ConceptMap.model_validate(x)
