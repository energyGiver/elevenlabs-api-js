import { spawn } from 'child_process';
import mic from 'mic';
import Speaker from 'speaker';

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const CHUNK_DURATION_MS = 10; // 10ms chunks for lower latency
const CHUNK_SIZE = SAMPLE_RATE * CHANNELS * 2 * CHUNK_DURATION_MS / 1000; // 2 bytes per sample

const pitch = 0; // 0(매우 낮음) ~ 10(매우 높음) 사이의 값
const volume = 5; // 0(매우 작음) ~ 2(매우 큼) 사이의 값

let ffmpegProcess;
let micInstance;
let micInputStream;
let speaker;
let startTime; // 새로 추가된 변수

function initMicInstance() {
    micInstance = mic({
        rate: String(SAMPLE_RATE),
        channels: String(CHANNELS),
        fileType: 'raw',
        bufferSize: CHUNK_SIZE // Buffer size to reduce latency
    });

    micInputStream = micInstance.getAudioStream();
    micInputStream.on('data', handleMicData);
    micInputStream.on('error', handleMicError);
}

function initSpeaker() {
    speaker = new Speaker({
        channels: CHANNELS,
        bitDepth: 16,
        sampleRate: SAMPLE_RATE
    });
}

function startFFmpegProcess(pitch, volume) {
    const args = [
        '-f', 's16le',
        '-ar', String(SAMPLE_RATE),
        '-ac', String(CHANNELS),
        '-i', 'pipe:0',
        '-filter_complex', `asetrate=${SAMPLE_RATE}*2^((${pitch}-5)/12),aresample=${SAMPLE_RATE},volume=${volume}`,
        '-f', 's16le',
        '-ar', String(SAMPLE_RATE),
        '-ac', String(CHANNELS),
        'pipe:1'
    ];

    ffmpegProcess = spawn('ffmpeg', args);
    ffmpegProcess.stderr.on('data', handleFFmpegError);
    ffmpegProcess.stdout.on('data', handleFFmpegOutput);

    return ffmpegProcess;
}

function handleMicData(data) {
    startTime = process.hrtime.bigint(); // startTime을 여기서 설정

    if (!ffmpegProcess) {
        ffmpegProcess = startFFmpegProcess(pitch, volume);
    }

    if (ffmpegProcess.stdin.writable) {
        ffmpegProcess.stdin.write(data);
    }
}

// function handleFFmpegOutput(outputChunk) {
//     if (outputChunk) {
//         const endTime = process.hrtime.bigint();
//         // const latency = Number(endTime - startTime) / 1000000; // Convert to milliseconds
//         // console.log(`Latency: ${latency.toFixed(2)} ms`);
//         speaker.write(outputChunk);
//     }
// }

function handleMicError(err) {
    console.error(`Mic input stream error: ${err}`);
}

function handleFFmpegError(data) {
    console.error(`FFmpeg stderr: ${data}`);
}

function start() {
    initMicInstance();
    initSpeaker();

    console.log('마이크 입력을 시작합니다. 10초 동안 실시간으로 처리하고 출력합니다...');
    micInstance.start();

    setTimeout(() => {
        console.log('프로그램을 종료합니다.');
        micInstance.stop();
        if (ffmpegProcess) {
            ffmpegProcess.stdin.end();
            ffmpegProcess.kill();
        }
        speaker.end();
        process.exit(0);
    }, 20000);
}

start();

