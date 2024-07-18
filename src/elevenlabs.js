import events from 'events';
import FormData from 'form-data';
import fs from 'fs';
import mic from 'mic';
import fetch from 'node-fetch';
import path from 'path';
// import Speaker from 'speaker';  // 스피커 import 제거
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import wav from 'wav';
import { outputFolder, voiceIds, voiceSettingsSTS } from './voice.js';

const apiKey = process.env.API_KEY;
const SAVE_INTERVAL = process.env.SAVE_INTERVAL;

let numProcessing = 0;
let audioQueue = [];
let isCalled = false;
// CHUNK_SIZE 40 ~= 4 Seconds
const CHUNK_SIZE = 40;
const MAX_QUEUE_SIZE = CHUNK_SIZE * 100;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

events.EventEmitter.defaultMaxListeners = 20;

// let speaker;  // 스피커 변수 제거
let mp3Buffer = [];
let mp3SaveInterval;
let micInstance;
let micInputStream;

export const streamSpeechToSpeech = async (latency, voice = 'Sarah') => {
  if (isCalled) {
    console.log('streamSpeechToSpeech already initialized.');
    return;
  }
  isCalled = true;

  const voiceId = voiceIds[voice];

  micInstance = mic({
    rate: '44100',
    channels: '1',
    debug: false
  });

  micInputStream = micInstance.getAudioStream();

  micInputStream.on('data', (data) => {
    if (audioQueue.length < MAX_QUEUE_SIZE) {
      // console.log(`Current time: ${new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 2 })}`);
      audioQueue.push(data);
    } else {
      console.warn('Audio queue is full. Dropping oldest chunk.');
      audioQueue.shift();
      audioQueue.push(data);
    }
    
    if (audioQueue.length >= CHUNK_SIZE && (numProcessing < 2)) {
      console.log(`Current time: ${new Date().toLocaleTimeString()}`);
      processQueue(latency, voiceId);
    }
  });

  micInputStream.on('error', (err) => {
    console.error('Error in Input Stream: ' + err);
  });

  micInputStream.on('end', () => {
    console.log('Microphone stream ended.');
    cleanUp();
  });

  micInstance.start();
  console.log('Microphone started');

  // MP3 저장 간격: SAVE_INTERVAL
  mp3SaveInterval = setInterval(saveMp3Buffer, SAVE_INTERVAL);
};

const processQueue = async (latency, voiceId) => {
  if (audioQueue.length === 0) {
    return;
  }
  

  numProcessing++;

  const chunk = Buffer.concat(audioQueue.splice(0, CHUNK_SIZE));
  console.log("processAudioChunk. numProcessing: ", numProcessing)
  if(numProcessing <= 2){
    await processAudioChunk(chunk, latency, voiceId);
    numProcessing--;
  }
};

const processAudioChunk = async (chunk, latency, voiceId) => {
  const bufferStream = new Readable();
  bufferStream.push(chunk);
  bufferStream.push(null);

  const wavWriter = new wav.Writer({
    channels: 1,
    sampleRate: 44100,
    bitDepth: 16
  });

  const wavBuffer = [];

  wavWriter.on('data', (data) => {
    wavBuffer.push(data);
  });
  wavWriter.on('finish', async () => {
    const wavBufferData = Buffer.concat(wavBuffer);
    const formData = new FormData();
    formData.append('audio', wavBufferData, { filename: 'audio.wav', contentType: 'audio/wav' });
    formData.append('model_id', voiceSettingsSTS.model_id);
    formData.append('voice_settings', JSON.stringify(voiceSettingsSTS.voice_settings));

    const options = {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        ...formData.getHeaders()
      },
      body: formData
    };

    const url = `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}/stream?enable_logging=true&optimize_streaming_latency=${latency}&output_format=mp3_44100_128`;

    try {
      console.log("elevenlabs api is fetched ")
      const response = await fetch(url, options);

      if (!response.ok) {
        console.error(`Error: HTTP ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // MP3 버퍼에 추가
      mp3Buffer.push(buffer);

      // 스피커 출력 부분 제거

    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  });

  bufferStream.pipe(wavWriter);
};

const saveMp3Buffer = () => {
  if (mp3Buffer.length > 0) {
    const combinedBuffer = Buffer.concat(mp3Buffer);
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const mp3FilePath = path.join(__dirname, `${outputFolder}/output_${timestamp}.mp3`);
    
    fs.writeFile(mp3FilePath, combinedBuffer, (err) => {
      if (err) {
        console.error('Error saving MP3 file:', err);
      } else {
        console.log(`MP3 file saved: ${mp3FilePath}`);
      }
    });

    mp3Buffer = []; // 버퍼 초기화
  }
};

const cleanUp = () => {
  if (micInstance) {
    micInstance.stop();
  }
  // if (speaker) {
  //   speaker.end();
  // }
  clearInterval(mp3SaveInterval);
  audioQueue = [];
  mp3Buffer = [];
};

// 실시간 음성 변환 스트림을 시작
streamSpeechToSpeech(0, process.env.STS_VOICE_ID);

// 프로그램 종료 시 정리
process.on('SIGINT', () => {
  console.log('Stopping and cleaning up...');
  cleanUp();
  process.exit();
});