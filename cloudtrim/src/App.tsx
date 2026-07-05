import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  Scissors,
  Sparkles,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Layers,
  Cpu,
  DollarSign,
  ShieldAlert,
  Loader2,
  BookOpen,
  Send,
} from 'lucide-react';

import { CloudResource, AnalysisRun, Settings } from './types.js';
import UploadSection from './components/UploadSection.tsx';
import TrendCharts from './components/TrendCharts.tsx';
import ResourceTable from './components/ResourceTable.tsx';
import Recommendations from './components/Recommendations.tsx';
import SettingsModal from './components/SettingsModal.tsx';

export default function App() {
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRun | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDiscordSending, setIsDiscordSending] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'resources'>('dashboard');

  // Custom Toast/Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch initial data on load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const fetchInitialData = async () => {
    try {
      // 1. Fetch resources
      const resRes = await fetch('/api/resources');
      const resData = await resRes.json();
      if (resData.success) {
        setResources(resData.resources || []);
      }

      // 2. Fetch analyses
      const anaRes = await fetch('/api/analyses');
      const anaData = await anaRes.json();
      if (anaData.success && anaData.analyses) {
        setAnalyses(anaData.analyses);
        if (anaData.analyses.length > 0) {
          // Set latest run as active
          setActiveAnalysis(anaData.analyses[anaData.analyses.length - 1]);
        }
      }
    } catch (err) {
      console.error('Error fetching initial database state:', err);
    }
  };

  const handleUploadSuccess = (newResources: CloudResource[]) => {
    setResources(newResources);
    showToast(`Successfully uploaded ${newResources.length} cloud resources!`);
  };

  const handleClearAll = () => {
    setResources([]);
    setAnalyses([]);
    setActiveAnalysis(null);
    showToast('All resources and historical optimizations cleared.', 'success');
  };

  // Run FinOps AI cost optimization
  const runAiOptimization = async () => {
    if (resources.length === 0) {
      showToast('No cloud resources available. Please upload resource data before running optimization.', 'error');
      return;
    }

    setIsAnalyzing(true);
    showToast('Senior FinOps AI agent analyzing utilization, metrics, and sizing logs...', 'success');

    try {
      const res = await fetch('/api/analyses/run', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.run) {
        const newRun: AnalysisRun = data.run;
        setAnalyses((prev) => [...prev, newRun]);
        setActiveAnalysis(newRun);
        showToast(
          `AI Audit completed! Identified $${(newRun.totalSavings || 0).toFixed(2)} in potential monthly savings.`,
          'success'
        );
      } else {
        throw new Error(data.message || 'Optimization run failed');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred during AI analysis.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger Discord integration post
  const sendToDiscord = async () => {
    if (!activeAnalysis) {
      showToast('No active optimization analysis run is loaded.', 'error');
      return;
    }

    setIsDiscordSending(true);
    try {
      const res = await fetch('/api/discord/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId: activeAnalysis.id }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('FinOps audit embed sent to Discord channel successfully!', 'success');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not post embed to Discord.', 'error');
    } finally {
      setIsDiscordSending(false);
    }
  };

  // Derived dashboard sums
  const summaryStats = useMemo(() => {
    const totalCost = resources.reduce((sum, r) => sum + r.monthly_cost, 0);
    
    if (activeAnalysis) {
      return {
        totalCost: activeAnalysis.totalCost,
        totalSavings: activeAnalysis.totalSavings,
        flaggedCount: activeAnalysis.resourcesFlaggedCount,
        efficiency: totalCost > 0 ? (((activeAnalysis.optimalCost || 0) / totalCost) * 100).toFixed(0) : '100',
      };
    }

    return {
      totalCost,
      totalSavings: 0,
      flaggedCount: 0,
      efficiency: '100',
    };
  }, [resources, activeAnalysis]);

  return (
    <div className="min-h-screen bg-brand-bg-dark text-slate-100 flex flex-col relative" id="cloudtrim-app">
      
      {/* 1. TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none max-w-sm w-full space-y-2">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 pointer-events-auto bg-black/30 backdrop-blur-md border-white/10 text-slate-100`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-brand-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-brand-warning flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-grow">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {toast.type === 'success' ? 'CloudTrim Heuristic' : 'Warning Action'}
                </p>
                <p className="text-xs opacity-90 mt-1 font-medium leading-relaxed">{toast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. HEADER */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 border-b border-white/10 bg-black/10 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ backgroundColor: '#E5BA41' }}>
            <Cloud className="w-5 h-5 text-[#2D3C59]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CloudTrim<span style={{ color: '#E5BA41' }}>.ai</span>
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Autonomous FinOps Agent</p>
          </div>
        </div>

        {/* Header Action Items */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-white/70">
            <Layers className="w-3.5 h-3.5 text-brand-accent" />
            <span>Monitored: <strong className="text-white">{resources.length} resources</strong></span>
          </div>

          <button
            onClick={runAiOptimization}
            disabled={isAnalyzing || resources.length === 0}
            className="px-4 py-2 rounded-md font-semibold text-sm flex items-center space-x-2 transition-all hover:brightness-110 active:scale-95 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#E5BA41', color: '#2D3C59' }}
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#2D3C59]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#2D3C59]" />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}</span>
          </button>

          <button
            onClick={sendToDiscord}
            disabled={isDiscordSending || !activeAnalysis}
            className="px-4 py-2 border border-white/20 rounded-md font-medium text-sm flex items-center space-x-2 hover:bg-white/5 transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className={`w-4 h-4 ${isDiscordSending ? 'animate-pulse' : ''}`} />
            <span>Discord Sync</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-white/20 rounded-md hover:bg-white/5 transition-all text-white"
            title="Integrations settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. HERO/MAIN CONTAINER */}
      <main className="flex-grow p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* TOP STATUS ALERTS */}
        {resources.length === 0 && (
          <div className="p-5 bg-white/5 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-accent mt-0.5 sm:mt-0 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Autonomous FinOps Optimization</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Ready to audit cloud costs. Load the optimized demo records below or upload your own CSV data source to trigger our deep analyzer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. METRIC CARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-summary">
          {/* Card 1: Total Cloud Cost */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col justify-between min-h-[115px]">
            <span className="text-xs uppercase tracking-widest text-white/50 font-bold">Total Cloud Cost</span>
            <span className="text-3xl font-light text-white font-sans mt-2">
              ${summaryStats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Card 2: Estimated Savings */}
          <div className="p-5 rounded-xl flex flex-col justify-between border border-white/10 min-h-[115px]" style={{ backgroundColor: 'rgba(148, 163, 120, 0.1)' }}>
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: '#94A378' }}>Estimated Savings</span>
            <span className="text-3xl font-light font-sans mt-2" style={{ color: '#94A378' }}>
              ${summaryStats.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Card 3: Flagged Resources */}
          <div className="p-5 rounded-xl flex flex-col justify-between border border-white/10 min-h-[115px]" style={{ backgroundColor: 'rgba(209, 133, 92, 0.1)' }}>
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: '#D1855C' }}>Flagged Resources</span>
            <span className="text-3xl font-light font-sans mt-2" style={{ color: '#D1855C' }}>
              {summaryStats.flaggedCount}
            </span>
          </div>

          {/* Card 4: Last Run History */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col justify-between min-h-[115px]">
            <span className="text-xs uppercase tracking-widest text-white/50 font-bold">Last Run History</span>
            <div className="flex items-center space-x-1 mt-2">
              <div className="w-1 h-8 bg-white/20 rounded-full"></div>
              <div className="w-1 h-6 bg-white/20 rounded-full"></div>
              <div className="w-1 h-10 bg-white/20 rounded-full"></div>
              <div className="w-1 h-5" style={{ backgroundColor: '#E5BA41', borderRadius: '9999px' }}></div>
              <span className="text-[11px] ml-2 text-white/40 font-bold uppercase tracking-wider">Trend: {summaryStats.efficiency}% Efficiency</span>
            </div>
          </div>
        </div>

        {/* 5. CSV UPLOAD COMPONENT */}
        <UploadSection
          onUploadSuccess={handleUploadSuccess}
          onClearAll={handleClearAll}
          hasResources={resources.length > 0}
        />

        {/* 6. CHARTS AND ADVISORY SEGMENT */}
        {resources.length > 0 && (
          <TrendCharts
            resources={resources}
            analyses={analyses}
            activeAnalysis={activeAnalysis}
          />
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Advisory card panel */}
          {resources.length > 0 && (
            <Recommendations
              run={activeAnalysis}
              resources={resources}
              onSendToDiscord={sendToDiscord}
              isDiscordSending={isDiscordSending}
            />
          )}

          {/* Full resource catalog list */}
          {resources.length > 0 && (
            <ResourceTable
              resources={resources}
              recommendations={activeAnalysis ? activeAnalysis.recommendations : []}
            />
          )}
        </div>

      </main>

      {/* 7. SETTINGS/INTEGRATIONS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(updated) => {
          showToast('Settings saved and synchronized with CloudTrim server.', 'success');
        }}
      />

      {/* FOOTER BAR */}
      <footer className="px-8 py-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center bg-black/10 text-[10px] tracking-widest uppercase text-white/30 font-bold gap-3">
        <div className="flex flex-wrap justify-center gap-6">
          <span>Region: US-EAST-1</span>
          <span>Cloud Provider: AWS / GCP</span>
          <span>Firestore Sync: <span style={{ color: '#94A378' }}>Active</span></span>
        </div>
        <div>
          <span>Gemini Analysis v1.4.2 Professional</span>
        </div>
      </footer>

    </div>
  );
}
