# Bezpečnostné pokyny a audit pre používateľov (Safety Guidelines)

Tento dokument slúži pre používateľov, ktorí si inštalujú alebo spúšťajú **DocProps Studio** na svojom počítači.

---

## 🔒 1. Prečo je aplikácia bezpečná?

1. **Čistý a overiteľný zdrojový kód:**
   - Aplikácia neobsahuje žiadne minifikované obfuscované skripty s výnimkou štandardnej knižnice `jszip.min.js`.
   - Všetka logika sa nachádza v prehľadných súboroch [`main.js`](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/main.js) a [`app.js`](file:///c:/Users/Admin/Documents/projektiky/DOCX_metadata_editor/app.js).

2. **Absencia sieťovej komunikácie:**
   - Aplikácia nevykonáva žiadne `fetch()`, `XMLHttpRequest` ani `WebSocket` volania na internet.
   - Všetky úpravy prebiehajú 100% v operačnej pamäti počítača (in-memory).
   - Vaše diplomové práce, firemné zmluvy, finančné tabuľky a dôverné prezentácie nikdy neopustia váš disk.

3. **Žiadne systémové zásahy do registrov:**
   - Aplikácia nemení registre systému Windows, nevytvára skryté služby na pozadí ani neinštaluje ovládače.
   - Odstránenie aplikácie je také jednoduché ako zmazanie priečinka so súbormi.

---

## 🛡️ 2. Pokyny pred zverejnením dokumentov (Privacy Checklist)

Pred odovzdaním alebo zverejnením upraveného dokumentu odporúčame skontrolovať:

1. **Autorské atribúty:**
   - Skontrolujte polia `Autor` a `Naposledy upravil`. Pre úplnú anonymizáciu použite tlačidlo **Anonymizovať stopy**.
2. **Cesta k šablóne (`Template`):**
   - Microsoft Word vkladá do dokumentu plnú cestu k lokálnej šablóne (napr. `C:\Users\VaseMeno\AppData\...`).
   - Nastavením hodnoty na `Normal.dotm` zabránite odhaleniu vášho používateľského mena vo Windowse.
3. **Čas úprav (`TotalTime`):**
   - Overte, či nastavený celkový čas zodpovedá požadovanému rozsahu práce (napr. 180 až 720 minút pri záverečných prácach).
4. **Náhľad v simulátore:**
   - Prepnite sa na záložku **Živý simulátor (Windows & Word)** a overte, ako presne uvidia vlastnosti súboru iné osoby.
