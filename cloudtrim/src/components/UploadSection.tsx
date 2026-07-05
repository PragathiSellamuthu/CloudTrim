import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Play, RefreshCw, Trash2 } from 'lucide-react';
import { CloudResource } from '../types.js';

interface UploadSectionProps {
  onUploadSuccess: (resources: CloudResource[]) => void;
  onClearAll: () => void;
  hasResources: boolean;
}

export default function UploadSection({ onUploadSuccess, onClearAll, hasResources }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse custom CSV string
  const parseCSV = (text: string): CloudResource[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or only contains headers');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Required headers
    const required = ['resource_id', 'type', 'region', 'cpu_util_percent', 'storage_gb', 'monthly_cost', 'last_active'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      throw new Error(`Missing required CSV headers: ${missing.join(', ')}`);
    }

    const parsed: CloudResource[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV cell parsing splitting by comma, respecting quoted values if any
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));

      if (values.length < headers.length) {
        continue; // skip malformed lines
      }

      // Map row to CloudResource object
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      parsed.push({
        id: `res-${Date.now()}-${i}`,
        resource_id: row['resource_id'],
        type: row['type'],
        region: row['region'],
        cpu_util_percent: parseFloat(row['cpu_util_percent']) || 0,
        storage_gb: parseFloat(row['storage_gb']) || 0,
        monthly_cost: parseFloat(row['monthly_cost']) || 0,
        last_active: row['last_active'] || new Date().toISOString().split('T')[0],
      });
    }

    return parsed;
  };

  const processFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const resources = parseCSV(text);
        
        // POST to backend
        const res = await fetch('/api/resources/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resources }),
        });

        const data = await res.json();
        if (data.success) {
          setSuccess(`Successfully uploaded and parsed ${data.count} cloud resources!`);
          onUploadSuccess(data.resources);
        } else {
          throw new Error(data.message || 'Server failed to save resources');
        }
      } catch (err: any) {
        setError(err.message || 'Error processing CSV file');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file contents');
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Load highly-tailored interactive demo data to trigger awesome analysis
  const loadDemoData = async () => {
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    const demoCSV = `resource_id,type,region,cpu_util_percent,storage_gb,monthly_cost,last_active
i-ec2-api-web,EC2,us-east-1,12.5,100,320.00,2026-07-04
i-ec2-batch-worker,EC2,us-east-1,1.8,200,480.00,2026-07-02
i-rds-prod-master,RDS,us-west-2,84.6,1500,1250.00,2026-07-04
i-rds-staging-db,RDS,us-west-2,4.2,500,450.00,2026-07-04
vol-ebs-orphaned-x9,EBS,us-east-1,0,300,45.00,2026-05-10
bucket-s3-archive-logs,S3,us-east-1,0,8500,215.00,2026-07-04
i-ec2-legacy-dev,EC2,eu-west-1,0.5,50,110.00,2026-05-20
vol-ebs-temp-swap,EBS,eu-west-1,0,150,22.50,2026-07-04
i-lambda-invoice-proc,Lambda,us-east-1,45.0,0,12.40,2026-07-04`;

    try {
      const resources = parseCSV(demoCSV);
      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resources }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Loaded ${data.count} demo cloud resources. Press 'Run Analysis' to optimize!`);
        onUploadSuccess(data.resources);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading demo data');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerReset = async () => {
    if (!window.confirm('Are you sure you want to delete all loaded resources and analysis history?')) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/clear-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Database reset successfully.');
        onClearAll();
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error clearing database');
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl" id="upload-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="text-brand-accent w-5 h-5" /> Cloud Resource Data Source
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Provide resource attributes (ID, type, region, CPU%, storage, cost, last active) to optimize.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={loadDemoData}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-medium bg-black/20 hover:bg-white/5 active:scale-95 border border-white/20 text-slate-100 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
            Load Demo Data
          </button>
          
          {hasResources && (
            <button
              onClick={triggerReset}
              className="px-4 py-2 text-xs font-medium border border-[#D1855C]/30 text-[#D1855C] bg-[#D1855C]/10 hover:bg-[#D1855C]/20 active:scale-95 rounded-lg transition-all flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset App
            </button>
          )}
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
          dragActive
            ? 'border-[#E5BA41] bg-white/10'
            : 'border-white/10 bg-black/20 hover:bg-white/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="bg-white/5 border border-white/10 p-4 rounded-full mb-4">
          <Upload className="w-8 h-8 text-brand-accent" />
        </div>
        
        <p className="text-sm font-medium text-slate-200">
          {isUploading ? 'Parsing data...' : 'Drag and drop your cloud resources CSV file here'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          or click to browse your local computer files
        </p>
        
        <div className="mt-4 flex flex-wrap gap-2 justify-center text-[10px] text-slate-400 max-w-md">
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">resource_id</span>
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">type</span>
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">region</span>
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">cpu_util_percent</span>
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">storage_gb</span>
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">monthly_cost</span>
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded">last_active</span>
        </div>
      </div>

      {/* Alerts/Status */}
      {error && (
        <div className="mt-4 p-4 bg-[#D1855C]/10 border border-[#D1855C]/30 rounded-lg text-sm text-[#D1855C] flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload Failed</p>
            <p className="text-xs opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-[#94A378]/10 border border-[#94A378]/30 rounded-lg text-sm text-[#94A378] flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Action Successful</p>
            <p className="text-xs opacity-90 mt-0.5">{success}</p>
          </div>
        </div>
      )}
    </div>
  );
}
