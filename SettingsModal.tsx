import React, { useState } from 'react';
import { Recommendation, CloudResource, AnalysisRun } from '../types.js';
import {
  Sparkles,
  Send,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface RecommendationsProps {
  run: AnalysisRun | null;
  resources: CloudResource[];
  onSendToDiscord: () => Promise<void>;
  isDiscordSending: boolean;
}

export default function Recommendations({ run, resources, onSendToDiscord, isDiscordSending }: RecommendationsProps) {
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterClass, setFilterClass] = useState<string>('All');

  const resourceMap = React.useMemo(() => {
    const map = new Map<string, CloudResource>();
    resources.forEach((r) => map.set(r.resource_id, r));
    return map;
  }, [resources]);

  // Filter recommendations
  const filteredRecs = React.useMemo(() => {
    if (!run) return [];
    let result = [...(run.recommendations || [])];
    
    if (filterPriority !== 'All') {
      result = result.filter((r) => (r.priority || 'none').toLowerCase() === filterPriority.toLowerCase());
    }
    
    if (filterClass !== 'All') {
      result = result.filter((r) => (r.classification || 'optimal').toLowerCase() === filterClass.toLowerCase());
    }

    // Sort so flagged/high savings are first
    return result.sort((a, b) => (b.estimatedSavings || 0) - (a.estimatedSavings || 0));
  }, [run, filterPriority, filterClass]);

  if (!run) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 shadow-xl text-center flex flex-col items-center justify-center min-h-[300px]" id="recommendations-panel">
        <div className="bg-white/5 border border-white/10 p-4 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-brand-accent animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">No AI Recommendations Yet</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
          Upload cloud resources and press the <strong>Run AI Analysis</strong> button in the header to invoke the senior FinOps AI and discover cost optimizations.
        </p>
      </div>
    );
  }

  const flaggedRecs = (run.recommendations || []).filter((r) => (r.classification || 'optimal') !== 'optimal');

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl" id="recommendations-panel">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-accent" /> Senior FinOps Advisory Insights
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time mechanical optimizations provided by the Gemini AI optimizer.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onSendToDiscord}
          disabled={isDiscordSending || run.recommendations.length === 0}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 self-start md:self-center"
        >
          <Send className={`w-3.5 h-3.5 ${isDiscordSending ? 'animate-pulse' : ''}`} />
          {isDiscordSending ? 'Posting Embed...' : 'Send to Discord'}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-xs font-medium text-slate-400">Filter Advice:</span>
        
        {/* Priority Filter */}
        <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/10 text-[10px]">
          {['All', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                (p === 'All' && filterPriority === 'All') || filterPriority.toLowerCase() === p.toLowerCase()
                  ? 'bg-white/10 text-slate-100 border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p} Priority
            </button>
          ))}
        </div>

        {/* Classification Filter */}
        <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/10 text-[10px]">
          {['All', 'idle', 'oversized', 'orphaned', 'optimal'].map((c) => (
            <button
              key={c}
              onClick={() => setFilterClass(c)}
              className={`px-3 py-1 rounded-md font-medium transition-all capitalize ${
                (c === 'All' && filterClass === 'All') || filterClass.toLowerCase() === c.toLowerCase()
                  ? 'bg-white/10 text-slate-100 border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {filteredRecs.length === 0 ? (
        <div className="text-center py-12 border border-brand-border/40 rounded-lg bg-brand-bg-dark/20 text-slate-400 text-xs">
          No recommendations match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec) => {
            const originalResource = resourceMap.get(rec.resource_id);
            const isOptimal = rec.classification === 'optimal';
            
            return (
              <div
                key={rec.resource_id}
                className={`border rounded-xl p-5 transition-all flex flex-col md:flex-row justify-between gap-6 ${
                  isOptimal
                    ? 'bg-white/5 border-white/10'
                    : rec.priority === 'high'
                    ? 'bg-[#D1855C]/5 border-[#D1855C]/30 hover:border-[#D1855C]/55'
                    : rec.priority === 'medium'
                    ? 'bg-[#E5BA41]/5 border-[#E5BA41]/30 hover:border-[#E5BA41]/55'
                    : 'bg-[#2D3C59]/10 border-[#2D3C59]/40 hover:border-[#2D3C59]/60'
                }`}
              >
                {/* Information Column */}
                <div className="flex-grow space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-semibold font-mono text-slate-100">{rec.resource_id}</span>
                    
                    {originalResource && (
                      <span className="bg-black/25 border border-white/10 text-slate-400 px-2 py-0.5 rounded text-[10px] uppercase">
                        {originalResource.type} • {originalResource.region}
                      </span>
                    )}

                    {/* Classification tag */}
                    <span
                      className="px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          rec.classification === 'idle'
                            ? 'rgba(209, 133, 92, 0.15)'
                            : rec.classification === 'oversized'
                            ? 'rgba(229, 186, 65, 0.15)'
                            : rec.classification === 'orphaned'
                            ? 'rgba(209, 133, 92, 0.1)'
                            : 'rgba(148, 163, 120, 0.15)',
                        color:
                          rec.classification === 'idle'
                            ? '#D1855C'
                            : rec.classification === 'oversized'
                            ? '#E5BA41'
                            : rec.classification === 'orphaned'
                            ? '#e2a381'
                            : '#94A378',
                        border: `1px solid ${
                          rec.classification === 'idle'
                            ? '#D1855C40'
                            : rec.classification === 'oversized'
                            ? '#E5BA4140'
                            : rec.classification === 'orphaned'
                            ? '#D1855C20'
                            : '#94A37840'
                        }`,
                      }}
                    >
                      {rec.classification}
                    </span>

                    {/* Priority badge */}
                    {!isOptimal && (
                      <span
                        className="px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-1"
                        style={{
                          backgroundColor:
                            rec.priority === 'high'
                              ? 'rgba(209, 133, 92, 0.25)'
                              : rec.priority === 'medium'
                              ? 'rgba(229, 186, 65, 0.2)'
                              : 'rgba(148, 163, 120, 0.2)',
                          color:
                            rec.priority === 'high'
                              ? '#D1855C'
                              : rec.priority === 'medium'
                              ? '#E5BA41'
                              : '#94A378',
                        }}
                      >
                        <Zap className="w-2.5 h-2.5" fill="currentColor" /> {rec.priority || 'none'} Priority
                      </span>
                    )}
                  </div>

                  {/* Mechanical description */}
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {rec.reasoning}
                  </p>

                  {/* Derived action suggestion */}
                  {!isOptimal && (
                    <div className="flex items-center gap-2 text-[11px] font-medium text-brand-accent">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>
                        Recommendation:{' '}
                        {rec.classification === 'idle'
                          ? 'Deprovision and terminate this resource to eliminate waste entirely.'
                          : rec.classification === 'oversized'
                          ? 'Downgrade scale or instance type to align capacity with utilization profile.'
                          : 'Clean up orphaned resources, detach storage volume, and delete permanent backup tags.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Financial Metrics Column */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 min-w-[140px] gap-2">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Monthly Cost</span>
                    <span className="text-xs font-mono text-slate-300">
                      ${originalResource?.monthly_cost !== undefined ? originalResource.monthly_cost.toFixed(2) : '—'}
                    </span>
                  </div>

                  {!isOptimal && rec.estimatedSavings !== undefined && rec.estimatedSavings > 0 ? (
                    <div className="text-right">
                      <span className="text-[10px] text-brand-success block uppercase font-semibold">AI Savings</span>
                      <span className="text-base font-bold font-mono text-brand-success">
                        -${(rec.estimatedSavings || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-slate-400 block">/ month</span>
                    </div>
                  ) : (
                    <div className="text-right flex items-center gap-1 text-brand-success text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Highly Optimal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
