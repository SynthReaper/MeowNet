'use client';

// components/profile/DataPortability/index.tsx — GDPR Article 20 "Export My Data" Portability Component
import { useState } from 'react';

export default function DataPortability() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/privacy/export-data');
      if (!res.ok) {
        throw new Error('Export failed. Server returned error.');
      }
      const data = await res.json();
      
      // Create a blob and trigger download
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `meownet-export-${data.export_metadata?.user_id || 'user'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to download data.';
      setError(errMsg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
      <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">download_for_offline</span>
        <span>Export My Data</span>
      </h3>
      <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-1 leading-relaxed">
        GDPR Article 20 Data Portability. Download a complete machine-readable copy of your profile, sightings, points logs, and activity.
      </p>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/65 text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/15 font-body text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">download</span>
        <span>{exporting ? 'Packing archive…' : 'Download JSON Archive'}</span>
      </button>

      {error && <p className="font-body text-[10px] text-red-500 font-semibold mt-1">{error}</p>}
    </div>
  );
}
