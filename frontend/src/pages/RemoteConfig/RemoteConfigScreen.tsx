import React, { useState, useEffect, useMemo } from 'react';
import type { RemoteConfigEntry, Project } from '../../types';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Save,
  Code2,
  Copy,
  Check,
  Search,
  X,
  Radio,
  Clock,
  Sparkles,
  Braces,
  Hash,
  Type,
  ToggleRight,
  RefreshCw,
  Terminal,
  Smartphone,
  Server,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface Props {
  theme?: 'dark' | 'light';
  currentProject?: Project;
}

export const RemoteConfigScreen: React.FC<Props> = ({ theme = 'dark', currentProject }) => {
  const isDark = theme === 'dark';
  const projectId = currentProject?.id || 'app_rCYp1a_mvdfs5j4_w9dyc';
  const apiKey = currentProject?.apiKey || '';

  const defaultEntries: RemoteConfigEntry[] = [
    {
      key: 'enable_instant_checkout',
      value: true,
      type: 'boolean',
      description: 'Enables 1-tap fast checkout modal without cart review',
      updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      key: 'maintenance_banner_active',
      value: false,
      type: 'boolean',
      description: 'Displays global scheduled maintenance advisory banner',
      updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      key: 'welcome_discount_percent',
      value: 20,
      type: 'number',
      description: 'Percentage discount applied for new mobile app signups',
      updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      key: 'support_hotline_number',
      value: '+1-800-CODEPUSH',
      type: 'string',
      description: 'Customer emergency support telephone number',
      updatedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
  ];

  const [configs, setConfigs] = useState<RemoteConfigEntry[]>(defaultEntries);
  const [initialConfigs, setInitialConfigs] = useState<RemoteConfigEntry[]>(defaultEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'boolean' | 'number' | 'string' | 'json'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [activeSdkTab, setActiveSdkTab] = useState<'react-native' | 'curl' | 'node' | 'json'>('react-native');
  const [saveToast, setSaveToast] = useState(false);

  // New Flag Modal State
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('true');
  const [newType, setNewType] = useState<'string' | 'number' | 'boolean' | 'json'>('boolean');
  const [newDesc, setNewDesc] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // JSON Editor Modal State
  const [editingJsonEntry, setEditingJsonEntry] = useState<{ key: string; jsonStr: string } | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Fetch live configs from serverless function / RTDB
  useEffect(() => {
    async function loadConfigs() {
      try {
        const res = await fetch(`/.netlify/functions/remote-config?projectId=${projectId}`, {
          headers: { 'x-codepush-api-key': apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.config) && data.config.length > 0) {
            setConfigs(data.config);
            setInitialConfigs(data.config);
          }
        }
      } catch (e) {
        console.warn('Could not fetch remote config from backend, using defaults', e);
      }
    }
    loadConfigs();
  }, [projectId]);

  // Check if there are unsaved local modifications
  const hasUnsavedChanges = useMemo(() => {
    if (configs.length !== initialConfigs.length) return true;
    return JSON.stringify(configs) !== JSON.stringify(initialConfigs);
  }, [configs, initialConfigs]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = configs.length;
    const booleans = configs.filter((c) => c.type === 'boolean');
    const booleansActive = booleans.filter((c) => Boolean(c.value)).length;
    const numbers = configs.filter((c) => c.type === 'number').length;
    const strings = configs.filter((c) => c.type === 'string').length;
    const jsons = configs.filter((c) => c.type === 'json').length;
    return {
      total,
      booleansTotal: booleans.length,
      booleansActive,
      numbers,
      strings,
      jsons,
    };
  }, [configs]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await fetch(`/.netlify/functions/remote-config?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-codepush-api-key': apiKey },
        body: JSON.stringify({ config: configs }),
      });
      setInitialConfigs(JSON.parse(JSON.stringify(configs)));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3500);
    } catch (e) {
      console.warn('Failed to save remote config:', e);
    }
    setIsSaving(false);
  };

  const handleDiscardChanges = () => {
    setConfigs(JSON.parse(JSON.stringify(initialConfigs)));
  };

  const handleToggleBoolean = (key: string) => {
    setConfigs((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              value: !item.value,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const handleValueChange = (key: string, rawVal: string, type: 'string' | 'number') => {
    setConfigs((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        let finalVal: string | number = rawVal;
        if (type === 'number') {
          const parsed = parseFloat(rawVal);
          finalVal = isNaN(parsed) ? 0 : parsed;
        }
        return {
          ...item,
          value: finalVal,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleDelete = (key: string) => {
    setConfigs((prev) => prev.filter((item) => item.key !== key));
    setDeleteConfirmKey(null);
  };

  const handleOpenAddModal = (templateType?: 'boolean' | 'number' | 'string' | 'json') => {
    const targetType = templateType || 'boolean';
    setNewType(targetType);
    setNewKey('');
    setNewDesc('');
    setKeyError(null);
    if (targetType === 'boolean') setNewVal('true');
    else if (targetType === 'number') setNewVal('100');
    else if (targetType === 'string') setNewVal('Hello World');
    else if (targetType === 'json') setNewVal('{\n  "enabled": true,\n  "variant": "A"\n}');
    setShowAddModal(true);
  };

  const handleAddFlag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanKey) {
      setKeyError('Key name is required');
      return;
    }

    if (configs.some((c) => c.key.toLowerCase() === cleanKey)) {
      setKeyError('A parameter with this key already exists');
      return;
    }

    let parsedVal: any = newVal;
    if (newType === 'boolean') {
      parsedVal = newVal === 'true';
    } else if (newType === 'number') {
      parsedVal = parseFloat(newVal) || 0;
    } else if (newType === 'json') {
      try {
        parsedVal = JSON.parse(newVal);
      } catch {
        setKeyError('Invalid JSON structure. Please verify syntax.');
        return;
      }
    }

    const newEntry: RemoteConfigEntry = {
      key: cleanKey,
      value: parsedVal,
      type: newType,
      description: newDesc.trim() || 'Dynamic parameter',
      updatedAt: new Date().toISOString(),
    };

    setConfigs([newEntry, ...configs]);
    setShowAddModal(false);
  };

  const handleSaveJsonEdit = () => {
    if (!editingJsonEntry) return;
    try {
      const parsed = JSON.parse(editingJsonEntry.jsonStr);
      setConfigs((prev) =>
        prev.map((item) =>
          item.key === editingJsonEntry.key
            ? { ...item, value: parsed, updatedAt: new Date().toISOString() }
            : item
        )
      );
      setEditingJsonEntry(null);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON syntax');
    }
  };

  const copyKeyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyCodeSnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'recently';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  };

  // Filtered entries
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const matchesSearch =
        c.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [configs, searchQuery, typeFilter]);

  // Code generator for SDK Integration Tab
  const firstBool = configs.find((c) => c.type === 'boolean')?.key || 'enable_instant_checkout';
  const firstNum = configs.find((c) => c.type === 'number')?.key || 'welcome_discount_percent';
  const firstStr = configs.find((c) => c.type === 'string')?.key || 'support_hotline_number';

  const reactNativeCode = `import React from 'react';
import { View, Text } from 'react-native';
import { CodePushService } from './src/services/CodePushService';

export const FeatureGateComponent = () => {
  // Read flags synchronously from fast local memory cache (synced on app start):
  const isEnabled = CodePushService.getRemoteConfig('${firstBool}');
  const discountRate = CodePushService.getRemoteConfig('${firstNum}');
  const hotline = CodePushService.getRemoteConfig('${firstStr}');

  if (!isEnabled) {
    return <Text>Standard Checkout Mode</Text>;
  }

  return (
    <View>
      <Text>Instant 1-Tap Checkout Activated! Discount: {discountRate}%</Text>
      <Text>Support: {hotline}</Text>
    </View>
  );
};`;

  const curlCode = `# Fetch real-time active flags for project '${projectId}'
curl -X GET "https://your-domain.netlify.app/.netlify/functions/remote-config?projectId=${projectId}" \\
  -H "Accept: application/json"

# Update flag values programmatically over REST:
curl -X POST "https://your-domain.netlify.app/.netlify/functions/remote-config?projectId=${projectId}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${firstBool}",
    "value": true,
    "type": "boolean"
  }'`;

  const nodeCode = `// Node.js Backend or CI/CD Automation
import axios from 'axios';

async function updateRemoteFlag(key, value) {
  const endpoint = 'https://your-domain.netlify.app/.netlify/functions/remote-config';
  const res = await axios.post(endpoint, {
    projectId: '${projectId}',
    config: [
      { key: '${firstBool}', value: true, type: 'boolean' },
      { key: '${firstNum}', value: 25, type: 'number' }
    ]
  });
  console.log('Remote config synced:', res.data.message);
}`;

  const jsonPayloadPreview = JSON.stringify(
    {
      success: true,
      projectId,
      timestamp: new Date().toISOString(),
      flags: configs.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, any>),
    },
    null,
    2
  );

  const cardBgClass = isDark
    ? 'border-slate-800/80 bg-slate-900/90 text-slate-100 shadow-xl shadow-black/20'
    : 'border-slate-200/90 bg-white text-slate-900 shadow-xl shadow-slate-200/50';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl shadow-emerald-500/30 border border-emerald-400/40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>Remote Config & Feature Flags successfully published to live CDN & devices!</span>
        </div>
      )}

      {/* 1. COMPACT COMMAND BAR HEADER (Reduced Height, Professional Layout) */}
      <div className={`rounded-2xl border px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBgClass}`}>
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight truncate">Remote Config & Feature Flags</h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Synced</span>
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                App: {currentProject?.name || 'Default'}
              </span>
            </div>
            <p className={`text-[11px] font-medium truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Instant OTA runtime parameter delivery and feature gating without app store reviews.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 mr-1">
              <span className="flex items-center space-x-1 text-[11px] font-semibold text-amber-400 animate-pulse">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Unsaved changes</span>
              </span>
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                Discard
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddModal('boolean')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-cyan-400" />
            <span>New Flag</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-500/40 ring-offset-1 ring-offset-slate-900'
                : 'bg-emerald-700/60 opacity-60 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save & Publish Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. STATS & METRICS STRIP (High Density, Low Profile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-xl border p-3 flex items-center justify-between ${cardBgClass}`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Flags</span>
            <div className="text-xl font-black mt-0.5">{metrics.total}</div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        <div className={`rounded-xl border p-3 flex items-center justify-between ${cardBgClass}`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 block">Feature Toggles</span>
            <div className="text-xl font-black mt-0.5 flex items-baseline space-x-1.5">
              <span>{metrics.booleansTotal}</span>
              <span className="text-[11px] font-mono font-medium text-emerald-400">({metrics.booleansActive} ON)</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
            <ToggleRight className="h-4 w-4" />
          </div>
        </div>

        <div className={`rounded-xl border p-3 flex items-center justify-between ${cardBgClass}`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">Dynamic Values</span>
            <div className="text-xl font-black mt-0.5 flex items-baseline space-x-1.5">
              <span>{metrics.numbers + metrics.strings + metrics.jsons}</span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                ({metrics.numbers}# / {metrics.strings}txt)
              </span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Hash className="h-4 w-4" />
          </div>
        </div>

        <div className={`rounded-xl border p-3 flex items-center justify-between ${cardBgClass}`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">OTA Propagation</span>
            <div className="text-xl font-black mt-0.5 flex items-center space-x-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>&lt; 120ms</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Radio className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH & FILTER PILLS */}
      <div className={`rounded-2xl border p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 ${cardBgClass}`}>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by parameter key or description..."
            className={`w-full pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium border outline-none transition-all ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">Filter:</span>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-cyan-500 text-white font-bold shadow-sm shadow-cyan-500/20'
                : isDark
                ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({configs.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('boolean')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
              typeFilter === 'boolean'
                ? 'bg-violet-600 text-white font-bold shadow-sm shadow-violet-600/20'
                : isDark
                ? 'bg-slate-800/60 text-violet-400 hover:bg-slate-800'
                : 'bg-slate-100 text-violet-600 hover:bg-slate-200'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>Booleans ({metrics.booleansTotal})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('number')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
              typeFilter === 'number'
                ? 'bg-cyan-600 text-white font-bold shadow-sm shadow-cyan-600/20'
                : isDark
                ? 'bg-slate-800/60 text-cyan-400 hover:bg-slate-800'
                : 'bg-slate-100 text-cyan-600 hover:bg-slate-200'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Numbers ({metrics.numbers})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('string')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
              typeFilter === 'string'
                ? 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-600/20'
                : isDark
                ? 'bg-slate-800/60 text-amber-400 hover:bg-slate-800'
                : 'bg-slate-100 text-amber-600 hover:bg-slate-200'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Strings ({metrics.strings})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('json')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
              typeFilter === 'json'
                ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/20'
                : isDark
                ? 'bg-slate-800/60 text-emerald-400 hover:bg-slate-800'
                : 'bg-slate-100 text-emerald-600 hover:bg-slate-200'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>JSON ({metrics.jsons})</span>
          </button>
        </div>
      </div>

      {/* 4. PARAMETERS TABLE / CONSOLE */}
      <div className={`rounded-2xl border overflow-hidden ${cardBgClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800/80 bg-slate-950/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider">Parameter Key</th>
                <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider">Type</th>
                <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider">Active Runtime Value</th>
                <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider">Description</th>
                <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider">Last Modified</th>
                <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <SlidersHorizontal className="h-8 w-8 text-slate-600 stroke-[1.5]" />
                      <p className="font-semibold text-sm">No remote config parameters match your query</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('all');
                        }}
                        className="text-xs text-cyan-400 hover:underline cursor-pointer pt-1"
                      >
                        Reset search & filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((entry) => {
                  const initialEntry = initialConfigs.find((c) => c.key === entry.key);
                  const isModified = initialEntry && JSON.stringify(initialEntry.value) !== JSON.stringify(entry.value);

                  return (
                    <tr
                      key={entry.key}
                      className={`transition-colors ${
                        isModified
                          ? isDark
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'bg-amber-50/60 hover:bg-amber-50'
                          : isDark
                          ? 'hover:bg-slate-800/40'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Parameter Key */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-cyan-400 tracking-tight">{entry.key}</span>
                          <button
                            type="button"
                            onClick={() => copyKeyText(entry.key)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
                            title="Copy Parameter Key"
                          >
                            {copiedKey === entry.key ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                          {isModified && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              MODIFIED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data Type Badge */}
                      <td className="py-3 px-4">
                        {entry.type === 'boolean' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            <ToggleRight className="h-3 w-3" />
                            <span>boolean</span>
                          </span>
                        )}
                        {entry.type === 'number' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Hash className="h-3 w-3" />
                            <span>number</span>
                          </span>
                        )}
                        {entry.type === 'string' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Type className="h-3 w-3" />
                            <span>string</span>
                          </span>
                        )}
                        {entry.type === 'json' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Braces className="h-3 w-3" />
                            <span>json</span>
                          </span>
                        )}
                      </td>

                      {/* Active Runtime Value (Modern iOS Switch & Controls) */}
                      <td className="py-3 px-4">
                        {entry.type === 'boolean' && (
                          <div className="flex items-center space-x-2.5">
                            {/* Modern iOS-Style Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleBoolean(entry.key)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                entry.value ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-700'
                              }`}
                              role="switch"
                              aria-checked={Boolean(entry.value)}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  entry.value ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`font-mono text-xs font-bold ${
                                entry.value ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {entry.value ? 'true' : 'false'}
                            </span>
                          </div>
                        )}

                        {entry.type === 'number' && (
                          <div className="relative max-w-[140px]">
                            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="number"
                              value={Number(entry.value)}
                              onChange={(e) => handleValueChange(entry.key, e.target.value, 'number')}
                              className={`w-full pl-8 pr-2 py-1 rounded-lg border text-xs font-mono font-semibold transition-all outline-none ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800 text-cyan-300 focus:border-cyan-500/60'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                              }`}
                            />
                          </div>
                        )}

                        {entry.type === 'string' && (
                          <div className="relative max-w-[200px]">
                            <input
                              type="text"
                              value={String(entry.value)}
                              onChange={(e) => handleValueChange(entry.key, e.target.value, 'string')}
                              className={`w-full px-2.5 py-1 rounded-lg border text-xs font-mono transition-all outline-none ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800 text-amber-300 focus:border-amber-500/60'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                              }`}
                            />
                          </div>
                        )}

                        {entry.type === 'json' && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingJsonEntry({
                                key: entry.key,
                                jsonStr: JSON.stringify(entry.value, null, 2),
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                          >
                            <Braces className="h-3.5 w-3.5" />
                            <span>Edit Payload ({typeof entry.value === 'object' ? Object.keys(entry.value).length : 1} keys)</span>
                          </button>
                        )}
                      </td>

                      {/* Description */}
                      <td className={`py-3 px-4 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className="line-clamp-2 leading-relaxed">{entry.description || 'No description provided'}</span>
                      </td>

                      {/* Last Modified */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{formatRelativeTime(entry.updatedAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {deleteConfirmKey === entry.key ? (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.key)}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-500 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmKey(null)}
                              className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmKey(entry.key)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Parameter"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TABBED DEVELOPER SDK CONSOLE & LIVE PAYLOAD (Professional Code Box) */}
      <div className={`rounded-2xl border p-4 space-y-3 ${cardBgClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-800">
          <div className="flex items-center space-x-2">
            <Code2 className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Developer SDK Integration & Live API
            </span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Tabs */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveSdkTab('react-native')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeSdkTab === 'react-native'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>React Native</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSdkTab('curl')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeSdkTab === 'curl'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="h-3 w-3" />
                <span>cURL / REST</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSdkTab('node')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeSdkTab === 'node'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Server className="h-3 w-3" />
                <span>Node.js SDK</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSdkTab('json')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeSdkTab === 'json'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Braces className="h-3 w-3" />
                <span>Live JSON</span>
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => {
                const text =
                  activeSdkTab === 'react-native'
                    ? reactNativeCode
                    : activeSdkTab === 'curl'
                    ? curlCode
                    : activeSdkTab === 'node'
                    ? nodeCode
                    : jsonPayloadPreview;
                copyCodeSnippet(text);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all border border-slate-700"
            >
              {copiedSnippet ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Container */}
        <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 border border-slate-800/80 overflow-x-auto leading-relaxed shadow-inner">
          <pre className="text-cyan-300/90 whitespace-pre">
            {activeSdkTab === 'react-native' && reactNativeCode}
            {activeSdkTab === 'curl' && curlCode}
            {activeSdkTab === 'node' && nodeCode}
            {activeSdkTab === 'json' && jsonPayloadPreview}
          </pre>
        </div>
      </div>

      {/* 6. ADD PARAMETER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${cardBgClass} animate-in fade-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h3 className="text-base font-extrabold tracking-tight">Create Remote Parameter</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">Preset Template</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewType('boolean');
                    setNewVal('true');
                    if (!newKey) setNewKey('feature_new_flow_enabled');
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                    newType === 'boolean'
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <ToggleRight className="h-4 w-4 mx-auto mb-1 text-violet-400" />
                  <span>Toggle Flag</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewType('number');
                    setNewVal('50');
                    if (!newKey) setNewKey('max_retry_limit');
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                    newType === 'number'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <Hash className="h-4 w-4 mx-auto mb-1 text-cyan-400" />
                  <span>Number</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewType('string');
                    setNewVal('Welcome to CodePush');
                    if (!newKey) setNewKey('promo_banner_text');
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                    newType === 'string'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <Type className="h-4 w-4 mx-auto mb-1 text-amber-400" />
                  <span>Text String</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewType('json');
                    setNewVal('{\n  "v": "1.0",\n  "tier": "gold"\n}');
                    if (!newKey) setNewKey('user_tier_manifest');
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                    newType === 'json'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <Braces className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                  <span>JSON Payload</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddFlag} className="space-y-3.5 text-xs">
              {/* Key Name */}
              <div>
                <label className="block font-bold mb-1">
                  Parameter Key <span className="text-cyan-400">(snake_case)</span>
                </label>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => {
                    setNewKey(e.target.value);
                    setKeyError(null);
                  }}
                  placeholder="e.g. enable_dark_mode_v2"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {keyError && <p className="text-[11px] text-rose-400 font-semibold mt-1">{keyError}</p>}
              </div>

              {/* Data Type & Initial Value Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Data Type</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setNewType(t);
                      if (t === 'boolean') setNewVal('true');
                      else if (t === 'number') setNewVal('0');
                      else if (t === 'string') setNewVal('');
                      else if (t === 'json') setNewVal('{}');
                    }}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="boolean">Boolean (true/false)</option>
                    <option value="number">Number</option>
                    <option value="string">String</option>
                    <option value="json">JSON Object</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Initial Value</label>
                  {newType === 'boolean' ? (
                    <select
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="true">true (Active)</option>
                      <option value="false">false (Inactive)</option>
                    </select>
                  ) : newType === 'number' ? (
                    <input
                      type="number"
                      required
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  ) : newType === 'string' ? (
                    <input
                      type="text"
                      required
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      placeholder="Value string..."
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  ) : (
                    <textarea
                      rows={3}
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      placeholder="{}"
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold mb-1">Description / Purpose</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describes what feature or business rule this flag controls..."
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  Create Parameter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. JSON PAYLOAD EDITOR MODAL */}
      {editingJsonEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${cardBgClass} animate-in fade-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center space-x-2">
                <Braces className="h-4 w-4 text-emerald-400" />
                <h3 className="text-base font-extrabold tracking-tight font-mono text-emerald-400">
                  {editingJsonEntry.key}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingJsonEntry(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">JSON Object Structure</label>
              <textarea
                rows={8}
                value={editingJsonEntry.jsonStr}
                onChange={(e) => {
                  setEditingJsonEntry({ ...editingJsonEntry, jsonStr: e.target.value });
                  setJsonError(null);
                }}
                className={`w-full p-3 rounded-xl border font-mono text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800 text-emerald-300' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              {jsonError && <p className="text-xs text-rose-400 font-semibold mt-1">{jsonError}</p>}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingJsonEntry(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveJsonEdit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                Update JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteConfigScreen;
