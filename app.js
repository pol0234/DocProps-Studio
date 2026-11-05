/**
 * DocProps Studio - Desktop Application Engine
 * With GSAP dynamic animations, context-aware document formatting, and live simulators.
 */

// Global State
let currentZip = null;
let currentFileInfo = {
  name: '',
  size: 0,
  path: '',
  type: 'word' // 'word', 'pptx', 'xlsx', 'generic'
};

let activeSectionId = 'secIdentity';
let activeArchiveFile = 'docProps/core.xml';
let originalSnapshot = {};

let xmlDocs = {
  core: null,
  app: null,
  custom: null
};

// Namespaces
const NS = {
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  ep: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  cust: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
  vt: 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initDragAndDrop();
  initEvents();
  initKeyboardShortcuts();
  initElectronBridge();
});

// -----------------------------------------------------------------------------
// Electron IPC Integration
// -----------------------------------------------------------------------------
function initElectronBridge() {
  if (window.electronAPI) {
    window.electronAPI.onOpenFileFromSystem(async (filePath) => {
      const fileData = await window.electronAPI.readFromPath(filePath);
      if (fileData) {
        loadFromBinaryBuffer(fileData.buffer, fileData.fileName, fileData.fileSize, fileData.filePath);
      }
    });
  }
}

// -----------------------------------------------------------------------------
// Theme Management
// -----------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('docprops-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  document.getElementById('btnThemeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('docprops-theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  const svg = document.getElementById('themeSvg');
  if (theme === 'dark') {
    svg.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  } else {
    svg.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  }
}

// -----------------------------------------------------------------------------
// Navigation Between Sections with GSAP
// -----------------------------------------------------------------------------
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const secId = item.getAttribute('data-section');
      activeSectionId = secId;

      document.querySelectorAll('.form-section').forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(secId);
      if (targetSec) {
        targetSec.classList.add('active');
        // GSAP smooth section fade & slide
        if (window.gsap) {
          gsap.fromTo(targetSec, 
            { opacity: 0, y: 10 }, 
            { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' }
          );
          gsap.fromTo(targetSec.querySelectorAll('.input-card, .timing-module, .sim-window, .raw-xml-container'),
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.28, stagger: 0.03, ease: 'power2.out' }
          );
        }
      }

      // Update Breadcrumb
      document.getElementById('bcCurrentSection').textContent = item.querySelector('span').textContent;

      if (secId === 'secXml') {
        syncFormToXmlDocs();
        loadArchiveFileIntoEditor(activeArchiveFile);
      } else if (secId === 'secSimulator') {
        updateLiveSimulators();
      }
    });
  });
}

// -----------------------------------------------------------------------------
// File Ingestion & Drag / Drop
// -----------------------------------------------------------------------------
function initDragAndDrop() {
  const dropzoneBox = document.getElementById('dropzoneBox');
  const fileInput = document.getElementById('systemFileInput');

  dropzoneBox.addEventListener('click', async () => {
    if (window.electronAPI) {
      const fileData = await window.electronAPI.openFileDialog();
      if (fileData) {
        loadFromBinaryBuffer(fileData.buffer, fileData.fileName, fileData.fileSize, fileData.filePath);
      }
    } else {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(ev => {
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzoneBox.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzoneBox.classList.remove('dragover');
    });
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
    }
  });
}

async function loadFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    loadFromBinaryBuffer(arrayBuffer, file.name, file.size, file.path || file.name);
  } catch (err) {
    console.error(err);
    alert('Nepodarilo sa načítať súbor: ' + err.message);
  }
}

async function loadFromBinaryBuffer(buffer, fileName, fileSize, filePath) {
  try {
    const ext = fileName.split('.').pop().toLowerCase();
    let docType = 'generic';

    if (['docx', 'docm', 'dotx', 'dotm'].includes(ext)) {
      docType = 'word';
    } else if (['pptx', 'pptm', 'potx', 'potm'].includes(ext)) {
      docType = 'pptx';
    } else if (['xlsx', 'xlsm', 'xltx', 'xltm'].includes(ext)) {
      docType = 'xlsx';
    }

    currentFileInfo = {
      name: fileName,
      size: fileSize,
      path: filePath,
      type: docType
    };

    currentZip = await JSZip.loadAsync(buffer);
    await parseArchiveMetadata();
    populateArchiveDropdown();

    // Show Workspace, Hide Empty Dropzone
    document.getElementById('viewEmptyState').style.display = 'none';
    document.getElementById('viewFormSections').style.display = 'block';
    document.getElementById('sidebarDocCard').style.display = 'flex';
    document.getElementById('sidebarActions').style.display = 'flex';
    document.getElementById('toolbarControls').style.display = 'flex';

    // Update UI headers & adapt to docType
    applyDocumentTypeContext(docType);
    updateDocumentMetadataHeader();
    saveSnapshot();
    updateDiffSummary();
    updateLiveSimulators();

    // GSAP Intro animation
    if (window.gsap) {
      gsap.from('#sidebarDocCard', { opacity: 0, x: -16, duration: 0.35, ease: 'power2.out' });
      gsap.from('.metric-row', { opacity: 0, x: -8, stagger: 0.04, duration: 0.25, ease: 'power1.out' });
      gsap.from('.form-section.active .input-card', { opacity: 0, y: 12, stagger: 0.03, duration: 0.35, ease: 'power2.out' });
    }

    setStatus(true, 'Dokument pripravený');
    showToastNotice(`Dokument '${fileName}' bol úspešne načítaný.`);
  } catch (err) {
    console.error(err);
    alert('Neplatný formát OpenXML archívu. Uistite sa, že súbor nie je poškodený.');
  }
}

