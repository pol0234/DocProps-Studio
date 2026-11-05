// -----------------------------------------------------------------------------
// DocProps Studio - Craft Web Design & OpenXML Engine
// 100% Free / Open-Source, Zero-Cost Guaranteed
// -----------------------------------------------------------------------------

// Active State
let currentZip = null;
let currentFileInfo = {
  name: '',
  size: 0,
  path: '',
  type: 'word' // word | pptx | xlsx | generic
};

let originalSnapshot = {};
let xmlDocs = {
  core: null,
  app: null,
  custom: null
};

// Namespaces standard
const NS = {
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  ep: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  custom: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
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
  initAmbientHeroCanvas();
});

// -----------------------------------------------------------------------------
// Electron Bridge Integration
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
  if (window.electronAPI && window.electronAPI.setTheme) {
    window.electronAPI.setTheme(savedTheme);
  }

  document.getElementById('btnThemeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('docprops-theme', next);
    updateThemeIcon(next);
    if (window.electronAPI && window.electronAPI.setTheme) {
      window.electronAPI.setTheme(next);
    }
  });
}

function updateThemeIcon(theme) {
  const svg = document.getElementById('themeSvg');
  if (!svg) return;
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
      <line x1="19.78" y1="19.78" x2="18.36" y2="18.36"></line>
    `;
  }
}

// -----------------------------------------------------------------------------
// Horizon Navigation Tabs
// -----------------------------------------------------------------------------
function initNavigation() {
  const navTabs = document.querySelectorAll('.horizon-nav-tabs .nav-tab-btn');
  const sections = document.querySelectorAll('.form-section');

  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-section');
      
      navTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      sections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === targetId) {
          sec.classList.add('active');
          if (window.gsap) {
            gsap.fromTo(sec, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
          }
        }
      });
    });
  });
}

// -----------------------------------------------------------------------------
// Ambient Canvas (Empty State)
// -----------------------------------------------------------------------------
let ambientCanvasAnimationId = null;
let ambientCanvasRunning = false;

function initAmbientHeroCanvas() {
  const canvas = document.getElementById('ambientDropCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
  let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

  window.addEventListener('resize', () => {
    if (!ambientCanvasRunning) return;
    width = canvas.width = canvas.offsetWidth || window.innerWidth;
    height = canvas.height = canvas.offsetHeight || window.innerHeight;
  });

  const numParticles = 40;
  const colors = [
    'rgba(59, 130, 246, 0.45)', // Word Cobalt
    'rgba(16, 185, 129, 0.40)', // Excel Emerald
    'rgba(249, 115, 22, 0.40)'  // PowerPoint Amber
  ];

  const particles = [];
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.8 + 1,
      color: colors[i % colors.length]
    });
  }

  let mouse = { x: -999, y: -999 };
  const dropzoneView = document.getElementById('viewEmptyState');
  if (dropzoneView) {
    dropzoneView.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    dropzoneView.addEventListener('mouseleave', () => {
      mouse.x = -999;
      mouse.y = -999;
    });
  }

  function render() {
    if (!ambientCanvasRunning) return;
    ctx.clearRect(0, 0, width, height);

    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';

    for (let i = 0; i < numParticles; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Mouse repulsion
      if (mouse.x > 0) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          p.x += (dx / dist) * force * 1.2;
          p.y += (dy / dist) * force * 1.2;
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Constellation lines
      for (let j = i + 1; j < numParticles; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isLightMode
            ? `rgba(15, 23, 42, ${0.06 * (1 - dist / 90)})`
            : `rgba(255, 255, 255, ${0.05 * (1 - dist / 90)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    ambientCanvasAnimationId = requestAnimationFrame(render);
  }

  ambientCanvasRunning = true;
  render();
}

function stopAmbientHeroCanvas() {
  ambientCanvasRunning = false;
  if (ambientCanvasAnimationId) {
    cancelAnimationFrame(ambientCanvasAnimationId);
    ambientCanvasAnimationId = null;
  }
}

// -----------------------------------------------------------------------------
// Drag & Drop & File Input
// -----------------------------------------------------------------------------
function initDragAndDrop() {
  const dropzoneBox = document.getElementById('dropzoneBox');
  const fileInput = document.getElementById('systemFileInput');
  const btnBrowseHero = document.getElementById('btnBrowseHero');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnOpenSampleHero = document.getElementById('btnOpenSampleHero');

  if (dropzoneBox) {
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
  }

  if (btnBrowseHero) {
    btnBrowseHero.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.electronAPI) {
        const fileData = await window.electronAPI.openFileDialog();
        if (fileData) {
          loadFromBinaryBuffer(fileData.buffer, fileData.fileName, fileData.fileSize, fileData.filePath);
        }
      } else {
        fileInput.click();
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadFile(e.target.files[0]);
      }
    });
  }

  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', loadSampleDiplomovka);
  }
  if (btnOpenSampleHero) {
    btnOpenSampleHero.addEventListener('click', (e) => {
      e.stopPropagation();
      loadSampleDiplomovka();
    });
  }

  ['dragenter', 'dragover'].forEach(ev => {
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      if (dropzoneBox) dropzoneBox.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      if (dropzoneBox) dropzoneBox.classList.remove('dragover');
    });
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
    }
  });

  // Spotlight mouse effect on cards
  document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.spotlight-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

async function loadFile(file) {
  try {
    if (window.electronAPI && file.path) {
      const fileData = await window.electronAPI.readFromPath(file.path);
      if (fileData && fileData.buffer) {
        await loadFromBinaryBuffer(fileData.buffer, fileData.fileName, fileData.fileSize, fileData.filePath);
        return;
      }
    }
    const arrayBuffer = await file.arrayBuffer();
    await loadFromBinaryBuffer(arrayBuffer, file.name, file.size, file.path || file.name);
  } catch (err) {
    console.error('Chyba načítania:', err);
    alert('Nepodarilo sa načítať súbor:\n' + (err.message || err));
  }
}

