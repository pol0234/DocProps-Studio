/**
 * DocProps Studio - Application Logic
 * Supports DOCX, PPTX, XLSX and other OpenXML formats.
 */

// Global State
let currentFile = null;
let currentZip = null;
let originalSnapshot = null;
let activeRawFile = 'docProps/core.xml';
let xmlDocs = {
  core: null,
  app: null,
  custom: null
};

// OpenXML Namespaces
const NS = {
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  ep: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  cust: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
  vt: 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'
};

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const dropzoneSection = document.getElementById('dropzoneSection');
const editorSection = document.getElementById('editorSection');
const saveBar = document.getElementById('saveBar');
const rawXmlEditor = document.getElementById('rawXmlEditor');
const toastEl = document.getElementById('toast');
const toastMessageEl = document.getElementById('toastMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initDragAndDrop();
  initEvents();
});

// -----------------------------------------------------------------------------
// Theme Management
// -----------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('docprops-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  document.getElementById('btnToggleTheme').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('docprops-theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (theme === 'dark') {
    // Moon icon
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  } else {
    // Sun icon
    icon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="12" x2="12" y2="23"></line>
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
// Tabs Navigation
// -----------------------------------------------------------------------------
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');

      if (targetId === 'tabRawXml') {
        syncFormToXmlDocs();
        loadRawXmlIntoEditor(activeRawFile);
      }
    });
  });
}

// -----------------------------------------------------------------------------
// Drag & Drop
// -----------------------------------------------------------------------------
function initDragAndDrop() {
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      loadFile(dt.files[0]);
    }
  });

  // Global window drag & drop
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
    }
  });
}

// -----------------------------------------------------------------------------
// File Processing (JSZip)
// -----------------------------------------------------------------------------
async function loadFile(file) {
  try {
    currentFile = file;
    const arrayBuffer = await file.arrayBuffer();
    currentZip = await JSZip.loadAsync(arrayBuffer);

    // Update File Card UI
    updateFileHeader(file.name, file.size);

    // Parse XML files
    await parseArchiveMetadata();

    // Show Workspace
    dropzoneSection.style.display = 'none';
    editorSection.style.display = 'block';
    saveBar.style.display = 'flex';

    saveOriginalSnapshot();
    showToast(`Dokument '${file.name}' bol úspešne načítaný!`);
  } catch (err) {
    console.error(err);
    alert('Nepodarilo sa načítať súbor ako OpenXML ZIP archív. Uistite sa, že ide o platný súbor DOCX, PPTX alebo XLSX.');
  }
}

function updateFileHeader(name, size) {
  document.getElementById('fileName').textContent = name;
  document.getElementById('fileSize').textContent = formatBytes(size);

  const ext = name.split('.').pop().toLowerCase();
  const badge = document.getElementById('fileTypeBadge');
  const formatName = document.getElementById('fileFormatName');

  badge.className = 'file-type-badge';

  if (['docx', 'docm', 'dotx', 'dotm'].includes(ext)) {
    badge.classList.add('type-word');
    badge.textContent = 'DOC';
    formatName.textContent = 'Microsoft Word Dokument';
  } else if (['pptx', 'pptm', 'potx', 'potm'].includes(ext)) {
    badge.classList.add('type-powerpoint');
    badge.textContent = 'PPT';
    formatName.textContent = 'Microsoft PowerPoint Prezentácia';
  } else if (['xlsx', 'xlsm', 'xltx', 'xltm'].includes(ext)) {
    badge.classList.add('type-excel');
    badge.textContent = 'XLS';
    formatName.textContent = 'Microsoft Excel Tabuľka';
  } else {
    badge.classList.add('type-other');
    badge.textContent = ext.toUpperCase().substring(0, 3);
    formatName.textContent = 'OpenXML Archív';
  }
}

async function parseArchiveMetadata() {
  const parser = new DOMParser();

  // 1. core.xml
  const coreFile = currentZip.file('docProps/core.xml');
  if (coreFile) {
    const text = await coreFile.async('text');
    xmlDocs.core = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.core = parser.parseFromString(createDefaultCoreXml(), 'application/xml');
  }

  // 2. app.xml
  const appFile = currentZip.file('docProps/app.xml');
  if (appFile) {
    const text = await appFile.async('text');
    xmlDocs.app = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.app = parser.parseFromString(createDefaultAppXml(), 'application/xml');
  }

  // 3. custom.xml
  const customFile = currentZip.file('docProps/custom.xml');
  if (customFile) {
    const text = await customFile.async('text');
    xmlDocs.custom = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.custom = parser.parseFromString(createDefaultCustomXml(), 'application/xml');
  }

  populateFormFromXml();
}

