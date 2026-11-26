import os
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

from audio_model import extract_audio_features


DATASET_PATH = "audio_dataset"

X_train = []
y_train = []

X_test = []
y_test = []


def load_dataset(split, features_list, labels_list):

    for label in ["fake", "real"]:

        folder = os.path.join(DATASET_PATH, split, label)

        print(f"\nLoading {split} - {label} audio...")

        for filename in os.listdir(folder):

            if filename.lower().endswith(".wav"):

                file_path = os.path.join(folder, filename)

                features = extract_audio_features(file_path)

                if features is not None:
                    features_list.append(features)
                    labels_list.append(label)

    print(f"{split} dataset loaded successfully!")


# Load training data
load_dataset("train", X_train, y_train)

# Load testing data
load_dataset("test", X_test, y_test)


# Convert into NumPy arrays
X_train = np.array(X_train)
y_train = np.array(y_train)

X_test = np.array(X_test)
y_test = np.array(y_test)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# Train Random Forest model
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)

print("\nTraining audio detection model...")

model.fit(X_train, y_train)


# Test model
predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\nModel Accuracy:", accuracy * 100, "%")

print("\nClassification Report:")
print(classification_report(y_test, predictions))


# Save trained model
joblib.dump(model, "audio_detector.pkl")

print("\nAudio detection model saved successfully!")