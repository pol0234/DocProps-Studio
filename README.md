# DocProps Studio

> **Profesionálna Windows desktopová aplikácia pre inšpekciu, hĺbkovú editáciu a anonymizáciu metadát v balíkoch Microsoft Office (DOCX, PPTX, XLSX).**  
> Postavená na architektúre Electron + JSZip s moderným Craft UI/UX dizajnovým systémom, natívnym desktopovým oknom, nulovým sledovaním a striktne lokálnym offline spracovaním.

---

## Prehľad riešenia

Dokumenty balíka Microsoft Office (`.docx`, `.pptx`, `.xlsx`) sú archívy typu OpenXML (ISO/IEC 29500). Obsahujú systémové XML deskriptory, v ktorých sú uložené vlastnosti, ktoré bežné používateľské rozhranie balíka Office neumožňuje modifikovať:

1. **`TotalTime` (Celkový čas úprav v minútach):** Počítadlo dĺžky práce zaznamenané aplikáciou Word/PowerPoint v `docProps/app.xml`.
2. **`Revision` (Číslo revízie):** Celkový počet uložení súboru v `docProps/core.xml`.
3. **`Creator` a `LastModifiedBy`:** Identifikátory autorstva previazané na používateľské kontá.
4. **`Template` (Cesta k šablóne):** Lokálna cesta na disku, ktorá prezrádza štruktúru priečinkov a meno používateľa (`C:\Users\Meno\AppData\...`).
5. **Dátumové pečiatky:** Čas vytvorenia a poslednej úpravy v UTC (`dcterms:created`, `dcterms:modified`).
6. **Surové textové štatistiky:** Počítadlo slov (`Words`), strán (`Pages`), riadkov, odsekov a znakov, prípadne snímkov a poznámok pre prezentácie.

**DocProps Studio** nahrádza potrebu manuálneho rozbaľovania cez archivačné nástroje (7-Zip, WinRAR) a poskytuje moderné grafické štúdio s okamžitou inšpekciou, živým Windows simulátorom a priamym prístupom k surovému XML archívu.

---

## Štruktúra repozitára & Distribúcia

> [!NOTE]
> **Tento repozitár obsahuje výhradne čistý zdrojový kód.**  
> Priečinok `dist/` s binárnym spustiteľným súborom (`DocProps Studio.exe`) je zámerne vylúčený cez `.gitignore` (veľkosť binárneho Electron prostredia presahuje 150 MB a nepatrí do git stromu). Každý používateľ si aplikáciu dokáže spustiť priamo alebo si jedným príkazom zostaviť vlastný samostatný `.exe` súbor podľa návodu nižšie.

---

## Rýchly štart & Lokálny Build

### Požiadavky
- [Node.js](https://nodejs.org/) (verzia 18 alebo novšia)
- Windows 10 alebo 11 (64-bit)

### Krok 1: Klonovanie repozitára a inštalácia
```bash
git clone https://github.com/pol0234/DOCX_metadata_editor.git
cd DOCX_metadata_editor
npm install
```

### Krok 2: Spustenie aplikácie (Režim vývoja / Desktop okno)
Aplikáciu spustíte okamžite bez potreby buildovania:
```bash
npm start
```

### Krok 3: Zostavenie vlastného prenosného súboru (.exe)
Ak chcete vygenerovať samostatnú prenosnú verziu aplikácie pre Windows, spustite:
```bash
npm run pack
```
Tento príkaz automaticky vytvorí priečinok:
```
dist/DocProps Studio-win32-x64/DocProps Studio.exe
```
Vygenerovaný súbor `DocProps Studio.exe` je plne prenosný (portable) a funguje na akomkoľvek 64-bitovom počítači so systémom Windows bez nutnosti inštalácie.

---

## Craft UI/UX Dizajnový systém

Aplikácia je navrhnutá podľa štandardov **Craft Web Design** a inšpirovaná rozhraniami ako *Linear*, *Raycast* a *21st.dev*:

- **Unified Glass Header:** Zjednotený horný panel okna integrujúci identitu aplikácie, dynamickú kontextovú kapsulu (`Island`) so živou stavovou kontrolkou a ovládacie prvky.
- **21st.dev Dynamic Cursor Spotlight:** Karty a formulárové polia reagujú na pohyb kurzora myši jemným svetelným lúčom po ich obvode.
- **Ambient Hero Canvas:** Interaktívny hviezdny mesh na pozadí prázdnej dropzone, ktorý reaguje na kurzor myši a automaticky sa uspí po načítaní súboru pre 0% zaťaženie CPU/GPU.
- **21st.dev Shiny Primary Button:** Hlavné tlačidlo pre uloženie s plynulým svetelným sweepom a haptickou odozvou.
- **Kontextová adaptácia formátov:** Rozhranie striktne oddeľuje polia textovej analýzy pre Word, prezentačné metriky pre PowerPoint a tabuľkové atribúty pre Excel.
- **Trvalý tmavý režim (Linear Obsidian):** Vynútené natívne tmavé scrollbary cez Electron engine aj systémové CSS pravidlá.

---

## Klávesové skratky

| Skratka | Akcia |
|---|---|
| **`Ctrl + O`** | Otvoriť Office dokument cez natívny dialóg Windows |
| **`Ctrl + S`** | Uložiť a exportovať upravený balík do nového súboru |
| **Drag & Drop** | Pretiahnutie súboru priamo do okna aplikácie z Prieskumníka |

---

## Alternatívne CLI rozhranie (Python)

Pre automatizáciu a dávkové spracovanie z príkazového riadku bez grafického rozhrania je k dispozícii samostatný skript [`cli_editor.py`](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/cli_editor.py) používajúci iba štandardnú knižnicu Pythonu:

```powershell
# Zobrazenie metadát
python cli_editor.py inspect "dokument.docx"

# Úprava času a autora
python cli_editor.py edit "dokument.docx" --total-time 480 --author "Ján Novák" --out "upravene.docx"

# Anonymizácia súboru (vyčistenie osobných stôp a Normal.dotm)
python cli_editor.py edit "dokument.docx" --anonymize --out "cisty.docx"
```

---

## Bezpečnosť a súkromie

- **100% Offline & Bezpečné:** Aplikácia neodosiela žiadne dáta na externé servery. Všetky operácie s OpenXML balíkmi prebiehajú striktne v pamäti vášho počítača.
- Podrobné bezpečnostné smernice nájdete v [`SAFETY_GUIDELINES.md`](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/SAFETY_GUIDELINES.md) a [`SECURITY.md`](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/SECURITY.md).

---

## Licencia

Tento projekt je licencovaný pod [MIT licenciou](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/LICENSE).
