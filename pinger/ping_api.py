import subprocess
import platform
import ipaddress
import re
import time
from datetime import datetime
import psycopg2
import psycopg2.extras
import os

# DB connection parameters from environment variables or defaults
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')
DB_NAME = os.getenv('POSTGRES_DB', 'cdgxpress')
DB_USER = os.getenv('POSTGRES_USER', 'cdgxpress_user')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'password')

custom_names = {
    "10.136.115.96": "MDR6",
    "10.136.115.100": "Serveur IA",
    "10.136.115.76" : "Camera 17"
}

def get_device_name(ip, index):
    ip_str = str(ip)
    if ip_str in custom_names:
        return custom_names[ip_str]
    else:
        return f"Camera {index}"

def ping_ip(ip, retries=3, delay=1):
    """
    Ping an IP with retries (default 3).
    Returns a dictionary with ping result.
    """
    system = platform.system().lower()
    count_flag = '-n' if system == 'windows' else '-c'

    for attempt in range(1, retries + 1):
        cmd = ['ping', count_flag, '1', str(ip)]

        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=3)
            output = result.stdout

            reachable = result.returncode == 0
            rtt = None
            ttl = None

            if reachable:
                if system == 'windows':
                    rtt_match = re.search(r'time[=<]?\s*(\d+)\s*ms', output, re.IGNORECASE)
                    ttl_match = re.search(r'ttl[=|:](\d+)', output, re.IGNORECASE)
                else:
                    rtt_match = re.search(r'time[=<]?\s*(\d+(?:\.\d+)?)\s*ms', output, re.IGNORECASE)
                    ttl_match = re.search(r'ttl[=|:](\d+)', output, re.IGNORECASE)

                if rtt_match:
                    rtt = float(rtt_match.group(1))
                if ttl_match:
                    ttl = int(ttl_match.group(1))

                return {
                    "ip": str(ip),
                    "reachable": True,
                    "rtt_ms": rtt,
                    "ttl": ttl,
                    "timestamp": datetime.now(),
                    "error": None
                }

            else:
                print(f"⚠️ Attempt {attempt}/{retries} failed for {ip}")
                time.sleep(delay)

        except subprocess.TimeoutExpired:
            print(f"⏱️ Timeout on attempt {attempt}/{retries} for {ip}")
            time.sleep(delay)
        except Exception as e:
            print(f"❌ Error pinging {ip} on attempt {attempt}/{retries}: {e}")
            time.sleep(delay)

    # If all retries failed
    return {
        "ip": str(ip),
        "reachable": False,
        "rtt_ms": None,
        "ttl": None,
        "timestamp": datetime.now(),
        "error": "Unreachable after retries"
    }

def insert_ping_results(conn, results):
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, """
            INSERT INTO ping_results (ip, name, reachable, rtt_ms, ttl, timestamp, error)
            VALUES (%(ip)s, %(name)s, %(reachable)s, %(rtt_ms)s, %(ttl)s, %(timestamp)s, %(error)s);
        """, results)
        conn.commit()

def run_ping_cycle(conn):
    start_ip = ipaddress.IPv4Address('10.136.115.60')
    end_ip = ipaddress.IPv4Address('10.136.115.79')

    results = []
    equipment_index = 1

    print(f"\n📡 Starting new ping cycle at {datetime.now().isoformat()}\n")

    for ip_int in range(int(start_ip), int(end_ip) + 1):
        ip = ipaddress.IPv4Address(ip_int)
        device_name = get_device_name(ip, equipment_index)
        result = ping_ip(ip)
        result["name"] = device_name
        results.append(result)

        print(f"{result['timestamp'].isoformat()} | {result['ip']} - {device_name}: "
              f"{'Reachable' if result['reachable'] else 'Unreachable'} | RTT: {result['rtt_ms']} ms | TTL: {result['ttl']}")
        equipment_index += 1

    # Ping extra custom IPs outside the main range
    for extra_ip_str in custom_names:
        ip = ipaddress.IPv4Address(extra_ip_str)
        if start_ip <= ip <= end_ip:
            continue
        result = ping_ip(ip)
        result["name"] = custom_names[extra_ip_str]
        results.append(result)

        print(f"{result['timestamp'].isoformat()} | {result['ip']} - {result['name']}: "
              f"{'Reachable' if result['reachable'] else 'Unreachable'} | RTT: {result['rtt_ms']} ms | TTL: {result['ttl']}")

    insert_ping_results(conn, results)

def main():
    # Connect to DB with retries
    while True:
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD
            )
            print("✅ Connected to PostgreSQL")
            break
        except Exception as e:
            print(f"❌ Unable to connect to DB: {e}")
            print("Retrying in 5 seconds...")
            time.sleep(5)

    try:
        while True:
            run_ping_cycle(conn)
            print("⏳ Waiting 5 minutes...\n")
            time.sleep(60)  # Wait 5 minutes
    except KeyboardInterrupt:
        print("\n🛑 Stopped by user.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