// -----------------------------------------------------------------------------
// Core Engine: Load Archive & Parse XML
// -----------------------------------------------------------------------------
async function loadFromBinaryBuffer(buffer, fileName, fileSize, filePath) {
  try {
    const ext = (fileName || '').split('.').pop().toLowerCase();

    if (['doc', 'xls', 'ppt'].includes(ext)) {
      alert(`Súbor "${fileName}" je v starom binárnom formáte Office (.${ext}).\n\nDocProps Studio vyžaduje moderné OpenXML balíky (.docx, .xlsx, .pptx). Otvorte súbor v Microsofte Office a zvoľte "Uložiť ako" vo formáte .${ext}x.`);
      return;
    }

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
      path: filePath || '',
      type: docType
    };

    // Buffer normalization to Uint8Array
    let zipInput = buffer;
    if (Array.isArray(buffer)) {
      zipInput = new Uint8Array(buffer);
    } else if (buffer && buffer.data && Array.isArray(buffer.data)) {
      zipInput = new Uint8Array(buffer.data);
    } else if (buffer instanceof ArrayBuffer) {
      zipInput = new Uint8Array(buffer);
    } else if (buffer && buffer.buffer && buffer.buffer instanceof ArrayBuffer) {
      zipInput = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }

    currentZip = await JSZip.loadAsync(zipInput);
    await parseArchiveMetadata();
    populateArchiveDropdown();

    // Hide Empty Dropzone, Show Active Workspace
    stopAmbientHeroCanvas();
    document.getElementById('viewEmptyState').style.display = 'none';
    document.getElementById('viewWorkspace').style.display = 'flex';
    document.getElementById('docFileCapsule').style.display = 'flex';
    document.getElementById('horizonNavTabs').style.display = 'flex';
    document.getElementById('workspaceHeaderActions').style.display = 'flex';

    // Adapt layout to Document Type
    applyDocumentTypeContext(docType);
    updateDocumentMetadataHeader();

    // Snapshot for Diff calculation
    saveSnapshot();
    updateDiffSummary();
    updateLiveSimulators();

    // GSAP Intro
    if (window.gsap) {
      gsap.from('#docSummaryBanner', { opacity: 0, y: -8, duration: 0.25, ease: 'power2.out' });
      const activeCards = document.querySelectorAll('.form-section.active .bento-card, .form-section.active .sim-preview-window, .form-section.active .xml-editor-canvas');
      if (activeCards.length > 0) {
        gsap.from(activeCards, { opacity: 0, y: 12, stagger: 0.03, duration: 0.3, ease: 'power2.out' });
      }
    }

    setStatus(true, 'Dokument pripravený');
    showToastNotice(`Dokument '${fileName}' bol úspešne otvorený.`);
  } catch (err) {
    console.error('Chyba OpenXML:', err);
    alert('Neplatný formát OpenXML archívu alebo poškodený súbor:\n' + (err.message || err));
  }
}

