# DocProps Studio

Desktopová aplikácia pre Windows na prehliadanie, úpravu a anonymizáciu metadát v kancelárskych dokumentoch Microsoft Office (`.docx`, `.xlsx`, `.pptx`).

---

## Základné fakty

- **100% lokálne a bezpečné:** Všetky úpravy prebiehajú priamo vo vašom počítači. Žiadne dáta sa neodosielajú na internet, aplikácia nevyžaduje žiadne API kľúče, prihlásenie ani účty.
- **Podporované formáty:**
  - Microsoft Word (`.docx`, `.docm`, `.dotx`, `.dotm`)
  - Microsoft Excel (`.xlsx`, `.xlsm`, `.xltx`, `.xltm`)
  - Microsoft PowerPoint (`.pptx`, `.pptm`, `.potx`, `.potm`)
- **Aké atribúty je možné upravovať:**
  - Pôvodný autor (`Creator`), posledný editor (`LastModifiedBy`), názov, predmet, kategória, stav obsahu
  - Celkový zaznamenaný čas úprav (`TotalTime` v minútach) a číslo revízie (`Revision`)
  - Počítadlá obsahu: slová (`Words`), strany (`Pages`), znaky, riadky, odseky, snímky (`Slides`)
  - Lokálna cesta k šablóne (`Template` - Normal.dotm)
  - Časové pečiatky vytvorenia a úpravy (`Created`, `Modified`)
  - Používateľské atribúty (`custom.xml`) a priamy editor surových XML súborov
- **Rýchle akcie na jedno kliknutie:**
  - **Anonymizovať stopy:** Vyčistí mená autorov, editora a spoločnosť.
  - **Zosúladiť dátumy:** Zosúladí dátum poslednej úpravy s dátumom vytvorenia.
  - **Očistiť Normal.dotm:** Odstráni z Word dokumentu lokálnu cestu na disku.

---

## Inštalácia a spustenie

### Požiadavky
- [Node.js](https://nodejs.org/) (verzia 18 alebo novšia)
- Windows 10 alebo Windows 11 (64-bit)

### 1. Klonovanie a inštalácia závislostí
```bash
git clone https://github.com/pol0234/DOCX_metadata_editor.git
cd DOCX_metadata_editor
npm install
```

### 2. Spustenie aplikácie
```bash
npm start
```

### 3. Zostavenie vlastného .exe (Portable)
Ak chcete vytvoriť samostatný `.exe` súbor, ktorý je možné spúšťať bez Node.js:
```bash
npm run pack
```
Výsledný súbor nájdete v priečinku:
```
dist/DocProps Studio-win32-x64/DocProps Studio.exe
```

---

## Klávesové skratky

| Skratka | Funkcia |
|---|---|
| `Ctrl + O` | Otvoriť dokument |
| `Ctrl + S` | Uložiť zmeny priamo do otvoreného súboru |
| `Drag & Drop` | Pretiahnutie súboru myšou priamo do okna |

---

## Testovanie

Spustenie automatizovaných Playwright testov:
```bash
npm test
```

---

## Alternatívne CLI (Python)

Pre použitie v termináli alebo dávkových skriptoch je k dispozícii skript `cli_editor.py`:
```bash
python cli_editor.py inspect "dokument.docx"
python cli_editor.py edit "dokument.docx" --author "Nový Autor" --total-time 120
# alebo s aliasom 'set':
python cli_editor.py set "dokument.docx" --author "Nový Autor" --total-time 120
```

---

## Bezpečnosť a ochrana súkromia

Aplikácia je postavená na prísnych bezpečnostných pravidlách (Zero-Telemetry & Local Isolation):
- Zavedená striktná hlavička **Content Security Policy (CSP)**.
- Zamedzený vzdialený sieťový prístup (`connect-src 'none'`).
- Izolované runtime prostredie s `contextIsolation: true` a validovanými IPC kanálmi.
- Viac informácií nájdete v priloženom [SECURITY.md](SECURITY.md).

---

## Licencia

MIT License — voľné použitie pre osobné aj komerčné účely.
