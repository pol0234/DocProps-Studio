#!/usr/bin/env python3
"""
Office OpenXML Metadata CLI Editor (DOCX, PPTX, XLSX)
Umožňuje prehliadať, upravovať a anonymizovať metadáta Office súborov priamo z príkazového riadka.
Používa výhradne štandardnú knižnicu Pythonu (zipfile, xml.etree.ElementTree).
"""

import sys
import os
import argparse
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Namespaces
NAMESPACES = {
    'cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'dcmitype': 'http://purl.org/dc/dcmitype/',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'ep': 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
    'vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
    'cust': 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
}

for prefix, uri in NAMESPACES.items():
    ET.register_namespace(prefix, uri)

def inspect_file(filepath):
    """Zobrazí všetky nájdené metadáta v prehľadnej tabuľke."""
    if not os.path.exists(filepath):
        print(f"Chyba: Súbor '{filepath}' neexistuje.")
        return

    print(f"\n=======================================================")
    print(f" Analýza metadát súboru: {os.path.basename(filepath)}")
    print(f" Cesta: {os.path.abspath(filepath)}")
    print(f" Veľkosť: {os.path.getsize(filepath):,} bajtov")
    print(f"=======================================================\n")

    with zipfile.ZipFile(filepath, 'r') as z:
        filelist = z.namelist()

        # Core Properties
        if 'docProps/core.xml' in filelist:
            print("--- [Základné vlastnosti (docProps/core.xml)] ---")
            root = ET.fromstring(z.read('docProps/core.xml'))
            tags = [
                ('Názov (Title)', '{http://purl.org/dc/elements/1.1/}title'),
                ('Predmet (Subject)', '{http://purl.org/dc/elements/1.1/}subject'),
                ('Autor / Vytvoril (Creator)', '{http://purl.org/dc/elements/1.1/}creator'),
                ('Kľúčové slová (Keywords)', '{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}keywords'),
                ('Popis (Description)', '{http://purl.org/dc/elements/1.1/}description'),
                ('Posledný editor (LastModifiedBy)', '{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}lastModifiedBy'),
                ('Číslo revízie (Revision)', '{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}revision'),
                ('Dátum vytvorenia (Created)', '{http://purl.org/dc/terms/}created'),
                ('Dátum úpravy (Modified)', '{http://purl.org/dc/terms/}modified'),
                ('Kategória (Category)', '{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}category'),
                ('Stav obsahu (ContentStatus)', '{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}contentStatus'),
            ]
            for label, tag in tags:
                elem = root.find(tag)
                val = elem.text if (elem is not None and elem.text) else '(nevyplnené)'
                print(f"  {label:<32}: {val}")
            print()

        # Extended Properties
        if 'docProps/app.xml' in filelist:
            print("--- [Rozšírené vlastnosti (docProps/app.xml)] ---")
            root = ET.fromstring(z.read('docProps/app.xml'))
            ns_uri = "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            app_tags = [
                ('Celkový čas úprav (TotalTime)', 'TotalTime', ' minút'),
                ('Aplikácia (Application)', 'Application', ''),
                ('Verzia aplikácie (AppVersion)', 'AppVersion', ''),
                ('Spoločnosť (Company)', 'Company', ''),
                ('Manažér (Manager)', 'Manager', ''),
                ('Šablóna (Template)', 'Template', ''),
                ('Počet strán (Pages)', 'Pages', ''),
                ('Počet slov (Words)', 'Words', ''),
                ('Počet znakov (Characters)', 'Characters', ''),
                ('Znakov s medzerami', 'CharactersWithSpaces', ''),
                ('Počet riadkov (Lines)', 'Lines', ''),
                ('Počet odsekov (Paragraphs)', 'Paragraphs', ''),
                ('Počet snímkov (Slides)', 'Slides', ''),
                ('Počet poznámok (Notes)', 'Notes', ''),
                ('Skryté snímky (HiddenSlides)', 'HiddenSlides', ''),
                ('Formát prezentácie', 'PresentationFormat', ''),
            ]
            for label, tag, unit in app_tags:
                elem = root.find(f"{{{ns_uri}}}{tag}")
                if elem is None:
                    elem = root.find(tag)
                if elem is not None and elem.text:
                    print(f"  {label:<32}: {elem.text}{unit}")
            print()

        # Custom Properties
        if 'docProps/custom.xml' in filelist:
            print("--- [Vlastné atribúty (docProps/custom.xml)] ---")
            root = ET.fromstring(z.read('docProps/custom.xml'))
            props = root.findall('{http://schemas.openxmlformats.org/officeDocument/2006/custom-properties}property')
            if props:
                for p in props:
                    name = p.attrib.get('name', 'Neznámy')
                    # value can be in vt:lpwstr, vt:filetime, vt:i4, etc.
                    val = "".join(p.itertext()).strip()
                    print(f"  {name:<32}: {val}")
            else:
                print("  (Žiadne vlastné atribúty)")
            print()