// -----------------------------------------------------------------------------
// Document Context Adaptation
// -----------------------------------------------------------------------------
function applyDocumentTypeContext(type) {
  // Set global document format theme attribute (Word = blue, Excel = green, PowerPoint = red)
  document.documentElement.setAttribute('data-doc-type', type);

  const wordFields = document.querySelectorAll('.doc-field-word');
  const pptxFields = document.querySelectorAll('.doc-field-pptx');
  const wordActions = document.querySelectorAll('.doc-action-word-only');
  const navMetricsTitle = document.getElementById('navMetricsTitle');
  const secMetricsHeaderTitle = document.getElementById('secMetricsHeaderTitle');
  const sumScopeLabel = document.getElementById('sumScopeLabel');
  const sumRevWrap = document.getElementById('sumRevWrap');

  // Dynamic Brand Adaptation (Logo, Title, Theme Accents)
  const brandName = document.getElementById('brandName');
  const brandTag = document.getElementById('brandTag');
  const brandBadgeBox = document.getElementById('brandBadgeBox');
  const brandIconDoc = document.getElementById('brandIconDoc');
  const brandIconExcel = document.getElementById('brandIconExcel');
  const brandIconPpt = document.getElementById('brandIconPpt');

  if (type === 'word') {
    if (brandName) { brandName.innerHTML = '<span class="brand-prefix">Doc</span><span class="brand-suffix">Props</span>'; brandName.className = 'brand-name'; }
    if (brandTag) {
      brandTag.textContent = 'DOCX';
      brandTag.className = 'brand-tag';
    }
    if (brandBadgeBox) brandBadgeBox.className = 'brand-badge-box';
    if (brandIconDoc) brandIconDoc.style.display = 'block';
    if (brandIconExcel) brandIconExcel.style.display = 'none';
    if (brandIconPpt) brandIconPpt.style.display = 'none';

    document.title = `DocProps Studio - ${currentFileInfo.name || 'Dokument.docx'}`;

    if (navMetricsTitle) navMetricsTitle.textContent = 'Metrika obsahu';
    if (secMetricsHeaderTitle) secMetricsHeaderTitle.textContent = 'Metrika obsahu & Počítadlá (Word)';
    if (sumScopeLabel) sumScopeLabel.textContent = 'ROZSAH OBSAHU';
    if (sumRevWrap) sumRevWrap.style.display = 'flex';

    wordFields.forEach(el => el.style.display = 'flex');
    pptxFields.forEach(el => el.style.display = 'none');
    wordActions.forEach(el => el.style.display = 'inline-flex');

    // Simulator adjustments
    document.getElementById('simRowPages').style.display = 'table-row';
    document.getElementById('simRowWords').style.display = 'table-row';
    document.getElementById('simRowCharacters').style.display = 'table-row';
    document.getElementById('simRowLines').style.display = 'table-row';
    document.getElementById('simRowParagraphs').style.display = 'table-row';
    document.getElementById('simRowSlides').style.display = 'none';
    document.getElementById('simOfficeAppTitle').textContent = 'Microsoft Word > Informácie';
    document.getElementById('simOfficePagesRow').style.display = 'table-row';
    document.getElementById('simOfficeWordsRow').style.display = 'table-row';
  } else if (type === 'pptx') {
    if (brandName) { brandName.innerHTML = '<span class="brand-prefix">Slide</span><span class="brand-suffix">Props</span>'; brandName.className = 'brand-name pptx-theme'; }
    if (brandTag) {
      brandTag.textContent = 'PPTX';
      brandTag.className = 'brand-tag pptx-theme';
    }
    if (brandBadgeBox) brandBadgeBox.className = 'brand-badge-box pptx-theme';
    if (brandIconDoc) brandIconDoc.style.display = 'none';
    if (brandIconExcel) brandIconExcel.style.display = 'none';
    if (brandIconPpt) brandIconPpt.style.display = 'block';

    document.title = `SlideProps Studio - ${currentFileInfo.name || 'Prezentácia.pptx'}`;

    if (navMetricsTitle) navMetricsTitle.textContent = 'Metrika snímkov';
    if (secMetricsHeaderTitle) secMetricsHeaderTitle.textContent = 'Metrika prezentácie & Snímky (PowerPoint)';
    if (sumScopeLabel) sumScopeLabel.textContent = 'POČET SNÍMKOV';
    if (sumRevWrap) sumRevWrap.style.display = 'flex';

    wordFields.forEach(el => el.style.display = 'none');
    pptxFields.forEach(el => el.style.display = 'flex');
    wordActions.forEach(el => el.style.display = 'none');

    // Simulator adjustments
    document.getElementById('simRowPages').style.display = 'none';
    document.getElementById('simRowWords').style.display = 'none';
    document.getElementById('simRowCharacters').style.display = 'none';
    document.getElementById('simRowLines').style.display = 'none';
    document.getElementById('simRowParagraphs').style.display = 'none';
    document.getElementById('simRowSlides').style.display = 'table-row';
    document.getElementById('simOfficeAppTitle').textContent = 'Microsoft PowerPoint > Informácie';
    document.getElementById('simOfficePagesRow').style.display = 'none';
    document.getElementById('simOfficeWordsRow').style.display = 'none';
  } else if (type === 'xlsx') {
    if (brandName) { brandName.innerHTML = '<span class="brand-prefix">Excel</span><span class="brand-suffix">Props</span>'; brandName.className = 'brand-name excel-theme'; }
    if (brandTag) {
      brandTag.textContent = 'XLSX';
      brandTag.className = 'brand-tag excel-theme';
    }
    if (brandBadgeBox) brandBadgeBox.className = 'brand-badge-box excel-theme';
    if (brandIconDoc) brandIconDoc.style.display = 'none';
    if (brandIconExcel) brandIconExcel.style.display = 'block';
    if (brandIconPpt) brandIconPpt.style.display = 'none';

    document.title = `ExcelProps Studio - ${currentFileInfo.name || 'Zošit.xlsx'}`;

    if (navMetricsTitle) navMetricsTitle.textContent = 'Metrika zošita';
    if (secMetricsHeaderTitle) secMetricsHeaderTitle.textContent = 'Vlastnosti zošita (Excel)';
    if (sumScopeLabel) sumScopeLabel.textContent = 'TYP ZOŠITA';
    if (sumRevWrap) sumRevWrap.style.display = 'none';

    wordFields.forEach(el => el.style.display = 'none');
    pptxFields.forEach(el => el.style.display = 'none');
    wordActions.forEach(el => el.style.display = 'none');

    // Simulator adjustments
    document.getElementById('simRowPages').style.display = 'none';
    document.getElementById('simRowWords').style.display = 'none';
    document.getElementById('simRowCharacters').style.display = 'none';
    document.getElementById('simRowLines').style.display = 'none';
    document.getElementById('simRowParagraphs').style.display = 'none';
    document.getElementById('simRowSlides').style.display = 'none';
    document.getElementById('simOfficeAppTitle').textContent = 'Microsoft Excel > Informácie';
    document.getElementById('simOfficePagesRow').style.display = 'none';
    document.getElementById('simOfficeWordsRow').style.display = 'none';
  }

  // Micro-interaction on badge transition
  if (window.gsap && brandBadgeBox) {
    gsap.fromTo(brandBadgeBox, { scale: 0.85, rotate: -6 }, { scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(2)' });
  }
}

function updateDocumentMetadataHeader() {
  const name = currentFileInfo.name || 'dokument.docx';
  const size = currentFileInfo.size || 0;
  const ext = name.split('.').pop().toUpperCase();

  const topFileName = document.getElementById('topFileName');
  const topFileSize = document.getElementById('topFileSize');
  const topTypeBadge = document.getElementById('topTypeBadge');
  const packageFormat = document.getElementById('packageFormat');
  const statusSize = document.getElementById('statusSize');

  topFileName.textContent = name;
  topFileName.title = currentFileInfo.path || name;
  topFileSize.textContent = formatBytes(size);
  statusSize.textContent = formatBytes(size);

  topTypeBadge.className = 'type-pill';
  if (currentFileInfo.type === 'word') {
    topTypeBadge.classList.add('word');
    topTypeBadge.textContent = 'DOCX';
    packageFormat.textContent = 'WordprocessingML (DOCX)';
  } else if (currentFileInfo.type === 'pptx') {
    topTypeBadge.classList.add('pptx');
    topTypeBadge.textContent = 'PPTX';
    packageFormat.textContent = 'PresentationML (PPTX)';
  } else if (currentFileInfo.type === 'xlsx') {
    topTypeBadge.classList.add('xlsx');
    topTypeBadge.textContent = 'XLSX';
    packageFormat.textContent = 'SpreadsheetML (XLSX)';
  } else {
    topTypeBadge.classList.add('generic');
    topTypeBadge.textContent = ext;
    packageFormat.textContent = 'OpenXML Archív';
  }
}

// -----------------------------------------------------------------------------
// XML Parsing & Form Population
// -----------------------------------------------------------------------------
async function parseArchiveMetadata() {
  const parser = new DOMParser();

  // 1. Core Properties (docProps/core.xml)
  const coreFile = currentZip.file('docProps/core.xml');
  if (coreFile) {
    const text = await coreFile.async('text');
    xmlDocs.core = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.core = parser.parseFromString(createBlankCoreXml(), 'application/xml');
  }

  // 2. Extended Properties (docProps/app.xml)
  const appFile = currentZip.file('docProps/app.xml');
  if (appFile) {
    const text = await appFile.async('text');
    xmlDocs.app = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.app = parser.parseFromString(createBlankAppXml(), 'application/xml');
  }

  // 3. Custom Properties (docProps/custom.xml)
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
  document.getElementById('sumRevision').textContent = `Rev. ${rev}`;

  // Dates
  setVal('fCreated', isoToDatetimeLocal(getTagValue(xmlDocs.core, 'created')));
  setVal('fModified', isoToDatetimeLocal(getTagValue(xmlDocs.core, 'modified')));

  // App Total Time
  const totalMin = parseInt(getTagValue(xmlDocs.app, 'TotalTime') || '0', 10);
  setTotalMinutes(totalMin, false);

  // App Metrics
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

  // Summary Banner Update
  updateSummaryBanner();

  // Custom Properties Table
  renderCustomPropertiesTable();
}

function updateSummaryBanner() {
  const author = getVal('fCreator') || '(neuvedený)';
  const totalTime = parseInt(getVal('fTotalTimeExact') || '0', 10);
  const rev = getVal('fRevision') || '1';
  const words = getVal('fWords') || '0';
  const pages = getVal('fPages') || '0';
  const slides = getVal('fSlides') || '0';

  document.getElementById('sumAuthor').textContent = author;
  document.getElementById('sumTime').textContent = formatMinutesToShort(totalTime);
  document.getElementById('sumRevision').textContent = `Rev. ${rev}`;

  if (currentFileInfo.type === 'word') {
    document.getElementById('sumScope').textContent = `${Number(words).toLocaleString()} slov / ${pages} strán`;
  } else if (currentFileInfo.type === 'pptx') {
    document.getElementById('sumScope').textContent = `${slides} snímkov`;
  } else if (currentFileInfo.type === 'xlsx') {
    document.getElementById('sumScope').textContent = `Tabuľka (XLSX)`;
  }
}

// -----------------------------------------------------------------------------
// Two-Way Sync Engine (Form -> XML DOM with STRICT Namespaces)
// -----------------------------------------------------------------------------
function syncFormToXmlDocs() {
  if (!xmlDocs.core || !xmlDocs.app) return;

  // 1. Core Properties
  setStrictTag(xmlDocs.core, 'creator', 'dc:creator', NS.dc, getVal('fCreator'));
  setStrictTag(xmlDocs.core, 'lastModifiedBy', 'cp:lastModifiedBy', NS.cp, getVal('fLastModifiedBy'));
  setStrictTag(xmlDocs.core, 'title', 'dc:title', NS.dc, getVal('fTitle'));
  setStrictTag(xmlDocs.core, 'subject', 'dc:subject', NS.dc, getVal('fSubject'));
  setStrictTag(xmlDocs.core, 'keywords', 'cp:keywords', NS.cp, getVal('fKeywords'));
  setStrictTag(xmlDocs.core, 'category', 'cp:category', NS.cp, getVal('fCategory'));
  setStrictTag(xmlDocs.core, 'contentStatus', 'cp:contentStatus', NS.cp, getVal('fContentStatus'));
  setStrictTag(xmlDocs.core, 'description', 'dc:description', NS.dc, getVal('fDescription'));
  setStrictTag(xmlDocs.core, 'revision', 'cp:revision', NS.cp, getVal('fRevision'));

  const createdVal = getVal('fCreated');
  if (createdVal) {
    setStrictTag(xmlDocs.core, 'created', 'dcterms:created', NS.dcterms, datetimeLocalToIso(createdVal), 'dcterms:W3CDTF');
  }

  const modifiedVal = getVal('fModified');
  if (modifiedVal) {
    setStrictTag(xmlDocs.core, 'modified', 'dcterms:modified', NS.dcterms, datetimeLocalToIso(modifiedVal), 'dcterms:W3CDTF');
  }

  // 2. Extended Properties (app.xml - Default namespace ep)
  setStrictTag(xmlDocs.app, 'TotalTime', 'TotalTime', NS.ep, getVal('fTotalTimeExact'));
  setStrictTag(xmlDocs.app, 'Words', 'Words', NS.ep, getVal('fWords'));
  setStrictTag(xmlDocs.app, 'Pages', 'Pages', NS.ep, getVal('fPages'));
  setStrictTag(xmlDocs.app, 'Characters', 'Characters', NS.ep, getVal('fCharacters'));
  setStrictTag(xmlDocs.app, 'CharactersWithSpaces', 'CharactersWithSpaces', NS.ep, getVal('fCharactersWithSpaces'));
  setStrictTag(xmlDocs.app, 'Paragraphs', 'Paragraphs', NS.ep, getVal('fParagraphs'));
  setStrictTag(xmlDocs.app, 'Lines', 'Lines', NS.ep, getVal('fLines'));
  setStrictTag(xmlDocs.app, 'Slides', 'Slides', NS.ep, getVal('fSlides'));
  setStrictTag(xmlDocs.app, 'Notes', 'Notes', NS.ep, getVal('fNotes'));
  setStrictTag(xmlDocs.app, 'HiddenSlides', 'HiddenSlides', NS.ep, getVal('fHiddenSlides'));

  setStrictTag(xmlDocs.app, 'Company', 'Company', NS.ep, getVal('fCompany'));
  setStrictTag(xmlDocs.app, 'Manager', 'Manager', NS.ep, getVal('fManager'));
  setStrictTag(xmlDocs.app, 'Template', 'Template', NS.ep, getVal('fTemplate'));
  setStrictTag(xmlDocs.app, 'Application', 'Application', NS.ep, getVal('fApplication'));
  setStrictTag(xmlDocs.app, 'AppVersion', 'AppVersion', NS.ep, getVal('fAppVersion'));

  // Update Summary Banner, Diff & Simulators
  updateSummaryBanner();
  updateDiffSummary();
  updateLiveSimulators();
}

function setStrictTag(doc, tagName, defaultQName, defaultUri, value, xsiType) {
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

  // If value is empty or null, remove the element
  if (value === '' || value === null || value === undefined) {
    if (target && target.parentNode) {
      target.parentNode.removeChild(target);
    }
    return;
  }

  if (target) {
    target.textContent = value;
    if (xsiType) {
      target.setAttribute('xsi:type', xsiType);
    }
  } else {
    // Create new element strictly with namespace URI
    let newEl;
    if (defaultUri) {
      newEl = doc.createElementNS(defaultUri, defaultQName);
    } else {
      newEl = doc.createElement(defaultQName);
    }
    newEl.textContent = value;
    if (xsiType) {
      newEl.setAttribute('xsi:type', xsiType);
    }
    root.appendChild(newEl);
  }
}

// -----------------------------------------------------------------------------
// Interactive Events & Input Binding
// -----------------------------------------------------------------------------
function initEvents() {
  // Bind input and change events to ALL inputs in the workspace
  const allInputs = document.querySelectorAll('.craft-input');
  allInputs.forEach(input => {
    ['input', 'change'].forEach(ev => {
      input.addEventListener(ev, () => {
        syncFormToXmlDocs();
        setStatus(false, 'Máte neuložené zmeny');
      });
    });
  });

  const rangeSlider = document.getElementById('fTotalTimeRange');
  if (rangeSlider) {
    rangeSlider.addEventListener('input', (e) => {
      setTotalMinutes(e.target.value);
    });
  }

  const exactInput = document.getElementById('fTotalTimeExact');
  if (exactInput) {
    exactInput.addEventListener('input', (e) => {
      setTotalMinutes(e.target.value);
    });
  }

  // Save Buttons
  const btnSaveDirect = document.getElementById('btnSaveDirect');
  if (btnSaveDirect) {
    btnSaveDirect.addEventListener('click', saveDocumentDirectly);
  }

  const btnExportCopy = document.getElementById('btnExportCopy');
  if (btnExportCopy) {
    btnExportCopy.addEventListener('click', exportDocumentCopy);
  }

  const btnOpenFileSecondary = document.getElementById('btnOpenFileSecondary');
  if (btnOpenFileSecondary) {
    btnOpenFileSecondary.addEventListener('click', async () => {
      if (window.electronAPI) {
        const fileData = await window.electronAPI.openFileDialog();
        if (fileData) {
          loadFromBinaryBuffer(fileData.buffer, fileData.fileName, fileData.fileSize, fileData.filePath);
        }
      } else {
        document.getElementById('systemFileInput').click();
      }
    });
  }

  // Diff drawer toggles
  document.getElementById('btnToggleDiff').addEventListener('click', () => {
    const d = document.getElementById('diffContainer');
    const isShowing = d.style.display !== 'none';
    d.style.display = isShowing ? 'none' : 'flex';
    if (!isShowing && window.gsap) {
      gsap.fromTo(d, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power2.out' });
    }
  });

  document.getElementById('btnCloseDiff').addEventListener('click', () => {
    document.getElementById('diffContainer').style.display = 'none';
  });

  // Custom prop add
  document.getElementById('btnAddNewProp').addEventListener('click', addNewCustomProperty);

  // XML Editor events
  document.getElementById('xmlArchiveFileSelect').addEventListener('change', (e) => {
    loadArchiveFileIntoEditor(e.target.value);
  });

  document.getElementById('btnPrettifyXmlCode').addEventListener('click', () => {
    const editor = document.getElementById('xmlCodeEditor');
    editor.value = formatXml(editor.value);
    showToastNotice('XML kód bol zarovnaný.');
  });

  document.getElementById('btnSaveXmlCode').addEventListener('click', () => {
    saveXmlCodeEditorContent();
  });

  // Presets
  document.getElementById('btnActionAnonymize').addEventListener('click', actionSanitize);
  document.getElementById('btnActionSyncDates').addEventListener('click', actionSyncDates);
  const btnClearTpl = document.getElementById('btnActionClearTemplate');
  if (btnClearTpl) {
    btnClearTpl.addEventListener('click', actionClearTemplate);
  }
}

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveDocumentDirectly();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      const btn = document.getElementById('btnOpenFileSecondary');
      if (btn && btn.style.display !== 'none') {
        btn.click();
      } else {
        document.getElementById('systemFileInput').click();
      }
    }
    if (e.key === 'Escape') {
      document.getElementById('diffContainer').style.display = 'none';
    }
  });
}

