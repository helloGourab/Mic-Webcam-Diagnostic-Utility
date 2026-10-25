#!/usr/bin/env node
/**
 * Master E2E Test Suite Orchestrator & Multi-Tier Runner
 * Mic & Camera Diagnostic Utility & Collateral Suite
 * 
 * Features:
 * - Native Node.js 22 test runner coordination (Tiers 1 to 4)
 * - Isolated process execution per tier
 * - Real-time progress reporting and TAP streaming
 * - Strict coverage threshold validation:
 *     * Tier 1 (Feature Coverage): >= 180 tests
 *     * Tier 2 (Boundary & Corner Cases): >= 180 tests
 *     * Tier 3 (Cross-Feature Combinations): >= 35 tests
 *     * Tier 4 (Real-World Application Scenarios): >= 10 tests
 *     * Total Tests: >= 405 tests
 * - Clean process exit codes (0 on full success, 1 on any failure/threshold violation)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m'
};

// Test Tier Configuration & Thresholds
const TIERS = [
  {
    id: 'tier1',
    name: 'Tier 1: Feature Coverage Suite',
    file: 'tests/tier1_features.test.mjs',
    minRequired: 180,
    description: 'Verifies all 36 atomic features (>=5 test cases per feature)'
  },
  {
    id: 'tier2',
    name: 'Tier 2: Boundary & Corner Cases Suite',
    file: 'tests/tier2_boundaries.test.mjs',
    minRequired: 180,
    description: 'Verifies hardware faults, boundary dimensions, format edge cases'
  },
  {
    id: 'tier3',
    name: 'Tier 3: Combinatorial & Multi-Feature Suite',
    file: 'tests/tier3_combinations.test.mjs',
    minRequired: 35,
    description: 'Verifies concurrent hardware pipelines & asynchronous cross-module state transitions'
  },
  {
    id: 'tier4',
    name: 'Tier 4: Real-World Application Workflow Scenarios',
    file: 'tests/tier4_scenarios.test.mjs',
    minRequired: 10,
    description: 'Verifies end-to-end user workflows (Streamer, Telehealth, Helpdesk, Offline, Hotplug, etc.)'
  }
];

const TOTAL_MIN_REQUIRED = 405;

/**
 * Runs a single tier file in a dedicated child process and collects metrics
 */
function runTier(tier) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const filePath = path.join(ROOT_DIR, tier.file);

    console.log(`\n${colors.cyan}${colors.bright}▶ Launching ${tier.name}${colors.reset}`);
    console.log(`${colors.dim}  File: ${tier.file} | Target: >= ${tier.minRequired} tests${colors.reset}`);

    const proc = spawn(process.execPath, ['--test', '--test-reporter=tap', filePath], {
      cwd: ROOT_DIR,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let stdout = '';
    let stderr = '';
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const failedTests = [];

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;

      const lines = text.split('\n');
      for (const line of lines) {
        // Parse TAP output for individual tests
        const trimmed = line.trim();
        if (trimmed.startsWith('ok ') && !trimmed.includes("type: 'suite'")) {
          // Check if it's a test (not the outer suite)
          const testNameMatch = trimmed.match(/^ok\s+\d+\s+-\s+(.+)$/);
          if (testNameMatch) {
            const name = testNameMatch[1];
            if (!name.includes('Suite') && !name.includes('Category') && !name.startsWith('F-') && !name.startsWith('Tier ')) {
              passCount++;
              if (passCount % 20 === 0 || passCount <= 5) {
                process.stdout.write(`${colors.green}.${colors.reset}`);
              }
            }
          }
        } else if (trimmed.startsWith('not ok ')) {
          const failMatch = trimmed.match(/^not ok\s+\d+\s+-\s+(.+)$/);
          const name = failMatch ? failMatch[1] : trimmed;
          if (!name.includes('Suite') && !name.includes('Category') && !name.startsWith('Tier ')) {
            failCount++;
            failedTests.push(name);
            process.stdout.write(`${colors.red}F${colors.reset}`);
          }
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      const elapsedMs = Date.now() - startTime;
      process.stdout.write('\n');

      // More robust parsing from full TAP buffer
      const tapTestLines = stdout.split('\n').filter(l => {
        const t = l.trim();
        return (t.startsWith('ok ') || t.startsWith('not ok ')) && 
               (t.includes('TC-') || t.includes('SCN-') || (!t.includes('Suite') && !t.includes('Category') && !t.startsWith('F-') && !t.startsWith('Tier ') && !t.includes('Tier 1') && !t.includes('Tier 2') && !t.includes('Tier 3') && !t.includes('Tier 4')));
      });

      // Recalculate accurately based on parsed test lines
      let accuratePass = 0;
      let accurateFail = 0;
      for (const l of tapTestLines) {
        const trimmed = l.trim();
        if (trimmed.startsWith('ok ')) accuratePass++;
        else if (trimmed.startsWith('not ok ')) accurateFail++;
      }

      // If accurate count is greater than streaming count, use accurate count
      const finalPass = Math.max(passCount, accuratePass);
      const finalFail = Math.max(failCount, accurateFail);
      const passedThreshold = finalPass >= tier.minRequired && finalFail === 0 && code === 0;

      if (passedThreshold) {
        console.log(`  ${colors.green}✔ ${tier.name}: ${finalPass} passed, 0 failed (${(elapsedMs / 1000).toFixed(2)}s)${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✖ ${tier.name}: ${finalPass} passed, ${finalFail} failed, exit code: ${code} (${(elapsedMs / 1000).toFixed(2)}s)${colors.reset}`);
        if (finalPass < tier.minRequired) {
          console.log(`    ${colors.yellow}⚠ Warning: Expected >= ${tier.minRequired} tests, but got ${finalPass}${colors.reset}`);
        }
      }

      resolve({
        tier,
        passed: finalPass,
        failed: finalFail,
        code,
        elapsedMs,
        passedThreshold,
        failedTests,
        stderr
      });
    });
  });
}

