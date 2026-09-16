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