// -----------------------------------------------------------------------------
// Interactive Timing Helpers
// -----------------------------------------------------------------------------
function setTotalMinutes(minutes, triggerSync = true) {
  const m = parseInt(minutes, 10) || 0;
  document.getElementById('fTotalTimeExact').value = m;
  document.getElementById('fTotalTimeRange').value = Math.min(m, 2400);
  document.getElementById('timingLargeDisplay').textContent = `${m} min`;
  document.getElementById('timingHumanConverted').textContent = `Zodpovedá: ${formatMinutesToHuman(m)}`;
  
  if (triggerSync) {
    syncFormToXmlDocs();
    setStatus(false, 'Máte neuložené zmeny');
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

// Steppers
function stepWords(delta) {
  const el = document.getElementById('fWords');
  const current = parseInt(el.value || '0', 10);
  el.value = Math.max(0, current + delta);
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Máte neuložené zmeny');
}

function stepPages(delta) {
  const el = document.getElementById('fPages');
  const current = parseInt(el.value || '0', 10);
  el.value = Math.max(0, current + delta);
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Máte neuložené zmeny');
}

function stepSlides(delta) {
  const el = document.getElementById('fSlides');
  const current = parseInt(el.value || '0', 10);
  el.value = Math.max(0, current + delta);
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Máte neuložené zmeny');
}

function stepRevision(delta) {
  const el = document.getElementById('fRevision');
  const current = parseInt(el.value || '1', 10);
  el.value = Math.max(1, current + delta);
  pulseElement(el);
  syncFormToXmlDocs();
  setStatus(false, 'Máte neuložené zmeny');
}

function pulseElement(el) {
  if (window.gsap) {
    gsap.fromTo(el, { scale: 1.05 }, { scale: 1, duration: 0.22, ease: 'power2.out' });
  }
}

// -----------------------------------------------------------------------------
// Quick Presets
// -----------------------------------------------------------------------------
function actionSanitize() {
  setVal('fCreator', '');
  setVal('fLastModifiedBy', '');
  setVal('fCompany', '');
  setVal('fManager', '');
  setVal('fDescription', '');
  setVal('fTemplate', 'Normal.dotm');

  syncFormToXmlDocs();
  setStatus(false, 'Metadáta anonymizované');
  showToastNotice('Osobné identifikačné údaje a názov šablóny boli odstránené.');
}

function actionSyncDates() {
  const created = getVal('fCreated');
  if (created) {
    setVal('fModified', created);
  } else {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const isoNow = now.toISOString().slice(0, 16);
    setVal('fCreated', isoNow);
    setVal('fModified', isoNow);
  }
  syncFormToXmlDocs();
  setStatus(false, 'Dátumy zosúladené');
  showToastNotice('Dátum úpravy bol nastavený zhodne s dátumom vytvorenia.');
}

function actionClearTemplate() {
  setVal('fTemplate', 'Normal.dotm');
  syncFormToXmlDocs();
  setStatus(false, 'Šablóna očistená');
  showToastNotice('Cesta k šablóne bola resetovaná na čistý súbor Normal.dotm.');
}

function serializeXmlCleanly(doc) {
  if (!doc) return '';
  const serializer = new XMLSerializer();
  let raw = serializer.serializeToString(doc);
  // Strip any existing XML declaration to prevent duplicates
  raw = raw.replace(/^\s*<\?xml[^>]*\?>\s*/i, '');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + raw.trim();
}

// -----------------------------------------------------------------------------
// Save & Export Engine (100% Guaranteed Persistence)
// -----------------------------------------------------------------------------
async function prepareZipPackageForSaving() {
  if (!currentZip) return null;

  syncFormToXmlDocs();

  // 1. Serialize core.xml cleanly
  if (xmlDocs.core) {
    currentZip.file('docProps/core.xml', serializeXmlCleanly(xmlDocs.core));
  }

  // 2. Serialize app.xml cleanly
  if (xmlDocs.app) {
    currentZip.file('docProps/app.xml', serializeXmlCleanly(xmlDocs.app));
  }

  // 3. Serialize custom.xml cleanly
  if (xmlDocs.custom) {
    currentZip.file('docProps/custom.xml', serializeXmlCleanly(xmlDocs.custom));
  }

  const blob = await currentZip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return blob;
}

// Direct Save (Overwrites the opened file)
async function saveDocumentDirectly() {
  const blob = await prepareZipPackageForSaving();
  if (!blob) return;

  const arrayBuf = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuf);

  // If local file path exists in Electron, overwrite directly
  if (window.electronAPI && currentFileInfo.path && window.electronAPI.saveDirect) {
    const result = await window.electronAPI.saveDirect(currentFileInfo.path, uint8);
    if (result && result.success) {
      currentFileInfo.size = uint8.byteLength;
      updateDocumentMetadataHeader();
      saveSnapshot();
      updateDiffSummary();
      updateLiveSimulators();
      setStatus(true, 'Uložené na disk');
      showToastNotice(`Zmeny boli úspešne uložené do: ${currentFileInfo.name}`);
      pulseElement(document.getElementById('btnSaveDirect'));
      return;
    }
  }

  // If no direct local path (e.g. sample doc or web fallback), prompt save dialog
  await exportDocumentCopy();
}

// Save As / Export Copy (Prompts Save Dialog)
async function exportDocumentCopy() {
  const blob = await prepareZipPackageForSaving();
  if (!blob) return;

  const origName = currentFileInfo.name || 'dokument.docx';
  const dotIdx = origName.lastIndexOf('.');
  const base = dotIdx !== -1 ? origName.substring(0, dotIdx) : origName;
  const ext = dotIdx !== -1 ? origName.substring(dotIdx) : '.docx';
  const exportName = `${base}_upravene${ext}`;

  if (window.electronAPI) {
    const arrayBuf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    const result = await window.electronAPI.saveFileDialog(exportName, uint8);
    if (result && result.success) {
      saveSnapshot();
      updateDiffSummary();
      updateLiveSimulators();
      setStatus(true, 'Kópia uložená na disk');
      showToastNotice(`Kópia bola úspešne uložená: ${result.savedPath}`);
      pulseElement(document.getElementById('btnExportCopy'));
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
    showToastNotice(`Súbor '${exportName}' bol stiahnutý.`);
  }
}

// -----------------------------------------------------------------------------
// Live Simulator Engine (Prieskumník Windows & MS Office)
// -----------------------------------------------------------------------------
function updateLiveSimulators() {
  const title = getVal('fTitle') || '-';
  const subject = getVal('fSubject') || '-';
  const creator = getVal('fCreator') || '-';
  const lastModifiedBy = getVal('fLastModifiedBy') || '-';
  const revision = getVal('fRevision') || '1';
  const totalMin = parseInt(getVal('fTotalTimeExact') || '0', 10);
  const created = getVal('fCreated') ? formatDatetimeHuman(getVal('fCreated')) : '-';
  const modified = getVal('fModified') ? formatDatetimeHuman(getVal('fModified')) : '-';
  const words = getVal('fWords') || '0';
  const pages = getVal('fPages') || '0';
  const slides = getVal('fSlides') || '0';
  const chars = getVal('fCharacters') || '0';
  const lines = getVal('fLines') || '0';
  const paras = getVal('fParagraphs') || '0';
  const company = getVal('fCompany') || '-';
  const manager = getVal('fManager') || '-';
  const appName = getVal('fApplication') || 'Microsoft Office';

  // 1. Windows Explorer Details Table
  setSimField('simTitle', title, originalSnapshot.title);
  setSimField('simSubject', subject, originalSnapshot.subject);
  setSimField('simKeywords', getVal('fKeywords') || '-', originalSnapshot.keywords);
  setSimField('simCategory', getVal('fCategory') || '-', originalSnapshot.category);
  setSimField('simComments', getVal('fDescription') || '-', originalSnapshot.description);
  setSimField('simAuthors', creator, originalSnapshot.creator);
  setSimField('simLastSavedBy', lastModifiedBy, originalSnapshot.lastModifiedBy);
  setSimField('simRevision', revision, originalSnapshot.revision);
  setSimField('simProgram', appName, originalSnapshot.application);
  setSimField('simCompany', company, originalSnapshot.company);
  setSimField('simManager', manager, originalSnapshot.manager);

  setSimField('simTotalTime', `${totalMin} minút`, `${originalSnapshot.totalTime || 0} minút`);
  setSimField('simPages', pages, originalSnapshot.pages);
  setSimField('simWords', words, originalSnapshot.words);
  setSimField('simCharacters', chars, originalSnapshot.characters);
  setSimField('simLines', lines, originalSnapshot.lines);
  setSimField('simParagraphs', paras, originalSnapshot.paragraphs);
  setSimField('simSlides', slides, originalSnapshot.slides);

  // 2. MS Office Backstage View
  document.getElementById('simOfficeDocName').textContent = currentFileInfo.name || 'dokument.docx';
  document.getElementById('simOfficeDocPath').textContent = currentFileInfo.path || `C:\\Users\\User\\Documents\\${currentFileInfo.name || 'dokument.docx'}`;
  document.getElementById('simOfficeSize').textContent = formatBytes(currentFileInfo.size || 0);

  setSimField('simOfficePages', pages, originalSnapshot.pages);
  setSimField('simOfficeWords', words, originalSnapshot.words);
  setSimField('simOfficeTime', `${totalMin} min`, `${originalSnapshot.totalTime || 0} min`);
  setSimField('simOfficeTitle', title, originalSnapshot.title);
  setSimField('simOfficeTags', getVal('fKeywords') || '-', originalSnapshot.keywords);
  setSimField('simOfficeCategory', getVal('fCategory') || '-', originalSnapshot.category);
  setSimField('simOfficeCreated', created, formatDatetimeHuman(originalSnapshot.created));
  setSimField('simOfficeModified', modified, formatDatetimeHuman(originalSnapshot.modified));
  setSimField('simOfficeAuthor', creator, originalSnapshot.creator);
  setSimField('simOfficeLastSavedBy', lastModifiedBy, originalSnapshot.lastModifiedBy);
}

function setSimField(elementId, val, originalVal) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = val;
  if (originalVal !== undefined && String(val) !== String(originalVal) && originalVal !== '') {
    el.classList.add('changed');
  } else {
    el.classList.remove('changed');
  }
}

// -----------------------------------------------------------------------------
// Diff Engine
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
    characters: getVal('fCharacters'),
    charactersWithSpaces: getVal('fCharactersWithSpaces'),
    paragraphs: getVal('fParagraphs'),
    lines: getVal('fLines'),
    slides: getVal('fSlides'),
    notes: getVal('fNotes'),
    hiddenSlides: getVal('fHiddenSlides'),
    company: getVal('fCompany'),
    manager: getVal('fManager'),
    template: getVal('fTemplate'),
    application: getVal('fApplication'),
    appVersion: getVal('fAppVersion')
  };
}