// -----------------------------------------------------------------------------
// Document Type Context Customization (Word vs PPTX vs Excel)
// -----------------------------------------------------------------------------
function applyDocumentTypeContext(type) {
  const root = document.documentElement;
  const wordFields = document.querySelectorAll('.doc-field-word');
  const pptxFields = document.querySelectorAll('.doc-field-pptx');
  const xlsxFields = document.querySelectorAll('.doc-field-xlsx');
  const wordActions = document.querySelectorAll('.doc-action-word-only');
  const pill = document.getElementById('bcDocTypePill');
  const navMetricsTitle = document.getElementById('navMetricsTitle');

  pill.style.display = 'inline-block';

  if (type === 'word') {
    root.style.setProperty('--doc-brand-color', '#2563eb');
    pill.textContent = 'WORD (DOCX)';
    pill.style.borderColor = '#2563eb';
    pill.style.color = '#3b82f6';
    navMetricsTitle.textContent = 'Surová metrika (Slová/Strany)';

    wordFields.forEach(el => el.style.display = 'flex');
    pptxFields.forEach(el => el.style.display = 'none');
    xlsxFields.forEach(el => el.style.display = 'none');
    wordActions.forEach(el => el.style.display = 'flex');

    // Sidebar metric labels
    document.getElementById('sideMetaMetric1Label').textContent = 'Počet slov';
    document.getElementById('sideMetaMetric2Label').textContent = 'Rozsah';

    // Simulator adjustments
    document.getElementById('simRowPages').style.display = 'table-row';
    document.getElementById('simRowWords').style.display = 'table-row';
    document.getElementById('simRowCharacters').style.display = 'table-row';
    document.getElementById('simRowLines').style.display = 'table-row';
    document.getElementById('simRowParagraphs').style.display = 'table-row';
    document.getElementById('simRowSlides').style.display = 'none';
    document.getElementById('simOfficeAppTitle').textContent = 'Microsoft Word > Informácie';
    document.getElementById('simOfficePagesLabel').textContent = 'Strany';
  } else if (type === 'pptx') {
    root.style.setProperty('--doc-brand-color', '#ea580c');
    pill.textContent = 'POWERPOINT (PPTX)';
    pill.style.borderColor = '#ea580c';
    pill.style.color = '#f97316';
    navMetricsTitle.textContent = 'Surová metrika (Snímky/Poznámky)';

    wordFields.forEach(el => el.style.display = 'none');
    pptxFields.forEach(el => el.style.display = 'flex');
    xlsxFields.forEach(el => el.style.display = 'none');
    wordActions.forEach(el => el.style.display = 'none');

    // Sidebar metric labels
    document.getElementById('sideMetaMetric1Label').textContent = 'Počet snímkov';
    document.getElementById('sideMetaMetric2Label').textContent = 'Poznámky';

    // Simulator adjustments
    document.getElementById('simRowPages').style.display = 'none';
    document.getElementById('simRowWords').style.display = 'none';
    document.getElementById('simRowCharacters').style.display = 'none';
    document.getElementById('simRowLines').style.display = 'none';
    document.getElementById('simRowParagraphs').style.display = 'none';
    document.getElementById('simRowSlides').style.display = 'table-row';
    document.getElementById('simOfficeAppTitle').textContent = 'Microsoft PowerPoint > Informácie';
    document.getElementById('simOfficePagesLabel').textContent = 'Snímky';
  } else if (type === 'xlsx') {
    root.style.setProperty('--doc-brand-color', '#16a34a');
    pill.textContent = 'EXCEL (XLSX)';
    pill.style.borderColor = '#16a34a';
    pill.style.color = '#22c55e';
    navMetricsTitle.textContent = 'Metrika a vlastnosti zošita';

    wordFields.forEach(el => el.style.display = 'none');
    pptxFields.forEach(el => el.style.display = 'none');
    xlsxFields.forEach(el => el.style.display = 'flex');
    wordActions.forEach(el => el.style.display = 'none');

    // Sidebar metric labels
    document.getElementById('sideMetaMetric1Label').textContent = 'Typ zošita';
    document.getElementById('sideMetaMetric1Val').textContent = 'Tabuľka (XLSX)';
    document.getElementById('sideMetaMetric2Label').textContent = 'Stav zošita';
    document.getElementById('sideMetaMetric2Val').textContent = 'Odomknutý';

    // Simulator adjustments
    document.getElementById('simRowPages').style.display = 'none';
    document.getElementById('simRowWords').style.display = 'none';
    document.getElementById('simRowCharacters').style.display = 'none';
    document.getElementById('simRowLines').style.display = 'none';
    document.getElementById('simRowParagraphs').style.display = 'none';
    document.getElementById('simRowSlides').style.display = 'none';
    document.getElementById('simOfficeAppTitle').textContent = 'Microsoft Excel > Informácie';
  }
}

function updateDocumentMetadataHeader() {
  const name = currentFileInfo.name;
  const size = currentFileInfo.size;
  const ext = name.split('.').pop().toLowerCase();

  document.getElementById('sideFileName').textContent = name;
  document.getElementById('sideFileName').title = currentFileInfo.path || name;
  document.getElementById('sideFileSize').textContent = `${formatBytes(size)} • OOXML`;
  document.getElementById('statusSize').textContent = formatBytes(size);
  document.getElementById('bcDocName').textContent = name;

  const badge = document.getElementById('sideTypeBadge');
  const typeLabel = document.getElementById('sideTypeLabel');
  badge.className = 'doc-type-icon';

  if (currentFileInfo.type === 'word') {
    badge.classList.add('type-word');
    badge.textContent = 'DOC';
    typeLabel.textContent = 'Microsoft Word';
    document.getElementById('packageFormat').textContent = 'WordprocessingML (DOCX)';
  } else if (currentFileInfo.type === 'pptx') {
    badge.classList.add('type-pptx');
    badge.textContent = 'PPT';
    typeLabel.textContent = 'Microsoft PowerPoint';
    document.getElementById('packageFormat').textContent = 'PresentationML (PPTX)';
  } else if (currentFileInfo.type === 'xlsx') {
    badge.classList.add('type-xlsx');
    badge.textContent = 'XLS';
    typeLabel.textContent = 'Microsoft Excel';
    document.getElementById('packageFormat').textContent = 'SpreadsheetML (XLSX)';
  } else {
    badge.classList.add('type-generic');
    badge.textContent = ext.toUpperCase().substring(0, 3);
    typeLabel.textContent = 'OpenXML Archív';
  }
}

