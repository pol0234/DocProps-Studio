# Bezpečnostná politika (Security Policy)

## 1. Lokálny bezpečnostný model (Zero-Leak Guarantee)

Aplikácia **DocProps Studio** bola navrhnutá s dôrazom na maximálne súkromie používateľov:

- **100% Lokálne spracovanie:** Všetky operácie s dokumentmi (rozbaľovanie ZIP kontajnerov, parsovanie XML, úprava atribútov a spätné balenie) prebiehajú výhradne v lokálnej pamäti vášho počítača.
- **Nulové sieťové požiadavky (No Telemetry / No Network):** Aplikácia neodosiela žiadne telemetrické dáta, analytiku ani obsah dokumentov na žiadne vzdialené servery ani cloudy.
- **Nulové API kľúče a tajomstvá:** Zdrojový kód neobsahuje ani nevyžaduje žiadne API kľúče, tokeny tretích strán ani externé predplatné.
- **Izolácia procesov:** V desktopovom režime Electron beží aplikácia so zapnutou izoláciou kontextu (`contextIsolation: true`) a vypnutým prístupom k `nodeIntegration` v okne prehliadača.

---

## 2. Nahlásenie bezpečnostných zraniteľností

Ak objavíte bezpečnostný problém alebo zraniteľnosť:
- Vytvorte prosím privátne bezpečnostné hlásenie (Security Advisory) priamo na GitHube repozitára cez záložku **Security -> Report a vulnerability**.
- Prípadne nahláste problém cez GitHub Issues s označením `[security]`.

---

## 3. Zrieknutie sa zodpovednosti (Disclaimer)

Aplikácia je poskytovaná v stave „tak ako je“ (AS IS) bez akýchkoľvek záruk v zmysle licencie MIT. Používateľ je zodpovedný za dodržiavanie interných pravidiel svojej inštitúcie alebo organizácie pri správe dokumentov.