function updateDiffSummary() {
  const diffList = document.getElementById('diffContentList');
  const counter = document.getElementById('diffCounter');
  if (!diffList || !counter) return;

  const fieldLabels = {
    creator: 'Autor (Creator)',
    lastModifiedBy: 'Posledný editor',
    title: 'Názov dokumentu',
    subject: 'Predmet',
    keywords: 'Kľúčové slová',
    category: 'Kategória',
    contentStatus: 'Stav obsahu',
    description: 'Popis',
    revision: 'Číslo revízie',
    created: 'Dátum vytvorenia',
    modified: 'Dátum úpravy',
    totalTime: 'Celkový čas úprav (min)',
    words: 'Počet slov',
    pages: 'Počet strán',
    characters: 'Počet znakov',
    charactersWithSpaces: 'Znakov s medzerami',
    paragraphs: 'Počet odsekov',
    lines: 'Počet riadkov',
    slides: 'Počet snímkov',
    company: 'Spoločnosť',
    manager: 'Manažér',
    template: 'Šablóna'
  };

  const currentValues = {
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
    characters: getVal('fCharacters'),
    charactersWithSpaces: getVal('fCharactersWithSpaces'),
    paragraphs: getVal('fParagraphs'),
    lines: getVal('fLines'),
    slides: getVal('fSlides'),
    company: getVal('fCompany'),
    manager: getVal('fManager'),
    template: getVal('fTemplate')
  };

  const diffs = [];
  for (let key in currentValues) {
    const oldVal = originalSnapshot[key] || '';
    const newVal = currentValues[key] || '';
    if (oldVal !== newVal) {
      diffs.push({
        label: fieldLabels[key] || key,
        old: oldVal || '(prázdne)',
        new: newVal || '(odstránené)'
      });
    }
  }

  counter.textContent = diffs.length;

  if (diffs.length === 0) {
    diffList.innerHTML = '<div class="empty-diff-text">Zatiaľ neboli vykonané žiadne zmeny oproti načítanému súboru.</div>';
    setStatus(true, 'Pripravené');
  } else {
    diffList.innerHTML = diffs.map(d => `
      <div class="diff-row">
        <div class="diff-key">${escapeHtml(d.label)}</div>
        <div class="diff-val-old">${escapeHtml(d.old)}</div>
        <div class="diff-val-new">→ ${escapeHtml(d.new)}</div>
      </div>
    `).join('');
    setStatus(false, `${diffs.length} neuložených zmien`);
  }
}

