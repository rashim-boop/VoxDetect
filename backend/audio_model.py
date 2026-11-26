import librosa
import numpy as np


def extract_audio_features(file_path):

    try:
        # Load audio file
        audio, sample_rate = librosa.load(
            file_path,
            sr=22050,
            mono=True
        )

        # Extract MFCC features
        mfcc = librosa.feature.mfcc(
            y=audio,
            sr=sample_rate,
            n_mfcc=20
        )

        # Extract other audio features
        spectral_centroid = librosa.feature.spectral_centroid(
            y=audio,
            sr=sample_rate
        )

        zero_crossing_rate = librosa.feature.zero_crossing_rate(
            audio
        )

        rms = librosa.feature.rms(y=audio)

        # Combine features
        features = np.concatenate([
            np.mean(mfcc, axis=1),
            np.std(mfcc, axis=1),
            [np.mean(spectral_centroid)],
            [np.mean(zero_crossing_rate)],
            [np.mean(rms)]
        ])

        return features

    except Exception as e:
        print("Error extracting audio features:", e)
        return None