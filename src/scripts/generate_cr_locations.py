from pathlib import Path
import json
import re
import pandas as pd

BASE_DIR = Path(__file__).parent
INPUT_FILE = Path("src/mnt/data/DTA-TABLA POR PROVINCIA-CANTÓN-DISTRITO 2025.xlsx")
OUTPUT_FILE = Path("src/mnt/data/CostaRicaLocations.ts")


def clean_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_header(value: str) -> str:
    value = clean_text(value).upper()
    value = value.replace("\n", " ")
    value = re.sub(r"\s+", " ", value)
    return value


def extract_rows_from_sheet(df: pd.DataFrame):
    """
    Busca dinámicamente la fila header y extrae provincia, cantón y distrito.
    """
    header_row_index = None
    provincia_idx = None
    canton_idx = None
    distrito_idx = None

    for i in range(min(len(df), 15)):
        row = [normalize_header(v) for v in df.iloc[i].tolist()]

        for j, cell in enumerate(row):
            if "PROVINCIA" in cell:
                provincia_idx = j
            if "CANTÓN" in cell or "CANTON" in cell:
                canton_idx = j
            if "DISTRITO" in cell:
                distrito_idx = j

        if provincia_idx is not None and canton_idx is not None and distrito_idx is not None:
            header_row_index = i
            break

    if header_row_index is None:
        return []

    records = []

    for i in range(header_row_index + 1, len(df)):
        row = df.iloc[i].tolist()

        provincia = clean_text(row[provincia_idx]) if provincia_idx < len(row) else ""
        canton = clean_text(row[canton_idx]) if canton_idx < len(row) else ""
        distrito = clean_text(row[distrito_idx]) if distrito_idx < len(row) else ""

        if not provincia or not canton or not distrito:
            continue

        # Filtra filas que sean encabezados repetidos
        if provincia.upper() == "PROVINCIA" or canton.upper() in ("CANTÓN", "CANTON") or distrito.upper() == "DISTRITO":
            continue

        records.append((provincia, canton, distrito))

    return records


def main():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"No se encontró el archivo: {INPUT_FILE}")

    excel = pd.ExcelFile(INPUT_FILE)

    locations: dict[str, dict[str, list[str]]] = {}

    for sheet_name in excel.sheet_names:
        df = pd.read_excel(INPUT_FILE, sheet_name=sheet_name, header=None)
        rows = extract_rows_from_sheet(df)

        for provincia, canton, distrito in rows:
            locations.setdefault(provincia, {})
            locations[provincia].setdefault(canton, [])

            if distrito not in locations[provincia][canton]:
                locations[provincia][canton].append(distrito)

    # ordenar alfabéticamente
    ordered = {}
    for provincia in sorted(locations.keys()):
        ordered[provincia] = {}
        for canton in sorted(locations[provincia].keys()):
            ordered[provincia][canton] = sorted(locations[provincia][canton])

    total_provincias = len(ordered)
    total_cantones = sum(len(cantones) for cantones in ordered.values())
    total_distritos = sum(
        len(distritos)
        for cantones in ordered.values()
        for distritos in cantones.values()
    )

    ts_content = (
        "export type CostaRicaLocations = Record<string, Record<string, string[]>>;\n\n"
        "export const COSTA_RICA_LOCATIONS: CostaRicaLocations = "
        + json.dumps(ordered, ensure_ascii=False, indent=2)
        + ";\n"
    )

    OUTPUT_FILE.write_text(ts_content, encoding="utf-8")

    print("Archivo generado correctamente:")
    print(OUTPUT_FILE)
    print(f"Provincias: {total_provincias}")
    print(f"Cantones: {total_cantones}")
    print(f"Distritos: {total_distritos}")


if __name__ == "__main__":
    main()