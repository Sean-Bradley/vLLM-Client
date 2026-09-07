# Agent Guidance

## Project Shape

- This is a static browser application. The main implementation is [index.html](index.html); vendored browser libraries are in [libs](libs).
- There is no package manifest, build system, automated test suite, or repository-defined development server.
- Preserve the current no-build workflow unless new tooling is intentionally introduced and documented in [README.md](README.md).

## Current API Contract

- The client currently expects an OpenAI-compatible endpoint ending in `/openai/v1/chat/completions`.
- Model discovery replaces that suffix with `/openai/v1/models` and uses the first returned `data[].id`.
- Chat requests use bearer authentication, streaming SSE, `choices[0].delta.content`, temperature `0.7`, and `max_tokens` `5000`.
- Assistant Markdown must continue to be sanitized with DOMPurify before insertion into the DOM.

## LM Studio Changes

- LM Studio commonly exposes `/v1/chat/completions` and `/v1/models`, often at `http://localhost:1234`.
- Do not assume an API key is required for LM Studio. Any validation, request headers, model discovery, or saved-configuration matching changed for LM Studio must still preserve the existing RunPod/vLLM flow.
- Account for browser CORS and mixed-content restrictions when the client is served over HTTPS and LM Studio is accessed over HTTP. Do not claim that a browser-only change can bypass those restrictions.
- Support the response and streaming formats actually emitted by the target server; keep compatibility with the current SSE parser unless the parser is deliberately broadened and tested.
- Keep endpoint normalization centralized so provider-specific paths are not scattered through UI handlers.

## Data and Privacy

- Conversations, endpoint values, API keys, saved configurations, and privacy acknowledgement are stored in browser `localStorage`.
- Saved API keys are currently plaintext in browser storage. Do not move credentials or chat data to a server, telemetry service, or proxy without explicitly changing the privacy UI and documentation.
- Keep user-authored content as text and sanitize model-authored HTML/Markdown before rendering.

## Validation

- There are no repository test commands. Open [index.html](index.html) directly or serve the folder with a simple static HTTP server when browser-origin behavior matters.
- For endpoint changes, manually verify: first-use privacy acknowledgement, empty and non-empty API keys, model discovery, streaming and non-streaming errors, localStorage persistence, saved configurations, RunPod/vLLM compatibility, and LM Studio localhost/CORS behavior.
- Check browser console and network requests when debugging provider integration. Do not add npm commands to documentation unless the corresponding tooling exists.