function populateFormFromXml() {
  // Core
  setInputValue('coreCreator', getTagValue(xmlDocs.core, 'creator'));
  setInputValue('coreLastModifiedBy', getTagValue(xmlDocs.core, 'lastModifiedBy'));
  setInputValue('coreTitle', getTagValue(xmlDocs.core, 'title'));
  setInputValue('coreSubject', getTagValue(xmlDocs.core, 'subject'));
  setInputValue('coreKeywords', getTagValue(xmlDocs.core, 'keywords'));
  setInputValue('coreCategory', getTagValue(xmlDocs.core, 'category'));
  setInputValue('coreContentStatus', getTagValue(xmlDocs.core, 'contentStatus'));
  setInputValue('coreDescription', getTagValue(xmlDocs.core, 'description'));
  setInputValue('coreRevision', getTagValue(xmlDocs.core, 'revision'));

  // Dates
  const createdRaw = getTagValue(xmlDocs.core, 'created');
  const modifiedRaw = getTagValue(xmlDocs.core, 'modified');
  setInputValue('coreCreated', isoToDatetimeLocal(createdRaw));
  setInputValue('coreModified', isoToDatetimeLocal(modifiedRaw));

  // App
  const totalTime = getTagValue(xmlDocs.app, 'TotalTime') || '0';
  setInputValue('appTotalTime', totalTime);
  updateTotalTimeHuman(totalTime);

  setInputValue('appCompany', getTagValue(xmlDocs.app, 'Company'));
  setInputValue('appManager', getTagValue(xmlDocs.app, 'Manager'));
  setInputValue('appTemplate', getTagValue(xmlDocs.app, 'Template'));
  setInputValue('appApplication', getTagValue(xmlDocs.app, 'Application'));
  setInputValue('appVersion', getTagValue(xmlDocs.app, 'AppVersion'));

  setInputValue('appPages', getTagValue(xmlDocs.app, 'Pages'));
  setInputValue('appWords', getTagValue(xmlDocs.app, 'Words'));
  setInputValue('appCharacters', getTagValue(xmlDocs.app, 'Characters'));
  setInputValue('appCharactersWithSpaces', getTagValue(xmlDocs.app, 'CharactersWithSpaces'));
  setInputValue('appParagraphs', getTagValue(xmlDocs.app, 'Paragraphs'));
  setInputValue('appLines', getTagValue(xmlDocs.app, 'Lines'));
  setInputValue('appSlides', getTagValue(xmlDocs.app, 'Slides'));
  setInputValue('appNotes', getTagValue(xmlDocs.app, 'Notes'));

  // Custom properties
  renderCustomProperties();
}

