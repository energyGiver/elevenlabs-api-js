
import fs from 'fs';
import mic from 'mic';
import { AudioContext } from 'node-web-audio-api';
import wav from 'wav';

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const CHUNK_DURATION_MS = 50; // 50ms chunks for smoother processing
const CHUNK_SIZE = SAMPLE_RATE * CHANNELS * 2 * CHUNK_DURATION_MS / 1000;

const PITCH_SHIFT_AMOUNT = 1.5; // 피치 변경 정도 (1: 변경 없음, <1: 낮춤, >1: 높임)
const VOLUME_GAIN = 1.0; // 볼륨 조절 (0.0: 무음, 1.0: 원본 볼륨, >1.0: 증폭)

let micInstance;
let micInputStream;
let audioContext;
let pitchShiftNode;
let gainNode;
let fileWriter;

function initMicInstance() {
    micInstance = mic({
        rate: String(SAMPLE_RATE),
        channels: String(CHANNELS),
        fileType: 'raw',
        bufferSize: CHUNK_SIZE
    });

    micInputStream = micInstance.getAudioStream();
    micInputStream.on('data', handleMicData);
}

function initAudioContext() {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.gain.value = VOLUME_GAIN; // 볼륨 설정
    pitchShiftNode = createPitchShiftNode(audioContext);
    pitchShiftNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
}

function createPitchShiftNode(audioContext) {
    const bufferSize = 4096;
    let pitchShiftNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

    pitchShiftNode.onaudioprocess = function(audioProcessingEvent) {
        let inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        let outputData = audioProcessingEvent.outputBuffer.getChannelData(0);

        for (let i = 0; i < inputData.length; i++) {
            let index = Math.floor(i * PITCH_SHIFT_AMOUNT);
            outputData[i] = index < inputData.length ? inputData[index] : 0;
        }

        // 변조된 오디오 데이터를 WAV 파일에 저장
        const int16Data = new Int16Array(outputData.length);
        for (let i = 0; i < outputData.length; i++) {
            int16Data[i] = Math.max(-1, Math.min(1, outputData[i])) * 32767;
        }
        const bufferToWrite = Buffer.from(int16Data.buffer);
        fileWriter.write(bufferToWrite);
    };

    return pitchShiftNode;
}

function handleMicData(buffer) {
    const audioBuffer = audioContext.createBuffer(CHANNELS, buffer.length / 2, SAMPLE_RATE);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < buffer.length / 2; i++) {
        channelData[i] = buffer.readInt16LE(i * 2) / 32768.0;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(pitchShiftNode);
    source.start();
}

function start() {
    initMicInstance();
    initAudioContext();

    const outputFile = fs.createWriteStream('output.wav');
    const wavWriter = new wav.Writer({
        channels: CHANNELS,
        sampleRate: SAMPLE_RATE,
        bitDepth: 16
    });

    fileWriter = wavWriter;
    wavWriter.pipe(outputFile);

    micInstance.start();

    setTimeout(() => {
        micInstance.stop();
        audioContext.close();
        fileWriter.end();
        process.exit(0);
    }, 10000);
}

start();
