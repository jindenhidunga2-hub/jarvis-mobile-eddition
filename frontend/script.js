// ======================================================
// JARVIS AI - script.js
// ======================================================

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const statusText = document.getElementById("status");

// ------------------------------------------------------
// Configuration
// ------------------------------------------------------

const JARVIS_NAME = "JARVIS";
let isListening = false;

// ------------------------------------------------------
// Chat UI
// ------------------------------------------------------

function addMessage(message, sender = "jarvis") {
    if (!chatBox) return;

    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}`;

    messageElement.innerHTML = `
        <div class="message-content">${escapeHTML(message)}</div>
    `;

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ------------------------------------------------------
// Speech Output
// ------------------------------------------------------

function speak(text) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 0.95;
    speech.pitch = 1.0;
    speech.volume = 1.0;

    const voices = speechSynthesis.getVoices();

    const preferredVoice =
        voices.find(v => /female/i.test(v.name)) ||
        voices.find(v => /en-US|en-IN|en-GB/i.test(v.lang)) ||
        voices[0];

    if (preferredVoice) {
        speech.voice = preferredVoice;
    }

    speech.onstart = () => {
        setStatus("JARVIS is speaking...");
    };

    speech.onend = () => {
        setStatus("Ready");
    };

    speechSynthesis.speak(speech);
}

// ------------------------------------------------------
// Status
// ------------------------------------------------------

function setStatus(text) {
    if (statusText) {
        statusText.textContent = text;
    }
}

// ------------------------------------------------------
// Voice Recognition
// ------------------------------------------------------

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
        isListening = true;
        setStatus("Listening...");
        micBtn?.classList.add("active");
    };

    recognition.onresult = event => {
        const transcript =
            event.results[0][0].transcript.trim();

        if (userInput) {
            userInput.value = transcript;
        }

        isListening = false;
        micBtn?.classList.remove("active");

        processUserMessage(transcript);
    };

    recognition.onerror = event => {
        console.error("Speech recognition error:", event.error);

        isListening = false;
        micBtn?.classList.remove("active");

        setStatus("Voice recognition error");
    };

    recognition.onend = () => {
        isListening = false;
        micBtn?.classList.remove("active");

        if (statusText?.textContent === "Listening...") {
            setStatus("Ready");
        }
    };
}

// ------------------------------------------------------
// Start / Stop Microphone
// ------------------------------------------------------

function toggleMicrophone() {
    if (!recognition) {
        addMessage(
            "Voice recognition is not supported in this browser.",
            "jarvis"
        );
        return;
    }

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// ------------------------------------------------------
// Basic JARVIS Intelligence
// ------------------------------------------------------

async function processUserMessage(message) {
    const text = message.trim();

    if (!text) return;

    addMessage(text, "user");

    if (userInput) {
        userInput.value = "";
    }

    setStatus("Thinking...");

    const response = await generateResponse(text);

    addMessage(response, "jarvis");
    speak(response);

    setStatus("Ready");
}

// ------------------------------------------------------
// Local Command Engine
// ------------------------------------------------------

async function generateResponse(input) {
    const text = input.toLowerCase();

    // Greeting
    if (
        text.includes("hello") ||
        text.includes("hi") ||
        text.includes("hey")
    ) {
        return "Hello. JARVIS online and ready to assist.";
    }

    // Identity
    if (
        text.includes("who are you") ||
        text.includes("your name")
    ) {
        return "I am JARVIS, your personal AI assistant.";
    }

    // Time
    if (text.includes("time")) {
        return `The current time is ${new Date().toLocaleTimeString()}.`;
    }

    // Date
    if (
        text.includes("date") ||
        text.includes("today")
    ) {
        return `Today is ${new Date().toLocaleDateString(
            undefined,
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        )}.`;
    }

    // Open Google
    if (text.includes("open google")) {
        window.open("https://www.google.com", "_blank");
        return "Opening Google.";
    }

    // Open YouTube
    if (text.includes("open youtube")) {
        window.open("https://www.youtube.com", "_blank");
        return "Opening YouTube.";
    }

    // Search
    if (text.startsWith("search ")) {
        const query = input.substring(7).trim();

        if (query) {
            window.open(
                `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                "_blank"
            );

            return `Searching for ${query}.`;
        }
    }

    // Clear chat
    if (
        text.includes("clear chat") ||
        text.includes("clear conversation")
    ) {
        if (chatBox) {
            chatBox.innerHTML = "";
        }

        return "Conversation cleared.";
    }

    // Help
    if (
        text === "help" ||
        text.includes("what can you do")
    ) {
        return (
            "I can respond to commands, tell you the time and date, " +
            "search the web, open websites, use voice input, and speak responses."
        );
    }

    // Default response
    return `I received your request: "${input}". Connect an online AI API to enable advanced reasoning and natural conversations.`;
}

// ------------------------------------------------------
// Send Button
// ------------------------------------------------------

sendBtn?.addEventListener("click", () => {
    const message = userInput?.value.trim();

    if (message) {
        processUserMessage(message);
    }
});

// ------------------------------------------------------
// Enter Key
// ------------------------------------------------------

userInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        const message = userInput.value.trim();

        if (message) {
            processUserMessage(message);
        }
    }
});

// ------------------------------------------------------
// Microphone Button
// ------------------------------------------------------

micBtn?.addEventListener("click", toggleMicrophone);

// ------------------------------------------------------
// Initialize
// ------------------------------------------------------

window.speechSynthesis?.addEventListener("voiceschanged", () => {
    speechSynthesis.getVoices();
});

setStatus("Ready");

console.log(`${JARVIS_NAME} system initialized.`);
