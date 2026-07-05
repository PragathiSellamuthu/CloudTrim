import React, { useState, useEffect } from 'react';
import { Settings2, X, Check, Save, Link2, AlertCircle } from 'lucide-react';
import { Settings } from '../types.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setWebhookUrl(data.settings.discordWebhookUrl || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Basic validation
    if (webhookUrl.trim() !== '') {
      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        setError('Invalid Discord Webhook format. It must start with "https://discord.com/api/webhooks/"');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ discordWebhookUrl: webhookUrl.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        onSave(data.settings);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || 'Server failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#1a2538] border border-white/10 w-full max-w-md rounded-xl p-6 shadow-2xl relative animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
          <Settings2 className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-semibold text-slate-100">Configure Integrations</h3>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400" /> Discord Webhook URL (Secret Key)
            </label>
            <input
              type="text"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-accent transition-all font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              CloudTrim posts detailed summary embeds to this webhook. This is stored server-side and never exposed to client browsers.
            </p>
          </div>

          {/* Feedback states */}
          {error && (
            <div className="p-3 bg-[#D1855C]/15 border border-[#D1855C]/30 rounded-lg text-xs text-[#D1855C] flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-[#94A378]/15 border border-[#94A378]/30 rounded-lg text-xs text-[#94A378] flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Settings saved successfully! Closing...</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-white/20 text-slate-300 hover:text-slate-100 rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#E5BA41] hover:brightness-110 active:scale-95 text-[#2D3C59] font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
