# DocProps Studio

[![CI Verification](https://github.com/pol0234/DOCX_metadata_editor/actions/workflows/ci.yml/badge.svg)](https://github.com/pol0234/DOCX_metadata_editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4.svg)]()

> A desktop application for Windows to inspect, edit, anonymize, and manage metadata in Microsoft Office OpenXML documents (`.docx`, `.xlsx`, `.pptx`).

---

## Key Highlights

- **100% Local & Private (Zero-Telemetry):** All document parsing, unpacking, and repackaging operations take place strictly in local memory. No files or telemetry are sent over the network, and no accounts, API keys, or cloud services are required.
- **Dynamic Office Formats:**
  - **Microsoft Word** (`.docx`, `.docm`, `.dotx`, `.dotm`) — Blue theme & word count metrics
  - **Microsoft Excel** (`.xlsx`, `.xlsm`, `.xltx`, `.xltm`) — Emerald green theme & workbook properties
  - **Microsoft PowerPoint** (`.pptx`, `.pptm`, `.potx`, `.potm`) — Red theme & slide counters
- **Comprehensive Metadata Control:**
  - **Identity & Authorship:** `Creator`, `LastModifiedBy`, Title, Subject, Category, Content Status, Description
  - **Revision History & Timestamps:** Total editing time (`TotalTime` in minutes), revision counter (`Revision`), `Created` and `Modified` timestamps
  - **Content Metrics:** Words, Pages, Characters (with/without spaces), Lines, Paragraphs, Slides, Notes, Hidden Slides
  - **Template Path Privacy:** Inspect and clean disk leak paths (`Template` / `Normal.dotm`)
  - **Custom Properties & Raw XML:** Manage key-value pairs in `custom.xml` or edit package XML files directly with the built-in raw XML editor and format validator
- **1-Click Privacy Actions:**
  - **Anonymize Footprints:** Instantly clear author, last editor, company, and comments.
  - **Synchronize Timestamps:** Align modification date precisely with creation date.
  - **Clean Normal.dotm:** Erase local filesystem paths leaking username and folder structure.

---

## Installation & Running

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- Windows 10 or Windows 11 (64-bit)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/pol0234/DOCX_metadata_editor.git
cd DOCX_metadata_editor
npm install
```

### 2. Launch the Application
```bash
npm start
```

### 3. Build Standalone Portable `.exe`
To package an independent executable that runs without requiring Node.js installed:
```bash
npm run pack
```
The compiled output will be generated in:
```
dist/DocProps Studio-win32-x64/DocProps Studio.exe
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + O` | Open file dialog |
| `Ctrl + S` | Save modifications directly into the active file |
| `Drag & Drop` | Drop any `.docx`, `.xlsx`, or `.pptx` file anywhere on the window |

---

## Testing & Quality Assurance

Run the automated Playwright end-to-end verification test suite:
```bash
npm test
```
The suite verifies file loading, attribute modification, XML package generation, dynamic format theming (Word/Excel/PPTX), and responsive layout safety zones across all viewport widths.

---

## Standalone Python CLI

For automated scripts, pipelines, or headless servers, a standalone Python CLI script (`cli_editor.py`) is included using only the Python standard library:

```bash
# Inspect all metadata in a document
python cli_editor.py inspect "document.docx"

# Edit metadata attributes
python cli_editor.py edit "document.docx" --author "John Doe" --total-time 120

# Alternatively, using the 'set' alias:
python cli_editor.py set "document.docx" --author "John Doe" --total-time 120

# Anonymize personal traces (removes author, editor, company)
python cli_editor.py edit "document.docx" --anonymize
```

---

## Security & Privacy Policy

- **Content Security Policy (CSP):** Enforces strict origins (`connect-src 'none'`, disabling unauthorized remote connections).
- **Process Isolation:** Runs with `contextIsolation: true` and `nodeIntegration: false`, communicating solely through strictly validated IPC handlers.
- For vulnerability disclosures, please review [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the [MIT License](LICENSE) — free for both personal and commercial use.