/**
 * Main Master Runner function
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.white}   MIC & WEBCAM DIAGNOSTIC UTILITY — MASTER E2E TEST RUNNER${colors.reset}`);
  console.log(`${colors.dim}   Native Node.js 22 Test Suite • Zero External Dependencies • 4 Tiers${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================================================${colors.reset}`);

  const overallStartTime = Date.now();
  const results = [];

  for (const tier of TIERS) {
    const res = await runTier(tier);
    results.push(res);
  }

  const overallElapsedMs = Date.now() - overallStartTime;

  // Compute Totals
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const allTiersPassedThreshold = results.every(r => r.passedThreshold);
  const totalMeetsThreshold = totalPassed >= TOTAL_MIN_REQUIRED;
  const suitePassed = allTiersPassedThreshold && totalMeetsThreshold && totalFailed === 0;

  // Print Summary Table
  console.log(`\n${colors.bright}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.white}   TEST SUITE EXECUTION SUMMARY REPORT${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.white}┌──────────────────────────────────────────────┬────────┬────────┬──────────┬──────────┬────────┐${colors.reset}`);
  console.log(`${colors.white}│ Test Suite Tier                              │ Target │ Passed │ Failed   │ Duration │ Status │${colors.reset}`);
  console.log(`${colors.white}├──────────────────────────────────────────────┼────────┼────────┼──────────┼──────────┼────────┤${colors.reset}`);

  for (const r of results) {
    const tierName = r.tier.name.padEnd(44).slice(0, 44);
    const target = `>=${r.tier.minRequired}`.padStart(6);
    const passed = String(r.passed).padStart(6);
    const failed = String(r.failed).padStart(8);
    const dur = `${(r.elapsedMs / 1000).toFixed(2)}s`.padStart(8);
    const status = r.passedThreshold ? `${colors.green} PASS ${colors.reset}` : `${colors.red} FAIL ${colors.reset}`;

    console.log(`│ ${tierName} │ ${target} │ ${passed} │ ${failed} │ ${dur} │ ${status} │`);
  }

  console.log(`${colors.white}├──────────────────────────────────────────────┼────────┼────────┼──────────┼──────────┼────────┤${colors.reset}`);
  const totalLabel = 'TOTAL COMBINED TEST SUITE'.padEnd(44);
  const totalTarget = `>=${TOTAL_MIN_REQUIRED}`.padStart(6);
  const totalPassStr = String(totalPassed).padStart(6);
  const totalFailStr = String(totalFailed).padStart(8);
  const totalDurStr = `${(overallElapsedMs / 1000).toFixed(2)}s`.padStart(8);
  const overallStatus = suitePassed ? `${colors.bgGreen}${colors.bright} PASS ${colors.reset}` : `${colors.bgRed}${colors.bright} FAIL ${colors.reset}`;

  console.log(`│ ${colors.bright}${totalLabel}${colors.reset} │ ${totalTarget} │ ${colors.green}${colors.bright}${totalPassStr}${colors.reset} │ ${totalFailed === 0 ? colors.green : colors.red}${totalFailStr}${colors.reset} │ ${totalDurStr} │ ${overallStatus} │`);
  console.log(`${colors.white}└──────────────────────────────────────────────┴────────┴────────┴──────────┴──────────┴────────┘${colors.reset}`);

  console.log(`\n${colors.bright}Coverage Threshold Verification:${colors.reset}`);
  console.log(`  • Tier 1 (Features):    ${results[0].passed} / ${results[0].tier.minRequired} tests ${results[0].passed >= results[0].tier.minRequired ? colors.green + '✔ [MET]' : colors.red + '✖ [UNMET]'}${colors.reset}`);
  console.log(`  • Tier 2 (Boundaries):  ${results[1].passed} / ${results[1].tier.minRequired} tests ${results[1].passed >= results[1].tier.minRequired ? colors.green + '✔ [MET]' : colors.red + '✖ [UNMET]'}${colors.reset}`);
  console.log(`  • Tier 3 (Combinations):${results[2].passed} / ${results[2].tier.minRequired} tests ${results[2].passed >= results[2].tier.minRequired ? colors.green + '✔ [MET]' : colors.red + '✖ [UNMET]'}${colors.reset}`);
  console.log(`  • Tier 4 (Scenarios):   ${results[3].passed} / ${results[3].tier.minRequired} tests ${results[3].passed >= results[3].tier.minRequired ? colors.green + '✔ [MET]' : colors.red + '✖ [UNMET]'}${colors.reset}`);
  console.log(`  • Suite Grand Total:    ${totalPassed} / ${TOTAL_MIN_REQUIRED} tests ${totalPassed >= TOTAL_MIN_REQUIRED ? colors.green + '✔ [MET]' : colors.red + '✖ [UNMET]'}${colors.reset}`);

  if (suitePassed) {
    console.log(`\n${colors.bgGreen}${colors.bright} SUCCESS ${colors.reset} ${colors.green}${colors.bright}All ${totalPassed} tests across all 4 tiers passed cleanly with 0 errors!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`\n${colors.bgRed}${colors.bright} FAILURE ${colors.reset} ${colors.red}Test suite failed. See details above.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running E2E test runner:', err);
  process.exit(1);
});
