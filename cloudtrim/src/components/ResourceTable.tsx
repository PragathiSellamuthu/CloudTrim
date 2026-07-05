import React, { useState, useMemo } from 'react';
import { CloudResource, Recommendation } from '../types.js';
import { Search, ArrowUpDown, Server, Cpu, HardDrive, DollarSign, Calendar, SlidersHorizontal } from 'lucide-react';

interface ResourceTableProps {
  resources: CloudResource[];
  recommendations: Recommendation[];
}

type SortField = 'resource_id' | 'type' | 'region' | 'cpu_util_percent' | 'storage_gb' | 'monthly_cost' | 'last_active' | 'classification' | 'savings';
type SortDirection = 'asc' | 'desc';

export default function ResourceTable({ resources, recommendations }: ResourceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('monthly_cost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Map of recommendations for O(1) lookup
  const recMap = useMemo(() => {
    const map = new Map<string, Recommendation>();
    recommendations.forEach((r) => map.set(r.resource_id, r));
    return map;
  }, [recommendations]);

  // Unique list of resource types for the dropdown filter
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    resources.forEach((r) => types.add(r.type));
    return ['All', ...Array.from(types)];
  }, [resources]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter & Sort Data
  const processedResources = useMemo(() => {
    let result = [...resources];

    // Search filter
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.resource_id.toLowerCase().includes(search) ||
          r.region.toLowerCase().includes(search) ||
          r.type.toLowerCase().includes(search)
      );
    }

    // Type filter
    if (filterType !== 'All') {
      result = result.filter((r) => r.type === filterType);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField as keyof CloudResource] ?? '';
      let valB: any = b[sortField as keyof CloudResource] ?? '';

      // Special handles for derived recommendation fields
      if (sortField === 'classification') {
        valA = recMap.get(a.resource_id)?.classification || 'optimal';
        valB = recMap.get(b.resource_id)?.classification || 'optimal';
      } else if (sortField === 'savings') {
        valA = recMap.get(a.resource_id)?.estimatedSavings || 0;
        valB = recMap.get(b.resource_id)?.estimatedSavings || 0;
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [resources, searchTerm, filterType, sortField, sortDirection, recMap]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl mb-8" id="resources-table">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-accent" /> Cloud Resource Catalog
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sort, filter, and inspect runtime metrics of active cloud instances.
          </p>
        </div>

        {/* Filters and search bar */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl w-full">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resource ID, region, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-450 focus:outline-none focus:border-brand-accent transition-all"
            />
          </div>

          <div className="relative min-w-[120px]">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-accent appearance-none cursor-pointer"
            >
              {uniqueTypes.map((t) => (
                <option key={t} value={t} className="bg-[#2D3C59] text-white">
                  Type: {t}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="absolute right-3 top-3 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {processedResources.length === 0 ? (
        <div className="text-center py-12 border border-white/10 rounded-lg bg-black/10">
          <p className="text-sm text-slate-400">No matching cloud resources discovered.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting filters or uploading standard resource records.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/5 text-slate-300 font-semibold border-b border-white/10">
                <th onClick={() => handleSort('resource_id')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    Resource ID <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('type')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    Service <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('region')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    Region <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('cpu_util_percent')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" /> CPU % <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('storage_gb')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3" /> Storage <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('monthly_cost')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> Cost/mo <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('last_active')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Last Active <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                
                {/* Derived classification and savings columns from AI Analysis if active */}
                {recommendations.length > 0 && (
                  <>
                    <th onClick={() => handleSort('classification')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        Status <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('savings')} className="p-3.5 cursor-pointer hover:text-slate-100 transition-all select-none text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        Waste Savings <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {processedResources.map((r, index) => {
                const rec = recMap.get(r.resource_id);
                const hasRec = !!rec;
                
                // Mapped style overrides for table row hover states
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-white/5 transition-colors ${
                      index % 2 === 0 ? 'bg-black/5' : 'bg-black/20'
                    }`}
                  >
                    <td className="p-3.5 font-mono text-slate-200 font-medium select-all">{r.resource_id}</td>
                    <td className="p-3.5">
                      <span className="bg-white/10 border border-white/10 px-2 py-0.5 rounded font-medium text-[10px] uppercase text-slate-200">
                        {r.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{r.region}</td>
                    <td className="p-3.5 font-mono">
                      <div className="flex items-center gap-2">
                        <span>{r.cpu_util_percent.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              r.cpu_util_percent < 5
                                ? 'bg-brand-warning'
                                : r.cpu_util_percent < 25
                                ? 'bg-brand-accent'
                                : 'bg-brand-success'
                            }`}
                            style={{ width: `${Math.min(100, r.cpu_util_percent)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">{r.storage_gb > 0 ? `${r.storage_gb.toLocaleString()} GB` : '—'}</td>
                    <td className="p-3.5 font-mono font-medium text-slate-100">${r.monthly_cost.toFixed(2)}</td>
                    <td className="p-3.5 text-slate-400">{r.last_active}</td>
                    
                    {/* Recommendation stats */}
                    {recommendations.length > 0 && (
                      <>
                        <td className="p-3.5 text-right">
                          {hasRec ? (
                            <span
                              className="px-2 py-0.5 rounded font-medium text-[10px] uppercase inline-block"
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
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-brand-success">
                          {hasRec && rec.estimatedSavings > 0 ? (
                            `-$${rec.estimatedSavings.toFixed(2)}`
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
