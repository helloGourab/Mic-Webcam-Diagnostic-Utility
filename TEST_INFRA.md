# E2E Test Infra: Mic & Cam Testing Utility & Collateral Suite

## Test Philosophy
- Opaque-box, requirement-driven verification derived directly from `ORIGINAL_REQUEST.md`.
- Zero external package dependencies (powered by Node.js 22 built-in `node:test`, `node:assert`, native ES modules).
- Comprehensive WebRTC, Web Audio, MediaDevices, and DOM mocks simulating hardware, permissions, and user interactions.

## Test Architecture
- **Test Runner**: `node tests/e2e_runner.mjs` (or `node --test tests/*.test.mjs`).
- **Pass/Fail Semantics**: All test suites must execute with 0 failures, 0 uncaught errors, exit code 0.
- **Coverage Tiers**:
  1. **Tier 1 (Feature Coverage)**: >=5 test cases per feature across all 36 inventoried features (180+ tests).
  2. **Tier 2 (Boundary & Corner Cases)**: >=5 boundary/corner test cases per feature (180+ tests).
  3. **Tier 3 (Cross-Feature Combinations)**: 35+ pairwise combinatorial interaction test cases.
  4. **Tier 4 (Real-World Application Scenarios)**: 10+ end-to-end multi-step user workflows.

## Directory Layout
```
tests/
├── e2e_runner.mjs               # Master test runner orchestrating all tiers
├── mocks/
│   ├── dom_mock.mjs             # Mock DOM, window, document, CanvasRenderingContext2D
│   ├── webrtc_mock.mjs          # Mock navigator.mediaDevices, MediaStream, MediaStreamTrack
│   └── webaudio_mock.mjs        # Mock AudioContext, AnalyserNode, StereoPannerNode, OscillatorNode
├── tier1_features.test.mjs      # Tier 1 Feature Coverage tests
├── tier2_boundaries.test.mjs    # Tier 2 Boundary & Edge Case tests
├── tier3_combinations.test.mjs  # Tier 3 Cross-feature Interaction tests
└── tier4_scenarios.test.mjs     # Tier 4 Real-World Application Workflow tests
```

## Coverage Thresholds
- Minimum Tier 1 tests: 180
- Minimum Tier 2 tests: 180
- Minimum Tier 3 tests: 35
- Minimum Tier 4 tests: 10
- Minimum Total tests: 405+
