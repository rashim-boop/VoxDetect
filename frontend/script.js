// ==================================
// VOXDETECT - FRONTEND JAVASCRIPT
// ==================================

const audioFile = document.getElementById("audioFile");
const chooseBtn = document.getElementById("chooseBtn");
const dropArea = document.getElementById("dropArea");

const audioPlayer = document.getElementById("audioPlayer");
const audioPreview = document.getElementById("audioPreview");

const analyzeBtn = document.getElementById("analyzeBtn");
const audioMessage = document.getElementById("audioMessage");

const recordBtn = document.getElementById("recordBtn");
const recordStatus = document.getElementById("recordStatus");

let selectedFile = null;
let histogramChart = null;
let mediaRecorder = null;
let recordedChunks = [];

 
// ==================================
// 1. AUDIO UPLOAD
// ==================================

chooseBtn.addEventListener("click", () => {
    audioFile.click();
});

audioFile.addEventListener("change", () => {

    if (audioFile.files.length > 0) {
        handleAudio(audioFile.files[0]);
    }

});

function handleAudio(file) {

    if (!file.type.startsWith("audio/")) {
        audioMessage.textContent =
            "Please select a valid audio file.";
        return;
    }

    selectedFile = file;

    audioPlayer.src = URL.createObjectURL(file);

    audioPreview.hidden = false;

    document.getElementById("fileName").textContent =
        file.name;

    audioMessage.textContent =
        "Audio uploaded successfully!";
}


// ==================================
// 2. DRAG AND DROP
// ==================================

dropArea.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropArea.classList.add("dragging");

});

dropArea.addEventListener("dragleave", () => {

    dropArea.classList.remove("dragging");

});

dropArea.addEventListener("drop", (event) => {

    event.preventDefault();

    dropArea.classList.remove("dragging");

    const file = event.dataTransfer.files[0];

    if (file) {
        handleAudio(file);
    }

});


// ==================================
// 3. VOICE RECORDING
// ==================================

recordBtn.addEventListener("click", async () => {

    if (mediaRecorder &&
        mediaRecorder.state === "recording") {

        mediaRecorder.stop();
        return;
    }

    try {

        const stream = await navigator.mediaDevices
            .getUserMedia({ audio: true });

        recordedChunks = [];

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {

            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }

        };

        mediaRecorder.onstop = () => {

            const blob = new Blob(recordedChunks, {
                type: mediaRecorder.mimeType
            });

            const extension =
                blob.type.includes("ogg") ? "ogg" : "webm";

            const file = new File(
                [blob],
                `recording.${extension}`,
                { type: blob.type }
            );

            handleAudio(file);

            stream.getTracks().forEach(track => track.stop());

            recordBtn.textContent = "● Start Recording";

            recordBtn.classList.remove("recording");

            recordStatus.textContent =
                "Recording completed.";

        };

        mediaRecorder.start();

        recordBtn.textContent = "■ Stop Recording";

        recordBtn.classList.add("recording");

        recordStatus.textContent =
            "Recording in progress...";

    } catch (error) {

        audioMessage.textContent =
            "Please allow microphone access.";

        console.error(error);

    }

});


// AUDIO ANALYSIS - BACKEND CONNECTION

analyzeBtn.addEventListener("click", async () => {

    const SelectedAudio = selectedFile || audioFile.files[0];

    if (!SelectedAudio) {
        alert("Please upload an audio file first.");
        return;
    }

    try {

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = "Analyzing...";

        document.getElementById("audioAnalysis").hidden = false;

        // Generate audio graphs
        await createHistogram(SelectedAudio);
        await createAudioRadar(SelectedAudio);
        await createAudioWaveform(SelectedAudio);

        // Send audio to Python backend
        const formData = new FormData();
        formData.append("file", SelectedAudio);

        const response = await fetch(
            "http://127.0.0.1:8000/api/analyze/audio",
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Audio analysis failed."
            );
        }

        console.log("Audio Backend Response:", result);

        // DISPLAY PREDICTION ON WEBSITE

        document.getElementById("audioPrediction").textContent =
            result.prediction;

        document.getElementById("audioConfidence").textContent =
            "Confidence: " + result.confidence + "%";

    } catch (error) {

        console.error("Audio Analysis Error:", error);

        document.getElementById("audioPrediction").textContent =
            "Analysis Failed";

        document.getElementById("audioConfidence").textContent =
            error.message;

    } finally {

        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze Audio";

    }

});
// ==================================
// 5. GENERATE AUDIO HISTOGRAM
// ==================================

