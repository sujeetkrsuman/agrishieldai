/* ==========================================
   AGRISHIELD AI - MULTILINGUAL VOICE CHAT
   ========================================== */

import { state, showToast } from './app.js';

// DOM Elements
const elements = {
  chatHistory: document.getElementById('chat-history'),
  btnVoiceInput: document.getElementById('btn-voice-input'),
  btnSendMessage: document.getElementById('btn-send-message'),
  chatTextInput: document.getElementById('chat-text-input'),
  chatLanguageSelect: document.getElementById('chat-language-select'),
  chatVoiceOutput: document.getElementById('chat-voice-output'),
  chatStatusBar: document.getElementById('chat-status-bar'),
  chatStatusText: document.getElementById('chat-status-text'),
  faqChips: document.querySelectorAll('.faq-chip')
};

// Conversational State
const chatHistoryLog = [];
let isRecording = false;
let recognition = null;

// Speech Recognition Mapping
const languageLocales = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  kn: 'kn-IN'
};

// Welcome Messages per Language
const welcomeMessages = {
  en: "Hello! I am your AgriShield AI Advisor. Ask me anything about crop irrigation, fertilizers, or diseases in your language.",
  hi: "नमस्ते! मैं आपका एग्रीशील्ड एआई सलाहकार हूं। मुझसे फसल सिंचाई, उर्वरक, या बीमारियों के बारे में अपनी भाषा में कुछ भी पूछें।",
  te: "నమస్కారం! నేను మీ అగ్రిషీల్డ్ AI సలహాదారుని. పంట నీటి పారుదల, ఎరువులు లేదా వ్యాధుల గురించి మీ భాషలో నన్ను ఏదైనా అడగండి.",
  ta: "வணக்கம்! நான் உங்கள் அக்ரிஷீல்ಡ್ எடி ஆலோசகர். பயிர் நீர்ப்பாசனம், உரங்கள் அல்லது நோய்கள் பற்றி உங்கள் மொழியில் என்னிடம் கேளுங்கள்.",
  mr: "नमस्कार! मी तुमचा ॲग्रीशील्ड एआय सल्लागार आहे. मला पीक जलसिंचन, खते किंवा रोगांवरील काहीही तुमच्या भाषेत विचारा.",
  bn: "নমস্কার! আমি আপনার এগ্রিশিল্ড এআই উপদেষ্টা। ফসল সেচ, সার বা রোগ সম্পর্কে আপনার ভাষায় আমাকে যেকোনো প্রশ্ন করতে পারেন।",
  kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಅಗ್ರಿಶೀಲ್ಡ್ AI ಸಲಹೆಗಾರ. ಬೆಳೆ ನೀರಾವರಿ, ರಸಗೊಬ್ಬರಗಳು ಅಥವಾ ರೋಗಗಳ ಬಗ್ಗೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ನನ್ನನ್ನು ಏನಾದರೂ ಕೇಳಿ."
};

// 1. SETUP SPEECH RECOGNITION (STT)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn("Web Speech API Recognition not supported in this browser.");
    elements.btnVoiceInput.title = "Speech Recognition not supported in this browser";
    elements.btnVoiceInput.style.opacity = '0.5';
    elements.btnVoiceInput.style.cursor = 'not-allowed';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecording = true;
    elements.btnVoiceInput.classList.add('active');
    elements.chatStatusBar.style.display = 'flex';
    elements.chatStatusText.textContent = `Listening for voice in ${elements.chatLanguageSelect.options[elements.chatLanguageSelect.selectedIndex].text}...`;
  };

  recognition.onend = () => {
    isRecording = false;
    elements.btnVoiceInput.classList.remove('active');
    elements.chatStatusBar.style.display = 'none';
  };

  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    if (e.error === 'no-speech') {
      showToast('No speech was detected. Please try again.', 'warn');
    } else if (e.error === 'not-allowed') {
      showToast('Microphone permission blocked. Please check browser settings.', 'error');
    } else {
      showToast(`Speech recognition error: ${e.error}`, 'error');
    }
    isRecording = false;
    elements.btnVoiceInput.classList.remove('active');
    elements.chatStatusBar.style.display = 'none';
  };

  recognition.onresult = (event) => {
    const resultText = event.results[0][0].transcript;
    elements.chatTextInput.value = resultText;
    showToast(`Voice captured: "${resultText.substring(0, 20)}..."`, 'success');
    sendMessage();
  };

  // Bind microphone button click
  elements.btnVoiceInput.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      const selectedLang = elements.chatLanguageSelect.value;
      recognition.lang = languageLocales[selectedLang] || 'en-US';
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  });
}