// -----------------------------------------------------------------------------
// XML Parsing & Form Population
// -----------------------------------------------------------------------------
async function parseArchiveMetadata() {
  const parser = new DOMParser();

  // Core Properties (docProps/core.xml)
  const coreFile = currentZip.file('docProps/core.xml');
  if (coreFile) {
    const text = await coreFile.async('text');
    xmlDocs.core = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.core = parser.parseFromString(createBlankCoreXml(), 'application/xml');
  }

  // App Properties (docProps/app.xml) - The key file with words, pages, total time
  const appFile = currentZip.file('docProps/app.xml');
  if (appFile) {
    const text = await appFile.async('text');
    xmlDocs.app = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.app = parser.parseFromString(createBlankAppXml(), 'application/xml');
  }

  // Custom Properties (docProps/custom.xml)
  const customFile = currentZip.file('docProps/custom.xml');
  if (customFile) {
    const text = await customFile.async('text');
    xmlDocs.custom = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.custom = parser.parseFromString(createBlankCustomXml(), 'application/xml');
  }

  populateForm();
}

function populateForm() {
  // Core
  setVal('fCreator', getTagValue(xmlDocs.core, 'creator'));
  setVal('fLastModifiedBy', getTagValue(xmlDocs.core, 'lastModifiedBy'));
  setVal('fTitle', getTagValue(xmlDocs.core, 'title'));
  setVal('fSubject', getTagValue(xmlDocs.core, 'subject'));
  setVal('fKeywords', getTagValue(xmlDocs.core, 'keywords'));
  setVal('fCategory', getTagValue(xmlDocs.core, 'category'));
  setVal('fContentStatus', getTagValue(xmlDocs.core, 'contentStatus'));
  setVal('fDescription', getTagValue(xmlDocs.core, 'description'));
  
  const rev = getTagValue(xmlDocs.core, 'revision') || '1';
  setVal('fRevision', rev);
  animateMetricText('sideMetaRev', `Rev. ${rev}`);

  // Dates
  setVal('fCreated', isoToDatetimeLocal(getTagValue(xmlDocs.core, 'created')));
  setVal('fModified', isoToDatetimeLocal(getTagValue(xmlDocs.core, 'modified')));

  // App (Total Time)
  const totalMin = parseInt(getTagValue(xmlDocs.app, 'TotalTime') || '0', 10);
  setTotalMinutes(totalMin, false);

  // App (Raw Metrics from docProps/app.xml)
  const pages = getTagValue(xmlDocs.app, 'Pages') || '0';
  const words = getTagValue(xmlDocs.app, 'Words') || '0';
  const slides = getTagValue(xmlDocs.app, 'Slides') || '0';
  const notes = getTagValue(xmlDocs.app, 'Notes') || '0';
  const hiddenSlides = getTagValue(xmlDocs.app, 'HiddenSlides') || '0';

  setVal('fWords', words);
  setVal('fPages', pages);
  setVal('fCharacters', getTagValue(xmlDocs.app, 'Characters'));
  setVal('fCharactersWithSpaces', getTagValue(xmlDocs.app, 'CharactersWithSpaces'));
  setVal('fParagraphs', getTagValue(xmlDocs.app, 'Paragraphs'));
  setVal('fLines', getTagValue(xmlDocs.app, 'Lines'));
  setVal('fSlides', slides);
  setVal('fNotes', notes);
  setVal('fHiddenSlides', hiddenSlides);

  setVal('fCompany', getTagValue(xmlDocs.app, 'Company'));
  setVal('fManager', getTagValue(xmlDocs.app, 'Manager'));
  setVal('fTemplate', getTagValue(xmlDocs.app, 'Template'));
  setVal('fApplication', getTagValue(xmlDocs.app, 'Application'));
  setVal('fAppVersion', getTagValue(xmlDocs.app, 'AppVersion'));

  // Update Sidebar Metrics with animation
  if (currentFileInfo.type === 'pptx') {
    animateMetricText('sideMetaMetric1Val', `${slides} snímkov`);
    animateMetricText('sideMetaMetric2Val', `${notes} pozn.`);
  } else if (currentFileInfo.type === 'word') {
    animateMetricText('sideMetaMetric1Val', Number(words).toLocaleString());
    animateMetricText('sideMetaMetric2Val', `${pages} strán`);
  } else if (currentFileInfo.type === 'xlsx') {
    animateMetricText('sideMetaMetric1Val', 'Tabuľka (XLSX)');
    animateMetricText('sideMetaMetric2Val', 'Odomknutý');
  }

  // Custom properties
  renderCustomPropertiesTable();
}

