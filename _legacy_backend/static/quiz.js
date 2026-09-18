const HISTORY_KEY='completed-exams-v1';
let activeExam=null;
let examTimer=null;
let examDeadline=0;
let grading=false;
let generatingExam=false;
let completedExams=[];

try{
 const saved=JSON.parse(sessionStorage.getItem(HISTORY_KEY)||'[]');
 if(Array.isArray(saved))completedExams=saved.filter(entry=>
  entry&&entry.exam&&Array.isArray(entry.exam.questions)&&entry.grade&&Array.isArray(entry.grade.results)
 );
}catch{completedExams=[]}

function $$(selector){return [...document.querySelectorAll(selector)]}

function saveHistory(){
 try{sessionStorage.setItem(HISTORY_KEY,JSON.stringify(completedExams))}catch{
  state('error','El historial sigue disponible mientras esta página permanezca abierta, pero no pudo guardarse para una recarga.');
 }
}

function examProgress(){
 const answered=$$('#exam-questions input:checked').length;
 $('#exam-progress').textContent=`${answered} de ${activeExam.questions.length} respondidas`;
}

function renderExam(exam){
 const container=$('#exam-questions');container.replaceChildren();
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
 $('#exam-title').textContent=`${exam.practice?'Práctica de':'Examen'} ${exam.difficulty}`;
 $('#exam-results').hidden=true;$('#exam-results').replaceChildren();
 $('#exam-form').hidden=false;$('#grade-button').disabled=false;
 $('#exam-panel').hidden=false;examProgress();renderHistory();
}

function updateExamTimer(){
 const remaining=Math.max(0,Math.ceil((examDeadline-Date.now())/1000));
 $('#exam-timer').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 $('#exam-timer').classList.toggle('urgent',remaining<=60);
 if(remaining===0){clearInterval(examTimer);examTimer=null;submitExam(true)}
}

function beginExam(exam){
 clearInterval(examTimer);activeExam=exam;examDeadline=Date.now()+exam.duration_seconds*1000;
 $('#history-review').hidden=true;
 renderExam(exam);updateExamTimer();examTimer=setInterval(updateExamTimer,1000);
 $('#exam-panel').scrollIntoView({behavior:'smooth',block:'start'});
}

async function startExam(body,previous=[]){
 if(generatingExam)throw new Error('Ya estamos generando un examen.');
 generatingExam=true;renderHistory();
 try{
  if(previous.length)body.set('avoid_questions',JSON.stringify(previous));
  const response=await fetch('/api/exams',{method:'POST',body});
  const exam=await response.json();
  if(!response.ok)throw new Error(exam.message||'No pudimos generar el examen.');
  const nextNumber=completedExams.reduce((max,entry)=>Math.max(max,Number(entry.series_number)||0),0)+1;
  beginExam({...exam,series_number:nextNumber,attempt:1});
 }finally{generatingExam=false;renderHistory()}
}

function selectedAnswers(){
 return activeExam.questions.map((_,index)=>{
  const checked=document.querySelector(`input[name="question-${index}"]:checked`);
  return checked?Number(checked.value):null;
 });
}

function reviewContent(exam,grade){
 const fragment=document.createDocumentFragment();
 const heading=document.createElement('h3');
 heading.textContent=`Resultado: ${grade.score} de ${grade.total} · ${grade.passed?'Aprobado':'Seguí practicando'}`;
 fragment.append(heading);
 grade.results.forEach((item,index)=>{
  const card=document.createElement('article');card.className=`answer-review ${item.correct?'correct':'incorrect'}`;
  const title=document.createElement('h4');title.textContent=`${item.number}. ${exam.questions[index].statement}`;
  const status=document.createElement('p');
  status.textContent=item.correct?'Correcta':`Tu respuesta: ${item.selected_index===null?'sin responder':exam.questions[index].options[item.selected_index]}`;
  const answer=document.createElement('p');answer.textContent=`Respuesta correcta: ${exam.questions[index].options[item.correct_index]}`;
  const explanation=document.createElement('p');explanation.textContent=item.explanation;
  card.append(title,status,answer,explanation);fragment.append(card);
 });
 return fragment;
}

function showExamResults(exam,grade){
 const panel=$('#exam-results');panel.replaceChildren(reviewContent(exam,grade));
 $('#exam-form').hidden=true;panel.hidden=false;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}

function practiceGrade(exam,answers){
 const results=exam.answer_key.map((key,index)=>({
  number:index+1,selected_index:answers[index],correct_index:key.correct_index,
  correct:answers[index]===key.correct_index,explanation:key.explanation
 }));
 const score=results.filter(result=>result.correct).length;
 return {score,total:results.length,passed:score>=7,difficulty:exam.difficulty,results};
}

