import React from 'react';
import { Zap, Server, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">CodePush</span>
              <span className="bg-cyan-500/10 text-cyan-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20">
                Self-Hosted OTA
              </span>
            </div>
            <p className="text-xs text-slate-400">Netlify Serverless Infrastructure</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs text-slate-300">
            <Server className="h-3.5 w-3.5 text-emerald-400" />
            <span>Netlify Edge: <strong className="text-emerald-400 font-medium">Active</strong></span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>SHA256 Verified</span>
          </div>
        </div>
      </div>
    </header>
  );
};