function syncFormToXmlDocs() {
  // Core
  setTagValue(xmlDocs.core, 'creator', 'dc:creator', getVal('fCreator'));
  setTagValue(xmlDocs.core, 'lastModifiedBy', 'cp:lastModifiedBy', getVal('fLastModifiedBy'));
  setTagValue(xmlDocs.core, 'title', 'dc:title', getVal('fTitle'));
  setTagValue(xmlDocs.core, 'subject', 'dc:subject', getVal('fSubject'));
  setTagValue(xmlDocs.core, 'keywords', 'cp:keywords', getVal('fKeywords'));
  setTagValue(xmlDocs.core, 'category', 'cp:category', getVal('fCategory'));
  setTagValue(xmlDocs.core, 'contentStatus', 'cp:contentStatus', getVal('fContentStatus'));
  setTagValue(xmlDocs.core, 'description', 'dc:description', getVal('fDescription'));
  setTagValue(xmlDocs.core, 'revision', 'cp:revision', getVal('fRevision'));

  const createdVal = getVal('fCreated');
  if (createdVal) setTagValue(xmlDocs.core, 'created', 'dcterms:created', datetimeLocalToIso(createdVal));

  const modifiedVal = getVal('fModified');
  if (modifiedVal) setTagValue(xmlDocs.core, 'modified', 'dcterms:modified', datetimeLocalToIso(modifiedVal));

  // App (docProps/app.xml)
  setTagValue(xmlDocs.app, 'TotalTime', 'TotalTime', getVal('fTotalTimeExact'));
  setTagValue(xmlDocs.app, 'Words', 'Words', getVal('fWords'));
  setTagValue(xmlDocs.app, 'Pages', 'Pages', getVal('fPages'));
  setTagValue(xmlDocs.app, 'Characters', 'Characters', getVal('fCharacters'));
  setTagValue(xmlDocs.app, 'CharactersWithSpaces', 'CharactersWithSpaces', getVal('fCharactersWithSpaces'));
  setTagValue(xmlDocs.app, 'Paragraphs', 'Paragraphs', getVal('fParagraphs'));
  setTagValue(xmlDocs.app, 'Lines', 'Lines', getVal('fLines'));
  setTagValue(xmlDocs.app, 'Slides', 'Slides', getVal('fSlides'));
  setTagValue(xmlDocs.app, 'Notes', 'Notes', getVal('fNotes'));
  setTagValue(xmlDocs.app, 'HiddenSlides', 'HiddenSlides', getVal('fHiddenSlides'));

  setTagValue(xmlDocs.app, 'Company', 'Company', getVal('fCompany'));
  setTagValue(xmlDocs.app, 'Manager', 'Manager', getVal('fManager'));
  setTagValue(xmlDocs.app, 'Template', 'Template', getVal('fTemplate'));
  setTagValue(xmlDocs.app, 'Application', 'Application', getVal('fApplication'));
  setTagValue(xmlDocs.app, 'AppVersion', 'AppVersion', getVal('fAppVersion'));

  // Update Sidebar Metrics in real time
  const sideRevEl = document.getElementById('sideMetaRev');
  if (sideRevEl) sideRevEl.textContent = `Rev. ${getVal('fRevision') || '1'}`;
  
  const m1 = document.getElementById('sideMetaMetric1Val');
  const m2 = document.getElementById('sideMetaMetric2Val');
  if (currentFileInfo.type === 'pptx') {
    if (m1) m1.textContent = `${getVal('fSlides') || 0} snímkov`;
    if (m2) m2.textContent = `${getVal('fNotes') || 0} pozn.`;
  } else if (currentFileInfo.type === 'word') {
    if (m1) m1.textContent = Number(getVal('fWords') || 0).toLocaleString();
    if (m2) m2.textContent = `${getVal('fPages') || 0} strán`;
  } else if (currentFileInfo.type === 'xlsx') {
    if (m1) m1.textContent = 'Tabuľka (XLSX)';
    if (m2) m2.textContent = 'Odomknutý';
  }

  updateDiffSummary();
  updateLiveSimulators();
}

// -----------------------------------------------------------------------------
// Total Time Logic with GSAP pulse
// -----------------------------------------------------------------------------
function setTotalMinutes(minutes, triggerSync = true) {
  const m = parseInt(minutes, 10) || 0;
  document.getElementById('fTotalTimeExact').value = m;
  document.getElementById('fTotalTimeRange').value = Math.min(m, 2400);
  document.getElementById('timingLargeDisplay').textContent = `${m} min`;
  document.getElementById('timingHumanConverted').textContent = `Zodpovedá: ${formatMinutesToHuman(m)}`;
  animateMetricText('sideMetaTime', formatMinutesToShort(m));

  if (triggerSync) {
    syncFormToXmlDocs();
    setStatus(false, 'Zmenené pole');
  }
}

function formatMinutesToHuman(m) {
  if (m <= 0) return '0 hodín 0 minút';
  const hours = Math.floor(m / 60);
  const remaining = m % 60;
  return `${hours} hodín ${remaining} minút`;
}

