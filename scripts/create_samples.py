"""
Generátor vzorových Office dokumentov (DOCX, PPTX, XLSX) na testovanie metadát.
"""
import zipfile
import os

def create_sample_files(dest_dir="samples"):
    os.makedirs(dest_dir, exist_ok=True)

    core_xml_template = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" 
                   xmlns:dc="http://purl.org/dc/elements/1.1/" 
                   xmlns:dcterms="http://purl.org/dc/terms/" 
                   xmlns:dcmitype="http://purl.org/dc/dcmitype/" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>{title}</dc:title>
    <dc:subject>{subject}</dc:subject>
    <dc:creator>{author}</dc:creator>
    <cp:keywords>{keywords}</cp:keywords>
    <dc:description>{desc}</dc:description>
    <cp:lastModifiedBy>{modified_by}</cp:lastModifiedBy>
    <cp:revision>{revision}</cp:revision>
    <dcterms:created xsi:type="dcterms:W3CDTF">2025-10-15T08:30:00Z</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">2026-02-28T16:45:00Z</dcterms:modified>
    <cp:category>{category}</cp:category>
    <cp:contentStatus>Finálna verzia</cp:contentStatus>
</cp:coreProperties>"""

    docx_app_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Properties>"""

    pptx_app_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <TotalTime>195</TotalTime>
    <Words>2850</Words>
    <Application>Microsoft Office PowerPoint</Application>
    <PresentationFormat>Širokouhlý formát (16:9)</PresentationFormat>
    <Paragraphs>230</Paragraphs>
    <Slides>36</Slides>
    <Notes>8</Notes>
    <HiddenSlides>2</HiddenSlides>
    <MMClips>1</MMClips>
    <ScaleCrop>false</ScaleCrop>
    <Company>Kreatívna Agentúra Digital</Company>
    <Manager>Ing. Elena Kováčová</Manager>
    <Template>Corporate_Pitch_Deck_2026.potx</Template>
    <AppVersion>16.0000</AppVersion>
</Properties>"""

    xlsx_app_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Application>Microsoft Excel</Application>
    <DocSecurity>0</DocSecurity>
    <ScaleCrop>false</ScaleCrop>
    <Company>FinStat Audit s.r.o.</Company>
    <Manager>Ing. Peter Malý</Manager>
    <AppVersion>16.0000</AppVersion>
</Properties>"""

    custom_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Interné Číslo"><vt:lpwstr>INT-2026-DOC-042</vt:lpwstr></property>
    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="Dôvernosť"><vt:lpwstr>Prísne tajné</vt:lpwstr></property>
</Properties>"""

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    <Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>
</Relationships>"""

    files = [
        (
            os.path.join(dest_dir, "vzorka_diplomovka.docx"),
            core_xml_template.format(
                title="Diplomová práca - Analýza trhových anomálií",
                subject="Aplikovaná ekonometria",
                author="Ján Novák",
                keywords="analýza, ekonometria, modelovanie, dáta",
                desc="Záverečná diplomová práca pre obhajobu.",
                modified_by="Ján Novák",
                revision="24",
                category="Záverečné práce"
            ),
            docx_app_xml
        ),
        (
            os.path.join(dest_dir, "vzorka_prezentacia.pptx"),
            core_xml_template.format(
                title="Kvartálna strategická prezentácia Q1 2026",
                subject="Finančný report a prognózy",
                author="Michal Vedúci",
                keywords="stratégia, q1, financie, ciele",
                desc="Prezentácia pre predstavenstvo spoločnosti.",
                modified_by="Elena Dizajnérka",
                revision="15",
                category="Prezentácie"
            ),
            pptx_app_xml
        ),
        (
            os.path.join(dest_dir, "vzorka_rozpocet.xlsx"),
            core_xml_template.format(
                title="Ročný rozpočet a cashflow 2026",
                subject="Finančné modelovanie",
                author="Peter Účtovník",
                keywords="rozpočet, dane, cashflow, výdavky",
                desc="Interný tabuľkový model pre finančný rok.",
                modified_by="Peter Účtovník",
                revision="9",
                category="Financie"
            ),
            xlsx_app_xml
        )
    ]

    for path, core_data, app_data in files:
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("[Content_Types].xml", content_types)
            z.writestr("_rels/.rels", rels)
            z.writestr("docProps/core.xml", core_data)
            z.writestr("docProps/app.xml", app_data)
            z.writestr("docProps/custom.xml", custom_xml)
        print(f"Vytvorená vzorka: {path} ({os.path.getsize(path)} bajtov)")

if __name__ == "__main__":
    create_sample_files()
