import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { CloudResource, AnalysisRun } from '../types.js';
import { TrendingDown, PieChart as PieIcon, BarChart2, Activity } from 'lucide-react';

interface TrendChartsProps {
  resources: CloudResource[];
  analyses: AnalysisRun[];
  activeAnalysis: AnalysisRun | null;
}

export default function TrendCharts({ resources, analyses, activeAnalysis }: TrendChartsProps) {
  // Theme Color Palette
  const colors = {
    primary: '#2D3C59',
    success: '#94A378',
    accent: '#E5BA41',
    warning: '#D1855C',
    darkBg: '#2D3C59',
    cardBg: 'rgba(255, 255, 255, 0.05)',
  };

  // 1. Data for Cost by Resource Type (Bar Chart)
  const costByTypeData = React.useMemo(() => {
    const aggregates: Record<string, number> = {};
    resources.forEach((r) => {
      aggregates[r.type] = (aggregates[r.type] || 0) + r.monthly_cost;
    });

    return Object.entries(aggregates).map(([type, cost]) => ({
      name: type,
      cost: parseFloat(cost.toFixed(2)),
    })).sort((a, b) => b.cost - a.cost);
  }, [resources]);

  // 2. Data for Waste vs Optimal (Pie Chart)
  const wasteVsOptimalData = React.useMemo(() => {
    if (!activeAnalysis) {
      // Fallback if no analysis has been run yet
      const total = resources.reduce((sum, r) => sum + r.monthly_cost, 0);
      return [
        { name: 'Optimal Spend', value: parseFloat(total.toFixed(2)), color: colors.success },
        { name: 'Identified Waste', value: 0, color: colors.warning },
      ];
    }

    return [
      {
        name: 'Optimal Spend',
        value: parseFloat((activeAnalysis.optimalCost || 0).toFixed(2)),
        color: colors.success,
      },
      {
        name: 'Identified Waste',
        value: parseFloat((activeAnalysis.totalSavings || 0).toFixed(2)),
        color: colors.warning,
      },
    ];
  }, [resources, activeAnalysis]);

  // 3. Data for Trend Over Time (Line Chart)
  const trendHistoryData = React.useMemo(() => {
    return analyses
      .map((run) => ({
        date: new Date(run.timestamp).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        'Total Cost': parseFloat((run.totalCost || 0).toFixed(2)),
        'Savings Identified': parseFloat((run.totalSavings || 0).toFixed(2)),
      }))
      .slice(-10); // Display the last 10 runs to avoid clutter
  }, [analyses]);

  // Custom Tooltip for dark theme styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-bg-dark border border-brand-border p-3 rounded-lg shadow-xl text-xs">
          <p className="font-semibold text-slate-300 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="font-medium mt-0.5">
              {entry.name}: ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" id="visualizations-panel">
      
      {/* 1. Bar Chart: Cost by Resource Type */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-brand-accent" /> Cost Distribution by Resource Type
          </h3>
          {costByTypeData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-500">
              No cloud resource data loaded.
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByTypeData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3C59/20" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cost" fill={colors.accent} radius={[4, 4, 0, 0]}>
                    {costByTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? colors.accent : colors.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Shows monthly runtime costs aggregated by service category.
        </p>
      </div>

      {/* 2. Pie Chart: Waste vs Optimal */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-brand-accent" /> Monthly Spend Efficiency (Waste vs Optimal)
          </h3>
          {resources.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-500">
              No cloud resource data loaded.
            </div>
          ) : (
            <div className="h-[220px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wasteVsOptimalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {wasteVsOptimalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Inner Pie Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Efficiency</span>
                <span className="text-lg font-bold text-slate-100">
                  {activeAnalysis && activeAnalysis.totalCost > 0
                    ? `${((activeAnalysis.optimalCost / activeAnalysis.totalCost) * 100).toFixed(0)}%`
                    : '100%'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Legends */}
        <div className="flex justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.success }}></div>
            <span>Optimal ({activeAnalysis ? `${((activeAnalysis.optimalCost / activeAnalysis.totalCost) * 100).toFixed(0)}%` : '100%'})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.warning }}></div>
            <span>Waste ({activeAnalysis ? `${((activeAnalysis.totalSavings / activeAnalysis.totalCost) * 100).toFixed(0)}%` : '0%'})</span>
          </div>
        </div>
      </div>

      {/* 3. Line Chart: Optimization History Trend */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-accent" /> Cost & Savings Trend History
          </h3>
          {trendHistoryData.length < 2 ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center text-xs text-slate-500 px-4">
              <TrendingDown className="w-8 h-8 text-brand-accent/40 mb-2" />
              <p>Execute multiple optimization runs to plot historical waste reduction trajectories over time.</p>
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendHistoryData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3C59/20" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#94A3B8' }} />
                  <Line
                    type="monotone"
                    dataKey="Total Cost"
                    stroke={colors.accent}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Savings Identified"
                    stroke={colors.success}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Logs historical runs sequentially to visualize cost waste correction paths.
        </p>
      </div>

    </div>
  );
}
