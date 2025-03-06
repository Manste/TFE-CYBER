import base64
import os

# Load existing .env file (or create one)
env_path = ".env"
if not os.path.exists(env_path):
    open(env_path, "w").close()

# Open the .env file and append the generated Base64 key
with open(env_path, 'a') as env_file:
    random_base64 = base64.b64encode(os.urandom(32)).decode()
    env_file.write(f"ENCRYPTION_KEY={random_base64}\n")
    random_base64 = base64.b64encode(os.urandom(32)).decode()
    env_file.write(f"HASHING_KEY={random_base64}\n")