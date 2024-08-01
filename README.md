# ElevenLabs Speech to Speech Project

This project demonstrates how to use ElevenLabs' Speech-to-Speech API with a Node.js application. The application records audio through a microphone, processes it, and sends it to the ElevenLabs API for speech modulation.

## Prerequisites

- Node.js
- Yarn (Yarn Package Manager)

## Installation

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies:**

   ```sh
   yarn install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the project root and add the following environment variables:

   ```env
   API_KEY=your_api_key_here
   SAVE_INTERVAL=5000  # Interval to save MP3 buffer in milliseconds
   STS_VOICE_ID=Sarah
   ```

## Usage

1. **Start the application:**

   ```sh
   yarn start
   ```

   This will start recording audio from the microphone, process it in chunks, and send it to the ElevenLabs API for speech modulation.

2. **Stop the application:**

   Press `Ctrl+C` to stop the application. This will also clean up and save any remaining audio data.