function formatMinutesToShort(m) {
  if (m <= 0) return '0m';
  const hours = Math.floor(m / 60);
  const remaining = m % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

// -----------------------------------------------------------------------------
// Steppers for Words, Pages, Slides with GSAP Micro-interaction
// -----------------------------------------------------------------------------
function stepWords(delta) {
  const el = document.getElementById('fWords');
  const current = parseInt(el.value || '0', 10);
  const next = Math.max(0, current + delta);
  el.value = next;
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Upravený počet slov');
}

function stepPages(delta) {
  const el = document.getElementById('fPages');
  const current = parseInt(el.value || '0', 10);
  const next = Math.max(0, current + delta);
  el.value = next;
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Upravený počet strán');
}

function stepSlides(delta) {
  const el = document.getElementById('fSlides');
  const current = parseInt(el.value || '0', 10);
  const next = Math.max(0, current + delta);
  el.value = next;
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Upravený počet snímkov');
}

function pulseElement(elem) {
  if (window.gsap) {
    gsap.fromTo(elem, 
      { scale: 1.05, borderColor: '#3b82f6' }, 
      { scale: 1, borderColor: '#202227', duration: 0.22, ease: 'back.out(2)' }
    );
  }
}

function animateMetricText(elementId, newText) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (el.textContent === newText) return;

  if (window.gsap) {
    gsap.to(el, {
      opacity: 0,
      y: -3,
      duration: 0.12,
      onComplete: () => {
        el.textContent = newText;
        gsap.to(el, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' });
      }
    });
  } else {
    el.textContent = newText;
  }
}
const animateBentoText = animateMetricText;

// -----------------------------------------------------------------------------
// Live Visual Simulators (Windows Explorer & Word/PowerPoint Info)
// -----------------------------------------------------------------------------
function updateLiveSimulators() {
  const snap = originalSnapshot;

  function setSim(id, currentVal, origKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = currentVal || '-';
    if (snap && snap[origKey] !== undefined && snap[origKey] !== currentVal) {
      el.classList.add('changed');
    } else {
      el.classList.remove('changed');
    }
  }

  // Windows Explorer Properties
  setSim('simTitle', getVal('fTitle'), 'title');
  setSim('simSubject', getVal('fSubject'), 'subject');
  setSim('simKeywords', getVal('fKeywords'), 'keywords');
  setSim('simCategory', getVal('fCategory'), 'category');
  setSim('simComments', getVal('fDescription'), 'description');

  setSim('simAuthors', getVal('fCreator'), 'creator');
  setSim('simLastAuthor', getVal('fLastModifiedBy'), 'lastModifiedBy');
  setSim('simRevision', getVal('fRevision'), 'revision');
  setSim('simProgram', `${getVal('fApplication')} ${getVal('fAppVersion')}`.trim(), 'app');
  setSim('simCompany', getVal('fCompany'), 'company');
  setSim('simManager', getVal('fManager'), 'manager');

  const totalMin = parseInt(getVal('fTotalTimeExact') || '0', 10);
  setSim('simTotalTime', `${totalMin} minút (${formatMinutesToShort(totalMin)})`, 'totalTime');
  setSim('simPages', getVal('fPages'), 'pages');
  setSim('simWords', Number(getVal('fWords') || 0).toLocaleString(), 'words');
  setSim('simSlides', getVal('fSlides'), 'slides');
  setSim('simCharacters', Number(getVal('fCharacters') || 0).toLocaleString(), 'characters');
  setSim('simLines', getVal('fLines'), 'lines');
  setSim('simParagraphs', getVal('fParagraphs'), 'paragraphs');

  setSim('simCreated', formatPrettyDate(getVal('fCreated')), 'created');
  setSim('simModified', formatPrettyDate(getVal('fModified')), 'modified');

  // Office Info Panel
  setSim('simWordSize', formatBytes(currentFileInfo.size), 'size');
  if (currentFileInfo.type === 'pptx') {
    setSim('simWordPages', `${getVal('fSlides') || 0} snímkov`, 'slides');
    setSim('simWordWords', `${getVal('fNotes') || 0} poznámok`, 'notes');
  } else {
    setSim('simWordPages', getVal('fPages'), 'pages');
    setSim('simWordWords', Number(getVal('fWords') || 0).toLocaleString(), 'words');
  }
  setSim('simWordTotalTime', `${totalMin} minút`, 'totalTime');
  setSim('simWordCreated', formatPrettyDate(getVal('fCreated')), 'created');
  setSim('simWordModified', formatPrettyDate(getVal('fModified')), 'modified');
  setSim('simWordAuthor', getVal('fCreator'), 'creator');
  setSim('simWordLastModified', getVal('fLastModifiedBy'), 'lastModifiedBy');
}

function formatPrettyDate(dateLocalStr) {
  if (!dateLocalStr) return '-';
  try {
    const d = new Date(dateLocalStr);
    return d.toLocaleString('sk-SK', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dateLocalStr;
  }
}

// -----------------------------------------------------------------------------
// Snapshot & Diff Tracking
// -----------------------------------------------------------------------------
function saveSnapshot() {
  originalSnapshot = {
    creator: getVal('fCreator'),
    lastModifiedBy: getVal('fLastModifiedBy'),
    title: getVal('fTitle'),
    subject: getVal('fSubject'),
    keywords: getVal('fKeywords'),
    category: getVal('fCategory'),
    contentStatus: getVal('fContentStatus'),
    description: getVal('fDescription'),
    revision: getVal('fRevision'),
    created: getVal('fCreated'),
    modified: getVal('fModified'),
    totalTime: getVal('fTotalTimeExact'),
    words: getVal('fWords'),
    pages: getVal('fPages'),
    slides: getVal('fSlides'),
    notes: getVal('fNotes'),
    characters: getVal('fCharacters'),
    charactersWithSpaces: getVal('fCharactersWithSpaces'),
    paragraphs: getVal('fParagraphs'),
    lines: getVal('fLines'),
    company: getVal('fCompany'),
    manager: getVal('fManager'),
    template: getVal('fTemplate'),
    app: getVal('fApplication'),
    appVersion: getVal('fAppVersion')
  };
}

function updateDiffSummary() {
  const fields = [
    { label: 'Autor (Creator)', key: 'creator', current: getVal('fCreator') },
    { label: 'Posledný editor', key: 'lastModifiedBy', current: getVal('fLastModifiedBy') },
    { label: 'Názov', key: 'title', current: getVal('fTitle') },
    { label: 'Predmet', key: 'subject', current: getVal('fSubject') },
    { label: 'Číslo revízie', key: 'revision', current: getVal('fRevision') },
    { label: 'Čas úprav (minúty)', key: 'totalTime', current: getVal('fTotalTimeExact') },
    { label: 'Počet slov', key: 'words', current: getVal('fWords') },
    { label: 'Počet strán', key: 'pages', current: getVal('fPages') },
    { label: 'Počet snímkov (PPTX)', key: 'slides', current: getVal('fSlides') },
    { label: 'Šablóna', key: 'template', current: getVal('fTemplate') },
    { label: 'Spoločnosť', key: 'company', current: getVal('fCompany') },
    { label: 'Dátum vytvorenia', key: 'created', current: getVal('fCreated') },
    { label: 'Dátum úpravy', key: 'modified', current: getVal('fModified') }
  ];

  const diffs = [];
  for (let f of fields) {
    const orig = originalSnapshot[f.key] || '';
    if (orig !== f.current) {
      diffs.push({
        label: f.label,
        orig: orig || '(prázdne)',
        current: f.current || '(vymazané)'
      });
    }
  }

  const badge = document.getElementById('diffCounter');
  if (badge) badge.textContent = diffs.length;

  const tbody = document.getElementById('diffTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (diffs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-tertiary); padding: 12px;">Žiadne zmeny oproti pôvodnému súboru.</td></tr>`;
    return;
  }

  for (let d of diffs) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.label)}</strong></td>
      <td style="color: var(--text-tertiary); text-decoration: line-through;">${escapeHtml(d.orig)}</td>
      <td style="color: var(--text-accent); font-weight: 600;">${escapeHtml(d.current)}</td>
      <td><span class="diff-badge modified">ZMENA</span></td>
    `;
    tbody.appendChild(tr);
  }
}

// -----------------------------------------------------------------------------
// Universal Archive Browser & Raw XML Editor
// -----------------------------------------------------------------------------
function populateArchiveDropdown() {
  const select = document.getElementById('xmlArchiveFileSelect');
  select.innerHTML = '';

  if (!currentZip) return;

  const files = Object.keys(currentZip.files).filter(name => !currentZip.files[name].dir);
  
  files.sort((a, b) => {
    if (a.startsWith('docProps/') && !b.startsWith('docProps/')) return -1;
    if (!a.startsWith('docProps/') && b.startsWith('docProps/')) return 1;
    return a.localeCompare(b);
  });

  for (let path of files) {
    const opt = document.createElement('option');
    opt.value = path;
    opt.textContent = path;
    if (path === 'docProps/core.xml') opt.selected = true;
    select.appendChild(opt);
  }

  activeArchiveFile = select.value || 'docProps/core.xml';
}

async function loadArchiveFileIntoEditor(path) {
  activeArchiveFile = path;
  const editor = document.getElementById('xmlCodeEditor');
  
  const serializer = new XMLSerializer();
  let text = '';

  if (path === 'docProps/core.xml' && xmlDocs.core) {
    text = serializer.serializeToString(xmlDocs.core);
  } else if (path === 'docProps/app.xml' && xmlDocs.app) {
    text = serializer.serializeToString(xmlDocs.app);
  } else if (path === 'docProps/custom.xml' && xmlDocs.custom) {
    text = serializer.serializeToString(xmlDocs.custom);
  } else if (currentZip && currentZip.file(path)) {
    text = await currentZip.file(path).async('text');
  } else {
    text = `<!-- Súbor ${path} v archíve neexistuje -->`;
  }

  editor.value = formatXml(text);
  document.getElementById('xmlStatusNotice').textContent = 'Syntax: Valid';
  document.getElementById('xmlStatusNotice').style.color = '#22c55e';
}

async function applyArchiveCodeChanges() {
  const code = document.getElementById('xmlCodeEditor').value.trim();
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, 'application/xml');

  const error = doc.querySelector('parsererror');
  if (error) {
    document.getElementById('xmlStatusNotice').textContent = 'Syntax: Chyba parsovania!';
    document.getElementById('xmlStatusNotice').style.color = '#ef4444';
    alert('Chyba XML syntaxe:\n' + error.textContent);
    return;
  }

  document.getElementById('xmlStatusNotice').textContent = 'Syntax: Valid & Uložené';
  document.getElementById('xmlStatusNotice').style.color = '#22c55e';

  if (activeArchiveFile === 'docProps/core.xml') {
    xmlDocs.core = doc;
    populateForm();
  } else if (activeArchiveFile === 'docProps/app.xml') {
    xmlDocs.app = doc;
    populateForm();
  } else if (activeArchiveFile === 'docProps/custom.xml') {
    xmlDocs.custom = doc;
    populateForm();
  } else if (currentZip) {
    currentZip.file(activeArchiveFile, code);
  }

  syncFormToXmlDocs();
  setStatus(false, 'Zmeny aplikované');
  showToastNotice(`Zmeny v '${activeArchiveFile}' boli uložené do balíka.`);
}

// -----------------------------------------------------------------------------
// Custom Properties
// -----------------------------------------------------------------------------
function renderCustomPropertiesTable() {
  const tbody = document.getElementById('customPropsTableBody');
  tbody.innerHTML = '';

  if (!xmlDocs.custom) return;

  const props = xmlDocs.custom.getElementsByTagName('property');
  if (props.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-tertiary); padding: 20px;">Žiadne vlastné atribúty.</td></tr>`;
    return;
  }

  for (let p of props) {
    const name = p.getAttribute('name') || 'Atribút';
    const val = p.textContent.trim();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="font-weight: 600; font-family: var(--font-mono); font-size: 11px;">${escapeHtml(name)}</span></td>
      <td><input type="text" class="input-field prop-inline-edit" data-name="${escapeHtml(name)}" value="${escapeHtml(val)}"></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="removeCustomProperty('${escapeHtml(name)}')">Zmazať</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.querySelectorAll('.prop-inline-edit').forEach(input => {
    input.addEventListener('input', (e) => {
      const propName = e.target.getAttribute('data-name');
      updateCustomPropValue(propName, e.target.value);
    });
  });
}