function syncFormToXmlDocs() {
  const serializer = new XMLSerializer();

  // Core
  setTagValue(xmlDocs.core, 'creator', 'dc:creator', getInputValue('coreCreator'));
  setTagValue(xmlDocs.core, 'lastModifiedBy', 'cp:lastModifiedBy', getInputValue('coreLastModifiedBy'));
  setTagValue(xmlDocs.core, 'title', 'dc:title', getInputValue('coreTitle'));
  setTagValue(xmlDocs.core, 'subject', 'dc:subject', getInputValue('coreSubject'));
  setTagValue(xmlDocs.core, 'keywords', 'cp:keywords', getInputValue('coreKeywords'));
  setTagValue(xmlDocs.core, 'category', 'cp:category', getInputValue('coreCategory'));
  setTagValue(xmlDocs.core, 'contentStatus', 'cp:contentStatus', getInputValue('coreContentStatus'));
  setTagValue(xmlDocs.core, 'description', 'dc:description', getInputValue('coreDescription'));
  setTagValue(xmlDocs.core, 'revision', 'cp:revision', getInputValue('coreRevision'));

  const createdLocal = getInputValue('coreCreated');
  if (createdLocal) setTagValue(xmlDocs.core, 'created', 'dcterms:created', datetimeLocalToIso(createdLocal));

  const modifiedLocal = getInputValue('coreModified');
  if (modifiedLocal) setTagValue(xmlDocs.core, 'modified', 'dcterms:modified', datetimeLocalToIso(modifiedLocal));

  // App
  setTagValue(xmlDocs.app, 'TotalTime', 'TotalTime', getInputValue('appTotalTime'));
  setTagValue(xmlDocs.app, 'Company', 'Company', getInputValue('appCompany'));
  setTagValue(xmlDocs.app, 'Manager', 'Manager', getInputValue('appManager'));
  setTagValue(xmlDocs.app, 'Template', 'Template', getInputValue('appTemplate'));
  setTagValue(xmlDocs.app, 'Application', 'Application', getInputValue('appApplication'));
  setTagValue(xmlDocs.app, 'AppVersion', 'AppVersion', getInputValue('appVersion'));

  setTagValue(xmlDocs.app, 'Pages', 'Pages', getInputValue('appPages'));
  setTagValue(xmlDocs.app, 'Words', 'Words', getInputValue('appWords'));
  setTagValue(xmlDocs.app, 'Characters', 'Characters', getInputValue('appCharacters'));
  setTagValue(xmlDocs.app, 'CharactersWithSpaces', 'CharactersWithSpaces', getInputValue('appCharactersWithSpaces'));
  setTagValue(xmlDocs.app, 'Paragraphs', 'Paragraphs', getInputValue('appParagraphs'));
  setTagValue(xmlDocs.app, 'Lines', 'Lines', getInputValue('appLines'));
  setTagValue(xmlDocs.app, 'Slides', 'Slides', getInputValue('appSlides'));
  setTagValue(xmlDocs.app, 'Notes', 'Notes', getInputValue('appNotes'));

  markUnsaved();
}

// -----------------------------------------------------------------------------
// XML Helper Utilities
// -----------------------------------------------------------------------------
function getTagValue(doc, tagName) {
  if (!doc) return '';
  // Match both localName and qualified tag
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
    // Create new element
    const newEl = doc.createElement(defaultQualifiedName);
    newEl.textContent = value;
    if (defaultQualifiedName === 'dcterms:created' || defaultQualifiedName === 'dcterms:modified') {
      newEl.setAttribute('xsi:type', 'dcterms:W3CDTF');
    }
    root.appendChild(newEl);
  }
}

// -----------------------------------------------------------------------------
// Custom Properties
// -----------------------------------------------------------------------------
function renderCustomProperties() {
  const tbody = document.getElementById('customPropsBody');
  tbody.innerHTML = '';

  if (!xmlDocs.custom) return;

  const props = xmlDocs.custom.getElementsByTagName('property');
  if (props.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-secondary); padding: 18px;">Žiadne vlastné atribúty neboli nájdené.</td></tr>`;
    return;
  }

  for (let p of props) {
    const name = p.getAttribute('name') || 'Vlastnosť';
    const val = p.textContent.trim();
    const pid = p.getAttribute('pid') || '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(name)}</strong></td>
      <td><input type="text" class="form-input custom-val-input" data-pid="${pid}" data-name="${escapeHtml(name)}" value="${escapeHtml(val)}"></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="deleteCustomProp('${escapeHtml(name)}')">Zmazať</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Add change listeners
  document.querySelectorAll('.custom-val-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const propName = e.target.getAttribute('data-name');
      updateCustomPropValue(propName, e.target.value);
    });
  });
}

function updateCustomPropValue(name, newVal) {
  const props = xmlDocs.custom.getElementsByTagName('property');
  for (let p of props) {
    if (p.getAttribute('name') === name) {
      let child = p.firstElementChild;
      if (child) {
        child.textContent = newVal;
      } else {
        p.textContent = newVal;
      }
      markUnsaved();
      break;
    }
  }
}

function deleteCustomProp(name) {
  const props = xmlDocs.custom.getElementsByTagName('property');
  for (let p of props) {
    if (p.getAttribute('name') === name) {
      p.parentNode.removeChild(p);
      renderCustomProperties();
      markUnsaved();
      showToast(`Vlastnosť '${name}' bola odstránená.`);
      break;
    }
  }
}

function addCustomProperty(name, val) {
  if (!name.trim()) {
    alert('Zadajte prosím názov vlastnosti.');
    return;
  }
  if (!xmlDocs.custom) {
    const parser = new DOMParser();
    xmlDocs.custom = parser.parseFromString(createDefaultCustomXml(), 'application/xml');
  }

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
  prop.setAttribute('name', name.trim());

  const lpwstr = xmlDocs.custom.createElement('vt:lpwstr');
  lpwstr.textContent = val.trim();
  prop.appendChild(lpwstr);

  root.appendChild(prop);
  renderCustomProperties();
  markUnsaved();
  showToast(`Vlastnosť '${name}' bola pridaná!`);

  document.getElementById('newCustomName').value = '';
  document.getElementById('newCustomValue').value = '';
}

