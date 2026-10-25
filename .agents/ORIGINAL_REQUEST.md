# Original User Request

## 2026-08-23T16:04:24Z

# Teamwork Project Prompt

Build a modern, feature-complete web-based microphone and camera testing utility tool that overcomes the UX and diagnostic limitations of existing tools, accompanied by a comprehensive suite of locally stored marketing, advertising, and promotional materials.

Requested team: 3 agents — a coding agent with Gemini 3.7 Flash (Thinking: Max/High), a researcher agent with Gemini 3.7 (Thinking: Medium), and a marketing agent with Gemini 3.7 Flash (Thinking: Low). The researcher agent searches the web, analyzes shortcomings of existing mic/cam test tools, and hands off specifications to the coding agent. The coding agent builds the web utility tool. The marketing agent prepares posters, ad scripts, promotional emails, and promotional strategies written locally.

Working directory: /home/gourab/coding/sampleAgy/mic_cam_tester
Integrity mode: development

## Requirements

### R1. Competitive Research & Gap Analysis (Researcher Agent)
Conduct web research on existing microphone and webcam testing websites (e.g., WebCamMicTest, MicTests, DeviceTests, etc.). Identify critical shortcomings—such as intrusive ads, poor mobile/desktop responsiveness, lack of detailed diagnostic data (latency, resolution, audio clipping/frequency, channel balance), and confusing permission error flows. Formulate an actionable feature blueprint and hand it off for implementation.

### R2. Client-Side Web Utility Application (Coding Agent)
Develop a standalone client-side web application (HTML5, Modern JavaScript, CSS) that runs directly in standard web browsers without backend server requirements. The application must provide:
1. **Camera Diagnostics**: Real-time video preview, active resolution detection, aspect ratio, supported resolutions picker, framerate (FPS) counter, and camera switching.
2. **Microphone Diagnostics**: Real-time audio visualizer (waveform and frequency spectrum), dynamic volume/clipping meter, audio input latency measurement, background noise indicator, and an interactive record-and-playback loopback test.
3. **Speaker / Audio Output Test**: Stereo channel balance verification (independent left/right audio tone playback) and frequency sweep test.
4. **Permissions & Troubleshooting Hub**: Step-by-step interactive guidance for browser/OS permission errors or missing hardware detection.
5. **Modern, Clean UI/UX**: Dark/light mode support, privacy-first zero-telemetry guarantee, and fully responsive layout.

### R3. Comprehensive Marketing & Promotional Collateral (Marketing Agent)
Create an end-to-end promotional strategy and creative package saved locally into the project's marketing directory:
1. **Promotional Emails**: Cold outreach, newsletter announcement, and launch sequence email templates with subject lines and preview text.
2. **Ad Scripts & Copy**: Short-form video scripts (TikTok/Reels/Shorts format), audio podcast ad copy, and search/social pay-per-click ad headlines.
3. **Poster & Graphic Prompts**: Visual poster concepts, typography/layout copy for feature highlight banners, and exact AI image generation prompts for visual asset generation.
4. **Go-To-Market Strategy**: Launch timeline, target audience personas (streamers, remote workers, educators, interviewees), SEO keywords/metadata, and distribution channels.

## Acceptance Criteria

### Research Deliverables
- [ ] A dedicated research report (`research/gap_analysis.md`) documenting evaluated competitor tools, identified UX/technical gaps, and feature specifications.

### Functional Web Application Deliverables
- [ ] Standalone web app files (`index.html`, styles, scripts) located in `/home/gourab/coding/sampleAgy/mic_cam_tester` with zero server-side build/runtime dependencies.
- [ ] Camera module verifies live stream, reports active resolution and FPS, and handles device selection.
- [ ] Microphone module renders real-time audio waveform/frequency spectrum, volume level indicator, and functional record-and-replay audio loopback.
- [ ] Audio output test plays distinct left and right stereo test audio tones.
- [ ] Permission rejection states display user-friendly troubleshooting instructions.

### Marketing Package Deliverables
- [ ] Marketing materials organized under `marketing/` containing `email_campaigns.md`, `ad_scripts.md`, `poster_concepts_and_prompts.md`, and `gtm_strategy.md`.

## 2026-08-23T16:19:36Z

User instruction: You do not have to spend extra iterations on exhaustive testing if something is taking too long to resolve. Wrap up verification, finalize deliverables, and complete the project for delivery.

## 2026-08-23T17:30:00Z

# Teamwork Project Prompt

Build a modern, feature-complete web-based microphone and camera testing utility tool that overcomes the UX and diagnostic limitations of existing tools, accompanied by a comprehensive suite of locally stored marketing, advertising, and promotional materials.

Requested team: 3 agents — a coding agent with Gemini 3.7 Flash (Thinking: Max/High), a researcher agent with Gemini 3.7 (Thinking: Medium), and a marketing agent with Gemini 3.7 Flash (Thinking: Low). The researcher agent searches the web, analyzes shortcomings of existing mic/cam test tools, and hands off specifications to the coding agent. The coding agent builds the web utility tool. The marketing agent prepares posters, ad scripts, promotional emails, and promotional strategies written locally.

Working directory: /home/gourab/coding/sampleAgy/mic_cam_tester
Integrity mode: development

