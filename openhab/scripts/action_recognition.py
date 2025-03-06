import cv2
import requests
import tensorflow as tf
from tensorflow.keras.models import load_model
from collections import deque
import numpy as np
import websocket
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

OPENHAB_ITEM = "http://localhost:8080/rest/items/DetectedAction"

# Load the model
LRCN_model = load_model('models/LRCN_model___Date_Time_2025_02_20__13_50_05___Loss_0.11162082850933075___Accuracy_1.0.h5')

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
    requests.post(OPENHAB_ITEM, data=action, headers={"Content-Type": "text/plain"})

# Connect to WebSocket Relay Server
ws = websocket.WebSocketApp("ws://localhost:8765", on_message=on_message)
ws.run_forever()
