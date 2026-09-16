const {test,expect}=require('@playwright/test');

for(const difficulty of ['facil','media','dificil']){
 test(`${difficulty}: genera, responde y corrige el examen`,async({page})=>{
  await page.goto('/');
  await page.locator('#output-mode').selectOption('exam');
  await page.locator('#difficulty').selectOption(difficulty);
  await page.locator('#text').fill('La norma jurídica establece reglas de conducta y prevé consecuencias para ciertos supuestos.');
  await page.locator('#submit').click();
  await expect(page.locator('#exam-panel')).toBeVisible();
  await expect(page.locator('.exam-question')).toHaveCount(10);
  await expect(page.locator('#exam-timer')).toContainText(':');
  await expect(page.locator('#exam-results')).toBeHidden();
  for(let index=0;index<10;index++)await page.locator(`input[name="question-${index}"][value="0"]`).check();
  await expect(page.locator('#exam-progress')).toHaveText('10 de 10 respondidas');
  await page.locator('#grade-button').click();
  await expect(page.locator('#exam-results')).toContainText('Resultado: 10 de 10 · Aprobado');
  await expect(page.locator('.answer-review')).toHaveCount(10);
 });
}

test('conserva exámenes anteriores para repasar y practicar otra vez',async({page})=>{
 let generations=0;
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/exams')generations++});
 await page.goto('/');
 await page.locator('#output-mode').selectOption('exam');
 await page.locator('#text').fill('La norma jurídica establece reglas de conducta y prevé consecuencias para ciertos supuestos.');
 await page.locator('#submit').click();
 await expect(page.locator('.exam-question')).toHaveCount(10);
 await page.locator('input[name="question-0"][value="0"]').check();
 await page.locator('#grade-button').click();
 await expect(page.locator('#exam-history')).toBeVisible();
 await expect(page.locator('.history-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Repasar respuestas'}).click();
 await expect(page.locator('#history-review')).toContainText('Tu respuesta');
 await page.getByRole('button',{name:'Cerrar repaso'}).click();

 await page.locator('#difficulty').selectOption('media');
 await page.locator('#submit').click();
 await expect(page.locator('.exam-question')).toHaveCount(10);
 await expect(page.locator('.history-card').first().getByRole('button',{name:'Practicar de nuevo'})).toBeDisabled();
 await page.locator('#grade-button').click();
 await expect(page.locator('.history-card')).toHaveCount(2);
 await page.locator('.history-card').last().getByRole('button',{name:'Practicar de nuevo'}).click();
 await expect(page.locator('#exam-title')).toContainText('Práctica de facil');
 await page.locator('input[name="question-0"][value="0"]').check();
 await page.locator('#grade-button').click();
 await expect(page.locator('.history-card')).toHaveCount(3);
 expect(generations).toBe(2);

 await page.reload();
 await expect(page.locator('.history-card')).toHaveCount(3);
 await page.locator('.history-card').last().getByRole('button',{name:'Repasar respuestas'}).click();
 await expect(page.locator('#history-review')).toContainText('Respuesta correcta');
 await page.getByRole('button',{name:'Borrar historial'}).click();
 await expect(page.locator('#exam-history')).toBeHidden();
});
