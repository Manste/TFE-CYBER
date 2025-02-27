import websocket
import requests
import cv2
import numpy as np
import os
import multiprocessing

OPENHAB_ITEM = "http://localhost:8080/rest/items/StreamAuthorization"
# Create a shared queue (stores latest 20 frames)
frame_queue = multiprocessing.Queue(maxsize=20)  # Shared Queue across processes

def visualize_stream(message):
    np_arr = np.frombuffer(message, dtype=np.uint8)
    
    # Decode the image
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if frame is not None:
        cv2.imshow("ESP32-CAM Stream", frame)  # Show video stream

    if cv2.waitKey(1) & 0xFF == ord('q'):
        ws.close()
        cv2.destroyAllWindows()

def on_message(ws, message):
    global frame_count  # Ensure frame_count is modified globally    
    
    #requests.post(OPENHAB_ITEM, data="ON", headers={"Content-Type": "text/plain"})
    # Convert received message (binary image data) to a NumPy array
    visualize_stream(message)
    frame_count+=1

ws = websocket.WebSocketApp("ws://172.20.10.6:81", on_message=on_message)
ws.run_forever()