// -----------------------------------------------------------------------------
// Custom Properties (docProps/custom.xml)
// -----------------------------------------------------------------------------
function renderCustomPropertiesTable() {
  const tbody = document.getElementById('customPropsTableBody');
  if (!tbody || !xmlDocs.custom) return;

  tbody.innerHTML = '';
  const root = xmlDocs.custom.documentElement;
  const props = root.getElementsByTagName('*');
  const customList = [];

  for (let p of props) {
    if (p.localName === 'property') {
      const name = p.getAttribute('name') || '';
      let val = '';
      for (let child of p.childNodes) {
        if (child.nodeType === 1) {
          val = child.textContent;
          break;
        }
      }
      customList.push({ name, val });
    }
  }

  if (customList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-diff-text">Žiadne vlastné atribúty nie sú definované.</td></tr>';
    return;
  }

  customList.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${escapeHtml(item.name)}</td>
      <td style="font-family: var(--font-mono);">${escapeHtml(item.val)}</td>
      <td style="text-align: center;">
        <button class="btn btn-icon btn-ghost" onclick="deleteCustomProperty('${escapeHtml(item.name)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addNewCustomProperty() {
  const nameInput = document.getElementById('newPropName');
  const valInput = document.getElementById('newPropValue');
  const name = nameInput.value.trim();
  const val = valInput.value.trim();

  if (!name) {
    alert('Zadajte názov atribútu.');
    return;
  }

  if (!xmlDocs.custom) {
    const parser = new DOMParser();
    xmlDocs.custom = parser.parseFromString(createBlankCustomXml(), 'application/xml');
  }

  const root = xmlDocs.custom.documentElement;
  const propEl = xmlDocs.custom.createElementNS(NS.custom, 'property');
  propEl.setAttribute('fmtid', '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}');
  propEl.setAttribute('pid', String(root.getElementsByTagName('*').length + 2));
  propEl.setAttribute('name', name);

  const valEl = xmlDocs.custom.createElementNS(NS.vt, 'vt:lpwstr');
  valEl.textContent = val;
  propEl.appendChild(valEl);
  root.appendChild(propEl);

  nameInput.value = '';
  valInput.value = '';
  renderCustomPropertiesTable();
  setStatus(false, 'Pridaný vlastný atribút');
  showToastNotice(`Vlastný atribút '${name}' bol pridaný.`);
}

