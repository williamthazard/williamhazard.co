// audio.js — main-thread audio graph for Carter's Delay.
// Stub: implementation lands in Task 30 (granular engine + main-thread graph).
const AUDIO = (() => {
  let started = false;

  async function start() {
    if (started) return { ok: true };
    // Worklet load + node graph construction in Task 30.
    started = true;
    return { ok: true };
  }

  function isStarted() { return started; }
  function setMicMuted(m) { /* Task 30 */ }
  function setOutputMuted(m) { /* Task 30 */ }

  // Hooks for the visualization to read per-voice analyser data.
  function getVoiceAnalysers() { return []; } // 16 entries when implemented
  function getInputAnalyser() { return null; }
  function getInputLevel() { return 0; }

  return { start, isStarted, setMicMuted, setOutputMuted, getVoiceAnalysers, getInputAnalyser, getInputLevel };
})();
