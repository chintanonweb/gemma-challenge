import type { NextConfig } from "next";

const config: NextConfig = {
  // Cross-Origin Isolation is required for WebGPU + SharedArrayBuffer in some browsers,
  // and is recommended by Transformers.js for best WebGPU performance.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default config;
