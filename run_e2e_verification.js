const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

(async () => {
  console.log('=== SPUSTENIE E2E OVERENIA S CHROMIUM ===');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('  [BROWSER ERROR]', err.message));

  const indexPath = 'file://' + path.resolve('index.html').replace(/\\/g, '/');
  console.log('1. Navigácia na aplikáciu:', indexPath);
  await page.goto(indexPath);

  // 2. Kliknutie na vzorový dokument
  console.log('2. Otváram vzorový dokument...');
  await page.click('#btnOpenSampleHero');
  await page.waitForTimeout(400);

  // 3. Kontrola načítaných hodnôt
  const creator = await page.inputValue('#fCreator');
  const title = await page.inputValue('#fTitle');
  const words = await page.inputValue('#fWords');
  const totalTime = await page.inputValue('#fTotalTimeExact');
  const rev = await page.inputValue('#fRevision');

  console.log('   Pôvodné hodnoty:');
  console.log(`   - Autor: "${creator}" (očakáva sa "Ján Novák")`);
  console.log(`   - Názov: "${title}"`);
  console.log(`   - Slová: "${words}" (očakáva sa "14250")`);
  console.log(`   - Čas: "${totalTime}" minút (očakáva sa "540")`);
  console.log(`   - Revízia: "${rev}" (očakáva sa "24")`);

  if (creator !== 'Ján Novák' || words !== '14250' || totalTime !== '540') {
    throw new Error('Počiatočné hodnoty neboli načítané správne!');
  }

  // 4. Úprava hodnôt (Simulácia písania používateľom)
  console.log('3. Úprava atribútov...');
  await page.fill('#fCreator', 'Dr. Ing. Martin Craft');
  await page.fill('#fTitle', 'Revolučný redizajn OpenXML metadát');

  // Prepnutie na záložku Čas & Revízie
  console.log('4. Prepnutie na záložku Čas & Revízie...');
  await page.click('button[data-section="secTiming"]');
  await page.waitForTimeout(200);

  // Zmena TotalTime cez slider a presné pole
  await page.fill('#fTotalTimeExact', '720');
  await page.fill('#fRevision', '30');

  // Prepnutie na záložku Metrika obsahu
  console.log('5. Prepnutie na záložku Metrika obsahu...');
  await page.click('button[data-section="secMetrics"]');
  await page.waitForTimeout(200);

  // Zmena počtu slov a strán
  await page.fill('#fWords', '28500');
  await page.fill('#fPages', '64');
  await page.fill('#fCompany', 'Slovenská Technická Akadémia');

  // 5. Overenie horného summary banneru
  const sumAuthor = await page.textContent('#sumAuthor');
  const sumTime = await page.textContent('#sumTime');
  const sumRev = await page.textContent('#sumRevision');
  const sumScope = await page.textContent('#sumScope');

  console.log('   Aktualizovaný prehľad v hornom banneri:');
  console.log(`   - Autor: ${sumAuthor}`);
  console.log(`   - Čas: ${sumTime}`);
  console.log(`   - Revízia: ${sumRev}`);
  console.log(`   - Rozsah: ${sumScope}`);

  if (!sumAuthor.includes('Martin Craft') || !sumTime.includes('12h') || !sumRev.includes('30')) {
    throw new Error('Horný prehľadový banner sa neaktualizoval v reálnom čase!');
  }

  // 6. Overenie simulátora
  console.log('6. Prepnutie na záložku Živý simulátor...');
  await page.click('button[data-section="secSimulator"]');
  await page.waitForTimeout(200);

  const simAuthor = await page.textContent('#simAuthors');
  const simWords = await page.textContent('#simWords');
  console.log(`   Simulátor Prieskumníka - Autor: "${simAuthor}", Slová: "${simWords}"`);
  if (!simAuthor.includes('Martin Craft') || !simWords.includes('28500')) {
    throw new Error('Simulátor Prieskumníka neodráža zmeny!');
  }

  // 7. Vygenerovanie a stiahnutie balíka priamo z vnútra stránky
  console.log('7. Ukladanie a generovanie upraveného OpenXML balíka...');
  const base64Zip = await page.evaluate(async () => {
    const blob = await prepareZipPackageForSaving();
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  });

  const zipBuffer = Buffer.from(base64Zip, 'base64');
  const outputPath = 'test_e2e_verified.docx';
  fs.writeFileSync(outputPath, zipBuffer);
  console.log(`   Vygenerovaný súbor: ${outputPath} (${zipBuffer.length} bajtov)`);

  // 8. Fyzické overenie obsahu výsledného archívu cez JSZip
  const verifiedZip = await JSZip.loadAsync(zipBuffer);
  const coreXml = await verifiedZip.file('docProps/core.xml').async('text');
  const appXml = await verifiedZip.file('docProps/app.xml').async('text');

  console.log('8. Fyzická inšpekcia vygenerovaného XML:');
  console.log('   core.xml obsahuje "Dr. Ing. Martin Craft"?', coreXml.includes('Dr. Ing. Martin Craft'));
  console.log('   core.xml obsahuje "Revolučný redizajn OpenXML metadát"?', coreXml.includes('Revolučný redizajn OpenXML metadát'));
  console.log('   core.xml obsahuje revíziu "30"?', coreXml.includes('<cp:revision>30</cp:revision>'));
  console.log('   app.xml obsahuje slová "28500"?', appXml.includes('<Words>28500</Words>'));
  console.log('   app.xml obsahuje strany "64"?', appXml.includes('<Pages>64</Pages>'));
  console.log('   app.xml obsahuje čas "720"?', appXml.includes('<TotalTime>720</TotalTime>'));
  console.log('   app.xml obsahuje spoločnosť "Slovenská Technická Akadémia"?', appXml.includes('Slovenská Technická Akadémia'));

  // Overenie neprítomnosti defektov xmlns=""
  if (coreXml.includes('xmlns=""') || appXml.includes('xmlns=""')) {
    throw new Error('Kritická chyba: Vygenerovaný XML obsahuje poškodený namespace xmlns=""!');
  }

  if (
    !coreXml.includes('Dr. Ing. Martin Craft') ||
    !coreXml.includes('30') ||
    !appXml.includes('28500') ||
    !appXml.includes('64') ||
    !appXml.includes('720')
  ) {
    throw new Error('Metadáta v ukladacom archíve neboli správne zapísané!');
  }

  // 9. DYNAMICKÝ BRANDING & FORMÁTOVÁ ADAPTÁCIA (Word -> Excel -> PowerPoint)
  console.log('\n9. Test dynamického brandingu pre XLSX a PPTX...');

  // Test XLSX
  const xlsxPath = path.resolve('samples/vzorka_rozpocet.xlsx');
  console.log('   Nahrávam Excel súbor:', xlsxPath);
  const fileInput = await page.$('#systemFileInput');
  await fileInput.setInputFiles(xlsxPath);
  await page.waitForTimeout(500);

  const brandNameExcel = await page.textContent('#brandName');
  const brandTagExcel = await page.textContent('#brandTag');
  const badgeClassesExcel = await page.getAttribute('#brandBadgeBox', 'class');
  const iconExcelDisplay = await page.evaluate(() => window.getComputedStyle(document.getElementById('brandIconExcel')).display);

  console.log(`   Excel Brand Name: "${brandNameExcel}" (očakáva sa "ExcelProps")`);
  console.log(`   Excel Brand Tag: "${brandTagExcel}" (očakáva sa "XLSX")`);
  console.log(`   Excel Badge Classes: "${badgeClassesExcel}"`);
  console.log(`   Excel Icon Display: "${iconExcelDisplay}"`);

  if (brandNameExcel !== 'ExcelProps' || brandTagExcel !== 'XLSX' || !badgeClassesExcel.includes('excel-theme') || iconExcelDisplay === 'none') {
    throw new Error('Dynamický branding pre Excel (ExcelProps) zlyhal!');
  }

  // Test PPTX
  const pptxPath = path.resolve('samples/vzorka_prezentacia.pptx');
  console.log('   Nahrávam PowerPoint súbor:', pptxPath);
  await fileInput.setInputFiles(pptxPath);
  await page.waitForTimeout(500);

  const brandNamePpt = await page.textContent('#brandName');
  const brandTagPpt = await page.textContent('#brandTag');
  const badgeClassesPpt = await page.getAttribute('#brandBadgeBox', 'class');
  const iconPptDisplay = await page.evaluate(() => window.getComputedStyle(document.getElementById('brandIconPpt')).display);

  console.log(`   PPTX Brand Name: "${brandNamePpt}" (očakáva sa "SlideProps")`);
  console.log(`   PPTX Brand Tag: "${brandTagPpt}" (očakáva sa "PPTX")`);
  console.log(`   PPTX Badge Classes: "${badgeClassesPpt}"`);
  console.log(`   PPTX Icon Display: "${iconPptDisplay}"`);

  if (brandNamePpt !== 'SlideProps' || brandTagPpt !== 'PPTX' || !badgeClassesPpt.includes('pptx-theme') || iconPptDisplay === 'none') {
    throw new Error('Dynamický branding pre PowerPoint (SlideProps) zlyhal!');
  }

  // 10. TEST RESPONSIVITY TOP BARU (Kompaktné okno a viditeľnosť tlačidla Uložiť)
  console.log('\n10. Test responzivity top baru pri kompaktnom okne (1000px & 960px)...');
  await page.setViewportSize({ width: 1000, height: 680 });
  await page.waitForTimeout(300);

  const saveBtnVisible1000 = await page.isVisible('#btnSaveDirect');
  const saveBtnBox1000 = await page.locator('#btnSaveDirect').boundingBox();
  console.log(`   Šírka okna 1000px -> Tlačidlo Uložiť viditeľné: ${saveBtnVisible1000}, Pozícia: x=${Math.round(saveBtnBox1000.x)}, w=${Math.round(saveBtnBox1000.width)}`);

  if (!saveBtnVisible1000 || saveBtnBox1000.x + saveBtnBox1000.width > 1000) {
    throw new Error('Tlačidlo Uložiť presahuje okno pri šírke 1000px!');
  }

  await page.setViewportSize({ width: 960, height: 640 });
  await page.waitForTimeout(300);

  const saveBtnVisible960 = await page.isVisible('#btnSaveDirect');
  const saveBtnBox960 = await page.locator('#btnSaveDirect').boundingBox();
  console.log(`   Šírka okna 960px -> Tlačidlo Uložiť viditeľné: ${saveBtnVisible960}, Pozícia: x=${Math.round(saveBtnBox960.x)}, w=${Math.round(saveBtnBox960.width)}`);

  if (!saveBtnVisible960 || saveBtnBox960.x + saveBtnBox960.width > 960) {
    throw new Error('Tlačidlo Uložiť presahuje okno pri šírke 960px!');
  }

  await browser.close();
  console.log('\n=== VŠETKY E2E TESTY ÚSPEŠNE PREBEHLI (100% PASSED) ===');
})().catch(err => {
  console.error('\n❌ E2E TEST ZLYHAL:', err);
  process.exit(1);
});