window.deleteCustomProperty = function(propName) {
  if (!xmlDocs.custom) return;
  const root = xmlDocs.custom.documentElement;
  for (let p of root.getElementsByTagName('*')) {
    if (p.localName === 'property' && p.getAttribute('name') === propName) {
      p.parentNode.removeChild(p);
      break;
    }
  }
  renderCustomPropertiesTable();
  setStatus(false, 'Odstránený vlastný atribút');
  showToastNotice(`Vlastný atribút '${propName}' bol vymazaný.`);
};

// -----------------------------------------------------------------------------
// Direct XML Editor
// -----------------------------------------------------------------------------
function populateArchiveDropdown() {
  const select = document.getElementById('xmlArchiveFileSelect');
  if (!select || !currentZip) return;

  select.innerHTML = '';
  const files = Object.keys(currentZip.files).filter(f => f.endsWith('.xml') || f.endsWith('.rels'));
  
  // Prioritize core, app, custom
  const priority = ['docProps/core.xml', 'docProps/app.xml', 'docProps/custom.xml'];
  priority.forEach(p => {
    if (files.includes(p)) {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    }
  });

  files.forEach(f => {
    if (!priority.includes(f)) {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      select.appendChild(opt);
    }
  });

  if (select.options.length > 0) {
    loadArchiveFileIntoEditor(select.options[0].value);
  }
}

