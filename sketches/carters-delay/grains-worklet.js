// grains-worklet.js — AudioWorkletProcessor for Carter's Delay granular synthesis.
// Stub: this version just passes the input through to output[0] channel 0.
// Task 30 replaces with full 16-voice circular-buffer granular engine.
class CartersGrainsProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'recordLevel', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const inputCh = input[0];
    const recordLevel = parameters.recordLevel[0];
    const numSamples = inputCh.length;

    // Pass-through stub: write to channel 0 of output[0].
    for (let s = 0; s < numSamples; s++) {
      output[0][s] = inputCh[s] * recordLevel;
    }
    return true;
  }
}

registerProcessor('carters-grains', CartersGrainsProcessor);