// -----------------------------------------------------------------------------
// Raw XML Editor (7-Zip Mode)
// -----------------------------------------------------------------------------
function loadRawXmlIntoEditor(filename) {
  activeRawFile = filename;
  const serializer = new XMLSerializer();
  let doc = null;

  if (filename === 'docProps/core.xml') doc = xmlDocs.core;
  else if (filename === 'docProps/app.xml') doc = xmlDocs.app;
  else if (filename === 'docProps/custom.xml') doc = xmlDocs.custom;

  if (doc) {
    const rawText = serializer.serializeToString(doc);
    rawXmlEditor.value = formatXml(rawText);
  } else {
    rawXmlEditor.value = `<!-- Súbor ${filename} v tomto archíve neexistuje -->`;
  }
}

function applyRawXmlChanges() {
  const text = rawXmlEditor.value.trim();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    alert('Chyba XML syntaxe! Skontrolujte tagy:\n\n' + parserError.textContent);
    return;
  }

  if (activeRawFile === 'docProps/core.xml') xmlDocs.core = doc;
  else if (activeRawFile === 'docProps/app.xml') xmlDocs.app = doc;
  else if (activeRawFile === 'docProps/custom.xml') xmlDocs.custom = doc;

  populateFormFromXml();
  markUnsaved();
  showToast(`Zmeny v '${activeRawFile}' boli úspešne aplikované!`);
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

// -----------------------------------------------------------------------------
// Quick Actions / Presets
// -----------------------------------------------------------------------------
function quickAnonymize() {
  setInputValue('coreCreator', '');
  setInputValue('coreLastModifiedBy', '');
  setInputValue('coreDescription', '');
  setInputValue('appCompany', '');
  setInputValue('appManager', '');
  setInputValue('appTemplate', 'Normal.dotm');
  syncFormToXmlDocs();
  showToast('🛡️ Osobné stopy (autor, firma, editor) boli vymazané.');
}

function setTotalTime(minutes) {
  setInputValue('appTotalTime', minutes);
  updateTotalTimeHuman(minutes);
  syncFormToXmlDocs();
  showToast(`⏱️ Čas úprav nastavený na ${minutes} minút.`);
}

function quickSyncDates() {
  setFieldToNow('coreCreated');
  setFieldToNow('coreModified');
  syncFormToXmlDocs();
  showToast('📅 Dátumy boli zosúladené s aktuálnym časom.');
}

function saveOriginalSnapshot() {
  originalSnapshot = {
    creator: getInputValue('coreCreator'),
    lastModifiedBy: getInputValue('coreLastModifiedBy'),
    title: getInputValue('coreTitle'),
    subject: getInputValue('coreSubject'),
    keywords: getInputValue('coreKeywords'),
    category: getInputValue('coreCategory'),
    contentStatus: getInputValue('coreContentStatus'),
    description: getInputValue('coreDescription'),
    revision: getInputValue('coreRevision'),
    created: getInputValue('coreCreated'),
    modified: getInputValue('coreModified'),
    totalTime: getInputValue('appTotalTime'),
    company: getInputValue('appCompany'),
    manager: getInputValue('appManager'),
    template: getInputValue('appTemplate'),
    app: getInputValue('appApplication'),
    version: getInputValue('appVersion')
  };
  setSaveIndicator(true);
}

function resetToOriginal() {
  if (!originalSnapshot) return;
  setInputValue('coreCreator', originalSnapshot.creator);
  setInputValue('coreLastModifiedBy', originalSnapshot.lastModifiedBy);
  setInputValue('coreTitle', originalSnapshot.title);
  setInputValue('coreSubject', originalSnapshot.subject);
  setInputValue('coreKeywords', originalSnapshot.keywords);
  setInputValue('coreCategory', originalSnapshot.category);
  setInputValue('coreContentStatus', originalSnapshot.contentStatus);
  setInputValue('coreDescription', originalSnapshot.description);
  setInputValue('coreRevision', originalSnapshot.revision);
  setInputValue('coreCreated', originalSnapshot.created);
  setInputValue('coreModified', originalSnapshot.modified);
  setInputValue('appTotalTime', originalSnapshot.totalTime);
  setInputValue('appCompany', originalSnapshot.company);
  setInputValue('appManager', originalSnapshot.manager);
  setInputValue('appTemplate', originalSnapshot.template);
  setInputValue('appApplication', originalSnapshot.app);
  setInputValue('appVersion', originalSnapshot.version);

  updateTotalTimeHuman(originalSnapshot.totalTime);
  syncFormToXmlDocs();
  showToast('🔄 Pôvodné hodnoty boli obnovené.');
}

