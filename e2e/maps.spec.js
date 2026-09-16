const {test,expect}=require('@playwright/test');
for(const source of ['text','pdf']) test(`${source}: genera, navega y descarga`,async({page})=>{
 await page.goto('/');
 if(source==='text') await page.locator('#text').fill('La norma jurídica establece consecuencias y una sanción para el incumplimiento.');
 else await page.locator('#pdf').setInputFiles('tests/fixtures/textual.pdf');
 await page.locator('#submit').click();await expect(page.locator('#status')).toContainText('Mapa generado');
 await expect(page.locator('#network canvas')).toBeVisible();await page.locator('#zoom-in').click();await page.locator('#reset').click();
 const download=page.waitForEvent('download');await page.locator('#download').click();expect((await download).suggestedFilename()).toBe('mapa-conceptual.png');
});
