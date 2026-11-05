/**
 * DocProps Studio - Desktop Application Engine
 * Native Electron + Web fallback engine
 */

// Global State
let currentZip = null;
let currentFileInfo = {
  name: '',
  size: 0,
  path: ''
};

let activeSectionId = 'secIdentity';
let activeXmlPart = 'docProps/core.xml';

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
// Navigation Between Sections
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
      if (targetSec) targetSec.classList.add('active');

      // Update Breadcrumb
      document.getElementById('bcCurrentSection').textContent = item.querySelector('span').textContent;

      if (secId === 'secXml') {
        syncFormToXmlDocs();
        loadRawXmlIntoEditor(activeXmlPart);
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
    currentFileInfo = {
      name: fileName,
      size: fileSize,
      path: filePath
    };

    currentZip = await JSZip.loadAsync(buffer);
    await parseArchiveMetadata();

    // Show Workspace, Hide Empty Dropzone
    document.getElementById('viewEmptyState').style.display = 'none';
    document.getElementById('viewFormSections').style.display = 'block';
    document.getElementById('sidebarDocCard').style.display = 'flex';
    document.getElementById('sidebarActions').style.display = 'flex';
    document.getElementById('toolbarControls').style.display = 'flex';

    // Update UI headers
    updateDocumentMetadataHeader();
    setStatus(true, 'Dokument načítaný');
    showToastNotice(`Dokument '${fileName}' bol úspešne otvorený.`);
  } catch (err) {
    console.error(err);
    alert('Neplatný formát OpenXML archívu. Uistite sa, že súbor nie je poškodený.');
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
  badge.className = 'doc-type-icon';

  if (['docx', 'docm', 'dotx', 'dotm'].includes(ext)) {
    badge.classList.add('type-word');
    badge.textContent = 'DOC';
    document.getElementById('packageFormat').textContent = 'WordprocessingML (DOCX)';
  } else if (['pptx', 'pptm', 'potx', 'potm'].includes(ext)) {
    badge.classList.add('type-pptx');
    badge.textContent = 'PPT';
    document.getElementById('packageFormat').textContent = 'PresentationML (PPTX)';
  } else if (['xlsx', 'xlsm', 'xltx', 'xltm'].includes(ext)) {
    badge.classList.add('type-xlsx');
    badge.textContent = 'XLS';
    document.getElementById('packageFormat').textContent = 'SpreadsheetML (XLSX)';
  } else {
    badge.classList.add('type-generic');
    badge.textContent = ext.toUpperCase().substring(0, 3);
  }
}

// -----------------------------------------------------------------------------
// XML Parsing & Form Population
// -----------------------------------------------------------------------------
async function parseArchiveMetadata() {
  const parser = new DOMParser();

  // Core Properties
  const coreFile = currentZip.file('docProps/core.xml');
  if (coreFile) {
    const text = await coreFile.async('text');
    xmlDocs.core = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.core = parser.parseFromString(createBlankCoreXml(), 'application/xml');
  }

  // App Properties
  const appFile = currentZip.file('docProps/app.xml');
  if (appFile) {
    const text = await appFile.async('text');
    xmlDocs.app = parser.parseFromString(text, 'application/xml');
  } else {
    xmlDocs.app = parser.parseFromString(createBlankAppXml(), 'application/xml');
  }

  // Custom Properties
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
  document.getElementById('bentoRevision').textContent = `Rev. ${rev}`;

  // Dates
  setVal('fCreated', isoToDatetimeLocal(getTagValue(xmlDocs.core, 'created')));
  setVal('fModified', isoToDatetimeLocal(getTagValue(xmlDocs.core, 'modified')));

  // App (Total Time)
  const totalMin = parseInt(getTagValue(xmlDocs.app, 'TotalTime') || '0', 10);
  setTotalMinutes(totalMin, false);

  // App (Structure)
  const pages = getTagValue(xmlDocs.app, 'Pages') || '0';
  const words = getTagValue(xmlDocs.app, 'Words') || '0';
  const slides = getTagValue(xmlDocs.app, 'Slides') || '0';

  setVal('fCompany', getTagValue(xmlDocs.app, 'Company'));
  setVal('fManager', getTagValue(xmlDocs.app, 'Manager'));
  setVal('fTemplate', getTagValue(xmlDocs.app, 'Template'));
  setVal('fApplication', getTagValue(xmlDocs.app, 'Application'));
  setVal('fAppVersion', getTagValue(xmlDocs.app, 'AppVersion'));

  setVal('fPages', pages);
  setVal('fWords', words);
  setVal('fCharacters', getTagValue(xmlDocs.app, 'Characters'));
  setVal('fCharactersWithSpaces', getTagValue(xmlDocs.app, 'CharactersWithSpaces'));
  setVal('fParagraphs', getTagValue(xmlDocs.app, 'Paragraphs'));
  setVal('fLines', getTagValue(xmlDocs.app, 'Lines'));
  setVal('fSlides', slides);
  setVal('fNotes', getTagValue(xmlDocs.app, 'Notes'));

  // Update Bento Stats
  if (parseInt(slides, 10) > 0) {
    document.getElementById('bentoScope').textContent = `${slides} snímkov`;
  } else if (parseInt(pages, 10) > 0) {
    document.getElementById('bentoScope').textContent = `${pages} strán`;
  } else {
    document.getElementById('bentoScope').textContent = `-`;
  }
  document.getElementById('bentoWords').textContent = Number(words).toLocaleString();

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

  // App
  setTagValue(xmlDocs.app, 'TotalTime', 'TotalTime', getVal('fTotalTimeExact'));
  setTagValue(xmlDocs.app, 'Company', 'Company', getVal('fCompany'));
  setTagValue(xmlDocs.app, 'Manager', 'Manager', getVal('fManager'));
  setTagValue(xmlDocs.app, 'Template', 'Template', getVal('fTemplate'));
  setTagValue(xmlDocs.app, 'Application', 'Application', getVal('fApplication'));
  setTagValue(xmlDocs.app, 'AppVersion', 'AppVersion', getVal('fAppVersion'));

  setTagValue(xmlDocs.app, 'Pages', 'Pages', getVal('fPages'));
  setTagValue(xmlDocs.app, 'Words', 'Words', getVal('fWords'));
  setTagValue(xmlDocs.app, 'Characters', 'Characters', getVal('fCharacters'));
  setTagValue(xmlDocs.app, 'CharactersWithSpaces', 'CharactersWithSpaces', getVal('fCharactersWithSpaces'));
  setTagValue(xmlDocs.app, 'Paragraphs', 'Paragraphs', getVal('fParagraphs'));
  setTagValue(xmlDocs.app, 'Lines', 'Lines', getVal('fLines'));
  setTagValue(xmlDocs.app, 'Slides', 'Slides', getVal('fSlides'));
  setTagValue(xmlDocs.app, 'Notes', 'Notes', getVal('fNotes'));

  document.getElementById('bentoRevision').textContent = `Rev. ${getVal('fRevision') || '1'}`;
}