// -----------------------------------------------------------------------------
// Export and Download
// -----------------------------------------------------------------------------
async function downloadModifiedFile() {
  if (!currentZip || !currentFile) return;

  syncFormToXmlDocs();

  const serializer = new XMLSerializer();

  // Pack core.xml
  if (xmlDocs.core) {
    const coreXmlStr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + serializer.serializeToString(xmlDocs.core);
    currentZip.file('docProps/core.xml', coreXmlStr);
  }

  // Pack app.xml
  if (xmlDocs.app) {
    const appXmlStr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + serializer.serializeToString(xmlDocs.app);
    currentZip.file('docProps/app.xml', appXmlStr);
  }

  // Pack custom.xml
  if (xmlDocs.custom) {
    const customXmlStr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + serializer.serializeToString(xmlDocs.custom);
    currentZip.file('docProps/custom.xml', customXmlStr);
  }

  // Generate output blob
  const outputBlob = await currentZip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Filename
  const origName = currentFile.name;
  const lastDot = origName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? origName.substring(0, lastDot) : origName;
  const ext = lastDot !== -1 ? origName.substring(lastDot) : '';
  const newName = `${baseName}_upravene${ext}`;

  // Trigger download
  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = newName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setSaveIndicator(true);
  showToast(`Súbor '${newName}' bol úspešne exportovaný!`);
}

function copySummaryToClipboard() {
  syncFormToXmlDocs();
  const summary = `
========================================
 PREHĽAD METADÁT: ${currentFile ? currentFile.name : 'Dokument'}
========================================
- Autor (Creator): ${getInputValue('coreCreator')}
- Posledný editor: ${getInputValue('coreLastModifiedBy')}
- Názov dokumentu: ${getInputValue('coreTitle')}
- Predmet: ${getInputValue('coreSubject')}
- Číslo revízie: ${getInputValue('coreRevision')}
- Celkový čas úprav: ${getInputValue('appTotalTime')} minút (${formatHumanMinutes(getInputValue('appTotalTime'))})
- Vytvorené: ${getInputValue('coreCreated')}
- Upravené: ${getInputValue('coreModified')}
- Spoločnosť: ${getInputValue('appCompany')}
- Manažér: ${getInputValue('appManager')}
- Šablóna: ${getInputValue('appTemplate')}
- Počet strán: ${getInputValue('appPages')}
- Počet slov: ${getInputValue('appWords')}
========================================
  `.trim();

  navigator.clipboard.writeText(summary).then(() => {
    showToast('📋 Prehľad metadát bol skopírovaný do schránky!');
  });
}

// -----------------------------------------------------------------------------
// Interactive Events Registration
// -----------------------------------------------------------------------------
function initEvents() {
  // Field auto-sync
  const formInputs = document.querySelectorAll('.form-input, .form-textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', () => {
      markUnsaved();
      if (input.id === 'appTotalTime') {
        updateTotalTimeHuman(input.value);
      }
    });
  });

  // Buttons
  document.getElementById('btnChangeFile').addEventListener('click', () => {
    dropzoneSection.style.display = 'block';
    editorSection.style.display = 'none';
    saveBar.style.display = 'none';
    fileInput.value = '';
  });

  document.getElementById('btnQuickAnonymize').addEventListener('click', quickAnonymize);
  document.getElementById('btnQuickTime120').addEventListener('click', () => setTotalTime(120));
  document.getElementById('btnQuickTime480').addEventListener('click', () => setTotalTime(480));
  document.getElementById('btnQuickSyncDates').addEventListener('click', quickSyncDates);
  document.getElementById('btnQuickReset').addEventListener('click', resetToOriginal);

  document.getElementById('btnDownload').addEventListener('click', downloadModifiedFile);
  document.getElementById('btnCopySummary').addEventListener('click', copySummaryToClipboard);

  document.getElementById('btnAddCustomProp').addEventListener('click', () => {
    const name = document.getElementById('newCustomName').value;
    const val = document.getElementById('newCustomValue').value;
    addCustomProperty(name, val);
  });

  // Raw XML Buttons
  document.querySelectorAll('.xml-file-picker button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.xml-file-picker button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadRawXmlIntoEditor(btn.getAttribute('data-xml-file'));
    });
  });

  document.getElementById('btnPrettifyXml').addEventListener('click', () => {
    rawXmlEditor.value = formatXml(rawXmlEditor.value);
    showToast('XML bolo naformátované.');
  });

  document.getElementById('btnApplyRawXml').addEventListener('click', applyRawXmlChanges);

  // Sample document button
  document.getElementById('btnSampleDoc').addEventListener('click', loadSampleDocument);
}

