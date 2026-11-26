import pandas as pd
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline
import joblib

# Dataset paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TRAIN_PATH = os.path.join(
    BASE_DIR, "train-00000-of-00001.parquet"
)

TEST_PATH = os.path.join(
    BASE_DIR, "test-00000-of-00001.parquet"
)

print("Libraries imported successfully!")

# Load training and testing datasets

train_data = pd.read_parquet(TRAIN_PATH)
test_data = pd.read_parquet(TEST_PATH)

print("Training dataset loaded successfully!")
print("Testing dataset loaded successfully!")

print("\nTraining Dataset Shape:", train_data.shape)
print("Testing Dataset Shape:", test_data.shape)

print("\nDataset Columns:")
print(train_data.columns)

print("\nFirst 5 Rows:")
print(train_data.head())

# Check label distribution

print("\nLabel Distribution:")
print(train_data["label"].value_counts())

print("\nMissing Values:")
print(train_data.isnull().sum())

# Prepare training data

X_train = train_data["text"]
y_train = train_data["label"]

X_test = test_data["text"]
y_test = test_data["label"]

print("\nTraining data prepared successfully!")
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# Create Machine Learning Pipeline

model = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=10000,
        stop_words="english"
    )),

    ("classifier", LogisticRegression(
        max_iter=1000
    ))
])

print("\nMachine Learning model created successfully!")

# Train the Machine Learning Model

print("\nModel training started...")

model.fit(X_train, y_train)

print("\nModel training completed successfully!")

# Test the trained model

print("\nTesting model...")

y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print("\nModel Accuracy:", accuracy * 100, "%")

print("\nClassification Report:")
print(classification_report(
    y_test,
    y_pred,
    target_names=["Human", "AI"]
))

# Save trained model

MODEL_PATH = os.path.join(BASE_DIR, "text_detection_model.pkl")

joblib.dump(model, MODEL_PATH)

print("\nModel saved successfully!")
print("Saved at:", MODEL_PATH)