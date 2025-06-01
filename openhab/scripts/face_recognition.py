import websocket
import cv2
import joblib
import numpy as np
import time
import json
import paho.mqtt.client as mqtt
import threading
from mtcnn.mtcnn import MTCNN
from keras_facenet import FaceNet
import base64

import os
import time
import logging

WEBSOCKET_RELAY_SERVER_IP = "localhost"
WEBSOCKET_RELAY_SERVER_PORT = 8765

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Configure logging to a file
logging.basicConfig(filename="/tmp/face_script.log", level=logging.INFO, format="%(asctime)s - %(message)s")

logging.info("Face recognition script started!")

# MQTT Settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_FACE_TRIGGER = "openhab/trigger/DetectedPersonEvent"

# Initialize MQTT Client
mqtt_client = mqtt.Client()

# Initialize models
embedder = FaceNet()
detector = MTCNN()

# Load models
loaded_svc_model = joblib.load('/etc/openhab/scripts/models/svc_model.pkl')
loaded_one_class_svm = joblib.load('/etc/openhab/scripts/models/one_class_svm_model.pkl')
X_train = np.load('/etc/openhab/scripts/models/EMBEDDED_3classes.npz.npy')
# Person ID mapping
person_ids = {
    1: "Annalise",
    2: "Manuelle"
}

def get_embedding(model, face_pixels):
    """Extracts 512D FaceNet embedding from an image."""
    face_pixels = face_pixels.astype('float32')
    face_img = np.expand_dims(face_pixels, axis=0)
    embedding = model.embeddings(face_img)
    return embedding[0]

def recognize_face(frame):
    """Detects faces and predicts their identities."""
    img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    faces = detector.detect_faces(img)
    persons = []

    for face in faces:
        x, y, w, h = face['box']
        face_img = img[y:y+h, x:x+w]
        face_img = cv2.resize(face_img, (160, 160))
        embedding = get_embedding(embedder, face_img)

        # Predict class
        pred_probs = loaded_svc_model.predict_proba([embedding])
        pred_label = loaded_svc_model.predict([embedding])[0]
        pred_prob = np.max(pred_probs)

        # Outlier detection
        is_known = loaded_one_class_svm.predict([embedding])[0]  # 1 = known, -1 = unknown

        # Distance-based rejection
        known_embeddings = X_train
        distances = np.linalg.norm(known_embeddings - embedding, axis=1)
        min_distance = np.min(distances)

        if pred_prob > 0.8 and is_known == -1 and min_distance <= 0.85:
            persons.append((person_ids.get(pred_label, 'Unknown'), frame))
        else:
            persons.append(('Unknown', frame))

    return persons

def save_images(faces, frame_cnt):
    """Saves detected faces as images and returns their paths."""
    if frame_cnt % 10 != 0:
        image_paths = {}
        for name, face_frame in faces:
            img_path = f"/tmp/images/{name}_{frame_cnt}.jpg"
            cv2.imwrite(img_path, face_frame)
            image_paths[name] = img_path
        return image_paths

def send_to_openhab(person_list):
    """Sends recognized person data to OpenHAB via MQTT."""
    logging.info(f"Sending to OpenHAB: {person_list}")
    mqtt_client.publish(MQTT_TOPIC_FACE_TRIGGER, person_list)

# WebSocket Handlers
def on_websocket_message(ws, message):
    """Processes incoming WebSocket messages (image frames)."""
    data = json.loads(message)
    frame_cnt, frame = data["count"], data["image"] 
    frame = base64.b64decode(frame)
    np_frame = np.frombuffer(frame, dtype=np.uint8)
    frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
    recognized_faces = recognize_face(frame)

    if recognized_faces:
        persons = [name for name, _ in recognized_faces]
        save_images(recognized_faces, frame_cnt)
        send_to_openhab(f"{frame_cnt}:{json.dumps(persons)}")
        print(persons)

def on_websocket_error(ws, error):
    """Handles WebSocket errors."""
    logging.error(f"WebSocket error: {error}")

def on_websocket_close(ws, close_status_code, close_msg):
    """Handles WebSocket closure and triggers reconnection."""
    logging.info(f"WebSocket closed. Code: {close_status_code}, Reason: {close_msg}")
    reconnect_to_websocket()

def on_websocket_open(ws):
    """Logs successful WebSocket connection."""
    logging.info("Connected to WebSocket relay server.")

# WebSocket Reconnection Logic
def reconnect_to_websocket():
    """Attempts to reconnect with exponential backoff."""
    delay = 5  # Initial delay in seconds
    while True:
        logging.info(f"Trying to reconnect in {delay} seconds...")
        time.sleep(delay)
        try:
            ws = websocket.WebSocketApp(
                f"ws://{WEBSOCKET_RELAY_SERVER_IP}:{WEBSOCKET_RELAY_SERVER_PORT}",
                on_message=on_websocket_message,
                on_error=on_websocket_error,
                on_close=on_websocket_close
            )
            ws.on_open = on_websocket_open
            ws.run_forever()
            break  # Exit loop once connected
        except Exception as e:
            logging.error(f"Reconnection failed: {e}")
            delay = min(delay * 2, 60)  # Increase delay but cap at 60 sec

def start_websocket_client():
    """Starts the WebSocket client with automatic reconnection."""
    while True:
        try:
            ws = websocket.WebSocketApp(
                f"ws://{WEBSOCKET_RELAY_SERVER_IP}:{WEBSOCKET_RELAY_SERVER_PORT}",
                on_message=on_websocket_message,
                on_error=on_websocket_error,
                on_close=on_websocket_close
            )
            ws.on_open = on_websocket_open
            ws.run_forever()
        except Exception as e:
            logging.info(f"WebSocket connection error: {e}")
            reconnect_to_websocket()

# MQTT Handlers
def on_mqtt_connect(client, userdata, flags, rc):
    """Handles successful MQTT connection."""
    logging.info("Connected to MQTT broker!")
    client.subscribe(MQTT_TOPIC_FACE_TRIGGER)

def on_mqtt_message(client, userdata, msg):
    """Handles received MQTT messages."""
    logging.info(f"Received MQTT message on {msg.topic}: {msg.payload.decode()}")

if __name__ == "__main__":
    # Set up MQTT client
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)

    # Run MQTT loop in a separate thread
    mqtt_thread = threading.Thread(target=mqtt_client.loop_forever, daemon=True)
    mqtt_thread.start()

    # Start WebSocket client
    start_websocket_client()