function updateCustomPropValue(name, val) {
  const props = xmlDocs.custom.getElementsByTagName('property');
  for (let p of props) {
    if (p.getAttribute('name') === name) {
      if (p.firstElementChild) {
        p.firstElementChild.textContent = val;
      } else {
        p.textContent = val;
      }
      setStatus(false, 'Zmenený atribút');
      break;
    }
  }
}

function removeCustomProperty(name) {
  const props = xmlDocs.custom.getElementsByTagName('property');
  for (let p of props) {
    if (p.getAttribute('name') === name) {
      p.parentNode.removeChild(p);
      renderCustomPropertiesTable();
      setStatus(false, 'Odstránený atribút');
      showToastNotice(`Atribút '${name}' bol zmazaný.`);
      break;
    }
  }
}

function addNewCustomProperty() {
  const nameInput = document.getElementById('newPropName');
  const valInput = document.getElementById('newPropValue');
  const name = nameInput.value.trim();
  const val = valInput.value.trim();

  if (!name) return;

  const root = xmlDocs.custom.documentElement;
  const existing = xmlDocs.custom.getElementsByTagName('property');
  let maxPid = 1;
  for (let p of existing) {
    const pid = parseInt(p.getAttribute('pid') || '1', 10);
    if (pid > maxPid) maxPid = pid;
  }

  const prop = xmlDocs.custom.createElement('property');
  prop.setAttribute('fmtid', '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}');
  prop.setAttribute('pid', String(maxPid + 1));
  prop.setAttribute('name', name);

  const lpwstr = xmlDocs.custom.createElement('vt:lpwstr');
  lpwstr.textContent = val;
  prop.appendChild(lpwstr);

  root.appendChild(prop);
  renderCustomPropertiesTable();
  nameInput.value = '';
  valInput.value = '';
  setStatus(false, 'Pridaný atribút');
  showToastNotice(`Atribút '${name}' pridaný.`);
}

