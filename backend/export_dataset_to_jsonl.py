import os
import json
import argparse
from psycopg2 import connect
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Config
DSN = str(os.getenv("DATABASE_URL"))
OUT_FILE = 'dataset_for_ft.jsonl'
LIMIT = None  # opcional, por ejemplo 1000

PROMPT_TEMPLATE = (
    "INSTRUCCIONES: Extrae y evalúa el ajuste del candidato al puesto.\n"
    "Entrega la salida en formato JSON con campos: years_exper, level_educa, certif, languages, evaluacion (name, skills[], reason, summary, match).\n\n"
    "JOB_REQUIREMENTS:\n{job_requirements}\n\n"
    "CV_TEXT:\n{cv_text}\n\n"
    "METADATA:\nprocess_id: {process_id}, puesto_id: {puesto_id}, nombre_archivo: {nombre_archivo}\n"
)


def row_to_example(row):
    # Normalizar job_requirements a texto
    jr = row.get('job_requirements')
    if isinstance(jr, dict):
        jr_text = jr.get('text') or json.dumps(jr, ensure_ascii=False)
    else:
        jr_text = str(jr) if jr is not None else ''

    prompt = PROMPT_TEMPLATE.format(
        job_requirements=jr_text,
        cv_text=row.get('cv_text') or '',
        process_id=row.get('process_id') or '',
        puesto_id=row.get('puesto_id') or '',
        nombre_archivo=row.get('nombre_archivo') or ''
    )

    completion_obj = row.get('final_json') or {}
    # Convert completion to compact JSON string
    completion = json.dumps(completion_obj, ensure_ascii=False)

    return {"prompt": prompt, "completion": completion}


def export_jsonl(dsn, out_file, limit=None):
    sql = "SELECT * FROM datasetentry WHERE final_json IS NOT NULL ORDER BY id"
    if limit:
        sql += f" LIMIT {int(limit)}"

    conn = connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(sql)

    with open(out_file, 'w', encoding='utf8') as f:
        count = 0
        for row in cur:
            ex = row_to_example(row)
            f.write(json.dumps(ex, ensure_ascii=False) + '\n')
            count += 1

    cur.close()
    conn.close()
    print(f"Wrote {count} examples to {out_file}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Export DB rows to JSONL for fine-tuning')
    parser.add_argument('--out', '-o', default=OUT_FILE)
    parser.add_argument('--limit', '-n', default=LIMIT, type=int, nargs='?')
    parser.add_argument('--dsn', default=DSN)
    args = parser.parse_args()

    export_jsonl(args.dsn, args.out, args.limit)