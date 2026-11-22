// Document
import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sliders,
  BellRing,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
  GitBranch,
  Search,
  CheckCircle2,
  Smartphone,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import type { Project } from '../../types';

interface DocumentationScreenProps {
  theme?: 'dark' | 'light';
  currentProject?: Project;
  onNavigateToIntegration?: () => void;
}

type SectionId =
  | 'overview'
  | 'lifecycle'
  | 'tracks'
  | 'rollouts'
  | 'safety'
  | 'rollback'
  | 'remote-config'
  | 'compatibility'
  | 'alerts'
  | 'glossary'
  | 'faq';

export interface SectionItem {
  num: string;
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

export interface CategoryGroup {
  label: string;
  items: SectionItem[];
}

export const DocumentationScreen: React.FC<DocumentationScreenProps> = ({
  theme = 'dark',
  currentProject,
  onNavigateToIntegration,
}) => {
  const isDark = theme === 'dark';
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Theme-aware typography & container tokens
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const textBodyClass = isDark ? 'text-slate-300' : 'text-slate-700';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBorderClass = isDark ? 'border-slate-800/80' : 'border-slate-200/90';

  const cardBgClass = isDark
    ? 'border-slate-800/80 bg-slate-900/85 text-slate-100 shadow-2xl backdrop-blur-2xl'
    : 'border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-slate-200/50 backdrop-blur-2xl';

  const subCardBgClass = isDark
    ? 'bg-slate-950/70 border-slate-800/80 text-slate-200'
    : 'bg-slate-50/90 border-slate-200/90 text-slate-800';

  const sectionCardClass = `p-5 sm:p-7 rounded-3xl border space-y-6 ${cardBgClass} min-h-[calc(100vh-6rem)] flex flex-col justify-between`;

  const situationBoxClass = isDark
    ? 'p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed'
    : 'p-4 rounded-xl bg-white border border-amber-200 text-xs text-slate-800 space-y-1.5 leading-relaxed shadow-xs';

  const scenarioCardClass = isDark
    ? 'p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-orange-950/30 border border-amber-500/30 space-y-4 shadow-xl shadow-amber-950/20'
    : 'p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 border border-amber-300/80 space-y-4 shadow-md shadow-amber-100/50';

  const withoutCodePushClass = isDark
    ? 'p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 text-slate-300'
    : 'p-4 rounded-xl bg-rose-50/90 border border-rose-200 space-y-2.5 text-slate-800';

  const withCodePushClass = isDark
    ? 'p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 text-slate-300'
    : 'p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2.5 text-slate-800';

  const impactBadgeClass = isDark
    ? 'p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between text-amber-300 font-medium'
    : 'p-3 rounded-xl bg-amber-100/70 border border-amber-300/80 text-xs flex items-center justify-between text-amber-900 font-medium';

  const categories: CategoryGroup[] = [
    {
      label: 'Core Concepts',
      items: [
        { num: '01', id: 'overview', title: 'Platform Overview', icon: BookOpen, desc: 'What is CodePush & how it works' },
        { num: '02', id: 'lifecycle', title: 'Update Lifecycle', icon: Layers, desc: '3 simple steps to release' },
        { num: '03', id: 'tracks', title: 'Staging vs Production', icon: GitBranch, desc: 'Private testing & safe releases' },
      ],
    },
    {
      label: 'Safety & Reliability',
      items: [
        { num: '04', id: 'rollouts', title: 'Canary Phased Rollouts', icon: Zap, desc: 'Gradual percentage cohorts' },
        { num: '05', id: 'safety', title: 'Boot Watchdog Guard', icon: ShieldCheck, desc: 'Self-healing crash recovery' },
        { num: '06', id: 'rollback', title: 'Rollback & Kill-Switch', icon: RotateCcw, desc: 'Instant emergency reversal' },
      ],
    },
    {
      label: 'Live Controls & Alerts',
      items: [
        { num: '07', id: 'remote-config', title: 'Remote Feature Flags', icon: Sliders, desc: 'Live toggles without code' },
        { num: '08', id: 'compatibility', title: 'Version Compatibility', icon: Smartphone, desc: 'Protecting older device binaries' },
        { num: '09', id: 'alerts', title: 'Slack & Discord Alerts', icon: BellRing, desc: 'Automated team notifications' },
      ],
    },
    {
      label: 'Reference & Help',
      items: [
        { num: '10', id: 'glossary', title: 'Plain-English Glossary', icon: Sparkles, desc: 'Definitions of all key terms' },
        { num: '11', id: 'faq', title: 'Frequently Asked Questions', icon: HelpCircle, desc: 'Direct answers to questions' },
      ],
    },
  ];

  const allSections: SectionItem[] = categories.flatMap((c) => c.items);

  const currentIndex = allSections.findIndex((s) => s.id === activeSection);
  const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
  const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;

  const handleSectionChange = (id: SectionId) => {
    setActiveSection(id);
    const mainElem = document.querySelector('main');
    if (mainElem) {
      mainElem.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto font-sans pb-1">
      {/* ======================================================== */}
      {/* TWO-COLUMN LAYOUT: PINNED STICKY SIDEBAR + CONTENT */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start relative">
        {/* ======================================================== */}
        {/* LEFT COLUMN: PINNED TOPIC NAVIGATION (Sticks during scroll) */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 lg:sticky lg:top-0 space-y-4 self-start">
          <div className={`p-4 rounded-3xl border ${cardBgClass} space-y-3.5 h-[calc(100vh-6rem)] flex flex-col shadow-2xl`}>
            {/* Header Title inside Sidebar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 dark:border-slate-800/60 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider block ${headingClass}`}>
                    Guide Topics
                  </span>
                  <span className={`text-[10px] ${textMutedClass} block`}>
                    Plain-English & Scenarios
                  </span>
                </div>
              </div>
              {currentProject?.name && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[10px] font-mono font-bold truncate max-w-[110px]">
                  {currentProject.name}
                </span>
              )}
            </div>

            {/* Search Input with Clear Button */}
            <div className="relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. rollback, safety)..."
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Categorized Topic List (Independently Scrollable) */}
            <nav className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar min-h-0">
              {categories.map((cat, idx) => {
                const filteredItems = cat.items.filter(
                  (s) =>
                    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.desc.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filteredItems.length === 0) return null;

                return (
                  <div key={cat.label} className="space-y-1.5">
                    <div className="px-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>{cat.label}</span>
                      <span className="text-slate-600 font-mono text-[9px]">{filteredItems.length}</span>
                    </div>

                    <div className="space-y-1">
                      {filteredItems.map((s) => {
                        const Icon = s.icon;
                        const isSelected = activeSection === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSectionChange(s.id)}
                            className={`w-full relative flex items-center space-x-3 px-3 py-2 rounded-2xl text-left transition-all cursor-pointer group ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-cyan-600 text-white font-extrabold shadow-lg shadow-indigo-600/30 scale-[1.01]'
                                : isDark
                                ? 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                                : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            {/* Active Accent Bar on Left */}
                            {isSelected && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-300 rounded-r-full shadow-sm shadow-cyan-400" />
                            )}

                            <div
                              className={`p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                                isSelected
                                  ? 'bg-white/20 text-white shadow-xs'
                                  : isDark
                                  ? 'bg-slate-800/90 text-slate-400 group-hover:text-cyan-400'
                                  : 'bg-slate-200 text-slate-600 group-hover:text-indigo-600'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="overflow-hidden flex-1">
                              <div className="flex items-center space-x-1.5">
                                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                                  {s.num}
                                </span>
                                <span className="text-xs font-bold truncate">{s.title}</span>
                              </div>
                              <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                {s.desc}
                              </div>
                            </div>

                            {isSelected && (
                              <ChevronRight className="h-3.5 w-3.5 text-white/70 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {idx < categories.length - 1 && (
                      <div className={`pt-2 border-b ${isDark ? 'border-slate-800/40' : 'border-slate-200/60'}`} />
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Bottom Developer Bridge */}
            {onNavigateToIntegration && (
              <div className={`pt-2.5 border-t shrink-0 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={onNavigateToIntegration}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 text-cyan-400 border border-cyan-500/25 text-xs font-bold transition-all cursor-pointer group shadow-sm"
                >
                  <div className="text-left">
                    <span className={`block font-bold text-xs ${headingClass}`}>Developer Portal</span>
                    <span className={`text-[10px] ${textMutedClass}`}>Code, SDKs & CLI setup</span>
                  </div>
                  <span className="text-[11px] underline flex items-center space-x-1 text-cyan-400">
                    <span>SDK Setup</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: RICH DOCUMENTATION CONTENT */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* ======================================================== */}
          {/* 1. PLATFORM OVERVIEW */}
          {/* ======================================================== */}
          {activeSection === 'overview' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                {/* SECTION HEADER */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
                      <BookOpen className="h-3 w-3" />
                      <span>01. Core Platform</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Over-The-Air (OTA) Updates
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-emerald-50 border-emerald-200'} border text-emerald-400 font-bold flex items-center space-x-1`}>
                      <Zap className="h-3 w-3" />
                      <span>Zero Review Delay</span>
                    </span>
                  </div>
                </div>

                {/* DEFINITION CARD */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-indigo-950/40 border-cyan-500/30 shadow-cyan-950/20' : 'bg-gradient-to-br from-cyan-50/80 via-white to-indigo-50/50 border-cyan-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-cyan-500 dark:text-cyan-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition (In Plain Words)</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    CodePush is a cloud delivery engine that upgrades or fixes your mobile app instantly over Wi-Fi and mobile data — completely bypassing the 2-to-4 day review delay of the Apple App Store and Google Play Store.
                  </p>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                    <span>Think of it like refreshing a website: the new code loads automatically when users open the app.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "QuickBite" Food Delivery Emergency</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Friday 7:00 PM Dinner Rush
                    </span>
                  </div>

                  {/* Scenario Background */}
                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      It's Friday evening at 7:00 PM — the peak dinner order rush of the entire week. The QuickBite engineering team deploys a minor layout tweak. Suddenly, customer support lines blow up: a currency formatting bug in the cart has locked the "Proceed to Checkout" button. Hungry customers cannot place orders.
                    </p>
                  </div>

                  {/* Contrast: The Old Way vs The CodePush Way */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Without CodePush */}
                    <div className={withoutCodePushClass}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-rose-500 dark:text-rose-400 text-xs flex items-center space-x-1.5">
                          <X className="h-4 w-4" />
                          <span>The Nightmare: Without CodePush</span>
                        </span>
                        <span className="text-[10px] text-rose-500 dark:text-rose-400 font-mono font-bold">36-48 Hours</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• Devs fix the bug in 5 minutes, but must compile a new APK & iOS build.</li>
                        <li>• The new build is submitted to Apple and Google for mandatory review.</li>
                        <li>• Apple review takes <strong>36 hours</strong>. Google takes <strong>18 hours</strong>.</li>
                        <li>• Friday and Saturday dinner sales are completely lost. Over <strong>$120,000</strong> in revenue is erased, and app rating drops from 4.8★ to 2.2★.</li>
                      </ul>
                    </div>

                    {/* With CodePush */}
                    <div className={withCodePushClass}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-500 dark:text-emerald-400 text-xs flex items-center space-x-1.5">
                          <Check className="h-4 w-4" />
                          <span>The Instant Fix: With CodePush</span>
                        </span>
                        <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-bold">45 Seconds</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• Dev fixes the currency formatting code at 7:04 PM.</li>
                        <li>• Dev clicks <strong>Publish</strong> to the Production track in the CodePush dashboard.</li>
                        <li>• Within <strong>45 seconds</strong>, edge servers distribute the 200 KB update worldwide.</li>
                        <li>• When hungry users open QuickBite, the checkout button works flawlessly. The weekend rush is saved with zero lost revenue.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Key Takeaway Badge */}
                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>Turned a multi-day company crisis into a 45-second non-event.</span>
                  </div>
                </div>

                {/* COMPARISON METRICS CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4.5 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                    <div className="font-bold text-rose-500 dark:text-rose-400 flex items-center space-x-1.5 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>App Store Review (Slow & Risky)</span>
                    </div>
                    <ul className={`space-y-1.5 ${textMutedClass} list-disc list-inside leading-relaxed`}>
                      <li>Requires 1 to 3 days manual review queue by store reviewers</li>
                      <li>Risk of arbitrary app store rejection or compliance delays</li>
                      <li>Users must manually open App Store and tap 'Update'</li>
                      <li>Takes 2 to 3 weeks to reach 80% user adoption</li>
                    </ul>
                    <div className="text-[11px] font-bold text-rose-500 dark:text-rose-400 pt-1 border-t border-rose-500/20">
                      Typical delay: 3 to 7 business days
                    </div>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                    <div className="font-bold text-emerald-500 dark:text-emerald-400 flex items-center space-x-1.5 text-sm">
                      <Zap className="h-4 w-4" />
                      <span>CodePush Cloud Updates (Instant)</span>
                    </div>
                    <ul className={`space-y-1.5 ${textMutedClass} list-disc list-inside leading-relaxed`}>
                      <li>100% compliant with Apple Guideline 3.3.2 & Google Play terms</li>
                      <li>Downloads silently in the background on app launch</li>
                      <li>No user friction: no App Store login or download wait</li>
                      <li>Reaches 95%+ of active daily users in under 10 minutes</li>
                    </ul>
                    <div className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 pt-1 border-t border-emerald-500/20">
                      Typical delay: Under 45 seconds live
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. UPDATE LIFECYCLE */}
          {/* ======================================================== */}
          {activeSection === 'lifecycle' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-wider">
                      <Layers className="h-3 w-3" />
                      <span>02. The Process</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      The 3-Step Release Journey
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-cyan-50 border-cyan-200'} border text-cyan-400 font-mono text-[11px] font-bold`}>
                    🚀 3 Simple Steps
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-cyan-950/40 border-indigo-500/30 shadow-indigo-950/20' : 'bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/50 border-indigo-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-indigo-500 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    The automated 3-step journey an update takes from the moment you click 'Publish' on your computer until it appears smoothly on customer devices worldwide.
                  </p>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                    <span>Think of it like publishing a news article: draft it, click publish, and readers see it immediately.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "StyleHub" 12:00 PM Flash Sale</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Marketing Flash Campaign
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      StyleHub is launching an exclusive 2-hour 50% flash sale banner at exactly 12:00 PM noon today. Customers need to see the banner the instant the clock strikes 12.
                    </p>
                  </div>

                  {/* 3 Steps in action */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-950/70 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-xs'} border space-y-2`}>
                      <div className="flex items-center space-x-2">
                        <span className="h-6 w-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center text-xs">
                          1
                        </span>
                        <span className={`font-bold ${headingClass} text-xs`}>11:45 AM: Package</span>
                      </div>
                      <p className={`${textBodyClass} leading-relaxed`}>
                        Developer creates the promotional banner in the React Native code. Running the bundle command takes <strong>15 seconds</strong> to generate the single bundle file.
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-950/70 border-cyan-500/30' : 'bg-white border-cyan-200 shadow-xs'} border space-y-2`}>
                      <div className="flex items-center space-x-2">
                        <span className="h-6 w-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold flex items-center justify-center text-xs">
                          2
                        </span>
                        <span className={`font-bold ${headingClass} text-xs`}>11:50 AM: Edge Push</span>
                      </div>
                      <p className={`${textBodyClass} leading-relaxed`}>
                        The team uploads the bundle file to CodePush. Netlify Edge replicates the release to 120+ server locations worldwide in <strong>3 seconds</strong>.
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-white border-emerald-200 shadow-xs'} border space-y-2`}>
                      <div className="flex items-center space-x-2">
                        <span className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-xs">
                          3
                        </span>
                        <span className={`font-bold ${headingClass} text-xs`}>12:00 PM: Silent Sync</span>
                      </div>
                      <p className={`${textBodyClass} leading-relaxed`}>
                        Customers open StyleHub at lunch. The app checks CodePush, silently downloads the 150 KB update in 1 second, and displays the 50% flash sale banner immediately!
                      </p>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>100% of customers saw the flash sale at 12:00 PM without needing an App Store update.</span>
                  </div>
                </div>

                {/* VISUAL STEPS FLOW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className={`p-4 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold">Step 1</span>
                    <div className={`font-bold text-sm ${headingClass}`}>Upload Bundle</div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Drop your bundle file into the dashboard. Tag it with the release notes and target version.
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">Step 2</span>
                    <div className={`font-bold text-sm ${headingClass}`}>Global Edge Cache</div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Files are distributed and cached at edge servers worldwide so devices download in milliseconds.
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">Step 3</span>
                    <div className={`font-bold text-sm ${headingClass}`}>Device Application</div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      The app checks for updates on startup or in the background and applies them seamlessly.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. STAGING VS PRODUCTION */}
          {/* ======================================================== */}
          {activeSection === 'tracks' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider">
                      <GitBranch className="h-3 w-3" />
                      <span>03. Safe Testing</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Staging vs Production Tracks
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-purple-50 border-purple-200'} border text-purple-400 font-mono text-[11px] font-bold`}>
                    🛡️ 1-Click Promote
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-indigo-950/40 border-purple-500/30 shadow-purple-950/20' : 'bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 border-purple-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-purple-500 dark:text-purple-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    A multi-track environment giving you a private 'practice room' (Staging) for your internal team to test on real phones before giving the update to real customers (Production).
                  </p>
                  <div className="text-[11px] text-purple-600 dark:text-purple-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-purple-500" />
                    <span>Think of it like a dress rehearsal backstage before opening the curtains to paying theater spectators.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "NeoBank" Fingerprint Login Redesign</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Fintech Security Critical
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      NeoBank developers redesigned the biometric Face ID and fingerprint login screen. For a bank, a login failure means users cannot access their funds, triggering severe regulatory scrutiny.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50/90 border-purple-200'} border space-y-2`}>
                      <div className="font-bold text-purple-500 dark:text-purple-400 text-xs flex items-center space-x-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Phase 1: The Staging Practice Room</span>
                      </div>
                      <ul className={`text-xs ${textBodyClass} space-y-1.5 leading-relaxed`}>
                        <li>• The release is uploaded to the <strong>Staging Track</strong>.</li>
                        <li>• Only Sarah (Lead QA) and 5 internal testers have test devices connected to Staging.</li>
                        <li>• During testing on an older Galaxy S10, Sarah notices the fingerprint scanner prompt fails to trigger.</li>
                        <li>• <strong>No real customers ever saw this bug!</strong></li>
                      </ul>
                    </div>

                    <div className={withCodePushClass}>
                      <div className="font-bold text-emerald-500 dark:text-emerald-400 text-xs flex items-center space-x-1.5">
                        <Zap className="h-4 w-4" />
                        <span>Phase 2: 1-Click Promote to Production</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• The dev patches the Samsung fingerprint glitch in 20 minutes on Staging.</li>
                        <li>• Sarah verifies all test devices log in smoothly.</li>
                        <li>• The Release Manager opens the dashboard and clicks <strong>"Promote to Production"</strong> with 1 click.</li>
                        <li>• 250,000 live banking customers get the verified, rock-solid update immediately.</li>
                      </ul>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>Zero public incidents. Internal testing shielded 250,000 customers from login errors.</span>
                  </div>
                </div>

                {/* TRACK CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4.5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold uppercase text-[10px]">
                      Staging Track
                    </span>
                    <div className={`font-bold text-sm ${headingClass}`}>Internal QA & Staff Only</div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Test builds are strictly quarantined. Real customers never see or download Staging updates. Perfect for end-to-end testing on physical iOS and Android hardware.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-bold uppercase text-[10px]">
                      Production Track
                    </span>
                    <div className={`font-bold text-sm ${headingClass}`}>Public Real-World Customers</div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Verified releases promoted to Production are distributed across all active customer devices worldwide with high availability and instant edge delivery.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. CANARY PHASED ROLLOUTS */}
          {/* ======================================================== */}
          {activeSection === 'rollouts' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
                      <Zap className="h-3 w-3" />
                      <span>04. Cohorts</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Canary Percentage Rollouts
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-cyan-50 border-cyan-200'} border text-cyan-400 font-mono text-[11px] font-bold`}>
                    5% → 25% → 50% → 100%
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-blue-950/40 border-cyan-500/30 shadow-cyan-950/20' : 'bg-gradient-to-br from-cyan-50/80 via-white to-blue-50/50 border-cyan-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-cyan-500 dark:text-cyan-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    Releasing an update to a small percentage of users first (like 5% or 25%) so you can verify there are zero crashes before releasing it to 100% of your audience.
                  </p>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                    <span>Think of it like testing the water with your toe before jumping into the deep end of a swimming pool.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "RidePulse" Taxi App with 500,000 Drivers</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Mission-Critical Navigation
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      RidePulse operates 500,000 drivers across 12 metropolitan cities. The team is releasing a brand-new GPS turn-by-turn navigation map. If this map crashes, 500,000 drivers are blinded on highways and thousands of passengers are stranded.
                    </p>
                  </div>

                  {/* Phased Roadmap */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className={`p-3.5 rounded-xl ${isDark ? 'bg-slate-950/80 border-cyan-500/30' : 'bg-white border-cyan-200 shadow-xs'} border space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-500 dark:text-cyan-400 uppercase text-[10px]">Cohort 1</span>
                        <span className="text-cyan-600 dark:text-cyan-300 font-black">5%</span>
                      </div>
                      <div className={`font-bold ${headingClass} text-xs`}>25,000 Drivers</div>
                      <p className={`${textMutedClass} text-[11px] leading-relaxed`}>
                        Deployed at 9 AM. Engineers monitor Crash Analytics. Crash rate is 0.00% for 2 hours.
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl ${isDark ? 'bg-slate-950/80 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-xs'} border space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-500 dark:text-indigo-400 uppercase text-[10px]">Cohort 2</span>
                        <span className="text-indigo-600 dark:text-indigo-300 font-black">25%</span>
                      </div>
                      <div className={`font-bold ${headingClass} text-xs`}>125,000 Drivers</div>
                      <p className={`${textMutedClass} text-[11px] leading-relaxed`}>
                        At 11 AM, slider moved to 25%. System health stays at 99.98% across diverse Android devices.
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl ${isDark ? 'bg-slate-950/80 border-purple-500/30' : 'bg-white border-purple-200 shadow-xs'} border space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-500 dark:text-purple-400 uppercase text-[10px]">Cohort 3</span>
                        <span className="text-purple-600 dark:text-purple-300 font-black">50%</span>
                      </div>
                      <div className={`font-bold ${headingClass} text-xs`}>250,000 Drivers</div>
                      <p className={`${textMutedClass} text-[11px] leading-relaxed`}>
                        At 1 PM, rollout expanded to 6 additional cities. Battery telemetry remains optimal.
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl ${isDark ? 'bg-slate-950/80 border-emerald-500/30' : 'bg-white border-emerald-200 shadow-xs'} border space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-500 dark:text-emerald-400 uppercase text-[10px]">Cohort 4</span>
                        <span className="text-emerald-600 dark:text-emerald-300 font-black">100%</span>
                      </div>
                      <div className={`font-bold ${headingClass} text-xs`}>All 500,000 Drivers</div>
                      <p className={`${textMutedClass} text-[11px] leading-relaxed`}>
                        At 4 PM, rollout increased to 100%. Entire driver network smoothly upgraded with zero disruption.
                      </p>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 The Safety Insurance:</span>
                    <span>If an unexpected bug had existed, only 5% of users would have seen it, shielding 475,000 drivers!</span>
                  </div>
                </div>

                {/* ROLLOUT PERCENTAGE VISUAL BAR */}
                <div className={`p-5 rounded-2xl border space-y-3 ${subCardBgClass}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${headingClass}`}>Canary Cohort Progression</span>
                    <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">Safety Multiplier: 95%</span>
                  </div>
                  <div className={`h-3 w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-full overflow-hidden flex`}>
                    <div className="w-[5%] bg-cyan-400 h-full" title="5% Stage 1" />
                    <div className="w-[20%] bg-indigo-500 h-full" title="25% Stage 2" />
                    <div className="w-[25%] bg-purple-500 h-full" title="50% Stage 3" />
                    <div className="w-[50%] bg-emerald-500 h-full" title="100% Full" />
                  </div>
                  <div className={`flex justify-between text-[10px] ${textMutedClass} font-mono`}>
                    <span>5% (Internal / Early)</span>
                    <span>25% (Early Adopters)</span>
                    <span>50% (General Audience)</span>
                    <span>100% (All Active Devices)</span>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. BOOT WATCHDOG GUARD */}
          {/* ======================================================== */}
          {activeSection === 'safety' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider">
                      <ShieldCheck className="h-3 w-3" />
                      <span>05. Self-Healing</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Boot Watchdog Crash Guard
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-rose-50 border-rose-200'} border text-rose-400 font-mono text-[11px] font-bold`}>
                    🛡️ 3-Strike Protection
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-red-950/40 border-rose-500/30 shadow-rose-950/20' : 'bg-gradient-to-br from-rose-50/80 via-white to-red-50/50 border-rose-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    An automatic bodyguard inside the user's phone that watches the app launch. If a faulty update crashes repeatedly on startup, the watchdog automatically throws away the bad update and restores the original working version.
                  </p>
                  <div className="text-[11px] text-rose-600 dark:text-rose-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-rose-500" />
                    <span>Think of it like an airplane autopilot that automatically pulls up and recovers if the plane enters unexpected turbulence.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "HealthSync" Telemedicine Crash Bug</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Patient App Lockout
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      A developer accidentally writes code that looks for a user's prescription ID on startup: <code className="text-amber-500 dark:text-amber-300 font-mono">user.prescriptionId.toUpperCase()</code>. For guest patients who haven't logged in yet, <code className="text-amber-500 dark:text-amber-300 font-mono">prescriptionId</code> is undefined. This causes an instant fatal crash the millisecond the app icon is tapped.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={withoutCodePushClass}>
                      <div className="font-bold text-rose-500 dark:text-rose-400 text-xs flex items-center space-x-1.5">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Without Watchdog: The Bricked App</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• Patient taps the app icon. Screen goes black and crashes immediately.</li>
                        <li>• Patient taps again. Crashes again.</li>
                        <li>• Patient cannot see their doctor's appointment or medicines.</li>
                        <li>• Frustrated, the patient deletes the app and leaves a scorching 1-star review on Google Play.</li>
                      </ul>
                    </div>

                    <div className={withCodePushClass}>
                      <div className="font-bold text-emerald-500 dark:text-emerald-400 text-xs flex items-center space-x-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>With Watchdog: Self-Healing in 3 Taps</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• Strike 1 & Strike 2: App crashes on launch; watchdog records startup failure counter in local phone storage.</li>
                        <li>• Strike 3: Watchdog detects 3 consecutive startup failures within 10 seconds.</li>
                        <li>• <strong>Self-Healing:</strong> Watchdog deletes the broken update and reboots to the clean factory version.</li>
                        <li>• On the 4th launch, the app opens smoothly. Patient attends their doctor visit without issue!</li>
                      </ul>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-100/70 border-emerald-300 text-emerald-900'} border text-xs flex items-center justify-between font-bold`}>
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Ironclad Guarantee:</span>
                    </span>
                    <span>An Over-The-Air update can NEVER permanently brick or disable your mobile app.</span>
                  </div>
                </div>

                {/* 3-STRIKE FLOW DIAGRAM */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <span className={`font-bold ${headingClass} text-xs`}>Strike 1 & 2: Detection</span>
                    </div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Local device storage monitors time between app launch and UI render. If app dies before 5 seconds, strike counter increments.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 rounded-full bg-rose-500/20 text-rose-500 dark:text-rose-400 font-bold flex items-center justify-center text-xs">
                        2
                      </span>
                      <span className={`font-bold ${headingClass} text-xs`}>Strike 3: Emergency Purge</span>
                    </div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Upon reaching 3 failed attempts, the Watchdog marks the bundle as corrupt and purges it from device memory.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                        3
                      </span>
                      <span className={`font-bold ${headingClass} text-xs`}>Instant Recovery</span>
                    </div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      The app launches using the base factory binary. A crash diagnostic is dispatched to your CodePush dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. ROLLBACK & KILL-SWITCH */}
          {/* ======================================================== */}
          {activeSection === 'rollback' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                      <RotateCcw className="h-3 w-3" />
                      <span>06. Emergency Controls</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      1-Click Rollback & Instant Kill-Switch
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-amber-50 border-amber-200'} border text-amber-400 font-mono text-[11px] font-bold`}>
                    ⚡ Revert in &lt; 5s
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-yellow-950/40 border-amber-500/30 shadow-amber-950/20' : 'bg-gradient-to-br from-amber-50/80 via-white to-yellow-50/50 border-amber-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    A time-machine button in your dashboard that reverts your live app back to an earlier working version in 5 seconds, plus a red emergency kill-switch to cancel a bad release worldwide in 1 second.
                  </p>
                  <div className="text-[11px] text-amber-600 dark:text-amber-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    <span>Think of it like an instant "Undo" (Ctrl+Z) for your entire mobile application across the globe.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "FitTrack" Free-Tier Subscription Leak</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Revenue Leakage Emergency
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      FitTrack releases version 2.8 at 2:00 PM. Due to a boolean inversion bug in the paywall logic (<code className="text-amber-500 dark:text-amber-300 font-mono">isPremium = !user.hasPaid</code>), all non-paying free users are mistakenly granted unlimited access to paid workouts without being charged. The finance team reports $15,000 in lost renewal transactions within 20 minutes!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50/90 border-amber-200'} border space-y-2`}>
                      <div className="font-bold text-amber-500 dark:text-amber-400 text-xs flex items-center space-x-1.5">
                        <RotateCcw className="h-4 w-4" />
                        <span>Option A: 1-Click Rollback</span>
                      </div>
                      <ul className={`text-xs ${textBodyClass} space-y-1.5 leading-relaxed`}>
                        <li>• The Product Manager opens the <strong>Release History</strong> tab in CodePush.</li>
                        <li>• Finds version 2.7 (which was rock-solid and verified yesterday).</li>
                        <li>• Clicks the <strong>"Rollback"</strong> button.</li>
                        <li>• Within 3 seconds, all user devices revert to v2.7 on their next launch.</li>
                      </ul>
                    </div>

                    <div className={withoutCodePushClass}>
                      <div className="font-bold text-rose-500 dark:text-rose-400 text-xs flex items-center space-x-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Option B: Instant Kill-Switch (Revoke)</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• In catastrophic cases, click <strong>"Kill-Switch"</strong> to revoke v2.8 immediately.</li>
                        <li>• Edge servers tell all phones globally to discard v2.8 instantly.</li>
                        <li>• Devices fall back to the safe base version on next launch.</li>
                        <li>• Revenue leak plugged in under 60 seconds without writing a line of code!</li>
                      </ul>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>Restored financial security in 45 seconds instead of waiting 3 days for App Store re-review.</span>
                  </div>
                </div>

                {/* COMPARISON CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4.5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <div className="font-bold text-amber-500 dark:text-amber-400 text-sm flex items-center space-x-1.5">
                      <RotateCcw className="h-4 w-4" />
                      <span>1-Click Rollback</span>
                    </div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Switches the active update channel back to any previous version. All devices smoothly adopt the older stable code. No build required.
                    </p>
                  </div>
                  <div className={`p-4.5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <div className="font-bold text-rose-500 dark:text-rose-400 text-sm flex items-center space-x-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Instant Kill-Switch (Revoke)</span>
                    </div>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Commands all mobile devices worldwide to immediately discard the current release and fall back to the base APK or earlier release.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. REMOTE CONFIG & FEATURE FLAGS */}
          {/* ======================================================== */}
          {activeSection === 'remote-config' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                      <Sliders className="h-3 w-3" />
                      <span>07. Live Toggles</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Remote Config & Feature Flags
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-emerald-50 border-emerald-200'} border text-emerald-400 font-mono text-[11px] font-bold`}>
                    🎛️ Real-Time Toggles
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/40 border-emerald-500/30 shadow-emerald-950/20' : 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 border-emerald-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-emerald-500 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    Live on/off switches and text settings in your dashboard that let you change app behavior, promo banners, or turn off broken features instantly without modifying or deploying any code.
                  </p>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>Think of it like an electrical circuit breaker box in your house: flip a switch to turn power off to one room without touching the walls.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "PaySwift" Payment Gateway Outage</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Third-Party Outage
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      On Saturday afternoon, a major third-party payment partner (e.g. PayPal or Stripe) suffers an unexpected global outage. Customers attempting to pay with this gateway see indefinite spinning wheels and errors.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={withCodePushClass}>
                      <div className="font-bold text-emerald-500 dark:text-emerald-400 text-xs flex items-center space-x-1.5">
                        <Sliders className="h-4 w-4" />
                        <span>Use Case 1: The Emergency Kill-Toggle</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• Support informs the team that the third-party gateway is down.</li>
                        <li>• In the Remote Config tab, the team flips <code className="text-emerald-500 dark:text-emerald-400 font-mono">enable_paypal</code> from <strong>ON</strong> to <strong>OFF</strong>.</li>
                        <li>• In less than 1 second, all mobile apps hide the broken button and guide users to Credit Card or Apple Pay.</li>
                        <li>• Not a single customer checkout is blocked!</li>
                      </ul>
                    </div>

                    <div className={`p-4 rounded-xl ${isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50/90 border-indigo-200'} border space-y-2`}>
                      <div className="font-bold text-indigo-500 dark:text-indigo-400 text-xs flex items-center space-x-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>Use Case 2: Midnight Flash Promo Banner</span>
                      </div>
                      <ul className={`text-xs ${textBodyClass} space-y-1.5 leading-relaxed`}>
                        <li>• It's New Year's Eve at 11:59 PM. Marketing wants to trigger a 30% discount.</li>
                        <li>• They update <code className="text-indigo-500 dark:text-indigo-300 font-mono">banner_text</code>: "🎉 Happy New Year! 30% Off All Orders".</li>
                        <li>• They change <code className="text-indigo-500 dark:text-indigo-300 font-mono">discount_rate</code> from 0 to 30.</li>
                        <li>• At 12:00:01 AM, every customer opening the app sees the celebratory banner instantly.</li>
                      </ul>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>Non-technical marketing and ops teams can change app behavior safely without needing a developer deployment.</span>
                  </div>
                </div>

                {/* 3 POPULAR CONFIG TEMPLATES */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div className={`p-4 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="font-bold text-cyan-500 dark:text-cyan-400 text-sm">Feature Kill-Toggles</span>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Disable a broken screen or payment gateway in 1 second by toggling a flag in the dashboard.
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="font-bold text-indigo-500 dark:text-indigo-400 text-sm">Marketing Banners</span>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Update promotion text or holiday discounts live without needing a developer to re-deploy.
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <span className="font-bold text-purple-500 dark:text-purple-400 text-sm">Maintenance Mode</span>
                    <p className={`${textMutedClass} leading-relaxed`}>
                      Show a friendly maintenance notice to users while your backend server is undergoing an upgrade.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 8. VERSION COMPATIBILITY */}
          {/* ======================================================== */}
          {activeSection === 'compatibility' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-wider">
                      <Smartphone className="h-3 w-3" />
                      <span>08. Binary Safety</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Semantic Version Compatibility
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-indigo-50 border-indigo-200'} border text-indigo-400 font-mono text-[11px] font-bold`}>
                    targetBinaryVersion
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-blue-950/40 border-indigo-500/30 shadow-indigo-950/20' : 'bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border-indigo-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-indigo-500 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    A safety rule ensuring that new JavaScript updates are only given to phones that have the matching native app installed, preventing older phones from crashing.
                  </p>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                    <span>Think of it like trying to plug a modern USB-C cable into an old phone with Micro-USB: the system checks the connector first so nothing breaks.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "UrbanCargo" Barcode Scanner Upgrade</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Native Camera Driver Conflict
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      UrbanCargo delivery app introduces a high-speed QR barcode scanner for warehouse workers. This scanner requires a brand-new native C++ camera driver that was compiled into native app version 3.0.0 on Google Play.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={withoutCodePushClass}>
                      <div className="font-bold text-rose-500 dark:text-rose-400 text-xs flex items-center space-x-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        <span>The Trap (Without Version Targeting)</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• 30,000 couriers haven't updated their phone from Google Play in 4 months and are still on native app version 2.4.</li>
                        <li>• If they downloaded the new JavaScript code, their app would crash immediately with: <code className="text-rose-500 dark:text-rose-400 font-mono">Native module NativeCameraScanner is null</code>.</li>
                        <li>• Couriers would be stranded in warehouses unable to scan packages.</li>
                      </ul>
                    </div>

                    <div className={withCodePushClass}>
                      <div className="font-bold text-emerald-500 dark:text-emerald-400 text-xs flex items-center space-x-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>The Solution: targetBinaryVersion</span>
                      </div>
                      <ul className="text-xs space-y-1.5 leading-relaxed">
                        <li>• In the CodePush release, the engineer sets: <code className="text-emerald-500 dark:text-emerald-400 font-mono">targetBinaryVersion: &gt;=3.0.0</code>.</li>
                        <li>• Couriers with native app 3.0+ receive the OTA update immediately.</li>
                        <li>• Couriers on older app 2.4 are safely ignored by CodePush. Their older stable screens continue working perfectly with zero crashes!</li>
                      </ul>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>Protects legacy customer phones from crashing when your app introduces new native device capabilities.</span>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 9. SLACK & DISCORD ALERTS */}
          {/* ======================================================== */}
          {activeSection === 'alerts' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                      <BellRing className="h-3 w-3" />
                      <span>09. Collaboration</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Slack & Discord Automated Alerts
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-amber-50 border-amber-200'} border text-amber-400 font-mono text-[11px] font-bold`}>
                    🔔 Real-Time Webhooks
                  </span>
                </div>

                {/* DEFINITION */}
                <div className={`p-5 sm:p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-yellow-950/40 border-amber-500/30 shadow-amber-950/20' : 'bg-gradient-to-br from-amber-50/80 via-white to-yellow-50/50 border-amber-300 shadow-slate-200/50'} border space-y-2.5 shadow-xl`}>
                  <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>The Simple Definition</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'} leading-relaxed`}>
                    An automated bot that sends a clear message into your team's Slack or Discord channel whenever an update is published, promoted to production, or rolled back.
                  </p>
                  <div className="text-[11px] text-amber-600 dark:text-amber-300/80 pt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    <span>Think of it like an airport flight status screen that keeps gate agents, pilots, and baggage crew in sync automatically.</span>
                  </div>
                </div>

                {/* DETAILED REAL-TIME SCENARIO */}
                <div className={scenarioCardClass}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                      <Activity className="h-4 w-4" />
                      <span>Real-Time Example: The "StreamFlix" Cross-Department Coordination</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Slack Transparency
                    </span>
                  </div>

                  <div className={situationBoxClass}>
                    <strong className="text-amber-500 dark:text-amber-300 block font-bold text-sm">🎭 The Situation:</strong>
                    <p>
                      The mobile engineering team deploys a fix for video buffering on Android 14 devices. In traditional setups, customer support and marketing have no idea this fix went live.
                    </p>
                  </div>

                  {/* SLACK MESSAGE CARD PREVIEW */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-950 border-indigo-500/30' : 'bg-slate-100 border-indigo-200'} border space-y-3 font-sans`}>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span className={`font-bold ${headingClass}`}>CodePush Bot</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">APP</span>
                      <span className="text-[11px]">Today at 6:02 PM</span>
                    </div>
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white shadow-xs'} border-l-4 border-emerald-500 space-y-1.5 text-xs ${textBodyClass}`}>
                      <div className={`font-bold ${headingClass} flex items-center space-x-2`}>
                        <span>🚀 New Android Release Deployed to Production</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">v4.2.1</span>
                      </div>
                      <p className={`${textMutedClass} text-[11px]`}>
                        <strong>Deployer:</strong> Alex Chen (Lead Mobile Dev)<br />
                        <strong>Changelog:</strong> Resolved HLS video buffering latency by 40% on Android 14.<br />
                        <strong>Canary Rollout:</strong> 10% Initial Cohort
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} border space-y-1`}>
                      <span className="font-bold text-cyan-500 dark:text-cyan-400">Customer Support</span>
                      <p className={`${textMutedClass} text-[11px]`}>Instantly knows buffering complaints can be marked resolved.</p>
                    </div>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} border space-y-1`}>
                      <span className="font-bold text-indigo-500 dark:text-indigo-400">QA Team</span>
                      <p className={`${textMutedClass} text-[11px]`}>Knows the live version to verify in production test phones.</p>
                    </div>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} border space-y-1`}>
                      <span className="font-bold text-purple-500 dark:text-purple-400">Marketing Team</span>
                      <p className={`${textMutedClass} text-[11px]`}>Confirms app is stable before launching major ad campaigns.</p>
                    </div>
                  </div>

                  <div className={impactBadgeClass}>
                    <span className="font-bold">💡 Business Impact:</span>
                    <span>100% company-wide visibility with zero manual status meetings or email updates.</span>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 10. GLOSSARY */}
          {/* ======================================================== */}
          {activeSection === 'glossary' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      <span>10. Dictionary</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Plain-English Glossary
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-cyan-50 border-cyan-200'} border text-cyan-400 font-mono text-[11px] font-bold`}>
                    📖 10 Key Concepts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-cyan-500 dark:text-cyan-400 text-sm flex items-center space-x-1.5">
                      <span>OTA (Over-The-Air)</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      Updating the mobile app directly through the internet without requiring users to download a new app build from Google Play or the Apple App Store.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-indigo-500 dark:text-indigo-400 text-sm flex items-center space-x-1.5">
                      <span>JavaScript Bundle</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      The packaged code file containing all your application screens, buttons, navigation flows, business rules, and UI designs.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-emerald-500 dark:text-emerald-400 text-sm flex items-center space-x-1.5">
                      <span>Staging Track</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      A private testing lane reserved for your internal QA team to test new updates on real physical phones before public release.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-purple-500 dark:text-purple-400 text-sm flex items-center space-x-1.5">
                      <span>Production Track</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      The live public environment where verified releases are distributed to all active customer devices worldwide.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-amber-500 dark:text-amber-400 text-sm flex items-center space-x-1.5">
                      <span>Canary Rollout</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      Gradually exposing an update to a small cohort (e.g. 5% or 25%) first to ensure rock-solid stability before releasing to 100%.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-rose-500 dark:text-rose-400 text-sm flex items-center space-x-1.5">
                      <span>Boot Watchdog</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      An automated safety guard on user devices. If a faulty update crashes 3 times on launch, it automatically throws away the update and restores the original working version.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-amber-500 dark:text-amber-400 text-sm flex items-center space-x-1.5">
                      <span>1-Click Rollback</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      A dashboard button that instantly tells all devices worldwide to discard a buggy release and revert to the previous working version.
                    </p>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-1.5 ${subCardBgClass}`}>
                    <div className="font-bold text-teal-500 dark:text-teal-400 text-sm flex items-center space-x-1.5">
                      <span>Remote Config</span>
                    </div>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      Live switches and text values in your dashboard that let you change app behavior or turn off features without updating code.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 11. FAQ */}
          {/* ======================================================== */}
          {activeSection === 'faq' && (
            <div className={sectionCardClass}>
              <div className="space-y-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${cardBorderClass} pb-4`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
                      <HelpCircle className="h-3 w-3" />
                      <span>11. Questions & Answers</span>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${headingClass}`}>
                      Frequently Asked Questions
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-xl ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-emerald-50 border-emerald-200'} border text-emerald-400 font-mono text-[11px] font-bold`}>
                    💡 Everything You Need to Know
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className={`p-5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <h4 className={`font-bold text-sm ${headingClass} flex items-center space-x-2`}>
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>Does Apple allow Over-The-Air updates in the App Store?</span>
                    </h4>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      <strong>Yes, 100%.</strong> Apple Developer Program License Agreement (Section 3.3.2) explicitly permits JavaScript code updates over the air as long as the updates do not alter the primary purpose or intent of the app as originally submitted. Major global applications (Facebook, Discord, Uber, Coinbase) use OTA updates daily.
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <h4 className={`font-bold text-sm ${headingClass} flex items-center space-x-2`}>
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span>Do our customers need to open Google Play or App Store to update?</span>
                    </h4>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      <strong>No.</strong> That is the fundamental benefit of CodePush. The app checks for new updates in the cloud and downloads them silently in the background while the user is using the app or upon the next launch. The user does not have to visit any store or tap any update button.
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <h4 className={`font-bold text-sm ${headingClass} flex items-center space-x-2`}>
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      <span>What happens if a customer has no internet connection?</span>
                    </h4>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      The app continues to run perfectly on its locally cached bundle. CodePush updates are cached directly in the phone's storage. When an internet connection returns, the app checks the cloud in the background and seamlessly downloads the latest release.
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <h4 className={`font-bold text-sm ${headingClass} flex items-center space-x-2`}>
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span>What if an update has an unexpected bug that crashes the app?</span>
                    </h4>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      You have two layers of total protection:
                      <br />
                      1. <strong>Boot Watchdog (Automated):</strong> If an update crashes 3 times on startup, the phone automatically discards the update and restores the original working version.
                      <br />
                      2. <strong>1-Click Rollback (Manual):</strong> You can click "Rollback" in your dashboard to revert all devices worldwide in under 5 seconds.
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-2 ${subCardBgClass}`}>
                    <h4 className={`font-bold text-sm ${headingClass} flex items-center space-x-2`}>
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>Can CodePush change native features like camera permissions or the app icon?</span>
                    </h4>
                    <p className={`${textBodyClass} leading-relaxed`}>
                      <strong>No.</strong> OTA updates can modify everything inside your JavaScript bundle: all user screens, buttons, navigation, checkout flows, images, and text. However, native device features like new app icons, splash screens, or new camera/Bluetooth permissions require a traditional App Store / Play Store binary update.
                    </p>
                  </div>
                </div>
              </div>

              {/* COMPACT FOOTER NAVIGATION */}
              <TopicFooterNav
                prevSection={prevSection}
                nextSection={nextSection}
                onSelect={(id) => handleSectionChange(id)}
                onNavigateToIntegration={onNavigateToIntegration}
                isDark={isDark}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========================================================
// HELPER COMPONENT: TOPIC FOOTER NAVIGATION (COMPACT SLEEK)
// ========================================================
interface TopicFooterNavProps {
  prevSection: SectionItem | null;
  nextSection: SectionItem | null;
  onSelect: (id: SectionId) => void;
  onNavigateToIntegration?: () => void;
  isDark?: boolean;
}

const TopicFooterNav: React.FC<TopicFooterNavProps> = ({
  prevSection,
  nextSection,
  onSelect,
  onNavigateToIntegration,
  isDark = true,
}) => {
  return (
    <div className={`pt-3.5 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'} mt-auto`}>
      {/* Sleek Small Next / Previous Navigation Buttons */}
      <div className="flex items-center justify-between gap-2">
        {prevSection ? (
          <button
            type="button"
            onClick={() => onSelect(prevSection.id)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 group ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5 text-indigo-400 transition-transform group-hover:-translate-x-0.5" />
            <span className="truncate max-w-[130px] sm:max-w-[200px]">Prev: {prevSection.title}</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-500 font-mono font-medium px-1">
            01 / 11
          </span>
        )}

        {nextSection ? (
          <button
            type="button"
            onClick={() => onSelect(nextSection.id)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 transition-all duration-150 cursor-pointer active:scale-95 ml-auto border border-indigo-400/30 group"
          >
            <span className="truncate max-w-[130px] sm:max-w-[200px]">Next: {nextSection.title}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : onNavigateToIntegration ? (
          <button
            type="button"
            onClick={onNavigateToIntegration}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 transition-all duration-150 cursor-pointer active:scale-95 ml-auto border border-indigo-400/30 group"
          >
            <span>SDK Setup</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default DocumentationScreen;
