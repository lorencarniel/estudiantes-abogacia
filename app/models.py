from pydantic import BaseModel, ConfigDict, Field, model_validator
class Node(BaseModel):
    model_config=ConfigDict(str_strip_whitespace=True)
    id: str=Field(min_length=1,max_length=64)
    label: str=Field(min_length=1,max_length=100)
class Edge(BaseModel):
    model_config=ConfigDict(str_strip_whitespace=True)
    source: str=Field(min_length=1,max_length=64)
    target: str=Field(min_length=1,max_length=64)
    label: str=Field(default="",max_length=100)
class ConceptMap(BaseModel):
    nodes:list[Node]=Field(min_length=2,max_length=30)
    edges:list[Edge]=Field(default_factory=list,max_length=100)
    @model_validator(mode='after')
    def valid_graph(self):
        ids=[n.id for n in self.nodes]
        if len(ids)!=len(set(ids)): raise ValueError('Los IDs de nodos deben ser únicos')
        missing={x for e in self.edges for x in (e.source,e.target)}-set(ids)
        if missing: raise ValueError('Las relaciones deben referenciar nodos existentes')
        return self
class PublicError(BaseModel):
    code:str
    message:str
