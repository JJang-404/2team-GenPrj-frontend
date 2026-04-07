import type { Config } from '@imgly/background-removal';

/**
 * Shared config for @imgly/background-removal.
 * Must be the SAME object reference (or stringify-identical) for both
 * preload() and removeBackground() so the memoized ONNX session is reused.
 * device: 'gpu' → WebGPU if supported, auto-falls back to WASM CPU.
 */
export const BG_REMOVAL_CONFIG: Config = { device: 'gpu' };