async function createHistogram(file) {

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    const context = new AudioContextClass();

    try {

        const arrayBuffer = await file.arrayBuffer();

        const audioBuffer =
            await context.decodeAudioData(arrayBuffer);

        const bins = 40;

        const counts = new Array(bins).fill(0);

        // Read actual audio samples

        for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
        ) {

            const samples =
                audioBuffer.getChannelData(channel);

            const step = Math.max(
                1,
                Math.ceil(samples.length / 200000)
            );

            for (
                let i = 0;
                i < samples.length;
                i += step
            ) {

                const amplitude = samples[i];

                let bin = Math.floor(
                    ((amplitude + 1) / 2) * bins
                );

                bin = Math.max(
                    0,
                    Math.min(bins - 1, bin)
                );

                counts[bin]++;

            }

        }

        const labels = [];

        for (let i = 0; i < bins; i++) {

            const start = -1 + (i * 2 / bins);

            const end = start + (2 / bins);

            labels.push(
                `${start.toFixed(2)} to ${end.toFixed(2)}`
            );

        }

        drawHistogram(labels, counts);

    } finally {

        await context.close();

    }

}


// ==================================
// 6. DISPLAY HISTOGRAM
// ==================================

function drawHistogram(labels, counts) {

    const ctx = document
        .getElementById("histogramChart")
        .getContext("2d");

    if (histogramChart) {
        histogramChart.destroy();
    }

    histogramChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{

                label: "Audio Sample Frequency",

                data: counts,

                backgroundColor: "#397df0",

                borderColor: "#70a5ff",

                borderWidth: 1,

                barPercentage: 1,

                categoryPercentage: 1

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    labels: {
                        color: "#ffffff"
                    }

                }

            },

            scales: {

                x: {

                    title: {

                        display: true,

                        text: "Audio Amplitude",

                        color: "#ffffff"

                    },

                    ticks: {

                        color: "#aab8cf",

                        maxTicksLimit: 8

                    },

                    grid: {
                        color: "#273653"
                    }

                },

                y: {

                    beginAtZero: true,

                    title: {

                        display: true,

                        text: "Frequency",

                        color: "#ffffff"

                    },

                    ticks: {
                        color: "#aab8cf"
                    },

                    grid: {
                        color: "#273653"
                    }

                }

            }

        }

    });

}
// ==================================
// 5. GENERATE AUDIO HISTOGRAM
// ==================================

async function createHistogram(file) {

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    const context = new AudioContextClass();

    try {

        const arrayBuffer = await file.arrayBuffer();

        const audioBuffer =
            await context.decodeAudioData(arrayBuffer);

        const bins = 40;

        const counts = new Array(bins).fill(0);

        // Read actual audio samples

        for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
        ) {

            const samples =
                audioBuffer.getChannelData(channel);

            const step = Math.max(
                1,
                Math.ceil(samples.length / 200000)
            );

            for (
                let i = 0;
                i < samples.length;
                i += step
            ) {

                const amplitude = samples[i];

                let bin = Math.floor(
                    ((amplitude + 1) / 2) * bins
                );

                bin = Math.max(
                    0,
                    Math.min(bins - 1, bin)
                );

                counts[bin]++;

            }

        }

        const labels = [];

        for (let i = 0; i < bins; i++) {

            const start = -1 + (i * 2 / bins);

            const end = start + (2 / bins);

            labels.push(
                `${start.toFixed(2)} to ${end.toFixed(2)}`
            );

        }

        drawHistogram(labels, counts);

    } finally {

        await context.close();

    }

}


// ==================================
// 6. DISPLAY HISTOGRAM
// ==================================

function drawHistogram(labels, counts) {

    const ctx = document
        .getElementById("histogramChart")
        .getContext("2d");

    if (histogramChart) {
        histogramChart.destroy();
    }

    histogramChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{

                label: "Audio Sample Frequency",

                data: counts,

                backgroundColor: "#397df0",

                borderColor: "#70a5ff",

                borderWidth: 1,

                barPercentage: 1,

                categoryPercentage: 1

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    labels: {
                        color: "#ffffff"
                    }

                }

            },

            scales: {

                x: {

                    title: {

                        display: true,

                        text: "Audio Amplitude",

                        color: "#ffffff"

                    },

                    ticks: {

                        color: "#aab8cf",

                        maxTicksLimit: 8

                    },

                    grid: {
                        color: "#273653"
                    }

                },

                y: {

                    beginAtZero: true,

                    title: {

                        display: true,

                        text: "Frequency",

                        color: "#ffffff"

                    },

                    ticks: {
                        color: "#aab8cf"
                    },

                    grid: {
                        color: "#273653"
                    }

                }

            }

        }

    });

}

