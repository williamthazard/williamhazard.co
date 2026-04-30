// tests.js — pure-function tests; load via test.html
const TESTS = (() => {
  const results = [];

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }
  function approx(a, b, eps = 1e-6) {
    return Math.abs(a - b) <= eps;
  }
  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: e.message });
    }
  }

  function run() {
    const failed = results.filter(r => !r.ok);
    const passed = results.filter(r => r.ok);
    console.log(`%c${passed.length} passed`, 'color: #4ade80');
    if (failed.length) {
      console.log(`%c${failed.length} failed`, 'color: #f87171');
      for (const r of failed) {
        console.log(`%c  ✗ ${r.name}: ${r.error}`, 'color: #f87171');
      }
    } else {
      console.log('%call tests passed', 'color: #4ade80; font-weight: bold');
    }
  }

  return { assert, approx, test, run };
})();
