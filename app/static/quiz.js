let activeExam=null;
let examTimer=null;
let examDeadline=0;
let grading=false;

function examProgress(){
 const answered=$$('#exam-questions input:checked').length;
 $('#exam-progress').textContent=`${answered} de ${activeExam.questions.length} respondidas`;
}

function $$(selector){return [...document.querySelectorAll(selector)]}

function renderExam(exam){
 const container=$('#exam-questions');
 container.replaceChildren();
 exam.questions.forEach((question,index)=>{
  const field=document.createElement('fieldset');field.className='exam-question';
  const legend=document.createElement('legend');legend.textContent=`${index+1}. ${question.statement}`;
  field.append(legend);
  question.options.forEach((option,choice)=>{
   const label=document.createElement('label');label.className='exam-option';
   const input=document.createElement('input');input.type='radio';input.name=`question-${index}`;input.value=String(choice);
   input.addEventListener('change',examProgress);
   const span=document.createElement('span');span.textContent=option;
   label.append(input,span);field.append(label);
  });
  container.append(field);
 });
 $('#exam-title').textContent=`Examen ${exam.difficulty}`;
 $('#exam-results').hidden=true;$('#exam-results').replaceChildren();
 $('#exam-form').hidden=false;$('#grade-button').disabled=false;
 $('#exam-panel').hidden=false;examProgress();
}

function updateExamTimer(){
 const remaining=Math.max(0,Math.ceil((examDeadline-Date.now())/1000));
 $('#exam-timer').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 $('#exam-timer').classList.toggle('urgent',remaining<=60);
 if(remaining===0){clearInterval(examTimer);examTimer=null;submitExam(true)}
}

async function startExam(body){
 clearInterval(examTimer);examTimer=null;activeExam=null;$('#exam-panel').hidden=true;
 const response=await fetch('/api/exams',{method:'POST',body});
 const exam=await response.json();
 if(!response.ok)throw new Error(exam.message||'No pudimos generar el examen.');
 clearInterval(examTimer);activeExam=exam;examDeadline=Date.now()+exam.duration_seconds*1000;
 renderExam(exam);updateExamTimer();examTimer=setInterval(updateExamTimer,1000);
 $('#exam-panel').scrollIntoView({behavior:'smooth',block:'start'});
}

function selectedAnswers(){
 return activeExam.questions.map((_,index)=>{
  const checked=document.querySelector(`input[name="question-${index}"]:checked`);
  return checked?Number(checked.value):null;
 });
}

function showExamResults(grade){
 const panel=$('#exam-results');panel.replaceChildren();
 const heading=document.createElement('h3');
 heading.textContent=`Resultado: ${grade.score} de ${grade.total} · ${grade.passed?'Aprobado':'Seguí practicando'}`;
 panel.append(heading);
 grade.results.forEach((item,index)=>{
  const card=document.createElement('article');card.className=`answer-review ${item.correct?'correct':'incorrect'}`;
  const title=document.createElement('h4');title.textContent=`${item.number}. ${activeExam.questions[index].statement}`;
  const status=document.createElement('p');
  status.textContent=item.correct?'Correcta':`Tu respuesta: ${item.selected_index===null?'sin responder':activeExam.questions[index].options[item.selected_index]}`;
  const answer=document.createElement('p');answer.textContent=`Respuesta correcta: ${activeExam.questions[index].options[item.correct_index]}`;
  const explanation=document.createElement('p');explanation.textContent=item.explanation;
  card.append(title,status,answer,explanation);panel.append(card);
 });
 $('#exam-form').hidden=true;panel.hidden=false;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}

async function submitExam(expired=false){
 if(!activeExam||grading)return;
 grading=true;$('#grade-button').disabled=true;
 try{
  const response=await fetch('/api/exams/grade',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({exam_id:activeExam.exam_id,answers:selectedAnswers()})
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.message||'No pudimos corregir el examen.');
  clearInterval(examTimer);examTimer=null;showExamResults(result);
  state('success',expired?'Terminó el tiempo. El examen se entregó automáticamente.':'Examen entregado y corregido.');
  activeExam=null;
 }catch(error){
  state('error',error.message);
  if(Date.now()<examDeadline)$('#grade-button').disabled=false;
 }finally{grading=false}
}

$('#exam-form').addEventListener('submit',event=>{event.preventDefault();submitExam()});
