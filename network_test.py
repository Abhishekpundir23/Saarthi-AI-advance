import urllib.request
import socket

def check_connection(url, host):
    print(f"Testing connection to {host}...")
    try:
        # Check DNS
        ip = socket.gethostbyname(host)
        print(f"✅ DNS Resolved {host} to {ip}")
        
        # Check HTTP
        req = urllib.request.Request(url, method="HEAD")
        urllib.request.urlopen(req, timeout=5)
        print(f"✅ HTTP Connection to {url} successful!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    check_connection("https://api.twilio.com", "api.twilio.com")
    check_connection("https://api.groq.com", "api.groq.com")
