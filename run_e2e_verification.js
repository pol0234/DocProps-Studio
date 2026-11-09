const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const JSZip = require('jszip');

async function createTempOfficeFile(type, fileName) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>Test ${type.toUpperCase()}</dc:title>
  <dc:creator>Test Author</dc:creator>
</cp:coreProperties>`);
  zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <TotalTime>45</TotalTime>
  <Application>Microsoft ${type === 'xlsx' ? 'Excel' : 'PowerPoint'}</Application>
  <Company>Test Organization</Company>
</Properties>`);

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const tmpPath = path.join(os.tmpdir(), fileName);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

(async () => {
  console.log('=== STARTING E2E CHROMIUM VERIFICATION ===');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('  [BROWSER ERROR]', err.message));

  const indexPath = 'file://' + path.resolve('index.html').replace(/\\/g, '/');
  console.log('1. Navigating to application:', indexPath);
  await page.goto(indexPath);

  // 2. Open sample document
  console.log('2. Opening sample document...');
  await page.click('#btnOpenSampleHero');
  await page.waitForTimeout(400);

  // 3. Verify initial loaded values
  const creator = await page.inputValue('#fCreator');
  const title = await page.inputValue('#fTitle');
  const words = await page.inputValue('#fWords');
  const totalTime = await page.inputValue('#fTotalTimeExact');
  const rev = await page.inputValue('#fRevision');

  console.log('   Initial values:');
  console.log(`   - Author: "${creator}" (expected "John Doe")`);
  console.log(`   - Title: "${title}"`);
  console.log(`   - Words: "${words}" (expected "14250")`);
  console.log(`   - Time: "${totalTime}" minutes (expected "540")`);
  console.log(`   - Revision: "${rev}" (expected "24")`);

  if (creator !== 'John Doe' || words !== '14250' || totalTime !== '540') {
    throw new Error('Initial sample document values were not loaded correctly!');
  }

  // 4. Modify attributes (Simulate user typing)
  console.log('3. Modifying attributes...');
  await page.fill('#fCreator', 'Dr. Martin Craft');
  await page.fill('#fTitle', 'OpenXML Metadata Redesign');

  // Switch to Time & Revisions tab
  console.log('4. Switching to Time & Revisions tab...');
  await page.click('button[data-section="secTiming"]');
  await page.waitForTimeout(200);

  // Update TotalTime and Revision
  await page.fill('#fTotalTimeExact', '720');
  await page.fill('#fRevision', '30');

  // Switch to Content Metrics tab
  console.log('5. Switching to Content Metrics tab...');
  await page.click('button[data-section="secMetrics"]');
  await page.waitForTimeout(200);

  // Update words, pages, and company
  await page.fill('#fWords', '28500');
  await page.fill('#fPages', '64');
  await page.fill('#fCompany', 'National Technology Academy');

  // 5. Verify top summary banner updates
  const sumAuthor = await page.textContent('#sumAuthor');
  const sumTime = await page.textContent('#sumTime');
  const sumRev = await page.textContent('#sumRevision');
  const sumScope = await page.textContent('#sumScope');

  console.log('   Updated summary banner values:');
  console.log(`   - Author: ${sumAuthor}`);
  console.log(`   - Time: ${sumTime}`);
  console.log(`   - Revision: ${sumRev}`);
  console.log(`   - Scope: ${sumScope}`);

  if (!sumAuthor.includes('Martin Craft') || !sumTime.includes('12h') || !sumRev.includes('30')) {
    throw new Error('Top summary banner did not update in real-time!');
  }

  // 6. Verify Live Simulator updates
  console.log('6. Switching to Live Simulator tab...');
  await page.click('button[data-section="secSimulator"]');
  await page.waitForTimeout(200);

  const simAuthor = await page.textContent('#simAuthors');
  const simWords = await page.textContent('#simWords');
  console.log(`   Explorer Simulator - Author: "${simAuthor}", Words: "${simWords}"`);
  if (!simAuthor.includes('Martin Craft') || !simWords.includes('28500')) {
    throw new Error('Explorer simulator does not reflect attribute changes!');
  }

  // 7. Generate and save OpenXML package from inside renderer
  console.log('7. Packaging and saving modified OpenXML package...');
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
  console.log(`   Generated file: ${outputPath} (${zipBuffer.length} bytes)`);

  // 8. Physical XML package verification with JSZip
  const verifiedZip = await JSZip.loadAsync(zipBuffer);
  const coreXml = await verifiedZip.file('docProps/core.xml').async('text');
  const appXml = await verifiedZip.file('docProps/app.xml').async('text');

  console.log('8. Physical inspection of generated XML:');
  console.log('   core.xml contains "Dr. Martin Craft"?', coreXml.includes('Dr. Martin Craft'));
  console.log('   core.xml contains "OpenXML Metadata Redesign"?', coreXml.includes('OpenXML Metadata Redesign'));
  console.log('   core.xml contains revision "30"?', coreXml.includes('<cp:revision>30</cp:revision>'));
  console.log('   app.xml contains words "28500"?', appXml.includes('<Words>28500</Words>'));
  console.log('   app.xml contains pages "64"?', appXml.includes('<Pages>64</Pages>'));
  console.log('   app.xml contains time "720"?', appXml.includes('<TotalTime>720</TotalTime>'));
  console.log('   app.xml contains company "National Technology Academy"?', appXml.includes('National Technology Academy'));

  // Ensure no broken xmlns="" declarations exist
  if (coreXml.includes('xmlns=""') || appXml.includes('xmlns=""')) {
    throw new Error('Critical error: Generated XML contains broken namespace xmlns=""!');
  }

  if (
    !coreXml.includes('Dr. Martin Craft') ||
    !coreXml.includes('30') ||
    !appXml.includes('28500') ||
    !appXml.includes('64') ||
    !appXml.includes('720')
  ) {
    throw new Error('Metadata in the saved archive was not written properly!');
  }

  // 9. DYNAMIC BRANDING & THEME ADAPTATION (Word = Blue, Excel = Green, PowerPoint = Red)
  console.log('\n9. Testing dynamic branding and theme adaptation for XLSX and PPTX...');

  // Test XLSX
  const xlsxPath = await createTempOfficeFile('xlsx', 'test_budget.xlsx');
  console.log('   Loading temporary Excel file:', xlsxPath);
  const fileInput = await page.$('#systemFileInput');
  await fileInput.setInputFiles(xlsxPath);
  await page.waitForTimeout(500);

  const brandNameExcel = await page.textContent('#brandName');
  const brandTagExcel = await page.textContent('#brandTag');
  const badgeClassesExcel = await page.getAttribute('#brandBadgeBox', 'class');
  const iconExcelDisplay = await page.evaluate(() => window.getComputedStyle(document.getElementById('brandIconExcel')).display);
  const docTypeExcel = await page.evaluate(() => document.documentElement.getAttribute('data-doc-type'));
  const themeAccentExcel = await page.evaluate(() => window.getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim());

  console.log(`   Excel Brand Name: "${brandNameExcel}" (expected "ExcelProps")`);
  console.log(`   Excel Brand Tag: "${brandTagExcel}" (expected "XLSX")`);
  console.log(`   Excel Badge Classes: "${badgeClassesExcel}"`);
  console.log(`   Excel Icon Display: "${iconExcelDisplay}"`);
  console.log(`   Excel data-doc-type: "${docTypeExcel}" (expected "xlsx")`);
  console.log(`   Excel --theme-accent: "${themeAccentExcel}" (expected green #10b981)`);

  if (
    brandNameExcel !== 'ExcelProps' ||
    brandTagExcel !== 'XLSX' ||
    !badgeClassesExcel.includes('excel-theme') ||
    iconExcelDisplay === 'none' ||
    docTypeExcel !== 'xlsx' ||
    themeAccentExcel !== '#10b981'
  ) {
    throw new Error('Dynamic branding or theme for Excel (green) failed!');
  }

  // Test PPTX
  const pptxPath = await createTempOfficeFile('pptx', 'test_presentation.pptx');
  console.log('   Loading temporary PowerPoint file:', pptxPath);
  await fileInput.setInputFiles(pptxPath);
  await page.waitForTimeout(500);

  const brandNamePpt = await page.textContent('#brandName');
  const brandTagPpt = await page.textContent('#brandTag');
  const badgeClassesPpt = await page.getAttribute('#brandBadgeBox', 'class');
  const iconPptDisplay = await page.evaluate(() => window.getComputedStyle(document.getElementById('brandIconPpt')).display);
  const docTypePpt = await page.evaluate(() => document.documentElement.getAttribute('data-doc-type'));
  const themeAccentPpt = await page.evaluate(() => window.getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim());

  console.log(`   PPTX Brand Name: "${brandNamePpt}" (expected "SlideProps")`);
  console.log(`   PPTX Brand Tag: "${brandTagPpt}" (expected "PPTX")`);
  console.log(`   PPTX Badge Classes: "${badgeClassesPpt}"`);
  console.log(`   PPTX Icon Display: "${iconPptDisplay}"`);
  console.log(`   PPTX data-doc-type: "${docTypePpt}" (expected "pptx")`);
  console.log(`   PPTX --theme-accent: "${themeAccentPpt}" (expected red #ef4444)`);

  if (
    brandNamePpt !== 'SlideProps' ||
    brandTagPpt !== 'PPTX' ||
    !badgeClassesPpt.includes('pptx-theme') ||
    iconPptDisplay === 'none' ||
    docTypePpt !== 'pptx' ||
    themeAccentPpt !== '#ef4444'
  ) {
    throw new Error('Dynamic branding or theme for PowerPoint (red) failed!');
  }

  // Clean up temporary test files
  try {
    if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    if (fs.existsSync(pptxPath)) fs.unlinkSync(pptxPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  } catch (cleanErr) {
    console.warn('Notice while deleting test files:', cleanErr.message);
  }

  // 10. TEST TOP BAR RESPONSIVENESS AND WINDOWS SYSTEM BUTTON COLLISION
  console.log('\n10. Testing top bar responsiveness and safety zone clearance...');
  const testWidths = [1600, 1440, 1240, 1024, 960];

  for (const w of testWidths) {
    await page.setViewportSize({ width: w, height: 720 });
    await page.waitForTimeout(200);

    const saveBtn = page.locator('#btnSaveDirect');
    const isVisible = await saveBtn.isVisible();
    const box = await saveBtn.boundingBox();
    const rightEdge = box ? Math.round(box.x + box.width) : 0;
    const safeLimit = w - 140; // Windows minimize/maximize/close reserve zone

    console.log(`   Window width ${w}px -> Save visible: ${isVisible}, right edge: ${rightEdge}px (safety limit: <= ${safeLimit}px)`);

    if (!isVisible) {
      throw new Error(`Save button is not visible at window width ${w}px!`);
    }
    if (rightEdge > safeLimit) {
      throw new Error(`COLLISION: Save button intrudes into Windows controls reserve zone (${rightEdge}px > ${safeLimit}px) at width ${w}px!`);
    }
  }

  await browser.close();
  console.log('\n=== ALL E2E TESTS PASSED (100%) ===');
})().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
