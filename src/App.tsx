/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight,
  RefreshCw,
  Clock,
  Download,
  FileSpreadsheet,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScanResult {
  href: string;
  text: string;
  fullUrl: string;
  status: number;
  statusText: string;
}

interface ScanResponse {
  baseUrl: string;
  totalLinks: number;
  results: ScanResult[];
}

export default function App() {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanTime, setScanTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isScanning) {
      setScanTime(0);
      interval = setInterval(() => {
        setScanTime(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const stats = useMemo(() => {
    if (!scanData) return null;
    return {
      total: scanData.results.length,
      broken: scanData.results.filter(r => r.status >= 400 || r.status === 0).length,
      redirects: scanData.results.filter(r => r.status >= 300 && r.status < 400).length,
      healthy: scanData.results.filter(r => r.status >= 200 && r.status < 300).length,
    };
  }, [scanData]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsScanning(true);
    setError(null);
    setScanData(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze site. Please check the URL and try again.');
      }

      const data: ScanResponse = await response.json();
      setScanData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main flex flex-col p-8 overflow-hidden h-screen">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LinkGuard v2.4</h1>
        </div>

        <form onSubmit={handleScan} className="flex gap-3 bg-white p-2 rounded-xl border border-border w-[500px] shadow-sm">
          <input
            type="text"
            placeholder="Enter website URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScanning}
            className="flex-1 bg-transparent border-none outline-none px-2 text-sm"
          />
          <button
            type="submit"
            disabled={isScanning || !url}
            className="bg-accent text-white px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Re-Scan'}
          </button>
        </form>
      </header>

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!scanData && !isScanning ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center max-w-xl">
                <div className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                  Ready for audit
                </div>
                <h2 className="text-5xl font-extrabold tracking-tighter mb-4 leading-tight">
                  Professional Link Monitoring
                </h2>
                <p className="text-text-secondary mb-8">
                  Enter a URL above to start a comprehensive site integrity scan. We'll check every link for downtime and redirects.
                </p>
                {error && (
                  <div className="bg-danger/10 text-danger p-4 rounded-xl flex items-center gap-2 justify-center font-medium">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-4 grid-rows-4 gap-5 h-full"
            >
              {/* Scan Duration & Summary */}
              <div className="card col-span-2 row-span-1 flex flex-col justify-center">
                <div className="label">
                  Scan Duration: {isScanning ? `${scanTime.toFixed(1)}s` : scanData ? 'Scan Complete' : 'Calculating...'}
                </div>
                <div className="big-stat italic">
                  {isScanning ? 'Scanning...' : `${stats?.total.toLocaleString()} Links Checked`}
                </div>
                {scanData && (
                  <div className="mt-2 text-success text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Final Audit Report
                  </div>
                )}
              </div>

              {/* Healthy Stat */}
              <div className="card col-span-1 row-span-1 flex flex-col justify-center text-center">
                <div className="label">Healthy</div>
                <div className="big-stat text-success">
                  {isScanning ? '...' : stats?.healthy.toLocaleString()}
                </div>
              </div>

              {/* Broken Stat */}
              <div className="card col-span-1 row-span-1 flex flex-col justify-center text-center">
                <div className="label">Broken</div>
                <div className="big-stat text-danger">
                  {isScanning ? '...' : stats?.broken.toLocaleString()}
                </div>
              </div>

              {/* Error/Result List */}
              <div className="card col-span-2 row-span-3 overflow-hidden flex flex-col">
                <div className="label mb-4">Site Integrity List</div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {isScanning ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <span className="font-mono text-xs uppercase">Crawling Resources...</span>
                    </div>
                  ) : scanData?.results.map((result, i) => (
                    <div key={i} className="flex items-center py-3 border-b border-border last:border-none group">
                      <div className={`status-badge mr-4 ${result.status >= 400 || result.status === 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                        {result.status || 'ERR'}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-sm font-bold truncate">{result.text}</div>
                        <div className="text-[11px] text-text-secondary truncate font-mono opacity-60">
                          {result.href}
                        </div>
                      </div>
                      <a 
                        href={result.fullUrl} 
                        target="_blank" 
                        className="p-2 bg-bg rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/10 hover:text-accent"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Response Timeline Graph */}
              <div className="card col-span-2 row-span-2 relative flex flex-col">
                <div className="label">Response Time Distribution (ms)</div>
                <div className="flex-1 flex items-end gap-3 pt-5">
                  {[30, 45, 85, 60, 40, 25, 15, 10, 50, 70, 95, 30].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex-1 rounded-t-lg transition-opacity hover:opacity-100 ${i > 8 ? 'bg-border opacity-100' : 'bg-accent opacity-80'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Action Icons */}
              <div className="card col-span-2 row-span-1 flex items-center justify-around">
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 bg-bg rounded-xl flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-all">
                    <Download className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Export PDF</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 bg-bg rounded-xl flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-all">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Full CSV</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 bg-bg rounded-xl flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-all">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Alerts</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
