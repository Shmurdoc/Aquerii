# BG-01: Voice Commands for AI Copilot

**Status:** ❌ NOT IMPLEMENTED
**Priority:** P3 — Nice-to-have, high wow factor
**Complexity:** HIGH — WebSocket streaming, ML model integration, real-time audio processing

---

## 1. What This Feature Is

Voice input for the AI copilot. Users speak commands or questions into their microphone, the system transcribes the audio via speech-to-text (Whisper API or local model), parses the intent, and executes the action or returns an AI response. This bridges the gap between "type your question" and "just say it" — making the copilot feel like a real assistant.

The vision: user clicks a mic button in the AI chat panel, speaks "create a task for the Q3 marketing campaign due next Friday assigned to Sarah", the system transcribes, interprets, creates the task, and responds "Done. I created 'Q3 Marketing Campaign Tasks' assigned to Sarah, due next Friday."

---

## 2. Why It's Missing

The backend has a basic AI Chat module (sessions + messages + credits) but zero audio infrastructure. There is no:

- WebSocket endpoint that accepts binary audio chunks
- Speech-to-text service integration (Whisper or otherwise)
- NLU intent parser beyond simple text-triggered rules
- Audio file storage or processing pipeline
- Voice session state management

The AI Chat feature was built as a text-only chatbot. Adding voice requires an entirely new real-time ingestion layer, third-party API costs (Whisper), and a non-trivial streaming architecture to handle chunked audio, interim transcriptions, and latency.

---

## 3. Backend Spec

### 3.1 Models

```php
// AudioRecording
Schema::create('audio_recordings', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('session_id')->constrained('ai_chat_sessions')->cascadeOnDelete();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->integer('duration_ms')->nullable();
    $table->text('transcription')->nullable();
    $table->text('transcription_raw')->nullable();  // Whisper raw output
    $table->string('intent')->nullable();            // parsed intent: 'create_task', 'ask_question', etc.
    $table->json('intent_params')->nullable();        // extracted params: {type: "task", title: "...", ...}
    $table->string('status');                        // recording, processing, transcribed, intent_parsed, executed, failed
    $table->string('audio_file_path')->nullable();
    $table->string('mime_type')->default('audio/webm');
    $table->float('confidence')->nullable();          // transcription confidence 0-1
    $table->timestamp('created_at')->useCurrent();
    $table->timestamp('processed_at')->nullable();
});

// VoiceSession (tracks the live state of a voice interaction)
Schema::create('voice_sessions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
    $table->string('status');                        // idle, listening, processing, executing
    $table->string('audio_input_device')->nullable();
    $table->timestamp('started_at')->useCurrent();
    $table->timestamp('ended_at')->nullable();
});

// VoiceCommandHistory (audit trail of executed voice commands)
Schema::create('voice_command_history', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->foreignUuid('recording_id')->constrained('audio_recordings')->cascadeOnDelete();
    $table->string('action');                        // what was executed
    $table->json('result')->nullable();               // execution result payload
    $table->boolean('success')->default(true);
    $table->text('error_message')->nullable();
    $table->timestamp('created_at')->useCurrent();
});

// UserVoiceSettings
Schema::create('user_voice_settings', function (Blueprint $table) {
    $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
    $table->string('language')->default('en-US');
    $table->boolean('push_to_talk')->default(true);
    $table->string('push_to_talk_key')->default('Space');
    $table->boolean('auto_execute')->default(false);   // skip confirmation for simple commands
    $table->float('silence_threshold')->default(0.5);   // seconds of silence = end of utterance
    $table->timestamps();
});
```

### 3.2 API Endpoints

```
# Voice Sessions
POST   /api/ai/voice-sessions                     # Start a voice session
GET    /api/ai/voice-sessions/{id}                 # Get voice session state
PATCH  /api/ai/voice-sessions/{id}                 # Update session (status change)
DELETE /api/ai/voice-sessions/{id}                 # End voice session

# Audio Recordings
GET    /api/ai/voice-sessions/{id}/recordings      # List recordings in a session
GET    /api/ai/recordings/{id}                     # Get recording with transcription
DELETE /api/ai/recordings/{id}                     # Delete recording

# Voice Settings
GET    /api/ai/voice-settings                      # Get current user's voice settings
PUT    /api/ai/voice-settings                      # Update voice settings

# Command History
GET    /api/ai/voice-command-history               # Paginated history

# WebSocket (Socket.IO)
Event: voice.audio.chunk      # Client → Server: binary audio chunk
Event: voice.audio.end        # Client → Server: end of utterance
Event: voice.transcription    # Server → Client: interim/final transcription
Event: voice.intent           # Server → Client: parsed intent + params
Event: voice.executing        # Server → Client: action is being executed
Event: voice.executed         # Server → Client: action result
Event: voice.error            # Server → Client: error with message
Event: voice.state            # Server → Client: session state change
```