// -----------------------------------------------------------------------------
// Helpers & Default Templates
// -----------------------------------------------------------------------------
function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function setField(id, val) {
  setInputValue(id, val);
  markUnsaved();
}

function clearField(id) {
  setInputValue(id, '');
  markUnsaved();
}

function copyField(sourceId, targetId) {
  setInputValue(targetId, getInputValue(sourceId));
  markUnsaved();
}

function setFieldToNow(id) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const formatted = now.toISOString().slice(0, 16);
  setInputValue(id, formatted);
  markUnsaved();
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

function updateTotalTimeHuman(minutes) {
  const label = document.getElementById('totalTimeHuman');
  label.textContent = `Zodpovedá: ${formatHumanMinutes(minutes)}`;
}

function formatHumanMinutes(min) {
  const m = parseInt(min, 10);
  if (isNaN(m) || m <= 0) return '0 minút';
  const hours = Math.floor(m / 60);
  const remainingMin = m % 60;
  if (hours === 0) return `${remainingMin} minút`;
  if (remainingMin === 0) return `${hours} hod`;
  return `${hours} hod ${remainingMin} min`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function markUnsaved() {
  setSaveIndicator(false);
}

function setSaveIndicator(isSynced) {
  const ind = document.getElementById('saveIndicator');
  const txt = document.getElementById('saveStatusText');
  if (isSynced) {
    ind.className = 'status-indicator synced';
    txt.textContent = 'Všetky zmeny uložené';
  } else {
    ind.className = 'status-indicator';
    txt.textContent = 'Máte neuložené zmeny';
  }
}

function showToast(msg) {
  toastMessageEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createDefaultCoreXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="${NS.cp}" xmlns:dc="${NS.dc}" xmlns:dcterms="${NS.dcterms}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
</cp:coreProperties>`;
}

function createDefaultAppXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS.ep}" xmlns:vt="${NS.vt}">
</Properties>`;
}

function createDefaultCustomXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${NS.cust}" xmlns:vt="${NS.vt}">
</Properties>`;
}

// -----------------------------------------------------------------------------
// Interactive Sample Document Generator
// -----------------------------------------------------------------------------
async function loadSampleDocument() {
  const sampleZip = new JSZip();

  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" 
                   xmlns:dc="http://purl.org/dc/elements/1.1/" 
                   xmlns:dcterms="http://purl.org/dc/terms/" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>Diplomová práca - Analýza trhových anomálií</dc:title>
    <dc:subject>Aplikovaná ekonometria a financie</dc:subject>
    <dc:creator>Ján Novák</dc:creator>
    <cp:keywords>financie, investície, analýza, dáta</cp:keywords>
    <dc:description>Záverečná diplomová práca pre obhajobu.</dc:description>
    <cp:lastModifiedBy>Peter Vedúci</cp:lastModifiedBy>
    <cp:revision>28</cp:revision>
    <dcterms:created xsi:type="dcterms:W3CDTF">2025-11-10T09:15:00Z</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">2026-02-28T16:45:00Z</dcterms:modified>
    <cp:category>Záverečné práce</cp:category>
    <cp:contentStatus>Finálna verzia</cp:contentStatus>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Template>C:\\Users\\JanNovak\\AppData\\Roaming\\Microsoft\\Templates\\Normal.dotm</Template>
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
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Interné Číslo"><vt:lpwstr>INT-2026-DOC-042</vt:lpwstr></property>
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="Klasifikácia"><vt:lpwstr>Dôverné</vt:lpwstr></property>
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
  const fakeFile = new File([blob], 'Vzorova_diplomovka.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  loadFile(fakeFile);
}