// -----------------------------------------------------------------------------
// Quick Actions
// -----------------------------------------------------------------------------
function actionSanitize() {
  setVal('fCreator', '');
  setVal('fLastModifiedBy', '');
  setVal('fCompany', '');
  setVal('fManager', '');
  setVal('fTemplate', 'Normal.dotm');
  setVal('fDescription', '');
  syncFormToXmlDocs();
  setStatus(false, 'Anonymizované');
  showToastNotice('Osobné stopy (autor, editor, firma, cesta šablóny) boli vymazané.');
}

function actionSyncDates() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const formatted = now.toISOString().slice(0, 16);
  setVal('fCreated', formatted);
  setVal('fModified', formatted);
  syncFormToXmlDocs();
  setStatus(false, 'Zosúladené dátumy');
  showToastNotice('Dátumy vytvorenia a úpravy boli synchronizované.');
}

function actionClearTemplate() {
  setVal('fTemplate', 'Normal.dotm');
  syncFormToXmlDocs();
  setStatus(false, 'Šablóna očistená');
  showToastNotice('Cesta k šablóne zresetovaná na generický Normal.dotm.');
}

// -----------------------------------------------------------------------------
// Export & Save File
// -----------------------------------------------------------------------------
async function exportModifiedPackage() {
  if (!currentZip) return;

  syncFormToXmlDocs();

  const serializer = new XMLSerializer();

  if (xmlDocs.core) {
    const s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + serializer.serializeToString(xmlDocs.core);
    currentZip.file('docProps/core.xml', s);
  }

  if (xmlDocs.app) {
    const s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + serializer.serializeToString(xmlDocs.app);
    currentZip.file('docProps/app.xml', s);
  }

  if (xmlDocs.custom) {
    const s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + serializer.serializeToString(xmlDocs.custom);
    currentZip.file('docProps/custom.xml', s);
  }

  const origName = currentFileInfo.name || 'dokument.docx';
  const dotIdx = origName.lastIndexOf('.');
  const base = dotIdx !== -1 ? origName.substring(0, dotIdx) : origName;
  const ext = dotIdx !== -1 ? origName.substring(dotIdx) : '';
  const exportName = `${base}_upravene${ext}`;

  const blob = await currentZip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  if (window.electronAPI) {
    const arrayBuf = await blob.arrayBuffer();
    const result = await window.electronAPI.saveFileDialog(exportName, Array.from(new Uint8Array(arrayBuf)));
    if (result && result.success) {
      saveSnapshot();
      updateDiffSummary();
      updateLiveSimulators();
      setStatus(true, 'Uložené na disk');
      showToastNotice(`Súbor bol úspešne uložený: ${result.savedPath}`);
    }
  } else {
    // Browser fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    saveSnapshot();
    updateDiffSummary();
    updateLiveSimulators();
    setStatus(true, 'Stiahnuté');
    showToastNotice(`Súbor '${exportName}' bol vyexportovaný.`);
  }
}

// -----------------------------------------------------------------------------
// Interactive Events & Helpers
// -----------------------------------------------------------------------------
function initEvents() {
  document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('input', () => {
      syncFormToXmlDocs();
      setStatus(false, 'Máte neuložené zmeny');
    });
  });

  document.getElementById('fTotalTimeRange').addEventListener('input', (e) => {
    setTotalMinutes(e.target.value);
  });

  document.getElementById('fTotalTimeExact').addEventListener('input', (e) => {
    setTotalMinutes(e.target.value);
  });

  document.getElementById('btnActionAnonymize').addEventListener('click', actionSanitize);
  document.getElementById('btnActionSyncDates').addEventListener('click', actionSyncDates);
  document.getElementById('btnActionClearTemplate').addEventListener('click', actionClearTemplate);

  document.getElementById('btnExportPrimary').addEventListener('click', exportModifiedPackage);
  document.getElementById('btnOpenFileSecondary').addEventListener('click', () => {
    document.getElementById('systemFileInput').click();
  });

  document.getElementById('btnToggleDiff').addEventListener('click', () => {
    const d = document.getElementById('diffContainer');
    const isShowing = d.style.display !== 'none';
    d.style.display = isShowing ? 'none' : 'block';
    if (!isShowing && window.gsap) {
      gsap.fromTo(d, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    }
  });

  document.getElementById('btnCloseDiff').addEventListener('click', () => {
    document.getElementById('diffContainer').style.display = 'none';
  });

  document.getElementById('btnAddNewProp').addEventListener('click', addNewCustomProperty);

  document.getElementById('xmlArchiveFileSelect').addEventListener('change', (e) => {
    loadArchiveFileIntoEditor(e.target.value);
  });

  document.getElementById('btnPrettifyXmlCode').addEventListener('click', () => {
    const editor = document.getElementById('xmlCodeEditor');
    editor.value = formatXml(editor.value);
    showToastNotice('XML kód bol naformátovaný.');
  });

  document.getElementById('btnApplyXmlCode').addEventListener('click', applyArchiveCodeChanges);

  document.getElementById('btnLoadSample').addEventListener('click', loadSamplePackage);
}

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      exportModifiedPackage();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      document.getElementById('systemFileInput').click();
    }
  });
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------
function setStatus(isClean, text) {
  const bullet = document.getElementById('statusBullet');
  const txt = document.getElementById('statusText');
  if (isClean) {
    bullet.className = 'status-bullet';
    txt.textContent = text || 'Pripravené';
  } else {
    bullet.className = 'status-bullet unsaved';
    txt.textContent = text || 'Máte neuložené zmeny';
  }
}

