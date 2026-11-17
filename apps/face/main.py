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
from fastapi import FastAPI, HTTPException, Request
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
        base = mp.tasks.BaseOptions(model_asset_path=MODEL_PATH)
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


def decode_base64(encoded: str) -> np.ndarray:
    if "," in encoded:
        encoded = encoded.split(",", 1)[1]
    try:
        raw = base64.b64decode(encoded, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Image base64 invalide.") from exc
    return decode_image(raw)


def liveness_metrics(frames: list[np.ndarray]) -> dict:
    """Heuristiques anti-photo : mouvement réel + netteté + taille du visage.

    Une photo imprimée ou un écran tenu devant la caméra produit des images
    quasi identiques (mouvement nul) ou anormalement lisses (peu de détail
    haute fréquence). Ces mesures ne remplacent pas un anti-spoofing ML, mais
    elles bloquent les attaques naïves sans dépendance supplémentaire.
    """
    grays = []
    for frame in frames:
        small = cv2.resize(frame, (160, 120))
        grays.append(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32))

    diffs = [
        float(np.mean(np.abs(grays[index] - grays[index - 1])))
        for index in range(1, len(grays))
    ]
    motion = max(diffs) if diffs else 0.0

    last = grays[-1]
    # Certaines builds OpenCV 5 refusent Laplacian(CV_32F -> CV_64F) : on part
    # du gris 8 bits, ce qui correspond aussi au calcul de netteté classique.
    sharpness = float(cv2.Laplacian(last.astype(np.uint8), cv2.CV_64F).var())

    detection = detect_faces(frames[-1])
    face_ratio = 0.0
    if detection["boundingBoxes"]:
        box = detection["boundingBoxes"][0]
        area = box["width"] * box["height"]
        face_ratio = area / float(frames[-1].shape[0] * frames[-1].shape[1])

    score = min(1.0, motion / 6.0) * 0.45 + min(1.0, sharpness / 120.0) * 0.4 + min(
        1.0, face_ratio / 0.18
    ) * 0.15

    reason = None
    if not detection["faceDetected"]:
        reason = "Aucun visage détecté sur la dernière image."
    elif motion < 1.2:
        reason = "Aucun mouvement détecté : bouge légèrement la tête pendant le scan."
    elif sharpness < 8:
        reason = "Image trop lisse ou floue : utilise un vrai visage, pas une photo."
    elif face_ratio < 0.03:
        reason = "Rapproche-toi de la caméra."

    return {
        "faceDetected": detection["faceDetected"],
        "faceCount": detection["faceCount"],
        "motion": round(motion, 3),
        "sharpness": round(sharpness, 3),
        "faceRatio": round(face_ratio, 4),
        "livenessScore": round(score, 3),
        "passed": reason is None,
        "reason": reason,
    }


@app.post("/liveness")
async def liveness(request: Request):
    try:
        body = await request.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Corps JSON invalide.") from exc

    frames = body.get("frames") if isinstance(body, dict) else None

    if not isinstance(frames, list) or len(frames) < 2:
        raise HTTPException(status_code=400, detail="Au moins deux images sont requises.")

    decoded = [decode_base64(frame) for frame in frames[:5]]

    try:
        return liveness_metrics(decoded)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Echec de l'analyse : {exc}") from exc


@app.get("/health")
def health():
    return {"status": "ok", "service": "mindbenin-face", "model": Path(MODEL_PATH).name}


@app.post("/detect")
async def detect(request: Request):
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded = form.get("file")
        if uploaded is None:
            raise HTTPException(status_code=400, detail="Aucune image fournie.")
        raw = await uploaded.read()
    else:
        try:
            body = await request.json()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Corps JSON invalide.") from exc

        encoded = body.get("image") if isinstance(body, dict) else None
        if not encoded:
            raise HTTPException(status_code=400, detail="Aucune image fournie.")
        if "," in encoded:
            encoded = encoded.split(",", 1)[1]
        try:
            raw = base64.b64decode(encoded, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Image base64 invalide.") from exc

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
