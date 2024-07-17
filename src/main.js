import { streamSpeechToSpeech } from './speech_to_speech.js';
import { defaultVoice, latency } from './voice.js';

const voice = defaultVoice; // 기본값은 .env에 설정된 VOICE

streamSpeechToSpeech(latency, voice);