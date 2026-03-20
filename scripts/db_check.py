import sys
import requests
import os

# Local script only. Never commit a real token in source control.
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF")

if not TOKEN or not PROJECT_REF:
    print("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF environment variables.")
    sys.exit(1)

def execute_sql(sql):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {"query": sql}
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"Error executing SQL: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def check_rls():
    print("--- Checking RLS on public tables ---")
    sql = "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
    results = execute_sql(sql)
    if not results: return False
    
    passed = True
    for row in results:
        if not row['rowsecurity']:
            print(f"[FAIL] RLS is NOT enabled on table: {row['tablename']}")
            passed = False
        else:
            print(f"[PASS] RLS is enabled on table: {row['tablename']}")
    return passed

def check_essential_columns():
    print("\n--- Checking essential columns ---")
    checks = [
        ("profiles", "is_superadmin"),
        ("teams", "auto_reminder_enabled"),
        ("factures", "parent_facture_id"),
        ("factures", "type")
    ]
    
    passed = True
    for table, col in checks:
        sql = f"SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '{table}' AND column_name = '{col}';"
        results = execute_sql(sql)
        if results and len(results) > 0:
            print(f"[PASS] Column {col} found in table {table}")
        else:
            print(f"[FAIL] Column {col} NOT found in table {table}")
            passed = False
    return passed

def check_foreign_keys():
    print("\n--- Checking common foreign keys ---")
    # This is a heuristic check for fields ending in _id
    sql = """
    SELECT 
        cols.table_name, 
        cols.column_name
    FROM 
        information_schema.columns cols
    LEFT JOIN 
        information_schema.key_column_usage kcu 
        ON cols.table_name = kcu.table_name 
        AND cols.column_name = kcu.column_name 
        AND cols.table_schema = kcu.table_schema
    WHERE 
        cols.table_schema = 'public' 
        AND cols.column_name LIKE '%_id'
        AND kcu.constraint_name IS NULL
        AND cols.table_name NOT IN ('audit_logs', 'payment_reminders_log');
    """
    results = execute_sql(sql)
    if results is None: return False
    
    if len(results) == 0:
        print("[PASS] All detected id fields have constraints (or are ignored).")
        return True
    else:
        for row in results:
            print(f"[WARN] Possible missing FK constraint: {row['table_name']}.{row['column_name']}")
        return True # Just a warning

if __name__ == "__main__":
    print(f"Starting database integrity check for project {PROJECT_REF}...")
    
    rls_ok = check_rls()
    cols_ok = check_essential_columns()
    fk_ok = check_foreign_keys()
    
    if rls_ok and cols_ok:
        print("\n[SUCCESS] Database integrity check passed!")
        sys.exit(0)
    else:
        print("\n[FAILURE] Database integrity check failed. See details above.")
        sys.exit(1)
