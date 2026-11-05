# DocProps Studio 📑
> **Moderný, minimalistický editor skrytých metadát a hardkódov pre Office dokumenty (DOCX, PPTX, XLSX)**  
> Navrhnutý s dôrazom na čistý Apple dizajn, súkromie a jednoduchosť ovládania priamo vo Windowse.

---

## 💡 Prečo táto aplikácia vznikla?

Dokumenty balíka Microsoft Office (Word `.docx`, PowerPoint `.pptx`, Excel `.xlsx`) sú v skutočnosti špeciálne zabalené **ZIP archívy (OpenXML)**, ktoré vo svojom vnútri obsahujú XML súbory:
- `docProps/core.xml` (základné informácie o autorovi, revíziách, dátumoch)
- `docProps/app.xml` (rozšírené systémové vlastnosti, celkový čas úprav, štatistiky)
- `docProps/custom.xml` (vlastné firemné atribúty a identifikátory)

Niektoré z týchto údajov Office programy **„hardkódujú“** a v bežnom používateľskom rozhraní Wordu či PowerPointu ich **nie je možné upraviť**:
1. **`TotalTime` (Celkový čas úprav v minútach):** Word a PowerPoint neustále počítajú každú minútu práce. Školy, univerzity a zamestnávatelia často kontrolujú, či študent alebo zamestnanec strávil nad prácou hodiny, alebo iba pár minút.
2. **`Revision` (Číslo revízie):** Počet uložení dokumentu.
3. **`Creator` a `LastModifiedBy`:** Často odhaľujú skutočné meno účtu Windows / Office.
4. **`Template` (Cesta k šablóne):** Často odhaľuje internú cestu na disku vrátane vášho používateľského mena na počítači (napr. `C:\Users\MenoPriezvisko\AppData\...`).
5. **Dátumy vytvorenia a úpravy:** Často nesedia s časom odovzdania.

Doteraz bolo nutné súbor manuálne otvárať cez **7-Zip / WinRAR**, vybrať z neho XML súbor, ručne v ňom nájsť príslušný tag, prepísať text, uložiť a znova zabaliť do archívu. 

**DocProps Studio toto všetko zjednocuje do jedného čistého prostredia s jednoduchým Drag & Drop.**

---

## ✨ Kľúčové funkcie

- 🍏 **Čistý Apple dizajn (Apple HIG):**
  - Jemné matné sklo (`backdrop-filter: blur`), natívna typografia, plynulé reakcie a nulový vizuálny balast.
  - Podpora pre **Svetlý aj Tmavý motív** (Light & Dark mode).
- 🖱️ **Drag & Drop:** Stačí pretiahnuť Word, PowerPoint alebo Excel priamo do okna.
- ⏱️ **Editácia času úprav (TotalTime):**
  - Prepíšte celkový čas na ľubovoľný počet minút.
  - Rýchle predvoľby (15 min, 1 hod, 3 hod, 8 hod, 20 hod).
  - Živý prepočet na hodiny a minúty.
- 🛡️ **Anonymizácia na 1 klik:**
  - Odstráni autora, posledného editora, organizáciu, manažéra a zresetuje cestu k šablóne.
- 📅 **Časový synchronizátor:**
  - Zosúlaďte čas vytvorenia a poslednej úpravy na aktuálnu sekundu alebo konkrétny dátum.
- 📊 **Kompletné štatistiky:**
  - Úprava počtu strán, slov, znakov, riadkov, odsekov (Word) a slidov či poznámok (PowerPoint).
- ⚙️ **Vlastné atribúty (Custom Properties):**
  - Prehľad, editácia, pridávanie a mazanie firemných vlastností.
- 📄 **Surový XML editor (7-Zip mód):**
  - Priamy integrovaný editor pre `core.xml`, `app.xml` a `custom.xml` s automatickým formátovaním (Prettify) a syntaxovou validáciou.
- 🔒 **100% Súkromie (Offline):**
  - Žiadne dáta nikdy neopúšťajú váš počítač. Všetko prebieha lokálne v pamäti pomocou JSZip a HTML5 File API.

---

## 🚀 Ako aplikáciu spustiť na Windowse

Máte k dispozícii **3 jednoduché spôsoby**:

### 1. Spôsob: Jedným klikom (Najrýchlejší)
- Dvakrát kliknite na súbor **`Spustiť_aplikáciu.bat`** (alebo priamo otvorte `index.html` v ľubovoľnom prehliadači Edge, Chrome, Firefox, Brave).
- Aplikácia sa okamžite načíta a funguje aj bez internetového pripojenia.

### 2. Spôsob: Lokálny Web Server
- Dvakrát kliknite na súbor **`Spustiť_server.bat`** (alebo spustite `python server.py`).
- Spustí sa lokálny server na `http://localhost:8080` a automaticky otvorí prehliadač.

### 3. Spôsob: Príkazový riadok (CLI)
Ak chcete analyzovať alebo hromadne upravovať metadáta priamo v termináli / PowerShelli:

```powershell
# Zobraziť všetky metadáta súboru
python cli_editor.py inspect "cesta\k\dokumentu.docx"

# Zmeniť čas úprav na 480 minút (8 hodín) a nastaviť autora
python cli_editor.py edit "cesta\k\dokumentu.docx" --total-time 480 --author "Ing. Ján Novák" --out "upraveny.docx"

# Kompletná anonymizácia súboru (odstránenie autora, firmy a editora)
python cli_editor.py edit "cesta\k\dokumentu.docx" --anonymize --out "anonymny.docx"
```

---

## 📁 Podporované formáty

| Program | Formáty |
| :--- | :--- |
| **Microsoft Word** | `.docx`, `.dotx`, `.docm`, `.dotm` |
| **Microsoft PowerPoint** | `.pptx`, `.potx`, `.pptm`, `.potm` |
| **Microsoft Excel** | `.xlsx`, `.xltx`, `.xlsm`, `.xltm` |

---

## 🧪 Vyskúšanie na testovacích vzorkách

V priečinku `samples/` sú pripravené testovacie súbory:
- `samples/vzorka_diplomovka.docx` (Word dokument so skrytým časom 540 minút a šablónou)
- `samples/vzorka_prezentacia.pptx` (PowerPoint prezentácia s 36 slidmi a časom 195 minút)
- `samples/vzorka_rozpocet.xlsx` (Excel tabuľka s firemnými vlastnosťami)

V aplikácii môžete tiež priamo v hlavičke kliknúť na **„Vyskúšať vzorku“**, čím sa okamžite načíta interaktívny vzorový dokument.

---

## 🛠️ Použité technológie

- **HTML5 & CSS3:** Apple Human Interface Guidelines, moderný Grid & Flexbox, CSS premenné, Glassmorphism backdrop-filter.
- **JSZip:** Rýchle a bezpečné klientske rozbaľovanie a kompresia ZIP kontajnerov priamo v prehliadači.
- **Vanilla JavaScript:** Čistý, bezpečný kód bez zbytočných frameworkov s okamžitou odozvou (0 ms latency).
- **Python 3:** CLI editor postavený na štandardných knižniciach `zipfile` a `xml.etree.ElementTree`.
