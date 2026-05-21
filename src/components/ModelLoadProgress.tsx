import type { ModelProgress } from "@/lib/engine/client";

const fmtBytes = (n?: number): string => {
  if (!n) return "";
  if (n > 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(0)} MB`;
  return `${(n / 1e3).toFixed(0)} KB`;
};

export function ModelLoadProgress({
  progress,
  error,
}: {
  progress: ModelProgress | null;
  error: string | null;
}) {
  if (error) return <div className="text-sm text-red-400">Model failed to load: {error}</div>;
  if (!progress) return <div className="text-sm text-neutral-400">Warming up…</div>;
  const pct = progress.progress != null ? Math.max(0, Math.min(100, progress.progress)) : null;
  const fileLabel = progress.file ? progress.file.split("/").pop() : "";
  return (
    <div className="text-sm text-neutral-300">
      <div className="flex items-baseline justify-between">
        <span className="capitalize">{progress.status}</span>
        {fileLabel && <span className="text-xs text-neutral-500 font-mono">{fileLabel}</span>}
      </div>
      {pct !== null && (
        <>
          <div className="h-1.5 mt-2 bg-neutral-800 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs text-neutral-500">{pct.toFixed(1)}%</span>
            {progress.loaded && progress.total && (
              <span className="text-xs text-neutral-500 font-mono">
                {fmtBytes(progress.loaded)} / {fmtBytes(progress.total)}
              </span>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
        First-time download is ~1.5GB and runs entirely in your browser. After this, it's cached
        and instant. Nothing is uploaded.
      </p>
    </div>
  );
}