async function loadArchiveFileIntoEditor(filename) {
  if (!currentZip || !filename) return;
  const file = currentZip.file(filename);
  if (!file) return;

  const content = await file.async('text');
  document.getElementById('xmlCodeEditor').value = formatXml(content);
}

async function saveXmlCodeEditorContent() {
  const select = document.getElementById('xmlArchiveFileSelect');
  const filename = select.value;
  const content = document.getElementById('xmlCodeEditor').value;

  if (!currentZip || !filename) return;

  currentZip.file(filename, content);

  // If core, app or custom was edited, refresh in-memory DOM
  const parser = new DOMParser();
  if (filename === 'docProps/core.xml') {
    xmlDocs.core = parser.parseFromString(content, 'application/xml');
    populateForm();
  } else if (filename === 'docProps/app.xml') {
    xmlDocs.app = parser.parseFromString(content, 'application/xml');
    populateForm();
  } else if (filename === 'docProps/custom.xml') {
    xmlDocs.custom = parser.parseFromString(content, 'application/xml');
    renderCustomPropertiesTable();
  }

  setStatus(false, 'XML súbor upravený');
  showToastNotice(`Zmeny v '${filename}' boli zapísané.`);
}

// -----------------------------------------------------------------------------
// Sample Document Generator
// -----------------------------------------------------------------------------
async function loadSampleDiplomovka() {
  const sampleZip = new JSZip();

  sampleZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>`);

  sampleZip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>
</Relationships>`);

  sampleZip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" 
                   xmlns:dc="http://purl.org/dc/elements/1.1/" 
                   xmlns:dcterms="http://purl.org/dc/terms/" 
                   xmlns:dcmitype="http://purl.org/dc/dcmitype/" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>Diplomová práca - Analýza trhových anomálií</dc:title>
    <dc:subject>Aplikovaná ekonometria</dc:subject>
    <dc:creator>Ján Novák</dc:creator>
    <cp:keywords>analýza, ekonometria, modelovanie, dáta</cp:keywords>
    <dc:description>Záverečná diplomová práca pre obhajobu.</dc:description>
    <cp:lastModifiedBy>Ján Novák</cp:lastModifiedBy>
    <cp:revision>24</cp:revision>
    <dcterms:created xsi:type="dcterms:W3CDTF">2025-10-15T08:30:00Z</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">2026-02-28T16:45:00Z</dcterms:modified>
    <cp:category>Záverečné práce</cp:category>
    <cp:contentStatus>Finálna verzia</cp:contentStatus>
</cp:coreProperties>`);

  sampleZip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Template>C:\\Users\\Admin\\Templates\\Normal.dotm</Template>
    <TotalTime>540</TotalTime>
    <Pages>48</Pages>
    <Words>14250</Words>
    <Characters>89100</Characters>
    <Application>Microsoft Office Word</Application>
    <DocSecurity>0</DocSecurity>
    <Lines>1450</Lines>
    <Paragraphs>420</Paragraphs>
    <ScaleCrop>false</ScaleCrop>
    <Company>Technická Univerzita</Company>
    <Manager>Prof. Ing. Martin Kováč, DrSc.</Manager>
    <CharactersWithSpaces>104200</CharactersWithSpaces>
    <AppVersion>16.0000</AppVersion>
</Properties>`);

  sampleZip.file('docProps/custom.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Interné Číslo"><vt:lpwstr>INT-2026-DOC-042</vt:lpwstr></property>
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="Dôvernosť"><vt:lpwstr>Prísne tajné</vt:lpwstr></property>
</Properties>`);

  const blob = await sampleZip.generateAsync({ type: 'blob' });
  const buf = await blob.arrayBuffer();

  loadFromBinaryBuffer(buf, 'Vzorova_diplomovka.docx', buf.byteLength, 'Vzorova_diplomovka.docx');
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
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
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

function formatDatetimeHuman(isoOrLocal) {
  if (!isoOrLocal) return '-';
  try {
    const d = new Date(isoOrLocal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('sk-SK') + ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const dm = 1;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setStatus(isSynced, text) {
  const bullet = document.getElementById('statusBullet');
  const txt = document.getElementById('statusText');
  const topDot = document.getElementById('topStatusDot');
  const topCapsule = document.getElementById('topStatusCapsule');
  const topLabel = document.getElementById('topStatusLabel');

  if (isSynced) {
    if (bullet) bullet.className = 'status-dot synced';
    if (topDot) topDot.className = 'status-beacon-core synced';
    if (topCapsule) {
      topCapsule.className = 'status-indicator-badge synced';
      topCapsule.title = 'Všetky zmeny sú synchronizované s archívom';
    }
    if (topLabel) topLabel.textContent = 'SYNC';
    if (txt) txt.textContent = text || 'Pripravené';
  } else {
    if (bullet) bullet.className = 'status-dot dirty';
    if (topDot) topDot.className = 'status-beacon-core dirty';
    if (topCapsule) {
      topCapsule.className = 'status-indicator-badge dirty';
      topCapsule.title = 'Máte neuložené zmeny v atribútoch';
    }
    if (topLabel) topLabel.textContent = 'ZMENY';
    if (txt) txt.textContent = text || 'Máte neuložené zmeny';
  }
}

function showToastNotice(msg) {
  const toast = document.getElementById('toastNotice');
  const text = document.getElementById('toastNoticeText');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.add('show');
  if (window.gsap) {
    gsap.fromTo(toast, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' });
  }
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
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
    for (let i = 0; i < pad; i++) {
      padding += '  ';
    }
    formatted += padding + node + '\r\n';
    pad += indent;
  });
  return formatted.trim();
}

function createBlankCoreXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="${NS.cp}" xmlns:dc="${NS.dc}" xmlns:dcterms="${NS.dcterms}" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="${NS.xsi}">
  <dc:title></dc:title>
  <dc:creator></dc:creator>
  <cp:lastModifiedBy></cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
</cp:coreProperties>`;
}

function createBlankAppXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS.ep}" xmlns:vt="${NS.vt}">
  <TotalTime>0</TotalTime>
  <Words>0</Words>
  <Pages>1</Pages>
</Properties>`;
}

function createBlankCustomXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS.custom}" xmlns:vt="${NS.vt}">
</Properties>`;
}
