import 'dotenv/config';

export const voiceSettingsSTS = {
  model_id: process.env.STS_MODEL_ID,
  voice_settings: {
    stability: parseFloat(process.env.STABILITY),
    similarity_boost: parseFloat(process.env.SIMILARITY_BOOST),
    style: parseFloat(process.env.STYLE),
    use_speaker_boost: process.env.USE_SPEAKER_BOOST === 'true'
  }
};

export const voiceIds = {
  Sarah: process.env.VOICE_ID_SARAH,
  Drew: process.env.VOICE_ID_DREW,
  Ellie: "MF3mGyEYCl7XYWbV9V6O",
  Hyuk: "ZJCNdZEjYwkOElxugmW2",
};

export const outputFolder = process.env.OUTPUT_FOLDER;
export const latency = parseInt(process.env.LATENCY, 10);
export const defaultVoice = process.env.VOICE ;
