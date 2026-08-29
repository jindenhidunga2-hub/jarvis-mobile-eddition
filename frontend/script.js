const chat = document.getElementById("chat");
const input = document.getElementById("userInput");

function addMessage(text, sender) {
const message = document.createElement("div");

message.className =
    sender === "user"
        ? "message user"
        : "message jarvis";

message.innerHTML =
    sender === "user"
        ? `<b>YOU:</b><br>${text}`
        : `<b>JARVIS:</b><br>${text}`;

chat.appendChild(message);
chat.scrollTop = chat.scrollHeight;

}

function sendMessage() {
const text = input.value.trim();

if (!text) return;

const chat = document.getElementById("chat");
const input = document.getElementById("userInput");

function addMessage(text, sender) {
const message = document.createElement("div");

message.className =
    sender === "user"
        ? "message user"
        : "message jarvis";

message.innerHTML =
    sender === "user"
        ? `<b>YOU:</b><br>${text}`
        : `<b>JARVIS:</b><br>${text}`;

chat.appendChild(message);
chat.scrollTop = chat.scrollHeight;

}

function sendMessage() {
const text = input.value.trim();

if (!text) return;

addMessage(text, "user");
input.value = "";

setTimeout(() => {
    const response = jarvisResponse(text);

    addMessage(response, "jarvis");
    speak(response);
}, 500);

}

function quickCommand(command) {
input.value = command;
sendMessage();
}

function jarvisResponse(text) {
const command = text.toLowerCase();

if (command.includes("hello") || command.includes("hi")) {
    return "Hello. I am JARVIS. How may I assist you?";
}

if (command.includes("time")) {
    return "The current time is " +
        new Date().toLocaleTimeString();
}

if (command.includes("date")) {
    return "Today's date is " +
        new Date().toLocaleDateString();
}

if (command.includes("youtube")) {
    window.open("https://www.youtube.com", "_blank");
    return "Opening YouTube.";
}

if (command.includes("google")) {
    window.open("https://www.google.com", "_blank");
    return "Opening Google.";
}

if (command.includes("joke")) {
    return "Why do programmers prefer dark mode? Because light attracts bugs.";
}

if (command.includes("status")) {
    return "All JARVIS systems are operating normally.";
}

if (command.includes("who are you")) {
    return "I am JARVIS, your virtual artificial intelligence assistant.";
}

if (command.includes("weather")) {
    return "Weather integration can be connected to a live weather API.";
}

if (command.includes("open")) {
    return "Command received. Advanced application controls can be added here.";
}

return `I understand your command: ${text}. Advanced AI integration can be connected here.`;

}

function speak(text) {
if (!("speechSynthesis" in window)) return;

window.speechSynthesis.cancel();

const speech = new SpeechSynthesisUtterance(text);
speech.rate = 1;
speech.pitch = 0.9;
speech.volume = 1;

window.speechSynthesis.speak(speech);

}

function startVoice() {
const SpeechRecognition =
window.SpeechRecognition ||
window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    addMessage(
        "Speech recognition is not supported in this browser.",
        "jarvis"
    );
    return;
}

const recognition = new SpeechRecognition();

recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

recognition.onstart = function () {
    addMessage("Listening...", "jarvis");
};

recognition.onresult = function (event) {
    const speechText =
        event.results[0][0].transcript;

    input.value = speechText;
    sendMessage();
};

recognition.onerror = function () {
    addMessage(
        "Voice recognition error. Please try again.",
        "jarvis"
    );
};

recognition.start();

}

document.addEventListener("DOMContentLoaded", () => {
input.focus();
});
