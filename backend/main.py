from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel 
import joblib
import os
import tempfile
from audio_model import extract_audio_features
import subprocess

app = FastAPI(title="VoxDetect - AI Detection System")
# Load trained text detection model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR, "text_detection_model.pkl"
)

text_model = joblib.load(MODEL_PATH)
# Load trained audio detection model

AUDIO_MODEL_PATH = os.path.join(
    BASE_DIR, "audio_detector.pkl"
)

audio_model = joblib.load(AUDIO_MODEL_PATH)

print("Audio detection model loaded successfully!")

print("Text detection model loaded successfully!")

# Connect frontend with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home route
@app.get("/")
def home():
    return {
        "message": "Welcome to VoxDetect Backend!"
    }


# Health check
@app.get("/health")
def health():
    return {
        "status": "Backend is working successfully"
    }


# TEXT DETECTION
class TextRequest(BaseModel):
    text: str


@app.post("/api/analyze/text")
async def analyze_text(data: TextRequest):

    text = data.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Please enter some text."
        )

    prediction = text_model.predict([text])[0]

    probabilities = text_model.predict_proba([text])[0]
    confidence = max(probabilities) * 100

    if prediction == 0:
        result = "Human Written"
    else:
        result = "AI Generated"

    return {
        "status": "Analysis completed successfully",
        "words": len(text.split()),
        "characters": len(text),
        "prediction": result,
        "confidence": round(confidence, 2)
    }

# AUDIO DETECTION
@app.post("/api/analyze/audio")
async def analyze_audio(file: UploadFile = File(...)):

    allowed_formats = (".wav", ".mp3", ".ogg", ".webm")

    if not file.filename.lower().endswith(allowed_formats):
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format."
        )

    audio_data = await file.read()

    if not audio_data:
        raise HTTPException(
            status_code=400,
            detail="Audio file is empty."
        )

    temp_path = None
    wav_path = None
    try:
        # Save uploaded audio temporarily
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=os.path.splitext(file.filename)[1]
        ) as temp_file:

            temp_file.write(audio_data)
            temp_path = temp_file.name

        # Convert audio to WAV format
        wav_path = temp_path.rsplit(".", 1)[0] + "_converted.wav"

        conversion = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", temp_path,
                "-ar", "22050",
                "-ac", "1",
                wav_path
            ],
            capture_output=True,
            text=True
        )

        if conversion.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail="Audio conversion failed."
            )

        # Extract audio features
        features = extract_audio_features(wav_path)

        if features is None:
            raise HTTPException(
                status_code=400,
                detail="Could not process audio file."
            )

        # Predict using trained model
        prediction = audio_model.predict([features])[0]

        probabilities = audio_model.predict_proba([features])[0]
        confidence = max(probabilities) * 100

        if prediction == "fake":
            result = "AI Generated"
        else:
            result = "Human Generated"

        return {
            "status": "Analysis completed successfully",
            "filename": file.filename,
            "file_size": len(audio_data),
            "prediction": result,
            "confidence": round(confidence, 2)
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)