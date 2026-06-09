# bg-01: Voice Commands (Whisper + WS Streaming)

**Status:** FUTURE — Not implemented  
**Priority:** HIGH  
**Complexity:** HIGH  
**Estimated Time:** 2-3 weeks  
**Created:** 2026-05-29

---

## Overview

Add voice command support to the project management system using OpenAI Whisper for speech-to-text and WebSocket streaming for real-time audio processing.

## Features

### Core Features
- **Voice-to-Text**: Speak commands → transcribed to text
- **Real-time Streaming**: Audio streams via WebSocket for instant feedback
- **Command Recognition**: Parse transcribed text into system commands
- **Multi-language Support**: Whisper supports 99+ languages

### Example Commands
- "Create task: Review PR #123 due tomorrow"
- "Assign task to John"
- "What's on my schedule today?"
- "Mark task as done"
- "Create meeting with team at 3pm"

## Architecture

```
Browser (Web Audio API)
    ↓ WebSocket stream
Node.js (Audio relay)
    ↓ HTTP POST
Python AI Service (Whisper)
    ↓ Transcribed text
Command Parser (NLP)
    ↓ Parsed command
Laravel API (execute action)
```

## Implementation Plan

### Phase 1: Basic Voice Input (1 week)
1. Add Web Audio API to frontend
2. Create WebSocket audio stream endpoint
3. Add Whisper integration to Python AI service
4. Basic voice-to-text display

### Phase 2: Command Recognition (1 week)
1. Build command parser (regex + NLP)
2. Map commands to API actions
3. Add confirmation UI for destructive actions
4. Voice feedback (text-to-speech)

### Phase 3: Advanced Features (1 week)
1. Context-aware commands (understand "this task", "that meeting")
2. Multi-step commands ("Create task and assign to John")
3. Voice shortcuts for common actions
4. Offline support (Whisper can run locally)

## Technical Requirements

### Backend
- OpenAI Whisper API (or self-hosted Whisper)
- WebSocket server for audio streaming
- Audio processing pipeline

### Frontend
- Web Audio API for microphone access
- WebSocket client for streaming
- Voice activity detection (VAD)
- Audio visualization

### Infrastructure
- GPU for self-hosted Whisper (optional)
- Redis for audio stream buffering
- WebSocket connection management

## Cost Analysis

| Option | Cost | Latency | Quality |
|--------|------|---------|---------|
| OpenAI Whisper API | $0.006/min | ~1s | High |
| Self-hosted Whisper | Free (GPU cost) | ~2-5s | High |
| Google Speech-to-Text | $0.006/15s | ~1s | High |
| Deepgram | $0.0043/min | ~0.5s | High |

## Dependencies

- `openai/whisper` (Python)
- `socket.io` (already exists)
- Web Audio API (browser native)
- MediaRecorder API (browser native)

## Security Considerations

- Audio data is ephemeral (not stored)
- Transcriptions are processed in memory
- No persistent voice recordings
- User consent required for microphone access

## Testing Strategy

- Unit tests for command parser
- Integration tests for Whisper API
- E2E tests for voice flow
- Performance tests for latency

## Future Enhancements

- **Wake word detection** ("Hey Aquerii")
- **Speaker identification** (multi-user support)
- **Noise cancellation** (background noise filtering)
- **Voice biometrics** (authentication via voice)
- **Meeting transcription** (auto-transcribe meetings)
- **Action item extraction** (extract tasks from meeting audio)

## Reference Projects

- [OpenAI Whisper](https://github.com/openai/whisper)
- [Mozilla DeepSpeech](https://github.com/mozilla/DeepSpeech)
- [Vosk](https://github.comalphacep/vosk-api)
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)

## Conclusion

Voice commands would significantly improve accessibility and productivity. However, this feature requires:
- Significant frontend work (Web Audio, WebSocket)
- External API integration (Whisper)
- Careful UX design (confirmation flows, error handling)

**Recommendation:** Implement after core features are stable and user base grows.