/* =========================================
   7. TEXT UPLOAD AND TEXT INPUT
========================================= */

const textFile = document.getElementById("textFile");
const textInput = document.getElementById("textInput");

const documentName = document.getElementById("documentName");
const textMessage = document.getElementById("textMessage");

const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");

const analyzeTextBtn = document.getElementById("analyzeTextBtn");
const textAnalysis = document.getElementById("textAnalysis");


// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


// Function to update word and character count
function updateTextCounter() {

    const text = textInput.value.trim();

    const words = text
        ? text.split(/\s+/).length
        : 0;

    wordCount.textContent = "Words: " + words;

    charCount.textContent =
        "Characters: " + textInput.value.length;
}


// Update counter when user writes or pastes text
textInput.addEventListener("input", function () {

    updateTextCounter();

});


// Upload TXT, PDF and DOCX files
textFile.addEventListener("change", async function () {

    const file = this.files[0];

    if (!file) return;

    documentName.textContent = "Selected: " + file.name;

    textMessage.textContent = "Reading your file...";

    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

    try {

        let extractedText = "";

        textMessage.textContent = "Reading your file...";

        // TXT FILE
        if (extension === "txt") {

            extractedText = await file.text();

        }

        // PDF FILE
        else if (extension === "pdf") {

            const buffer = await file.arrayBuffer();

            const pdf = await pdfjsLib.getDocument({
                data: buffer
            }).promise;

            for (let i = 1; i <= pdf.numPages; i++) {

                const page = await pdf.getPage(i);

                const content = await page.getTextContent();

                extractedText += content.items
                    .map(item => item.str)
                    .join(" ") + "\n";

            }

        }

        // DOCX FILE
        else if (extension === "docx") {

            const buffer = await file.arrayBuffer();

            const result = await mammoth.extractRawText({
                arrayBuffer: buffer
            });

            extractedText = result.value;

        }

        else {

            throw new Error(
                "Please upload TXT, PDF or DOCX file."
            );

        }


        // Display extracted text in writing box
        textInput.value = extractedText;

        documentName.textContent =
            "Uploaded: " + file.name;

        textMessage.textContent =
            "File uploaded successfully!";

        updateTextCounter();

    }

    catch (error) {

        console.error(error);

        textMessage.textContent =
            "Error reading file: " + error.message;

    }

});


analyzeTextBtn.addEventListener("click", async () => {
    const text = textInput.value.trim();

    if (!text) {
        textMessage.textContent = "Please enter or upload some text first.";
        return;
    }

    try {
        textMessage.textContent = "Sending text to backend...";

        const response = await fetch("http://127.0.0.1:8000/api/analyze/text", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: text })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Something went wrong.");
        }

        textAnalysis.style.display = "block";
        createTextHistogram(text);
        createTextRadar(text);
        textResult.textContent =
            `Prediction: ${result.prediction}
            Words: ${result.words}
            Characters: ${result.characters}
            Confidence: ${result.confidence}%`;
        textMessage.textContent = "Backend connection successful!";

    } catch (error) {
        console.error("Text API Error:", error);
        textMessage.textContent = "Backend connection failed: " + error.message;
    }
});

// TEXT WORD LENGTH HISTOGRAM

let textHistogramInstance = null;

function createTextHistogram(text) {
    const words = text.trim().split(/\s+/);

    // Count words according to their length
    const labels = ["1-3", "4-6", "7-9", "10-12", "13+"];
    const counts = [0, 0, 0, 0, 0];

    words.forEach(word => {
        const length = word.replace(/[^\p{L}\p{N}]/gu, "").length;

        if (length >= 1 && length <= 3) {
            counts[0]++;
        } else if (length <= 6) {
            counts[1]++;
        } else if (length <= 9) {
            counts[2]++;
        } else if (length <= 12) {
            counts[3]++;
        } else {
            counts[4]++;
        }
    });

    const canvas = document.getElementById("textHistogramChart");

    if (!canvas) {
        console.error("Text histogram canvas not found!");
        return;
    }

    if (textHistogramInstance) {
        textHistogramInstance.destroy();
    }

    textHistogramInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Number of Words",
                data: counts,
                backgroundColor: "#28b8ed",
                borderColor: "#1595c5",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Word Length"
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: "Number of Words"
                    }
                }
            }
        }
    });
}

/* audio radar*/
let audioRadarInstance = null;

