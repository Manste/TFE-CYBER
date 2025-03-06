import websocket
import cv2
import joblib
import numpy as np
from mtcnn.mtcnn import MTCNN
from keras_facenet import FaceNet
import requests

embedder = FaceNet()
detector = MTCNN()

# OpenHAB API URL
OPENHAB_ITEM = "http://localhost:8080/rest/items/RecognizedPerson"

# Load the SVC model
loaded_svc_model = joblib.load('models/svc_model.pkl')
# Load the OneClassSVM model
loaded_one_class_svm = joblib.load('models/one_class_svm_model.pkl')

person_ids = {
    1: "Annalise Keating",
    2: "Manuelle"
}

def get_embedding(model, face_pixels):
	face_pixels = face_pixels.astype('float32') # 3D (160x160x3)
	face_img = np.expand_dims(face_pixels, axis=0)
    # 4D (Nonex160x160x3)
	embedding = model.embeddings(face_img)
	return embedding[0] # 512 D image (1x1x512)

def recognize_face(frame):
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
        # Outlier detection using One-Class SVM
        is_known = loaded_one_class_svm.predict([embedding])[0]  # 1 = known, -1 = unknown

        if pred_prob >= 80 or is_known != -1:
            persons.append(person_ids.get(pred_label, 'Unknown'))
    
    return persons
        

def on_message(ws, message):
    """Process received frame"""
    np_frame = np.frombuffer(message, dtype=np.uint8)
    frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
    persons = recognize_face(frame)
    #print(persons)
    # Send result to OpenHAB
    requests.post(OPENHAB_ITEM, data=persons, headers={"Content-Type": "text/plain"})

# Connect to WebSocket Relay Server
ws = websocket.WebSocketApp("ws://localhost:8765", on_message=on_message)
ws.run_forever()