// 2. SETUP SPEECH SYNTHESIS (TTS)
function speakText(text, langCode) {
  if (!elements.chatVoiceOutput.checked) return;
  if (!window.speechSynthesis) {
    console.warn("Speech Synthesis not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const targetLocale = languageLocales[langCode] || 'en-US';
  utterance.lang = targetLocale;
  
  // Attempt to select a voice matching the language
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(voice => voice.lang.startsWith(langCode) || voice.lang.startsWith(targetLocale));
  
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  window.speechSynthesis.speak(utterance);
}

// 3. SEND MESSAGE & API CALL FLOW
async function sendMessage() {
  const text = elements.chatTextInput.value.trim();
  if (!text) return;

  // Add User Bubble
  appendBubble(text, 'user');
  elements.chatTextInput.value = '';
  
  // Log message to state history
  chatHistoryLog.push({ sender: 'user', text: text });
  
  // Show Typing Indicator bubble
  const typingIndicator = appendBubble('...', 'bot typing');
  
  try {
    const selectedLang = elements.chatLanguageSelect.value;
    const requestBody = {
      message: text,
      history: chatHistoryLog.slice(0, -1), // Send past history without the newest user question
      language: selectedLang,
      context: {
        crop: state.selectedCrop,
        temperature: state.environment.temperature,
        moisture: state.environment.moisture,
        humidity: state.environment.humidity,
        sunExposure: state.environment.sunlight
      }
    };

    const headers = { 'Content-Type': 'application/json' };
    if (state.apiKey) {
      headers['Authorization'] = `Bearer ${state.apiKey}`;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to query chat server');
    }

    const data = await response.json();
    
    // Remove typing indicator and append bot message
    typingIndicator.remove();
    appendBubble(data.response, 'bot');
    
    // Add bot response to log
    chatHistoryLog.push({ sender: 'bot', text: data.response });
    
    // Trigger TTS voice output
    speakText(data.response, selectedLang);

  } catch (error) {
    console.error('Chat error:', error);
    typingIndicator.remove();
    appendBubble('Sorry, I encountered an error answering your question. Please make sure the server is online and try again.', 'bot');
    showToast('Failed to get chat response', 'error');
  }
}

// 4. RENDERING BUBBLES IN DOM
function appendBubble(text, senderClass) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${senderClass}`;
  
  if (senderClass.includes('typing')) {
    bubble.innerHTML = `<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>`;
  } else {
    // Convert newlines to breaks for clean display of lists
    const cleanText = text.replace(/\n/g, '<br>');
    bubble.innerHTML = `<span>${cleanText}</span>`;
    
    // Append TTS Speak icon on bot responses
    if (senderClass === 'bot') {
      const footer = document.createElement('div');
      footer.className = 'chat-bubble-footer';
      
      const speakBtn = document.createElement('button');
      speakBtn.className = 'speak-bubble-btn';
      speakBtn.title = "Listen to Response";
      speakBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const langCode = elements.chatLanguageSelect.value;
        speakText(text, langCode);
      });
      
      footer.appendChild(speakBtn);
      bubble.appendChild(footer);
    }
  }
  
  elements.chatHistory.appendChild(bubble);
  
  // Auto-scroll chat area
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
  return bubble;
}

// 5. BOOTSTRAP CHAT HISTORY & FAQ HANDLERS
function initChatHandlers() {
  elements.btnSendMessage.addEventListener('click', sendMessage);
  
  elements.chatTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Handle FAQ Chip clicks
  elements.faqChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-question');
      elements.chatTextInput.value = q;
      sendMessage();
    });
  });

  // Load welcome bubble depending on language
  elements.chatLanguageSelect.addEventListener('change', () => {
    const lang = elements.chatLanguageSelect.value;
    
    // Stop any ongoing speaking when language changes
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    // Append language-specific welcome message
    appendBubble(welcomeMessages[lang] || welcomeMessages.en, 'bot');
    
    showToast(`Voice assistant language changed to ${elements.chatLanguageSelect.options[elements.chatLanguageSelect.selectedIndex].text}`, 'info');
  });

  // Load initial welcome bubble
  appendBubble(welcomeMessages.en, 'bot');
}

// Initialize SpeechSynthesis voice loading (fixes Chrome issues with voice fetch delays)
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}

document.addEventListener('DOMContentLoaded', () => {
  initSpeechRecognition();
  initChatHandlers();
});
