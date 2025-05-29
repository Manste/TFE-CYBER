import websocket
import cv2
import tensorflow as tf
from tensorflow.keras.models import load_model
from collections import deque
import numpy as np
import json
import paho.mqtt.client as mqtt
import threading
import base64
import os
import time
import logging

# Disable GPU
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Configure logging
logging.basicConfig(filename="/tmp/action_script.log", level=logging.INFO, format="%(asctime)s - %(message)s")
logging.info("Action recognition script started!")

# WebSocket Relay Server
WEBSOCKET_RELAY_SERVER_IP = "localhost"
WEBSOCKET_RELAY_SERVER_PORT = 8765

# MQTT Settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_ACTION_TRIGGER = "openhab/trigger/DetectedActionEvent"

# Initialize MQTT Client
mqtt_client = mqtt.Client()

# Load Action Recognition Model
LRCN_model = load_model('/etc/openhab/scripts/models/LRCN.h5')

# Action Recognition Settings
SEQUENCE_LENGTH = 20
CLASSES_LIST = ['open', 'close']
IMAGE_HEIGHT, IMAGE_WIDTH = 64, 64
frames_queue = deque(maxlen=SEQUENCE_LENGTH)

def detect_action(frame):
    """Detects actions based on frames and returns action label."""
    resized_frame = cv2.resize(frame, (IMAGE_WIDTH, IMAGE_HEIGHT))
    normalized_frame = resized_frame / 255
    frames_queue.append(normalized_frame)

    if len(frames_queue) == SEQUENCE_LENGTH:
        predicted_labels_probabilities = LRCN_model.predict(np.expand_dims(frames_queue, axis=0))[0]
        predicted_label = np.argmax(predicted_labels_probabilities)
        predicted_class_name = CLASSES_LIST[predicted_label]
        predicted_labels_probability = round(predicted_labels_probabilities[predicted_label] * 100, 2)

        return predicted_class_name

    return "Unknown"

def send_to_openhab(data):
    """Sends detected action to OpenHAB via MQTT."""
    logging.info(f"Sending action to OpenHAB: {data}")
    mqtt_client.publish(MQTT_TOPIC_ACTION_TRIGGER, data)

# WebSocket Handlers
def on_websocket_message(ws, message):
    """Processes incoming WebSocket messages (image frames)."""
    data = json.loads(message)
    frame_cnt, frame = data["count"], data["image"]
    frame = base64.b64decode(frame)

    np_frame = np.frombuffer(frame, dtype=np.uint8)
    frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
    
    action = detect_action(frame)
    
    send_to_openhab(f"{frame_cnt}:{action}")
    print(f"Detected Action: {action}")

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
    client.subscribe(MQTT_TOPIC_ACTION_TRIGGER)

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
