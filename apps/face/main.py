"""MindBenin - service de verification faciale (Python).

Expose une detection de visage reelle via MediaPipe. L'API NestJS l'appelle
pour valider qu'un vrai visage est present dans la photo capturee par la
camera du citoyen. Si le service est indisponible, l'API repasse en mode
simule (voir Fallback dans IdentityService).

Lancement :
    cd apps/face
    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import io
import os
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MODEL_PATH = os.getenv(
    "FACE_MODEL_PATH",
    str(Path(__file__).resolve().parent / "models" / "blaze_face_short_range.tflite"),
)

app = FastAPI(title="MindBenin Face Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_detector = None


def get_detector():
    global _detector
    if _detector is None:
        if not Path(MODEL_PATH).exists():
            raise RuntimeError(f"Modele introuvable : {MODEL_PATH}")
        base = mp.tasks.python.BaseOptions(model_asset_path=MODEL_PATH)
        options = mp.tasks.vision.FaceDetectorOptions(base_options=base)
        _detector = mp.tasks.vision.FaceDetector.create_from_options(options)
    return _detector


def decode_image(raw: bytes) -> np.ndarray:
    if not raw:
        raise HTTPException(status_code=400, detail="Image vide.")
    array = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Image illisible.")
    return image


def detect_faces(image: np.ndarray) -> dict:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = get_detector().detect(mp_image)

    boxes = []
    for detection in result.detections:
        box = detection.bounding_box
        boxes.append(
            {
                "x": int(box.origin_x),
                "y": int(box.origin_y),
                "width": int(box.width),
                "height": int(box.height),
            }
        )

    return {
        "faceDetected": len(result.detections) > 0,
        "faceCount": len(result.detections),
        "boundingBoxes": boxes,
    }


class DetectRequest(BaseModel):
    image: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "mindbenin-face", "model": Path(MODEL_PATH).name}


@app.post("/detect")
async def detect(file: UploadFile | None = File(None), payload: DetectRequest | None = None):
    if file is not None:
        raw = await file.read()
    elif payload is not None and payload.image:
        encoded = payload.image
        if "," in encoded:
            encoded = encoded.split(",", 1)[1]
        try:
            raw = base64.b64decode(encoded, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Image base64 invalide.") from exc
    else:
        raise HTTPException(status_code=400, detail="Aucune image fournie.")

    image = decode_image(raw)
    try:
        return detect_faces(image)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Echec de la detection : {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
