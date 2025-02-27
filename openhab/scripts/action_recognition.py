import cv2
import requests

frame_count = 0
OPENHAB_ITEM = "http://localhost:8080/rest/items/DetectedAction"

def detect_action(folder_frame):
    image = cv2.imread(image_path)
    with mp_pose.Pose(static_image_mode=True) as pose:
        results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if results.pose_landmarks:
            return "DangerousAction"  # Example detected action
    return "None"

detected_action = detect_action("/tmp/frames/")
requests.post(OPENHAB_ITEM, data=detected_action, headers={"Content-Type": "text/plain"})
