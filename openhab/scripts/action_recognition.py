import cv2
import requests
import tensorflow as tf
from tensorflow.keras.models import load_model
from collections import deque
import numpy as np
import websocket
import os
import time
import logging

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Configure logging to a file
logging.basicConfig(filename="/tmp/action_script.log", level=logging.INFO, format="%(asctime)s - %(message)s")

logging.info("Action script started!")

OPENHAB_ITEM = "http://localhost:8080/rest/items/DetectedAction"

# Load the model
LRCN_model = load_model('/etc/openhab/scripts/models/LRCN_model___Date_Time_2025_02_20__13_50_05___Loss_0.11162082850933075___Accuracy_1.0.h5')

SEQUENCE_LENGTH = 20
CLASSES_LIST = ['open', 'close']
IMAGE_HEIGHT, IMAGE_WIDTH = 64, 64
frames_queue = deque(maxlen=SEQUENCE_LENGTH)

def detect_action(frame):
    resized_frame = cv2.resize(frame, (IMAGE_WIDTH, IMAGE_HEIGHT))
    normalized_frame = resized_frame / 255
    frames_queue.append(normalized_frame)

    if len(frames_queue) == SEQUENCE_LENGTH:
        predicted_labels_probabilities = LRCN_model.predict(np.expand_dims(frames_queue, axis=0))[0]
        predicted_label = np.argmax(predicted_labels_probabilities)
        predicted_class_name = CLASSES_LIST[predicted_label]
        predicted_labels_probability = round(predicted_labels_probabilities[predicted_label] * 100, 2)
        if predicted_labels_probability >= 80:
            return predicted_class_name
    return "Unknown"

def on_message(ws, message):
    """Process received frame"""
    np_frame = np.frombuffer(message, dtype=np.uint8)
    frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
    action = detect_action(frame)
    # Send result to OpenHAB
    print(action)
    requests.post(OPENHAB_ITEM, data=action, headers={"Content-Type": "text/plain"})

def on_error(ws, error):
    """Handle error and retry connection"""
    logging.error(f"WebSocket Error: {error}")
    logging.info("Attempting to reconnect...")
    time.sleep(5)  # Wait for 5 seconds before trying to reconnect
    connect_to_ws()

def on_close(ws, close_status_code, close_msg):
    """Handle connection closure and retry connection"""
    logging.warning(f"WebSocket Closed: {close_status_code}, {close_msg}")
    logging.info("Attempting to reconnect...")
    time.sleep(5)  # Wait for 5 seconds before trying to reconnect
    connect_to_ws()

def on_open(ws):
    """Handle WebSocket connection open"""
    logging.info("WebSocket connection opened.")

def connect_to_ws():
    """Function to connect to WebSocket server with retry logic"""
    ws = websocket.WebSocketApp("ws://localhost:8765", on_message=on_message, on_error=on_error, on_close=on_close, on_open=on_open)
    ws.run_forever()

# Initial connection to WebSocket server
connect_to_ws()
