from dotenv import load_dotenv
import sys
import requests
import json
import os

# Cloud API endpoint
CLOUD_API_URL = "https://172.20.10.7:/upload"
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
HASHING_KEY = os.getenv('HASHING_KEY')

def send_alert(person_name, image_path):
    """Sends an alert with the person's image & name to the cloud."""
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found!")
        return

    with open(image_path, 'rb') as img_file:
        files = {"file": img_file}
        data = {"name": person_name}
        
        try:
            response = requests.post(CLOUD_API_URL, files=files, data=data, timeout=10)
            if response.status_code == 200:
                print(f"Alert sent for {person_name}!")
            else:
                print(f"Failed to send alert! Server responded with {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 alarm.py <person_name> <image_path>")
        sys.exit(1)

    person_name = sys.argv[1]
    image_path = sys.argv[2]
    send_alert(person_name, image_path)