### 3.3 Controller Logic

**VoiceSessionController@store:**
1. Validate user has permission to use AI features (credit check)
2. Create a VoiceSession with status `idle`
3. Join the user to a private Socket.IO room `voice:{sessionId}`
4. Return session ID and WebSocket connection details

**WebSocket Audio Handler (listens on `voice.audio.chunk`):**
1. Receive binary audio chunk
2. Append to buffer in Redis temp key `voice:{sessionId}:buffer`
3. Every 300ms, send buffered audio to Whisper API for interim transcription
4. Emit `voice.transcription` back with interim text
5. On `voice.audio.end`, finalize the buffer, run full Whisper transcription
6. Store AudioRecording with raw transcription, status `transcribed`

**Intent Parser (after transcription completes):**
1. Send transcription text to LLM (same AI Chat LLM) with system prompt:
   ```
   Parse this voice command into an intent. Respond with JSON:
   { "intent": "create_task"|"ask_question"|"create_ticket"|"search"|"send_email"|"open_view"|"unknown",
     "params": { ... extracted parameters ... },
     "confidence": 0.95,
     "requires_confirmation": true/false
   }
   ```
2. Update AudioRecording with intent and confidence
3. Emit `voice.intent` to the client

**Action Execution Pipeline:**
1. If `requires_confirmation` is true, emit `voice.executing` with params and WAIT for client confirmation event (`voice.confirm`)
2. Map intent to backend action:
   - `create_task` → ItemsController@store
   - `create_ticket` → SupportTicketController@store
   - `search` → SearchController@search
   - `send_email` → EmailController@send
   - `open_view` → return route/frontend URL
   - `ask_question` → forward to existing AI Chat completion
3. Execute action, capture result
4. Store VoiceCommandHistory record
5. Emit `voice.executed` with result summary
6. TTS the result summary back if configured

### 3.4 WebSocket Architecture

```
Client                             Server                         Whisper API / LLM
  │                                  │                                  │
  │── voice.audio.chunk (binary) ──▶ │                                  │
  │                                  │── audio chunk → buffer ───────▶ │
  │◀── voice.transcription (interim) │◀──── interim text ──────────────│
  │── voice.audio.end ──────────────▶│                                  │
  │                                  │── full audio ──────────────────▶│
  │◀── voice.transcription (final) ──│◀──── full text ─────────────────│
  │                                  │── text → LLM intent parse ─────▶│
  │◀── voice.intent ────────────────│◀──── intent JSON ────────────────│
  │── voice.confirm ───────────────▶│                                  │
  │                                  │── execute action                 │
  │◀── voice.executed ──────────────│                                  │
```

### 3.5 Service Layer

```
App\Services\Voice\AudioProcessorService
  - processAudioChunk(StreamedChunk $chunk): void
  - finalizeBuffer(string $sessionId): AudioRecording
  - getInterimTranscription(string $sessionId): string

App\Services\Voice\SpeechToTextService
  - transcribe(string $audioPath, string $language): TranscriptionResult
  - supportsLanguage(string $locale): bool

App\Services\Voice\IntentParserService
  - parse(string $text): IntentResult
  - extractEntities(string $text, string $intent): array

App\Services\Voice\ActionExecutionService
  - execute(IntentResult $intent, User $user, Workspace $workspace): ActionResult
  - getConfirmationParams(IntentResult $intent): array
```

### 3.6 Configuration (config/voice.php)

```php
return [
    'stt_driver' => env('VOICE_STT_DRIVER', 'whisper'),
    'whisper' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => 'whisper-1',
        'language' => 'en',
        'chunk_duration_ms' => 300,
    ],
    'max_recording_duration_ms' => 30000,  // 30 seconds max
    'silence_timeout_ms' => 1500,
    'supported_languages' => ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
    'audio_format' => 'audio/webm',
    'auto_execute_confidence_threshold' => 0.9,
];
```

### 3.7 Credits & Rate Limiting

- Each voice session costs 5 AI credits to start
- Each transcription costs 2 credits (Whisper API cost)
- Rate limit: 5 voice sessions per minute per user
- Audio upload limit: 5MB per recording

---

## 4. Frontend Design

### 4.1 Mic Button in AI Chat

The existing AI chat panel gets a circular mic button next to the text input:

```
┌─────────────────────────────────────────────────────────┐
│  💬 AI Copilot                                    [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User: create a task for Q3 marketing            [10:30] │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Done! I created "Q3 Marketing Campaign Tasks"   │   │
│  │ assigned to Sarah, due next Friday.             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [🎤] Listening... ▁▂▃▅▂▁▂▃▅▇▅▃▂▁                │   │
│  │ "create a task for Q3 marketing campaign..."     │   │
│  │ [■ Stop]                                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  [📎] [🎤 ██████████████████████] [➤]                  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Recording UI States

**Idle State:**
- Mic icon with tooltip "Voice command (Ctrl+Space)"

**Listening State:**
- Mic icon pulses with blue ring animation
- Waveform visualization (canvas-drawn frequency bars)
- "Listening..." text with animated dots
- Timer showing recording duration
- Push-to-talk: hold Space to record

**Processing State:**
- Mic icon replaced with spinner
- "Processing..." text with shimmer animation
- Transcription preview shown instantly
- Transcription confidence indicator (color bar: green=high, yellow=medium, red=low)

**Intent Parsed State:**
- Shows the parsed intent as a card: "I understood: Create a task titled '...'"
- "Confirm" and "Cancel" buttons if auto_execute is off
- Quick-say "yes" or "no" to confirm via voice

**Error States:**
- **No Permission:** "Microphone access denied. Please allow microphone access in your browser settings." + link to browser settings
- **No Audio Detected:** "No audio detected. Check your microphone." + mic icon with red X
- **Recognition Failed:** "Sorry, I couldn't understand that. Please try again." + retry button
- **Network Error:** "Voice processing failed due to network error. [Retry]"
- **Credit Exhausted:** "You've run out of AI credits. [Upgrade plan]"

### 4.3 Waveform Visualization

Custom canvas component rendering real-time frequency data from the Web Audio API's `AnalyserNode`:

```
Features:
- 64 frequency bars rendered on a canvas
- Bars animate with smooth easing (not instant jumps)
- Color gradient from blue (low freq) to purple (high freq)
- Peak markers that fade slowly (visual reference)
- Silence detection shown as flat gray line
- Container max-height: 60px to not dominate the chat panel
```

### 4.4 Voice Settings Page

Settings section "Voice & Speech":

```
┌──────────────────────────────────────────────────────┐
│  Voice & Speech Settings                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ☐ Enable Voice Commands                             │
│                                                      │
│  Microphone                    [Internal Mic ▼]      │
│  Language                      [English (US)    ▼]   │
│  Activation                    ○ Push-to-Talk (Space) │
│                                ○ Always Listening     │
│  Auto-Execute Simple Commands  [☐]                    │
│  Silence Timeout               [1.5s] ───●───────     │
│  Voice Feedback                [☐] Play confirmation  │
│                                                      │
│  [Test Microphone]  [Save Settings]                  │
└──────────────────────────────────────────────────────┘
```

### 4.5 Voice History

Accessible from AI Chat sidebar → "Voice History":

```
┌──────────────────────────────────────────────────────┐
│  Voice Command History                      [Filter ▼]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  🎤 "create task for Q3 marketing"         Today     │
│  ✔ Created task "Q3 Marketing Tasks"      10:30 AM   │
│  ───────────────────────────────────────────          │
│  🎤 "find the latest invoice from Acme"    Today     │
│  ✔ Opened invoice INV-2024-0421           10:15 AM   │
│  ───────────────────────────────────────────          │
│  🎤 "what's my task list for today"        Yesterday │
│  ✔ Showed 7 tasks                         4:02 PM    │
│  ───────────────────────────────────────────          │
│  🎤 "send email to jane about meeting"     Yesterday │
│  ✘ Failed: "jane" ambiguous — 3 contacts   3:30 PM   │
│                                                      │
│  [Load More...]                                      │
└──────────────────────────────────────────────────────┘
```

---

## 5. Implementation Complexity Analysis

| Component | Complexity | Risk | Notes |
|-----------|-----------|------|-------|
| WebSocket audio streaming | HIGH | MEDIUM | Binary streaming over Socket.IO requires careful buffer management |
| Whisper API integration | MEDIUM | LOW | Standard HTTP API call, but latency is a UX concern |
| Intent parsing via LLM | MEDIUM | MEDIUM | LLM hallucinations in intent parsing could cause bad actions |
| Action execution pipeline | HIGH | HIGH | Executing arbitrary actions from voice must have safety guards |
| Audio file storage | LOW | LOW | Standard file upload pattern |
| Frontend audio capture | MEDIUM | LOW | Web Audio API + MediaRecorder API, well-documented |
| Waveform visualization | MEDIUM | LOW | Canvas rendering, well-understood |
| Push-to-talk UX | LOW | LOW | Keyboard event handling |
| Error states | MEDIUM | MEDIUM | Many edge cases: permissions, no audio, network, credits |

**Total estimated effort:** 3-4 weeks for a senior full-stack developer with WebSocket experience
**Ongoing cost:** Whisper API ~$0.006/minute of audio, LLM intent parse calls
**Key risk:** Users will expect <1s transcription latency. Whisper API is ~2-5s for a 10s clip. Mitigation: show interim transcriptions immediately so it feels responsive even if the final result takes a moment.