async function createAudioRadar(file) {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    const audioContext = new AudioContextClass();

    try {
        const buffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);

        const samples = audioBuffer.getChannelData(0);

        let sumSquares = 0;
        let peak = 0;
        let zeroCrossings = 0;
        let silentSamples = 0;
        let previous = samples[0] || 0;

        for (let i = 0; i < samples.length; i++) {
            const value = samples[i];

            sumSquares += value * value;
            peak = Math.max(peak, Math.abs(value));

            if (i > 0 && value * previous < 0) {
                zeroCrossings++;
            }

            if (Math.abs(value) < 0.01) {
                silentSamples++;
            }

            previous = value;
        }

        const rms = Math.sqrt(sumSquares / samples.length);
        const zcr = zeroCrossings / samples.length;
        const silenceRatio = silentSamples / samples.length;

        const features = [
            Math.min(rms * 300, 100),
            Math.min(zcr * 500, 100),
            silenceRatio * 100,
            peak * 100,
            Math.min((peak - rms) * 150, 100)
        ];

        const canvas = document.getElementById("audioRadarChart");

        if (audioRadarInstance) {
            audioRadarInstance.destroy();
        }

        audioRadarInstance = new Chart(canvas, {
            type: "radar",
            data: {
                labels: [
                    "RMS Energy",
                    "Zero Crossing Rate",
                    "Silence Ratio",
                    "Peak Amplitude",
                    "Dynamic Range"
                ],
                datasets: [{
                    label: "Audio Features",
                    data: features,
                    backgroundColor: "rgba(40, 184, 237, 0.2)",
                    borderColor: "#28b8ed",
                    pointBackgroundColor: "#28b8ed"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });

    } finally {
        await audioContext.close();
    }
}

/*text radar*/
let textRadarInstance = null;

function createTextRadar(text) {
    const words = text.match(/\b[\p{L}\p{N}]+\b/gu) || [];

    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    if (words.length === 0) {
        console.log("No text available for radar chart.");
        return;
    }

    const lengths = words.map(word => word.length);

    const averageWordLength =
        lengths.reduce((a, b) => a + b, 0) / words.length;

    const averageSentenceLength =
        words.length / Math.max(sentences.length, 1);

    const uniqueWords =
        new Set(words.map(word => word.toLowerCase())).size;

    const vocabularyDiversity = uniqueWords / words.length;

    const punctuationCount = (text.match(/[,;:!?]/g) || []).length;

    const punctuationRate =
        (punctuationCount / words.length) * 100;

    const longWordRatio =
        lengths.filter(length => length > 7).length / words.length;

    const features = [
        Math.min(averageWordLength * 12, 100),
        Math.min(averageSentenceLength * 2, 100),
        vocabularyDiversity * 100,
        Math.min(punctuationRate * 10, 100),
        longWordRatio * 100
    ];

    const canvas = document.getElementById("textRadarChart");

    if (!canvas) {
        console.error("Text radar canvas not found!");
        return;
    }

    if (textRadarInstance) {
        textRadarInstance.destroy();
    }

    textRadarInstance = new Chart(canvas, {
        type: "radar",
        data: {
            labels: [
                "Average Word Length",
                "Sentence Length",
                "Vocabulary Diversity",
                "Punctuation Rate",
                "Long Word Ratio"
            ],
            datasets: [{
                label: "Text Features",
                data: features,
                backgroundColor: "rgba(255, 165, 50, 0.2)",
                borderColor: "#ffa532",
                pointBackgroundColor: "#ffa532"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
}
/* AUDIO WAVEFORM */

let audioWaveformInstance = null;

async function createAudioWaveform(file) {

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    const audioContext = new AudioContextClass();

    try {
        const buffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);

        const samples = audioBuffer.getChannelData(0);

        const points = 1000;
        const blockSize = Math.floor(samples.length / points);

        const waveformData = [];

        for (let i = 0; i < points; i++) {

            const start = i * blockSize;
            let max = 0;

            for (let j = start; j < start + blockSize; j++) {
                max = Math.max(max, Math.abs(samples[j]));
            }

            waveformData.push(max);
        }

        const canvas = document.getElementById("audioWaveform");

        if (audioWaveformInstance) {
            audioWaveformInstance.destroy();
        }

        audioWaveformInstance = new Chart(canvas, {
            type: "line",

            data: {
                labels: waveformData.map((_, i) => i),

                datasets: [{
                    label: "Audio Waveform",
                    data: waveformData,
                    borderColor: "#28b8ed",
                    backgroundColor: "rgba(40,184,237,0.2)",
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1.5,
                    tension: 0.2
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true
                    }
                },

                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Time"
                        }
                    },

                    y: {
                        min: 0,
                        max: 1,
                        title: {
                            display: true,
                            text: "Amplitude"
                        }
                    }
                }
            }
        });

    } finally {
        await audioContext.close();
    }
}