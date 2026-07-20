import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend-cloud/.env')
load_dotenv('frontend/.env.local')

db_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

if not db_url and len(sys.argv) > 1:
    db_url = sys.argv[1]

if not db_url:
    print("Usage: python apply_schema.py <postgres_connection_string>")
    print("Or set SUPABASE_DB_URL in environment.")
    sys.exit(1)

schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")

with open(schema_file, "r", encoding="utf-8") as f:
    sql_script = f.read()

print(f"Connecting to database...")
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    print("Executing SQL schema script...")
    cursor.execute(sql_script)
    print("SQL Schema applied successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error applying schema:", e)
    sys.exit(1)
