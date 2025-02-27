import requests
import sys

frame_path = sys.argv[1]
person = sys.argv[2]
action = sys.argv[3]

data = {
    "person": person,
    "action": action
}

files = {"image": open(frame_path, "rb")}
requests.post("http://cloud-app.com/api/security_alert", data=data, files=files)
