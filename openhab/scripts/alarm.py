from dotenv import load_dotenv
import sys
import requests
import json
import os
import logging

# Configure logging to a file
logging.basicConfig(filename="/tmp/alarm_script.log", level=logging.INFO, format="%(asctime)s - %(message)s")

logging.info("Alarm script started!")

# Cloud API endpoint
CLOUD_API_URL = "http://localhost:5000/api/alarm"

def send_alert(person_name):
    """Sends an alert with the person's image & name to the cloud."""
    image_path = f"/tmp/images/{person_name}.jpg"
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
    if len(sys.argv) < 2:
        print("Usage: python3 alarm.py <person_name>")
        sys.exit(1)

    person_name = sys.argv[1]
    send_alert(person_name)
