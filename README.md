# DocProps Studio 

> **Profesionálna Windows desktopová aplikácia pre inšpekciu, hĺbkovú editáciu a anonymizáciu metadát v balíkoch Microsoft Office (DOCX, PPTX, XLSX).**  
> Postavená na architektúre Electron + JSZip s natívnym desktopovým oknom, nulovým sledovaním a striktne lokálnym spracovaním.

---

## Prehľad riešenia

Dokumenty Microsoft Office (`.docx`, `.pptx`, `.xlsx`) sú archívy typu OpenXML (ISO/IEC 29500). Obsahujú systémové XML deskriptory, v ktorých sú uložené vlastnosti, ktoré bežné rozhranie balíka Office neumožňuje používateľovi modifikovať:

1. **`TotalTime` (Celkový čas úprav v minútach):** Presné počítadlo dĺžky práce zaznamenané aplikáciou Word/PowerPoint.
2. **`Revision` (Číslo revízie):** Celkový počet uložení súboru.
3. **`Creator` a `LastModifiedBy`:** Identifikátory autorstva previazané na lokálne používateľské kontá.
4. **`Template` (Cesta k šablóne):** Lokálna cesta na disku, ktorá často prezrádza štruktúru priečinkov a meno používateľa (`C:\Users\Meno\AppData\...`).
5. **Dátumové pečiatky:** Čas vytvorenia a poslednej úpravy v UTC.

**DocProps Studio** nahrádza potrebu manuálneho rozbaľovania cez archivačné nástroje (7-Zip, WinRAR) a poskytuje ucelené desktopové štúdio s priamou inšpekciou hodnôt aj surového XML kódu.

---

## Architektúra & Dizajnový systém

- **Native Windows Desktop Window:** Aplikácia beží ako samostatný desktopový proces v okne Electronu s natívnymi dialógovými oknami systému Windows pre otváranie a ukladanie súborov.
- **Dizajnový systém:** Inšpirovaný utilitami ako Linear, Raycast a macOS Pro nástrojmi.
  - Tmavá paleta v bridlicových tónoch (`#0c0d0e`, `#141517`, `#191a1d`).
  - Rozvrhnutie Master-Detail s bočným inšpektorom a Bento dátovými blokmi.
  - Vektorová ikonografia (SVG) bez akýchkoľvek emoji alebo rušivých prvkov.
  - Typografia: Systémové UI písma pre rozhranie a monospace pre číselné metriky, časové pečiatky a XML kód.
  - Živý posuvník s automatickým prepočtom minút na hodiny a minúty.
  - Surový XML inšpektor so syntaxovou validáciou a automatickým formátovaním kódu.

---

## Spustenie a zostavenie (Build)

### 1. Spustenie hotového spustiteľného súboru (.exe)
Hotová zostavená aplikácia pre Windows (64-bit) sa nachádza v:
```
dist/DocProps Studio-win32-x64/DocProps Studio.exe
```
Stačí spustiť `DocProps Studio.exe`. Aplikácia nevyžaduje inštaláciu (portable režim) a beží okamžite.

### 2. Spustenie vo vývojovom režime
```bash
# Spustenie aplikácie priamo v Electrone
npm start
```

### 3. Opätovné zostavenie (Packaging)
```bash
npm run pack
```
Tento príkaz vygeneruje nový Windows spustiteľný balík do priečinka `dist/`.

---

## Klávesové skratky

- **`Ctrl + O`** – Otvoriť dokument cez natívny dialóg Windows
- **`Ctrl + S`** – Uložiť a vyexportovať modifikovaný dokument
- **Drag & Drop** – Pretiahnutie súboru priamo do okna aplikácie z Prieskumníka

---

## Alternatívne CLI rozhranie (Python)

Pre automatizáciu a dávkové spracovanie z príkazového riadku je k dispozícii samostatný skript [`cli_editor.py`](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/cli_editor.py):

```powershell
# Zobrazenie metadát
python cli_editor.py inspect "cesta\k\suboru.docx"

# Úprava času a autora
python cli_editor.py edit "cesta\k\suboru.docx" --total-time 480 --author "Novy Autor" --out "vystup.docx"

# Anonymizácia súboru
python cli_editor.py edit "cesta\k\suboru.docx" --anonymize --out "anonymny.docx"
```