function recordExam(exam,grade){
 completedExams.push({
  series_number:exam.series_number,attempt:exam.attempt,
  completed_at:new Date().toLocaleString('es-AR'),
  exam:{difficulty:exam.difficulty,duration_seconds:exam.duration_seconds,questions:exam.questions},
  grade
 });
 saveHistory();
}

async function submitExam(expired=false){
 if(!activeExam||grading)return;
 grading=true;$('#grade-button').disabled=true;
 const exam=activeExam;
 const answers=selectedAnswers();
 try{
  let result;
  if(exam.practice)result=practiceGrade(exam,answers);
  else{
   const response=await fetch('/api/exams/grade',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({exam_id:exam.exam_id,answers})
   });
   result=await response.json();
   if(!response.ok)throw new Error(result.message||'No pudimos corregir el examen.');
  }
  clearInterval(examTimer);examTimer=null;
  showExamResults(exam,result);recordExam(exam,result);
  activeExam=null;renderHistory();
  state('success',expired?'Terminó el tiempo. El examen se entregó automáticamente.':'Examen entregado y corregido. Podés repasarlo o practicarlo de nuevo desde el historial.');
 }catch(error){
  state('error',error.message);
  if(Date.now()<examDeadline)$('#grade-button').disabled=false;
 }finally{grading=false}
}

function showHistoryReview(entry){
 const panel=$('#history-review');
 $('#history-review-title').textContent=`Repaso del examen ${entry.series_number} · intento ${entry.attempt}`;
 $('#history-review-content').replaceChildren(reviewContent(entry.exam,entry.grade));
 panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'});
}

function startPractice(entry){
 const attempt=completedExams.filter(item=>item.series_number===entry.series_number).length+1;
 const answerKey=entry.grade.results.map(item=>({correct_index:item.correct_index,explanation:item.explanation}));
 beginExam({...entry.exam,practice:true,answer_key:answerKey,
  series_number:entry.series_number,attempt});
 state('success','Práctica iniciada con las mismas preguntas. La corrección aparecerá al entregar.');
}

async function newQuestions(entry){
 $('#output-mode').value='exam';
 $('#output-mode').dispatchEvent(new Event('change'));
 $('#difficulty').value=entry.exam.difficulty;
 if(!valid()){
  state('error','Seleccioná de nuevo el PDF o pegá el texto arriba para generar preguntas nuevas.');
  $('#material-form').scrollIntoView({behavior:'smooth',block:'start'});
  return;
 }
 const previous=[...new Set(completedExams.filter(item=>item.exam.difficulty===entry.exam.difficulty)
  .flatMap(item=>item.exam.questions.map(question=>question.statement)))].slice(-30);
 $('#submit').disabled=true;
 state('processing','Generando preguntas diferentes con el material seleccionado…');
 try{
  await startExam(new FormData($('#material-form')),previous);
  $('#result').hidden=true;
  state('success','Examen nuevo listo. Las preguntas anteriores siguen en el historial.');
 }catch(error){state('error',`${error.message} Volvé a intentarlo.`)}
 finally{$('#submit').disabled=false}
}

function renderHistory(){
 const panel=$('#exam-history');panel.hidden=completedExams.length===0;
 const list=$('#history-list');list.replaceChildren();
 [...completedExams].reverse().forEach(entry=>{
  const card=document.createElement('article');card.className='history-card';
  const detail=document.createElement('div');
  const title=document.createElement('h3');title.textContent=`Examen ${entry.series_number} · intento ${entry.attempt}`;
  const summary=document.createElement('p');summary.className='hint';
  summary.textContent=`Dificultad ${entry.exam.difficulty} · ${entry.grade.score}/${entry.grade.total} · ${entry.completed_at}`;
  detail.append(title,summary);
  const actions=document.createElement('div');actions.className='history-actions';
  const review=document.createElement('button');review.type='button';review.className='secondary-button';review.textContent='Repasar respuestas';
  review.disabled=Boolean(activeExam||generatingExam);review.addEventListener('click',()=>showHistoryReview(entry));
  const practice=document.createElement('button');practice.type='button';practice.textContent='Practicar de nuevo';
  practice.disabled=Boolean(activeExam||generatingExam);practice.addEventListener('click',()=>startPractice(entry));
  const fresh=document.createElement('button');fresh.type='button';fresh.className='secondary-button';fresh.textContent='Preguntas nuevas';
  fresh.disabled=Boolean(activeExam||generatingExam);fresh.addEventListener('click',()=>newQuestions(entry));
  actions.append(review,practice,fresh);card.append(detail,actions);list.append(card);
 });
 $('#clear-history').disabled=Boolean(activeExam||generatingExam);
}

$('#exam-form').addEventListener('submit',event=>{event.preventDefault();submitExam()});
$('#close-review').addEventListener('click',()=>{$('#history-review').hidden=true});
$('#clear-history').addEventListener('click',()=>{
 completedExams=[];sessionStorage.removeItem(HISTORY_KEY);
 $('#history-review').hidden=true;renderHistory();
});
renderHistory();