Note: The workspace already contains existing progress (research/gap_analysis.md, mic_cam_tester/ application, marketing/ materials, and tests/ suites). Resume and continue from existing work, complete test verification, and finalize all deliverables.

## Requirements

### R1. Competitive Research & Gap Analysis (Researcher Agent)
Conduct web research on existing microphone and webcam testing websites (e.g., WebCamMicTest, MicTests, DeviceTests, etc.). Identify critical shortcomings—such as intrusive ads, poor mobile/desktop responsiveness, lack of detailed diagnostic data (latency, resolution, audio clipping/frequency, channel balance), and confusing permission error flows. Formulate an actionable feature blueprint and hand it off for implementation.

### R2. Client-Side Web Utility Application (Coding Agent)
Develop a standalone client-side web application (HTML5, Modern JavaScript, CSS) that runs directly in standard web browsers without backend server requirements. The application must provide:
1. **Camera Diagnostics**: Real-time video preview, active resolution detection, aspect ratio, supported resolutions picker, framerate (FPS) counter, and camera switching.
2. **Microphone Diagnostics**: Real-time audio visualizer (waveform and frequency spectrum), dynamic volume/clipping meter, audio input latency measurement, background noise indicator, and an interactive record-and-playback loopback test.
3. **Speaker / Audio Output Test**: Stereo channel balance verification (independent left/right audio tone playback) and frequency sweep test.
4. **Permissions & Troubleshooting Hub**: Step-by-step interactive guidance for browser/OS permission errors or missing hardware detection.
5. **Modern, Clean UI/UX**: Dark/light mode support, privacy-first zero-telemetry guarantee, and fully responsive layout.

### R3. Comprehensive Marketing & Promotional Collateral (Marketing Agent)
Create an end-to-end promotional strategy and creative package saved locally into the project's marketing directory:
1. **Promotional Emails**: Cold outreach, newsletter announcement, and launch sequence email templates with subject lines and preview text.
2. **Ad Scripts & Copy**: Short-form video scripts (TikTok/Reels/Shorts format), audio podcast ad copy, and search/social pay-per-click ad headlines.
3. **Poster & Graphic Prompts**: Visual poster concepts, typography/layout copy for feature highlight banners, and exact AI image generation prompts for visual asset generation.
4. **Go-To-Market Strategy**: Launch timeline, target audience personas (streamers, remote workers, educators, interviewees), SEO keywords/metadata, and distribution channels.

## Acceptance Criteria

### Research Deliverables
- [ ] A dedicated research report (`research/gap_analysis.md`) documenting evaluated competitor tools, identified UX/technical gaps, and feature specifications.

### Functional Web Application Deliverables
- [ ] Standalone web app files (`index.html`, styles, scripts) located in `/home/gourab/coding/sampleAgy/mic_cam_tester` with zero server-side build/runtime dependencies.
- [ ] Camera module verifies live stream, reports active resolution and FPS, and handles device selection.
- [ ] Microphone module renders real-time audio waveform/frequency spectrum, volume level indicator, and functional record-and-replay audio loopback.
- [ ] Audio output test plays distinct left and right stereo test audio tones.
- [ ] Permission rejection states display user-friendly troubleshooting instructions.

### Marketing Package Deliverables
- [ ] Marketing materials organized under `marketing/` containing `email_campaigns.md`, `ad_scripts.md`, `poster_concepts_and_prompts.md`, and `gtm_strategy.md`.

## 2026-08-23T17:32:29Z

# Teamwork Project Prompt — Resume from .agents/

Resume and finalize the project from the existing agent workspace state saved in `/home/gourab/coding/sampleAgy/.agents/`.

Requested team: 3 agents — a coding agent with Gemini 3.7 Flash (Thinking: Max/High), a researcher agent with Gemini 3.7 (Thinking: Medium), and a marketing agent with Gemini 3.7 Flash (Thinking: Low). The researcher agent searches the web, analyzes shortcomings of existing mic/cam test tools, and hands off specifications to the coding agent. The coding agent builds the web utility tool. The marketing agent prepares posters, ad scripts, promotional emails, and promotional strategies written locally.

Working directory: /home/gourab/coding/sampleAgy/mic_cam_tester
Integrity mode: development

Resume Context:
- Phase 0 Survey & Scope is complete (PROJECT.md, TEST_INFRA.md).
- Milestone 1 is COMPLETE: research/gap_analysis.md.
- Milestone 2 is COMPLETE: mic_cam_tester/ application.
- Milestone 3 is COMPLETE: marketing/ package.
- Milestone 4 in progress: Finish tests/tier3_combinations.test.mjs, implement tests/tier4_scenarios.test.mjs, tests/e2e_runner.mjs, execute all tests, generate TEST_READY.md, run the audit review, and deliver the final synthesis.

## Acceptance Criteria
- [x] Research gap analysis delivered in `research/gap_analysis.md`
- [x] Client-side web utility application built in `mic_cam_tester/`
- [x] Full marketing package generated in `marketing/`
- [ ] Complete 4-tier test suite in `tests/` passing with exit code 0 via `tests/e2e_runner.mjs`
- [ ] Final audit gating and acceptance synthesis report