function showToastNotice(msg) {
  const toast = document.getElementById('toastNotice');
  const text = document.getElementById('toastNoticeText');
  text.textContent = msg;
  toast.classList.add('show');
  if (window.gsap) {
    gsap.fromTo(toast, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' });
  }
  setTimeout(() => {
    if (window.gsap) {
      gsap.to(toast, { opacity: 0, y: 8, duration: 0.2, onComplete: () => toast.classList.remove('show') });
    } else {
      toast.classList.remove('show');
    }
  }, 3200);
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function getTagValue(doc, tagName) {
  if (!doc) return '';
  const elements = doc.getElementsByTagName('*');
  for (let el of elements) {
    if (el.localName === tagName || el.tagName === tagName || el.tagName.endsWith(':' + tagName)) {
      return el.textContent || '';
    }
  }
  return '';
}

function setTagValue(doc, tagName, defaultQualifiedName, value) {
  if (!doc) return;
  const root = doc.documentElement;
  const elements = doc.getElementsByTagName('*');
  let target = null;
  for (let el of elements) {
    if (el.localName === tagName || el.tagName === tagName || el.tagName.endsWith(':' + tagName)) {
      target = el;
      break;
    }
  }

  if (value === '' || value === null || value === undefined) {
    if (target) target.parentNode.removeChild(target);
    return;
  }

  if (target) {
    target.textContent = value;
  } else {
    const newEl = doc.createElement(defaultQualifiedName);
    newEl.textContent = value;
    if (defaultQualifiedName.startsWith('dcterms:')) {
      newEl.setAttribute('xsi:type', 'dcterms:W3CDTF');
    }
    root.appendChild(newEl);
  }
}

function isoToDatetimeLocal(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function datetimeLocalToIso(localStr) {
  if (!localStr) return '';
  try {
    const d = new Date(localStr);
    return d.toISOString();
  } catch {
    return '';
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatXml(xml) {
  let formatted = '';
  let reg = /(>)(<)(\/*)/g;
  xml = xml.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach(node => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 1;
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }

    let padding = '';
    for (let i = 0; i < pad; i++) padding += '  ';

    formatted += padding + node + '\r\n';
    pad += indent;
  });
  return formatted.trim();
}

function createBlankCoreXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="${NS.cp}" xmlns:dc="${NS.dc}" xmlns:dcterms="${NS.dcterms}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
</cp:coreProperties>`;
}

function createBlankAppXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS.ep}" xmlns:vt="${NS.vt}">
</Properties>`;
}

function createBlankCustomXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS.cust}" xmlns:vt="${NS.vt}">
</Properties>`;
}

async function loadSamplePackage() {
  const sampleZip = new JSZip();

  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" 
                   xmlns:dc="http://purl.org/dc/elements/1.1/" 
                   xmlns:dcterms="http://purl.org/dc/terms/" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>Diplomová práca - Analýza trhových anomálií</dc:title>
    <dc:subject>Aplikovaná ekonometria</dc:subject>
    <dc:creator>Ján Novák</dc:creator>
    <cp:keywords>financie, investície, analýza, modelovanie</cp:keywords>
    <dc:description>Záverečný dokument pre interné hodnotenie.</dc:description>
    <cp:lastModifiedBy>Peter Vedúci</cp:lastModifiedBy>
    <cp:revision>28</cp:revision>
    <dcterms:created xsi:type="dcterms:W3CDTF">2025-11-10T09:15:00Z</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">2026-02-28T16:45:00Z</dcterms:modified>
    <cp:category>Záverečné práce</cp:category>
    <cp:contentStatus>Finálna verzia</cp:contentStatus>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Template>C:\\Users\\Author\\Templates\\Normal.dotm</Template>
    <TotalTime>580</TotalTime>
    <Pages>52</Pages>
    <Words>15420</Words>
    <Characters>94300</Characters>
    <Application>Microsoft Office Word</Application>
    <DocSecurity>0</DocSecurity>
    <Lines>1580</Lines>
    <Paragraphs>460</Paragraphs>
    <ScaleCrop>false</ScaleCrop>
    <Company>Technická Univerzita</Company>
    <Manager>Prof. Ing. Martin Kováč, DrSc.</Manager>
    <CharactersWithSpaces>112400</CharactersWithSpaces>
    <AppVersion>16.0000</AppVersion>
</Properties>`;

  const customXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="ID Projektu"><vt:lpwstr>PRJ-2026-09</vt:lpwstr></property>
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="Dôvernosť"><vt:lpwstr>Interné</vt:lpwstr></property>
</Properties>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    <Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>`;

  sampleZip.file('[Content_Types].xml', contentTypes);
  sampleZip.file('docProps/core.xml', coreXml);
  sampleZip.file('docProps/app.xml', appXml);
  sampleZip.file('docProps/custom.xml', customXml);

  const blob = await sampleZip.generateAsync({ type: 'blob' });
  const buf = await blob.arrayBuffer();

  loadFromBinaryBuffer(buf, 'Vzorova_diplomovka.docx', buf.byteLength, 'samples/Vzorova_diplomovka.docx');
}
