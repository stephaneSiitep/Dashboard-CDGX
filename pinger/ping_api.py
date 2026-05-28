import subprocess
import platform
import re
import time
from datetime import datetime
import psycopg2
import psycopg2.extras
import os

DB_HOST     = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT     = os.getenv('POSTGRES_PORT', '5432')
DB_NAME     = os.getenv('POSTGRES_DB', 'cdgxpress')
DB_USER     = os.getenv('POSTGRES_USER', 'cdgxpress_user')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'password')

PING_INTERVAL = int(os.getenv('PING_INTERVAL', '300'))  # secondes entre chaque cycle


def get_active_equipements(conn):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT ip, name FROM equipements WHERE active = true ORDER BY id")
        return cur.fetchall()


def ping_ip(ip, retries=3, delay=1):
    system = platform.system().lower()
    count_flag = '-n' if system == 'windows' else '-c'

    for attempt in range(1, retries + 1):
        try:
            result = subprocess.run(
                ['ping', count_flag, '1', str(ip)],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, timeout=3
            )
            output = result.stdout

            if result.returncode == 0:
                rtt_match = re.search(r'time[=<]?\s*(\d+(?:\.\d+)?)\s*ms', output, re.IGNORECASE)
                ttl_match = re.search(r'ttl[=|:](\d+)', output, re.IGNORECASE)
                return {
                    "ip": str(ip),
                    "reachable": True,
                    "rtt_ms": float(rtt_match.group(1)) if rtt_match else None,
                    "ttl": int(ttl_match.group(1)) if ttl_match else None,
                    "timestamp": datetime.now(),
                    "error": None,
                }

            print(f"Attempt {attempt}/{retries} failed for {ip}")
            time.sleep(delay)

        except subprocess.TimeoutExpired:
            print(f"Timeout on attempt {attempt}/{retries} for {ip}")
            time.sleep(delay)
        except Exception as e:
            print(f"Error pinging {ip} on attempt {attempt}/{retries}: {e}")
            time.sleep(delay)

    return {
        "ip": str(ip),
        "reachable": False,
        "rtt_ms": None,
        "ttl": None,
        "timestamp": datetime.now(),
        "error": "Unreachable after retries",
    }


def insert_ping_results(conn, results):
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, """
            INSERT INTO ping_results (ip, name, reachable, rtt_ms, ttl, timestamp, error)
            VALUES (%(ip)s, %(name)s, %(reachable)s, %(rtt_ms)s, %(ttl)s, %(timestamp)s, %(error)s)
        """, results)
        conn.commit()


def run_ping_cycle(conn):
    equipements = get_active_equipements(conn)

    if not equipements:
        print(f"[{datetime.now().isoformat()}] Aucun equipement actif trouve en base, cycle ignore.")
        return

    print(f"\n[{datetime.now().isoformat()}] Debut du cycle — {len(equipements)} equipement(s)\n")

    results = []
    for eq in equipements:
        result = ping_ip(eq['ip'])
        result['name'] = eq['name']
        results.append(result)
        status = "OK" if result['reachable'] else "KO"
        print(f"  [{status}] {result['ip']:18s} {eq['name']:20s} RTT: {result['rtt_ms']} ms  TTL: {result['ttl']}")

    insert_ping_results(conn, results)
    print(f"\n  {len(results)} resultats ecrits en base.")


def connect_with_retry():
    while True:
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT,
                dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
            )
            print("Connexion PostgreSQL etablie.")
            return conn
        except Exception as e:
            print(f"Connexion impossible : {e}. Nouvelle tentative dans 5s...")
            time.sleep(5)


def main():
    conn = connect_with_retry()
    try:
        while True:
            try:
                run_ping_cycle(conn)
            except psycopg2.OperationalError:
                print("Perte de connexion DB, reconnexion...")
                conn = connect_with_retry()
                run_ping_cycle(conn)
            print(f"Prochain cycle dans {PING_INTERVAL}s.\n")
            time.sleep(PING_INTERVAL)
    except KeyboardInterrupt:
        print("\nArret demande.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
