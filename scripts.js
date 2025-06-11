import CONFIG from './config.js'; //Import de configuracion conexion backend

const chat = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const voiceBtn = document.getElementById('voiceBtn');
const BACKEND_URL = CONFIG.BACKEND_URL;

let autoReadEnabled = false;

// Manejo del botón de escuchar respuestas automáticas
document.getElementById('listenBotBtn').addEventListener('click', () => {
    autoReadEnabled = !autoReadEnabled;
    const btn = document.getElementById('listenBotBtn');
    btn.classList.toggle('active', autoReadEnabled);
    btn.textContent = autoReadEnabled ? '🛑 Detener Lectura' : '🔊 Escuchar';

    if (autoReadEnabled) {
    const messages = document.querySelectorAll('.message.bot');
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1].innerText.split('Detener')[0].trim();
        speakText(lastMessage);
    }
    }
});

function speakText(text) {
    if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    speechSynthesis.speak(utterance);
    } else {
    alert('Tu navegador no soporta síntesis de voz.');
    }
}

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = 'message ' + sender;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (sender === 'bot' && autoReadEnabled) {
    speakText(text);
    }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    userInput.value = '';

    const sessionId = localStorage.getItem('chatSessionId') || Math.random().toString(36).substring(7);
    localStorage.setItem('chatSessionId', sessionId);

    try {
    const response = await fetch(BACKEND_URL,  {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        message: text,
        sessionId
        })
    });

    const data = await response.json();
    if (data.response) {
        addMessage(data.response, 'bot');
    } else {
        addMessage('Lo siento, no entendí eso.', 'bot');
    }
    } catch (error) {
    console.error(error);
    addMessage('Error al conectar con el servidor.', 'bot');
    }
}

// Hacer funciones globales para que funcionen en onclick
window.sendMessage = sendMessage;
window.speakText = speakText;

// Reconocimiento de voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener('click', () => {
    recognition.start();
    voiceBtn.classList.add('listening');
    voiceBtn.textContent = '🎤 Escuchando...';
    });

    recognition.addEventListener('result', (event) => {
    const voiceText = event.results[0][0].transcript;
    userInput.value = voiceText;
    sendMessage();
    });

    recognition.addEventListener('end', () => {
    voiceBtn.classList.remove('listening');
    voiceBtn.textContent = '🎤 Hablar';
    });

    recognition.addEventListener('error', (e) => {
    alert('Error al reconocer voz: ' + e.error);
    voiceBtn.classList.remove('listening');
    voiceBtn.textContent = '🎤 Hablar';
    });
} else {
    voiceBtn.disabled = true;
    voiceBtn.innerText = '🎤 No soportado';
}
