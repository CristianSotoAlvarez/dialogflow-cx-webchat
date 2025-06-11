import CONFIG from './config.js'; //Import de configuracion conexion backend

const chat = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const voiceBtn = document.getElementById('voiceBtn');
const tooltip = document.querySelector('.tooltip-press');
let currentUtterance = null;
let pressTimer;


const BACKEND_URL = CONFIG.BACKEND_URL;

let autoReadEnabled = false;

// Manejo del botón de escuchar respuestas automáticas
document.getElementById('listenBotBtn').addEventListener('click', () => {
    autoReadEnabled = !autoReadEnabled;
    const btn = document.getElementById('listenBotBtn');
    btn.classList.toggle('active', autoReadEnabled);
    btn.textContent = autoReadEnabled ? '🛑 Detener' : 'Escuchar';

    if (autoReadEnabled) {
        const messages = document.querySelectorAll('.message.bot');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1].innerText.split('Detener')[0].trim();
            speakText(lastMessage);
        }
    } else {
        // Si se desactiva "Escuchar", detén cualquier lectura en curso
        speechSynthesis.cancel(); // 👈 DETIENES CUALQUIER LECTURA ACTIVA
    }
});

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        currentUtterance = utterance;

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

    if (autoReadEnabled) {
    speechSynthesis.cancel(); // Detener cualquier lectura activa antes de enviar
    }   

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

    let isListening = false;

    // Función para iniciar escucha
    function startListening() {
        if (!isListening) {
            speechSynthesis.cancel(); // Detener lectura si hay alguna
            recognition.start();
            isListening = true;
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon> Escuchando';
        }
    }

    // Función para detener escucha
    function stopListening() {
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon> <span>Hablar</span>';
        }
    }

    // Evento: un solo clic para activar/detener
    voiceBtn.addEventListener('click', () => {
        if (!isListening) {
            startListening();
        } else {
            stopListening();
        }
    });

    // Capturar resultado del reconocimiento
    recognition.addEventListener('result', (event) => {
        const voiceText = event.results[0][0].transcript;
        userInput.value = voiceText;
        addMessage(voiceText, 'user'); // Mostrar mensaje del usuario
        sendVoiceMessage(voiceText); // Enviar automáticamente
    });

    // Cuando termine la escucha (ej. usuario deja de hablar)
    recognition.addEventListener('end', () => {
        if (isListening) {
            stopListening();
        }
    });

    // Manejo de errores
    recognition.addEventListener('error', (e) => {
        alert('Error al reconocer voz: ' + e.error);
        stopListening();
    });

} else {
    voiceBtn.disabled = true;
    voiceBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon> No soportado';
}

async function sendVoiceMessage(text) {
    if (!text) return;

    if (autoReadEnabled) {
        speechSynthesis.cancel(); // Detener cualquier lectura activa antes de enviar
    }

    userInput.value = ''; // Limpiar input

    const sessionId = localStorage.getItem('chatSessionId') || Math.random().toString(36).substring(7);
    localStorage.setItem('chatSessionId', sessionId);

    try {
        const response = await fetch(BACKEND_URL, {
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