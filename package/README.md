# Mascotbot React SDK (`@mascotbot/react`)

This package provides React components and hooks to integrate interactive Rive-based mascots with lip-sync capabilities and real-time voice interaction into your web applications.

**Target Audience:** This README is intended for developers using the React SDK, with a special focus on guiding a developer tasked with creating a React Native version of this SDK.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Core Concepts & Basic Usage (React Native V1 Target)](#core-concepts--basic-usage-react-native-v1-target)
  - [1. Setup Providers](#1-setup-providers)
  - [2. Loading the Mascot (`MascotClient`)](#2-loading-the-mascot-mascotclient)
  - [3. Rendering the Mascot (`MascotRive`)](#3-rendering-the-mascot-mascotrive)
  - [4. Manual Animation Control (`useMascotPlayback`)](#4-manual-animation-control-usemascotplayback)
  - [Basic Usage Example](#basic-usage-example)
- [Advanced Feature: Real-time Voice (`MascotCall`)](#advanced-feature-real-time-voice-mascotcall)
- [Architecture Deep Dive](#architecture-deep-dive)
  - [Component Hierarchy & Context](#component-hierarchy--context)
  - [Rive Interaction](#rive-interaction)
  - [Lip-Sync Logic (`MascotPlayback`)](#lip-sync-logic-mascotplayback)
  - [`MascotCall` Data Flow](#mascotcall-data-flow)
- [Guide for React Native Adaptation](#guide-for-react-native-adaptation)
  - [V1 Goal: Manual Playback](#v1-goal-manual-playback)
  - [V1 Implementation Steps](#v1-implementation-steps)
  - [V1 Potential Challenges](#v1-potential-challenges)
  - [Beyond V1: Porting `MascotCall`](#beyond-v1-porting-mascotcall)
- [Troubleshooting](#troubleshooting)

## Introduction

The Mascotbot React SDK simplifies the integration of animated mascots powered by [Rive](https://rive.app/). It provides mechanisms for:

1.  Loading and displaying Rive animations.
2.  Controlling Rive state machine inputs (for emotions, actions, etc.).
3.  Synchronizing Rive animations with audio playback using viseme data (lip-sync).
4.  (Advanced) Integrating real-time voice conversations using services like Pipecat AI.

This guide will break down the SDK's structure and functionality, starting with the core components needed for basic display and manual lip-sync, and then explaining the more advanced `MascotCall` component.

## Installation

Install the package using npm, yarn, or pnpm. Note that the package might be distributed as a `.tgz` file initially.

```bash
# Using npm (replace with actual path/version)
npm install ./mascotbot-sdk-react-0.1.3.tgz

# Or using yarn
yarn add ./mascotbot-sdk-react-0.1.3.tgz

# Or using pnpm
pnpm add ./mascotbot-sdk-react-0.1.3.tgz
```

**Peer Dependencies:** Ensure you have the necessary peer dependencies installed:

```bash
# Using npm
npm install react react-dom @rive-app/react-canvas

# Or using yarn
yarn add react react-dom @rive-app/react-canvas

# Or using pnpm
pnpm add react react-dom @rive-app/react-canvas
```

_(Installation instructions reference: [Mascotbot React SDK Documentation](https://docs.mascot.bot/libraries/react-sdk))_

## Core Concepts & Basic Usage (React Native V1 Target)

This section covers the fundamental components and hooks required to display a mascot and manually synchronize its lip movements with pre-recorded audio or text-to-speech output. This aligns with the target functionality for a V1 React Native adaptation.

### 1. Setup Providers

- **`<MascotProvider>`:** (Currently minimal) This is intended as the top-level provider for potential global settings (like API keys). Wrap your application or relevant part with it.

  ```jsx
  import { MascotProvider } from "@mascotbot/react";

  function App() {
    return <MascotProvider>{/* ... rest of your app */}</MascotProvider>;
  }
  ```

### 2. Loading the Mascot (`MascotClient`)

- **`<MascotClient>`:** This component is responsible for loading the Rive animation file (`.riv`) and preparing the necessary controls. It uses the `useLoadRive` hook internally. You provide the path to your Rive file via the `src` prop. It creates the `MascotClientContext`, making the Rive instance, loading status, and controls available to child components and hooks.

  ```jsx
  import { MascotClient, MascotProvider } from "@mascotbot/react";

  function MascotContainer() {
    return (
      <MascotProvider>
        <MascotClient src="/path/to/your/mascot.riv">{/* ... Mascot rendering and controls */}</MascotClient>
      </MascotProvider>
    );
  }
  ```

### 3. Rendering the Mascot (`MascotRive`)

- **`<MascotRive>`:** This component renders the actual Rive animation. It consumes the `MascotClientContext` (set up by `<MascotClient>`) to get the Rive component (`RiveComponent`) and loading state. It also handles displaying a loading indicator while the Rive file is loading.

  ```jsx
  import { MascotClient, MascotProvider, MascotRive } from "@mascotbot/react";

  function MascotContainer() {
    return (
      <MascotProvider>
        <MascotClient src="/path/to/your/mascot.riv">
          <div style={{ width: "300px", height: "300px" }}>
            {" "}
            {/* Container for size */}
            <MascotRive />
          </div>
        </MascotClient>
      </MascotProvider>
    );
  }
  ```

### 4. Manual Animation Control (`useMascotPlayback`)

This is the key hook for manual lip-sync control, essential for the V1 React Native goal.

- **`useMascotPlayback` Hook:** This hook provides access to a `MascotPlayback` instance, which manages the timing and execution of viseme animations on the Rive character. It needs to be used within a `<MascotClient>` context.

  ```jsx
  import { useMascotPlayback } from "@mascotbot/react";

  function MyMascotController() {
    const playback = useMascotPlayback(); // Get playback controls

    // Now you can use playback.add(), playback.play(), etc.
    // ... see example below ...

    return null; // Or return some UI controls
  }
  ```

- **`MascotPlayback` Class (`src/lib/rive/mascot-playback.ts`):** This class is instantiated by the hook. Its core responsibilities are:

  - Maintaining a queue of visemes (`chunks`) and stresses (`stresses`), each with a timestamp (`offset`).
  - Using `requestAnimationFrame` for a smooth playback loop driven by `performance.now()`.
  - Comparing the current time with viseme/stress offsets.
  - When a viseme's time is reached, it triggers the corresponding input transition on the Rive state machine (e.g., making the mouth shape change).
  - Managing playback state (`play`, `pause`, `reset`, `seek`).
  - Optionally controlling an `is_speaking` boolean input in the Rive state machine (`setSpeakingState` option in the hook).

- **Viseme Data:** You need to provide viseme data, typically an array of objects like:

  ```typescript
  type Viseme = {
    offset: number; // Time in milliseconds from the start of the audio
    visemeId: number; // The ID corresponding to a specific lip shape (mapped internally)
  };

  const exampleVisemes: Viseme[] = [
    { offset: 100, visemeId: 0 }, // Silence at 100ms
    { offset: 150, visemeId: 1 }, // 'A' shape at 150ms
    { offset: 250, visemeId: 19 }, // 'T' shape at 250ms
    // ... more visemes
  ];
  ```

  This data usually comes from a Text-to-Speech (TTS) service that supports viseme generation or can be pre-calculated.

### Basic Usage Example

This example demonstrates how to load a mascot and manually trigger lip-sync based on predefined viseme data and separate audio playback. This mirrors the functionality described in the [basic SDK docs](https://docs.mascot.bot/libraries/react-sdk).

```jsx
import React, { useEffect, useRef, useState } from "react";
import { MascotClient, MascotProvider, MascotRive, useMascotPlayback } from "@mascotbot/react";

// Example viseme data (replace with your actual data)
const exampleVisemes = [
  { offset: 100, visemeId: 0 },
  { offset: 150, visemeId: 1 },
  { offset: 250, visemeId: 19 },
  { offset: 350, visemeId: 6 },
  { offset: 450, visemeId: 0 },
  { offset: 500, visemeId: 13 },
  { offset: 600, visemeId: 1 },
  { offset: 700, visemeId: 19 },
  { offset: 800, visemeId: 0 },
];

// Placeholder for your audio file URL
const audioUrl = "/path/to/your/corresponding/audio.mp3";

function MascotWithManualPlayback() {
  const playback = useMascotPlayback();
  const audioRef = useRef(new Audio());
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  useEffect(() => {
    // Load audio source only once
    audioRef.current.src = audioUrl;
    audioRef.current.load(); // Preload audio

    const handleCanPlay = () => setIsReadyToPlay(true);
    audioRef.current.addEventListener("canplaythrough", handleCanPlay);

    return () => {
      // Cleanup audio element and listener
      audioRef.current.removeEventListener("canplaythrough", handleCanPlay);
      audioRef.current.pause();
      audioRef.current.src = "";
    };
  }, []);

  const handlePlay = () => {
    if (!isReadyToPlay || !playback) return;

    console.log("Adding visemes:", exampleVisemes);
    playback.reset(); // Reset previous state
    playback.add(exampleVisemes); // Add new visemes

    // Ensure audio is at the beginning
    audioRef.current.currentTime = 0;

    // Start audio and visual playback approximately together
    audioRef.current.play();
    playback.play();
  };

  return (
    <div>
      <button onClick={handlePlay} disabled={!isReadyToPlay}>
        Play Speech
      </button>
      {/* Render the mascot itself */}
      <div style={{ width: "300px", height: "400px", border: "1px solid lightgrey", marginTop: "10px" }}>
        <MascotRive />
      </div>
    </div>
  );
}

function App() {
  return (
    <MascotProvider>
      <MascotClient src="/path/to/your/mascot.riv">
        <MascotWithManualPlayback />
      </MascotClient>
    </MascotProvider>
  );
}

export default App;
```

**Key points for manual sync:**

1.  You get the `playback` controls using `useMascotPlayback`.
2.  You load viseme data (`playback.add(visemes)`).
3.  You manage audio playback separately (e.g., using the HTML `<audio>` element).
4.  You trigger both `audio.play()` and `playback.play()` together to start the synchronized experience.

## Advanced Feature: Real-time Voice (`MascotCall`)

For more complex use cases involving real-time interaction (like a chatbot the user can talk to), the SDK provides the `<MascotCall>` component. **This is significantly more complex than the basic usage and likely a V2+ goal for React Native.**

- **`<MascotCall>`:** This component orchestrates a full voice call experience.
  - **Backend Integration:** It connects to a backend service (configured via the `apiUrl` prop, typically a Pipecat-based endpoint) using the `useVoiceClient` hook (`src/lib/pipecat/voice-client.ts`).
  - **Real-time Transport:** It uses `@pipecat-ai/client-react` and a transport layer (e.g., `@pipecat-ai/daily-transport`) to handle WebSocket communication, audio streaming (microphone input, bot audio output), and event handling (`UserStartedSpeaking`, `BotTtsText`, `TransportStateChanged`, etc.).
  - **Audio Buffering (`AudioPlaybackBuffer`):** It receives the bot's audio output as a `MediaStreamTrack`. This stream is processed by the `AudioPlaybackBuffer` class (`src/lib/audio/audio-playback-buffer.ts`), which uses an `AudioContext` and `AudioWorkletNode` (`buffer-processor.js`) to chunk the audio and schedule it precisely for smooth playback.
  - **Viseme Processing (`ChunkProcessor`):** Viseme data arrives via `BotTtsText` events, often chunked with the audio. The `ChunkProcessor` (`src/components/mascot-call.tsx`) adjusts viseme timestamps within these chunks to ensure accurate alignment relative to the start of the bot's utterance.
  - **Automatic Synchronization:** `<MascotCall>` coordinates the `AudioPlaybackBuffer` and an internal `MascotPlayback` instance. It waits for a threshold of audio to be buffered before starting the visual `MascotPlayback`, ensuring audio and lip-sync are automatically synchronized without manual intervention.
  - **UI Controls (`MascotCallControlPanel`):** Provides optional pre-built UI elements (Start Call, End Call, Mute) that interact with the `MascotCall` state.

Usage typically looks like this:

```jsx
import { MascotCall, MascotCallControlPanel, MascotClient, MascotProvider, MascotRive } from "@mascotbot/react";

function RealtimeMascot() {
  const pipecatApiUrl = "YOUR_PIPECAT_API_ENDPOINT"; // Replace with your backend URL

  return (
    <MascotProvider>
      {/* MascotClient provides the Rive instance */}
      <MascotClient src="/path/to/your/mascot.riv">
        {/* MascotCall handles the entire voice interaction */}
        <MascotCall apiUrl={pipecatApiUrl}>
          <div style={{ position: "relative", width: "300px", height: "400px" }}>
            {/* MascotRive renders the character */}
            <MascotRive />
            {/* ControlPanel adds buttons (optional) */}
            <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)" }}>
              <MascotCallControlPanel />
            </div>
          </div>
        </MascotCall>
      </MascotClient>
    </MascotProvider>
  );
}
```

### MascotCall

The `MascotCall` component provides voice interaction capabilities with your mascot, including synchronized audio playback and lip-sync animations.

```tsx
<MascotCall
  apiUrl="https://your-api.com/connect"
  tts={{ voice: "en-US-JennyNeural" }}
  llm={{ model: "gpt-4" }}
  enableStressReaction={true} // Optional: trigger stress animation when bot starts speaking
  onStateChange={(state) => console.log("Call state:", state)}
>
  {(provided) => <button onClick={provided.startProps.onClick}>Start Call</button>}
</MascotCall>
```

#### Props

- `apiUrl` (required): The URL of your voice call API endpoint
- `tts`: Text-to-speech configuration
- `llm`: Language model configuration
- `enableStressReaction`: Whether to trigger the "stress" Rive input when bot starts speaking (default: false)
- `onStateChange`: Callback for transport state changes
- `debug`: Show debug information including audio/viseme readiness

#### Stress Reaction Feature

When `enableStressReaction` is set to `true`, the mascot will trigger a "stress" animation at the beginning of each response. This requires:

1. Your Rive file must have a trigger input named "stress"
2. The "stress" input must be included in your MascotClient inputs array:

```tsx
<MascotClient
  src="/mascot.riv"
  inputs={["stress", "thumbs_up"]} // Include "stress" in inputs
>
  <MascotCall apiUrl="..." enableStressReaction={true} />
</MascotClient>
```

The stress trigger fires when:

- Bot starts a new response
- Both audio and viseme data are ready
- Audio playback is about to begin

This ensures the stress reaction is perfectly synchronized with the mascot's speech.

## Architecture Deep Dive

Understanding the flow of data and control is crucial for adaptation.

### Component Hierarchy & Context

```
<MascotProvider> (Optional global context)
└── <MascotClient src="..."> (Loads Rive, provides MascotClientContext)
    ├── <MascotRive /> (Renders Rive via context, uses MascotClientContext)
    │
    ├── <YourComponentUsingHooks>
    │   └── useMascotClient() -> Access Rive instance, RiveComponent, inputs
    │   └── useMascotPlayback() -> Access playback controls (needs MascotClientContext)
    │
    └── <MascotCall apiUrl="..."> (Handles real-time call, uses MascotClientContext)
        ├── <MascotRive /> (Usually nested to show the character during the call)
        ├── <MascotCallControlPanel /> (Optional UI, uses MascotCallContext)
        └── (Internal Hooks: useVoiceClient, useRTVIClientEvent, etc.)
        └── (Internal Classes: AudioPlaybackBuffer, MascotPlayback, ChunkProcessor)
```

- **Context:** Data flows down primarily through React Context (`MascotProviderContext`, `MascotClientContext`, `MascotCallContext`). Hooks like `useMascotClient` and `useMascotPlayback` rely on being descendants of the appropriate provider component (`MascotClient`).

### Rive Interaction

1.  **Loading:** `MascotClient` uses `useLoadRive` (`src/hooks/rive/use-load-rive.ts`) which leverages `@rive-app/react-canvas`'s `useRive` hook to fetch and initialize the Rive file specified in `src`.
2.  **Input Access:** `MascotClient` also uses `useRiveInputs` (`src/hooks/rive/use-rive-inputs.ts`) to get references to the state machine inputs defined in the Rive file (e.g., standard inputs for `mouth`, `emotions`, `stress`, plus any custom inputs). These input objects allow programmatic control (e.g., `riveInputs.emotions.is_speaking.value = true`).
3.  **Rendering:** `MascotRive` gets the `RiveComponent` from context and renders it.
4.  **Animation:** Animation (like lip-sync) is driven by changing the Rive state machine input values over time, primarily handled by the `MascotPlayback` class.

### Lip-Sync Logic (`MascotPlayback`)

- **Input:** Receives an array of `Viseme` objects (ID + timestamp).
- **Timing:** Uses `requestAnimationFrame` and `performance.now()` for precise timing, independent of React render cycles.
- **Execution:** Iterates through sorted visemes. When `performance.now() - startTime` exceeds a viseme's `offset`, it finds the corresponding Rive input name (using `VISEMES_MAP` in `src/lib/rive/constants.ts`) and updates the input's `value` (e.g., `riveInputs.mouth.viseme_A.value = transitionDuration`) to trigger the mouth shape animation. It handles transitioning _out_ of the previous shape as well.

### `MascotCall` Data Flow

1.  **Initiation:** User interacts with `MascotCallControlPanel` (or custom UI) to call `start()`.
2.  **Connection:** `useVoiceClient` initiates connection to `apiUrl` via Pipecat transport.
3.  **Mic Input:** User speaks, audio sent to backend via Pipecat.
4.  **Backend Processing:** LLM and TTS generate response + viseme data.
5.  **Data Reception:**
    - Bot audio arrives as `MediaStreamTrack` -> `AudioPlaybackBuffer`.
    - Viseme/text data arrives via `BotTtsText` event -> `ChunkProcessor`.
6.  **Processing:**
    - `AudioPlaybackBuffer` chunks and schedules audio using `AudioContext`.
    - `ChunkProcessor` adjusts viseme timing offsets.
7.  **Synchronization & Playback:**
    - `MascotCall` waits for `AudioPlaybackBuffer`'s `onThresholdExceeded`.
    - It adds processed visemes to an internal `MascotPlayback` instance.
    - It calls `mascotPlayback.play()`.
    - Both audio (via `AudioContext`) and visuals (via `MascotPlayback`'s `requestAnimationFrame` loop) play out synchronized.
8.  **State Updates:** `useRTVIClientEvent` updates component state (`connecting`, `ready`, `error`, etc.).
9.  **Cleanup:** `reset()` methods on `AudioPlaybackBuffer` and `MascotPlayback` are called on events like `UserStartedSpeaking` or `BotStoppedSpeaking` to prepare for the next interaction. `leave()` disconnects the Pipecat transport.

## Guide for React Native Adaptation

This section provides guidance for creating a React Native version.

### V1 Goal: Manual Playback

The primary goal for V1 should be to replicate the **basic manual playback** functionality described earlier and shown in the [React SDK docs](https://docs.mascot.bot/libraries/react-sdk). This involves:

1.  Displaying the Rive mascot.
2.  Providing a hook similar to `useMascotPlayback`.
3.  Allowing the developer to manually:
    - Load viseme data (`playback.add(visemes)`).
    - Trigger synchronized playback of visemes (`playback.play()`) and separately managed audio (`audio.play()`).

### V1 Implementation Steps

1.  **Rive Runtime:** Find and integrate a React Native Rive runtime library (e.g., `rive-react-native`). Check its API for loading `.riv` files and accessing state machine inputs.
2.  **Component Structure:** Replicate the basic component structure:
    - `MascotProvider` (can remain minimal).
    - `MascotClient`: Adapt `useLoadRive` logic using the chosen RN Rive library. Provide context with the RN Rive instance/component and input controls.
    - `MascotRive`: Render the mascot using the RN Rive component obtained from context.
3.  **Port `MascotPlayback`:** The core logic in `src/lib/rive/mascot-playback.ts` should be largely portable.
    - It relies on `performance.now()` (available in RN) and `requestAnimationFrame` (available in RN).
    - The main dependency is the structure of the `riveInputs` object. Ensure you adapt the code to match how the RN Rive library allows you to access and modify state machine input values. The `VISEMES_MAP` constant will likely remain the same.
4.  **Create Hooks:** Implement RN equivalents of:
    - `useMascotClient`: Provides context value from `MascotClient`.
    - `useMascotPlayback`: Instantiates the ported `MascotPlayback` class, passing it the Rive input controls obtained from `useMascotClient`.
5.  **Audio Playback:** RN requires a different approach than the web's HTML `<audio>` element. Use a library like `react-native-sound`, `react-native-track-player`, or `expo-av` to load and play audio files. The V1 developer will need to manually call `audio.play()` from their chosen library at the same time they call `playback.play()` from the ported hook.
6.  **Example:** Create a V1 usage example demonstrating the manual synchronization of audio playback (using the RN audio library) and viseme animation (using the ported `useMascotPlayback` hook).

### V1 Potential Challenges

- **Rive Library API Differences:** The exact methods for loading Rive files, getting state machine inputs, and changing input values might differ between `@rive-app/react-canvas` and the chosen RN Rive library. Careful adaptation of `useLoadRive`, `useRiveInputs`, and `MascotPlayback` will be needed.
- **Audio Library Integration:** Ensuring reliable loading, playing, and seeking of audio in RN requires careful handling of the chosen audio library's lifecycle and events.
- **Performance:** Test performance on target devices, especially the `requestAnimationFrame` loop within `MascotPlayback`.

### Beyond V1: Porting `MascotCall`

Porting the full `<MascotCall>` functionality presents significant challenges:

- **Pipecat Transport:** `@pipecat-ai/daily-transport` relies on web APIs (like Daily.co's web SDK). A native transport layer for Pipecat compatible with React Native would be required. This might involve using native WebRTC libraries or a different transport mechanism if offered by Pipecat.
- **AudioContext/AudioWorklets:** React Native does not have a direct equivalent to the Web Audio API's `AudioContext` or `AudioWorkletNode`. Replicating the precise, low-latency audio chunking, scheduling, and processing done by `AudioPlaybackBuffer` would require native audio modules or a fundamentally different approach, potentially relying more on the backend or simpler RN audio APIs which might have higher latency.
- **MediaStreams/WebRTC:** Accessing microphone input and handling real-time audio streams requires using React Native WebRTC libraries, whose APIs may differ from the web standards used by `@pipecat-ai/client-js`.

Porting `MascotCall` would likely require significant native development or reliance on different cross-platform solutions for real-time communication and audio processing.

## Troubleshooting

- Ensure peer dependencies are correctly installed.
- Verify the path to the `.riv` file is correct and the file is accessible.
- Check the Rive state machine name used internally (`STATE_MACHINE_NAME` in `src/lib/rive/constants.ts`) matches the one in your Rive file if you encounter issues with `MascotPlayback` or `MascotCall`.
- For `MascotCall`, ensure the `apiUrl` is correct and the backend service is running. Use browser developer tools (Network and Console tabs) to debug connection issues or errors from the Pipecat client.
- Enable the `debug` prop on `MascotCall` for additional logging and download buttons for call data.

_(Troubleshooting tips reference: [Mascotbot React SDK Troubleshooting](https://docs.mascot.bot/libraries/react-sdk/troubleshooting))_