// -----------------------------------------------------------------------------
// Total Time Logic
// -----------------------------------------------------------------------------
function setTotalMinutes(minutes, triggerSync = true) {
  const m = parseInt(minutes, 10) || 0;
  document.getElementById('fTotalTimeExact').value = m;
  document.getElementById('fTotalTimeRange').value = Math.min(m, 1800);
  document.getElementById('timingLargeDisplay').textContent = `${m} min`;
  document.getElementById('timingHumanConverted').textContent = `Zodpovedá: ${formatMinutesToHuman(m)}`;
  document.getElementById('bentoTime').textContent = formatMinutesToShort(m);

  if (triggerSync) {
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
// Raw XML Code Inspector
// -----------------------------------------------------------------------------
function loadRawXmlIntoEditor(partPath) {
  activeXmlPart = partPath;
  const serializer = new XMLSerializer();
  let doc = null;

  if (partPath === 'docProps/core.xml') doc = xmlDocs.core;
  else if (partPath === 'docProps/app.xml') doc = xmlDocs.app;
  else if (partPath === 'docProps/custom.xml') doc = xmlDocs.custom;

  const editor = document.getElementById('xmlCodeEditor');
  if (doc) {
    const raw = serializer.serializeToString(doc);
    editor.value = formatXml(raw);
    document.getElementById('xmlStatusNotice').textContent = 'Syntax: Valid';
    document.getElementById('xmlStatusNotice').style.color = '#22c55e';
  } else {
    editor.value = `<!-- Súbor ${partPath} v tomto balíku neexistuje -->`;
  }
}

function applyXmlCodeChanges() {
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

  document.getElementById('xmlStatusNotice').textContent = 'Syntax: Valid & Aplikované';
  document.getElementById('xmlStatusNotice').style.color = '#22c55e';

  if (activeXmlPart === 'docProps/core.xml') xmlDocs.core = doc;
  else if (activeXmlPart === 'docProps/app.xml') xmlDocs.app = doc;
  else if (activeXmlPart === 'docProps/custom.xml') xmlDocs.custom = doc;

  populateForm();
  setStatus(false, 'Aplikované zmeny z XML');
  showToastNotice(`Zmeny v '${activeXmlPart}' boli úspešne uložené.`);
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
  showToastNotice('Osobné identifikačné údaje a cesta k šablóne boli vymazané.');
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

    setStatus(true, 'Stiahnuté');
    showToastNotice(`Súbor '${exportName}' bol vyexportovaný.`);
  }
}

// -----------------------------------------------------------------------------
// Interactive Events & Helpers
// -----------------------------------------------------------------------------
function initEvents() {
  // Input changes
  document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('input', () => {
      setStatus(false, 'Máte neuložené zmeny');
    });
  });

  // Slider change
  document.getElementById('fTotalTimeRange').addEventListener('input', (e) => {
    setTotalMinutes(e.target.value);
  });

  document.getElementById('fTotalTimeExact').addEventListener('input', (e) => {
    setTotalMinutes(e.target.value);
  });

  // Quick Action Buttons
  document.getElementById('btnActionAnonymize').addEventListener('click', actionSanitize);
  document.getElementById('btnActionSyncDates').addEventListener('click', actionSyncDates);
  document.getElementById('btnActionClearTemplate').addEventListener('click', actionClearTemplate);

  // Toolbar Buttons
  document.getElementById('btnExportPrimary').addEventListener('click', exportModifiedPackage);
  document.getElementById('btnOpenFileSecondary').addEventListener('click', () => {
    document.getElementById('systemFileInput').click();
  });

  // Custom prop add
  document.getElementById('btnAddNewProp').addEventListener('click', addNewCustomProperty);

  // XML Raw Buttons
  document.querySelectorAll('.raw-xml-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.raw-xml-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadRawXmlIntoEditor(btn.getAttribute('data-xml-part'));
    });
  });

  document.getElementById('btnPrettifyXmlCode').addEventListener('click', () => {
    const editor = document.getElementById('xmlCodeEditor');
    editor.value = formatXml(editor.value);
    showToastNotice('XML bolo naformátované.');
  });

  document.getElementById('btnApplyXmlCode').addEventListener('click', applyXmlCodeChanges);

  // Sample document
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
  setTimeout(() => toast.classList.remove('show'), 3000);
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
    <Template>C:\\Users\\Admin\\Templates\\Normal.dotm</Template>
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
