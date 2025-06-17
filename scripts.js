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
    const isActive = autoReadEnabled;

    // Cambiar icono y texto dinámicamente
    if (isActive) {
        btn.innerHTML = `
            <ion-icon name="stop-circle-outline"></ion-icon>
            <span>Detener</span>
        `;
        btn.classList.add('active');

        const messages = document.querySelectorAll('.message.bot');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1].innerText.split('Detener')[0].trim();
            speakText(lastMessage);
        }
    } else {
        speechSynthesis.cancel(); // Detener lectura inmediatamente
        btn.innerHTML = `
            <ion-icon name="volume-high-outline"></ion-icon>
            <span>Escuchar</span>
        `;
        btn.classList.remove('active');
    }
});

function cleanTextForSpeech(text) {
    // Eliminar emoticonos y caracteres no deseados
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g;
    let cleaned = text.replace(emojiRegex, '');

    // Eliminar comillas y guiones comunes
    cleaned = cleaned
        .replace(/[“”"“]/g, '')     // Comillas dobles y curvas
        .replace(/[‘’'`]/g, '')     // Comillas simples y apóstrofos
        .replace(/[-—–]/g, ' ')      // Guiones largos y cortos (se reemplaza por un espacio para no romper formato de salas!!!)
        .replace(/[*_~`]/g, '')     // Formato tipo Markdown
        .replace(/\[.*?\]/g, '')    // Links en formato [texto](url)
        .replace(/https?:\/\/\S+/g, '') // URLs

    /*eliminar espacios múltiples generados por los reemplazos
    cleaned = cleaned.replace(/\s+/g, ' ').trim();*/

    return cleaned;
}


function speakText(text) {
    if ('speechSynthesis' in window) {
        const cleanedText = cleanTextForSpeech(text); // Limpiamos antes de hablar
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = 'es-ES';
        currentUtterance = utterance;

        speechSynthesis.speak(utterance);
    } else {
        alert('Tu navegador no soporta síntesis de voz.');
    }
}

function addMessage(text, sender) {
    const cleanedText = cleanTextForSpeech(text); // Para la lectura de voz

    if (sender === 'bot' && text.includes('\n')) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        let delay = 0;

        lines.forEach((line, index) => {
            setTimeout(() => {
                const div = document.createElement('div');
                div.className = 'message ' + sender;
                div.textContent = line;
                chat.appendChild(div);

                // Scroll automático solo en cada mensaje
                chat.scrollTop = chat.scrollHeight;
            }, delay);

            delay += 200; // Ajusta este valor para velocidad más rápida o lenta
        });

        // Después de mostrar todas las líneas, leer todo junto
        setTimeout(() => {
            if (autoReadEnabled) {
                speakText(cleanedText);
            }
        }, delay);

    } else {
        const div = document.createElement('div');
        div.className = 'message ' + sender;
        div.textContent = text;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;

        if (sender === 'bot' && autoReadEnabled) {
            speakText(cleanedText);
        }
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

    console.debug('Datos completos recibidos desde la API:', data);

    if (data.response) {
        console.log('Respuesta del backend:', data);

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
            voiceBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon> Hablar';
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

document.addEventListener("DOMContentLoaded", function () {
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    const instructionsModal = document.getElementById('instructionsModal');
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');

    if (showInstructionsBtn && instructionsModal && closeInstructionsBtn) {
        // Abrir modal
        showInstructionsBtn.addEventListener('click', () => {
            instructionsModal.style.display = 'block';
        });

        // Cerrar modal con X
        closeInstructionsBtn.addEventListener('click', () => {
            instructionsModal.style.display = 'none';
        });

        // Cerrar modal haciendo clic fuera del contenido
        window.addEventListener('click', (event) => {
            if (event.target === instructionsModal) {
                instructionsModal.style.display = 'none';
            }
        });
    } else {
        console.warn('Uno o más elementos del modal no fueron encontrados.');
    }
});