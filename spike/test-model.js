import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";

env.backends.onnx.wasm.proxy = false;

const out = document.getElementById("out");
const gpuStatus = document.getElementById("gpu-status");
const log = (m) => { out.textContent += m + "\n"; };

// Check WebGPU availability first
(async () => {
  const adapter = await navigator.gpu?.requestAdapter();
  if (adapter) {
    gpuStatus.textContent = "WebGPU: ✓ available";
    gpuStatus.style.background = "#064e3b";
    gpuStatus.style.color = "#a7f3d0";
  } else {
    gpuStatus.textContent = "WebGPU: ✗ NOT available — won't work";
    gpuStatus.style.background = "#7f1d1d";
    gpuStatus.style.color = "#fecaca";
  }
})();

const candidates = [
  "onnx-community/gemma-4-E4B-it-ONNX",
  "onnx-community/gemma-4-E2B-it-ONNX",
  "onnx-community/gemma-3-4b-it-ONNX",
  "onnx-community/gemma-3-1b-it-ONNX",
];

document.getElementById("go").onclick = async () => {
  for (const id of candidates) {
    try {
      log(`\n=== Trying ${id} ===`);
      const t0 = performance.now();
      const gen = await pipeline("text-generation", id, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback: (p) => {
          if (p.status === "progress" && p.progress != null) {
            log(`  ${p.file ?? ""} ${p.progress.toFixed(1)}%`);
          } else if (p.status) {
            log(`  ${p.status} ${p.file ?? ""}`);
          }
        },
      });
      log(`✓ Loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      const res = await gen(
        "Categorize this transaction in one word: STARBUCKS COFFEE #1234 $4.50. Category:",
        { max_new_tokens: 8, return_full_text: false }
      );
      log("Output: " + JSON.stringify(res));
      log(`\n🏆 WINNER: ${id}`);
      window.__WINNER__ = id;
      return;
    } catch (e) {
      log(`  ✗ failed: ${e.message}`);
    }
  }
  log("\n❌ All candidates failed.");
};