def edit_file(filepath, out_path, **kwargs):
    """Upraví vybrané metadáta a uloží nový súbor."""
    if not os.path.exists(filepath):
        print(f"Chyba: Vstupný súbor '{filepath}' neexistuje.")
        return False

    out_path = out_path or filepath

    # Read existing zip
    files_data = {}
    with zipfile.ZipFile(filepath, 'r') as z:
        for name in z.namelist():
            files_data[name] = z.read(name)

    # 1. Edit core.xml
    if 'docProps/core.xml' in files_data:
        root = ET.fromstring(files_data['docProps/core.xml'])
        
        def set_core(tag_full, value):
            if value is None:
                return
            elem = root.find(tag_full)
            if elem is None and value != "":
                elem = ET.SubElement(root, tag_full)
            if elem is not None:
                if value == "":
                    root.remove(elem)
                else:
                    elem.text = str(value)

        if kwargs.get('anonymize'):
            set_core('{http://purl.org/dc/elements/1.1/}creator', '')
            set_core('{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}lastModifiedBy', '')
            set_core('{http://purl.org/dc/elements/1.1/}description', '')
        else:
            if 'creator' in kwargs and kwargs['creator'] is not None:
                set_core('{http://purl.org/dc/elements/1.1/}creator', kwargs['creator'])
            if 'last_modified_by' in kwargs and kwargs['last_modified_by'] is not None:
                set_core('{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}lastModifiedBy', kwargs['last_modified_by'])

        if 'title' in kwargs and kwargs['title'] is not None:
            set_core('{http://purl.org/dc/elements/1.1/}title', kwargs['title'])
        if 'subject' in kwargs and kwargs['subject'] is not None:
            set_core('{http://purl.org/dc/elements/1.1/}subject', kwargs['subject'])
        if 'keywords' in kwargs and kwargs['keywords'] is not None:
            set_core('{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}keywords', kwargs['keywords'])
        if 'revision' in kwargs and kwargs['revision'] is not None:
            set_core('{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}revision', str(kwargs['revision']))
        if 'created' in kwargs and kwargs['created'] is not None:
            set_core('{http://purl.org/dc/terms/}created', kwargs['created'])
        if 'modified' in kwargs and kwargs['modified'] is not None:
            set_core('{http://purl.org/dc/terms/}modified', kwargs['modified'])

        files_data['docProps/core.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)

    # 2. Edit app.xml
    if 'docProps/app.xml' in files_data:
        root = ET.fromstring(files_data['docProps/app.xml'])
        ns_uri = "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"

        def set_app(tag_name, value):
            if value is None:
                return
            elem = root.find(f"{{{ns_uri}}}{tag_name}")
            if elem is None:
                elem = root.find(tag_name)
            if elem is None and value != "":
                elem = ET.SubElement(root, f"{{{ns_uri}}}{tag_name}")
            if elem is not None:
                if value == "":
                    root.remove(elem)
                else:
                    elem.text = str(value)

        if kwargs.get('anonymize'):
            set_app('Company', '')
            set_app('Manager', '')
            set_app('Template', 'Normal.dotm')
        else:
            if 'company' in kwargs and kwargs['company'] is not None:
                set_app('Company', kwargs['company'])
            if 'manager' in kwargs and kwargs['manager'] is not None:
                set_app('Manager', kwargs['manager'])
            if 'template' in kwargs and kwargs['template'] is not None:
                set_app('Template', kwargs['template'])

        if 'total_time' in kwargs and kwargs['total_time'] is not None:
            set_app('TotalTime', str(kwargs['total_time']))
        if 'pages' in kwargs and kwargs['pages'] is not None:
            set_app('Pages', str(kwargs['pages']))
        if 'words' in kwargs and kwargs['words'] is not None:
            set_app('Words', str(kwargs['words']))
        if 'slides' in kwargs and kwargs['slides'] is not None:
            set_app('Slides', str(kwargs['slides']))

        files_data['docProps/app.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)

    # Save to out_path
    temp_out = out_path + ".tmp"
    with zipfile.ZipFile(temp_out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files_data.items():
            z.writestr(name, data)

    if os.path.exists(out_path) and os.path.abspath(out_path) == os.path.abspath(filepath):
        os.remove(filepath)
    os.replace(temp_out, out_path)

    print(f"✓ Úspešne uložené do: {out_path}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Office Document Metadata CLI Editor (DOCX, PPTX, XLSX)")
    subparsers = parser.add_subparsers(dest="cmd")

    # Inspect
    inspect_parser = subparsers.add_parser("inspect", help="Zobraziť metadáta súboru")
    inspect_parser.add_argument("file", help="Cesta k súboru DOCX / PPTX / XLSX")

    # Edit / Set
    edit_parser = subparsers.add_parser("edit", aliases=["set"], help="Upraviť metadáta (alias: set)")
    edit_parser.add_argument("file", help="Cesta k súboru")
    edit_parser.add_argument("--out", help="Výstupná cesta (predvolene prepíše pôvodný)")
    edit_parser.add_argument("--title", help="Nový názov")
    edit_parser.add_argument("--subject", help="Nový predmet")
    edit_parser.add_argument("--author", help="Nový autor (creator)")
    edit_parser.add_argument("--modified-by", help="Posledný editor (lastModifiedBy)")
    edit_parser.add_argument("--total-time", type=int, help="Celkový čas úprav v minútach (TotalTime)")
    edit_parser.add_argument("--revision", type=int, help="Číslo revízie")
    edit_parser.add_argument("--company", help="Názov spoločnosti")
    edit_parser.add_argument("--manager", help="Meno manažéra")
    edit_parser.add_argument("--template", help="Názov / cesta šablóny")
    edit_parser.add_argument("--pages", type=int, help="Počet strán")
    edit_parser.add_argument("--words", type=int, help="Počet slov")
    edit_parser.add_argument("--slides", type=int, help="Počet snímkov (PPTX)")
    edit_parser.add_argument("--anonymize", action="store_true", help="Odstrániť všetky osobné stopy (autor, firma, editor)")

    args = parser.parse_args()

    if args.cmd == "inspect":
        inspect_file(args.file)
    elif args.cmd in ("edit", "set"):
        edit_file(
            args.file,
            args.out,
            title=args.title,
            subject=args.subject,
            creator=args.author,
            last_modified_by=args.modified_by,
            total_time=args.total_time,
            revision=args.revision,
            company=args.company,
            manager=args.manager,
            template=args.template,
            pages=args.pages,
            words=args.words,
            slides=args.slides,
            anonymize=args.anonymize
        )
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
