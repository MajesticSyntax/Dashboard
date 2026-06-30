import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Layout, Settings as SettingsIcon, Sliders, Type, Grid, Box, Download, Upload, Trash2, Shield, Lock, Database, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useImportExport } from '../hooks/useImportExport';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('Interface');
  const { settings, setSettings, isUnlocked, setIsUnlocked } = useStore();
  const { exportData, importData } = useImportExport();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security & Storage states
  const [isPersisted, setIsPersisted] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ used: string; total: string } | null>(null);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isVerifyingToDisable, setIsVerifyingToDisable] = useState(false);

  useEffect(() => {
    if (navigator.storage) {
      navigator.storage.persisted().then(persisted => {
        setIsPersisted(persisted);
      });
      navigator.storage.estimate().then(estimate => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
          const totalGB = (estimate.quota / (1024 * 1024 * 1024)).toFixed(1);
          setStorageEstimate({ used: `${usedMB} MB`, total: `${totalGB} GB` });
        }
      });
    }
  }, [activeTab]);

  const handleRequestPersistence = async () => {
    setSecurityError('');
    setSecuritySuccess('');
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        setIsPersisted(granted);
        if (granted) {
          setSecuritySuccess('Device granted storage persistence successfully!');
        } else {
          setSecurityError('Device denied persistence request. Try bookmarking the app.');
        }
      } catch (err) {
        setSecurityError('Failed to request device persistence.');
        console.error(err);
      }
    }
  };

  const handleTogglePin = () => {
    setSecurityError('');
    setSecuritySuccess('');
    if (settings.pinEnabled) {
      setIsVerifyingToDisable(true);
      setPinInput('');
    } else {
      setIsSettingPin(true);
      setPinInput('');
      setPinConfirmInput('');
    }
  };

  const handleSavePin = () => {
    setSecurityError('');
    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      setSecurityError('PIN must be exactly 4 numeric digits.');
      return;
    }
    if (pinInput !== pinConfirmInput) {
      setSecurityError('PINs do not match.');
      return;
    }
    setSettings({ pinEnabled: true, pinCode: pinInput });
    setIsUnlocked(true); // Keep unlocked after setting
    setIsSettingPin(false);
    setPinInput('');
    setPinConfirmInput('');
    setSecuritySuccess('Security PIN enabled successfully!');
  };

  const handleDisablePin = () => {
    setSecurityError('');
    if (pinInput === settings.pinCode) {
      setSettings({ pinEnabled: false, pinCode: '' });
      setIsUnlocked(true); // Ensure unlocked
      setIsVerifyingToDisable(false);
      setPinInput('');
      setSecuritySuccess('Security PIN deactivated.');
    } else {
      setSecurityError('Incorrect PIN.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importData(file);
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      onClose();
    }
  };

  useEffect(() => {
    if (resetConfirm) {
      const timer = setTimeout(() => setResetConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [resetConfirm]);

  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }

    try {
      // 1. Clear database (all nodes and usage counts)
      await db.websites.clear();
      
      // 2. Clear application storage (Settings, Profile, PIN, etc)
      localStorage.clear();
      
      // 3. Force reload to re-seed with default values (Nebula theme, 0 usage)
      window.location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset. Please clear your browser cache manually.');
    }
  };

  const themes = [
    { id: 'minimal', label: 'Eclipse', colors: ['#050505', '#1a1a1a'], nodeColor: '#9ca3af', accentColor: '#522C5D' },
    { id: 'glass', label: 'Cosmos', colors: ['#000814', '#001d3d'], nodeColor: '#3b82f6', accentColor: '#3b82f6' },
    { id: 'nebula', label: 'Nebula', colors: ['#0f0a1a', '#1a142e'], nodeColor: '#c084fc', accentColor: '#c084fc' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-end z-[100] p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 pointer-events-auto"
          />
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="w-[350px] glass-dark rounded-[16px] border-dotted border-[5.8px] border-white/10 shadow-2xl relative overflow-hidden flex h-[80vh] mr-4 z-10 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="w-[115px] border-r border-white/5 p-4 bg-white/[0.03] backdrop-blur-md">
               <div className="flex items-center gap-2 mb-8">
                  <SettingsIcon className="w-3.5 h-3.5 text-blue-400" />
                  <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 font-sans">System</h2>
               </div>
               
               <div className="space-y-1">
                 {['Interface', 'Graphics', 'Security', 'Data'].map((tab) => (
                   <button 
                     key={tab}
                     onClick={() => setActiveTab(tab as any)}
                     className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold tracking-tight transition-all ${
                       activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white/95'
                     }`}
                   >
                     {tab}
                   </button>
                 ))}
               </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scroll-smooth border-0 p-5 bg-white/[0.01]">
              <div className="flex justify-end mb-2">
                <button 
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/55 hover:text-white transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

               <div className="space-y-6 pb-6">
                {activeTab === 'Interface' && (
                  <>
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">Visual Style</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {themes.map(t => (
                          <button
                            key={t.id}
                            onClick={async () => {
                              setSettings({ 
                                theme: t.id as any,
                                backgroundColor: t.colors[0],
                                nodeColor: t.nodeColor,
                                accentColor: t.accentColor
                              });
                              try {
                                await db.websites.toCollection().modify({ color: t.nodeColor });
                                queryClient.invalidateQueries({ queryKey: ['websites'] });
                              } catch (err) {
                                console.error("Failed to update website colors on theme change:", err);
                              }
                            }}
                            className={`p-2.5 rounded-xl border backdrop-blur-sm transition-all ${
                              settings.theme === t.id 
                                ? t.id === 'minimal' ? 'border-[#522C5D]/50 bg-white/10 ring-1 ring-[#522C5D]/30' : 'border-blue-500/50 bg-white/10' 
                                : t.id === 'minimal' ? 'border-white/5 bg-white/5 hover:border-[#522C5D]/40 hover:bg-[#522C5D]/5 text-white/90' : 'border-white/5 bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex gap-1 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors[0] }} />
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                            </div>
                            <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Canvas Background Color Picker */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">Canvas Background</h3>
                      </div>

                      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-xl p-3.5 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-white/85 uppercase tracking-wider">Custom Color</span>
                          <span className="text-[10px] font-mono text-blue-400 font-bold">{settings.backgroundColor.toUpperCase()}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: settings.backgroundColor }}>
                            <input 
                              type="color"
                              value={settings.backgroundColor.startsWith('#') && settings.backgroundColor.length === 7 ? settings.backgroundColor : '#050505'}
                              onChange={(e) => setSettings({ backgroundColor: e.target.value })}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            {/* Visual Indicator of clickability */}
                            <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40 pointer-events-none flex items-center justify-center">
                              <span className="text-[9px] text-white font-extrabold">+</span>
                            </div>
                          </div>

                          <div className="flex-1 space-y-1">
                            <input 
                              type="text"
                              value={settings.backgroundColor}
                              onChange={(e) => setSettings({ backgroundColor: e.target.value })}
                              placeholder="#050505"
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                            />
                            <p className="text-[9px] text-white/50 leading-tight">Adjust background tone. Nodes and theme colors remain unaffected.</p>
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="space-y-1.5 pt-1 border-t border-white/[0.03]">
                          <span className="text-[9px] text-white/40 uppercase tracking-wider font-extrabold block mb-1">Canvas Presets</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Void', color: '#000000' },
                              { label: 'Obsidian', color: '#050505' },
                              { label: 'Midnight', color: '#0a0f1d' },
                              { label: 'Abyss', color: '#000814' },
                              { label: 'Forest', color: '#02120e' },
                              { label: 'Wine', color: '#160205' },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                onClick={() => setSettings({ backgroundColor: preset.color })}
                                className={`px-2 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase transition-all flex items-center gap-1.5 ${
                                  settings.backgroundColor.toLowerCase() === preset.color.toLowerCase() 
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                    : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: preset.color }} />
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Node Aesthetics */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">Node Style</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                          onClick={() => setSettings({ glowingNodes: true })}
                          className={`p-3.5 rounded-xl border backdrop-blur-sm transition-all flex flex-col items-center gap-2 ${
                            settings.glowingNodes ? 'border-blue-500/50 bg-white/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                          </div>
                          <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">Glowing</span>
                        </button>

                         <button
                          onClick={() => setSettings({ glowingNodes: false })}
                          className={`p-3.5 rounded-xl border backdrop-blur-sm transition-all flex flex-col items-center gap-2 ${
                            !settings.glowingNodes ? 'border-blue-500/50 bg-white/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                          </div>
                          <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">Minimal</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-extrabold text-white/85 uppercase tracking-wider">Intensity</span>
                            <span className="text-[10px] font-mono text-blue-400">{settings.glowStrength}</span>
                          </div>
                          <input 
                            type="range" min="0" max="30" step="1"
                            value={settings.glowStrength}
                            onChange={(e) => setSettings({ glowStrength: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500 bg-white/5 rounded-full h-1 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-extrabold text-white/85 uppercase tracking-wider">Scale</span>
                            <span className="text-[10px] font-mono text-blue-400">{settings.nodeSize}x</span>
                          </div>
                          <input 
                            type="range" min="1" max="10" step="0.5"
                            value={settings.nodeSize}
                            onChange={(e) => setSettings({ nodeSize: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500 bg-white/5 rounded-full h-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {activeTab === 'Graphics' && (
                  <>
                    {/* Graphics Settings */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Type className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">Graphics & UI</h3>
                      </div>

                      <div className="space-y-3">
                        <div 
                          onClick={() => {
                            setSettings({ glassEffect: !settings.glassEffect });
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-white/55" />
                            <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-tight">Glass Effects</span>
                          </div>
                          <div 
                            className={`w-8 h-4 rounded-full transition-all relative ${settings.glassEffect ? 'bg-blue-600' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${settings.glassEffect ? 'left-[18px]' : 'left-0.5'}`} />
                          </div>
                        </div>

                        <div 
                          onClick={() => {
                            setSettings({ mouseHoverEffect: !settings.mouseHoverEffect });
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-white/55" />
                            <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-tight">Mouse Hover Effect</span>
                          </div>
                          <div 
                            className={`w-8 h-4 rounded-full transition-all relative ${settings.mouseHoverEffect ? 'bg-blue-600' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${settings.mouseHoverEffect ? 'left-[18px]' : 'left-0.5'}`} />
                          </div>
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {activeTab === 'Security' && (
                  <>
                    {/* Device Storage Persistence */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">Device Storage</h3>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">Device Status</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            isPersisted 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isPersisted ? 'Persistent' : 'Best Effort'}
                          </span>
                        </div>

                        {storageEstimate && (
                          <div className="flex justify-between items-center text-[9px] text-white/70 font-mono">
                            <span>Usage / Quota</span>
                            <span>{storageEstimate.used} of {storageEstimate.total}</span>
                          </div>
                        )}

                        <p className="text-[9px] text-white/60 leading-relaxed font-sans">
                          Making storage persistent requests the physical device to preserve Nexus nodes from being cleared during OS cleaning cycles.
                        </p>

                        {!isPersisted && (
                          <button
                            onClick={handleRequestPersistence}
                            className="w-full py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider transition-all"
                          >
                            Secure Storage Persistence
                          </button>
                        )}
                      </div>
                    </section>

                    {/* User PIN Security */}
                    <section className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">User Lock PIN</h3>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-white/60" />
                            <span className="text-[10px] font-extrabold text-white/85 uppercase tracking-tight">Security Lock PIN</span>
                          </div>
                          <button
                            onClick={handleTogglePin}
                            className={`w-8 h-4 rounded-full transition-all relative ${settings.pinEnabled ? 'bg-blue-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${settings.pinEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* Error and Success status notifications */}
                        {securityError && (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 text-[9px] font-medium leading-tight">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{securityError}</span>
                          </div>
                        )}

                        {securitySuccess && (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[9px] font-medium leading-tight">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{securitySuccess}</span>
                          </div>
                        )}

                        {/* PIN Configuration view */}
                        {isSettingPin && (
                          <div className="space-y-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Set 4-Digit PIN</label>
                              <input
                                type="password"
                                maxLength={4}
                                value={pinInput}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setPinInput(val);
                                }}
                                placeholder="••••"
                                className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-center tracking-[1em] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-white"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Confirm PIN</label>
                              <input
                                type="password"
                                maxLength={4}
                                value={pinConfirmInput}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setPinConfirmInput(val);
                                }}
                                placeholder="••••"
                                className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-center tracking-[1em] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-white"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setIsSettingPin(false);
                                  setPinInput('');
                                  setPinConfirmInput('');
                                  setSecurityError('');
                                }}
                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-[9px] font-bold uppercase tracking-wider transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSavePin}
                                className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10"
                              >
                                Save PIN
                              </button>
                            </div>
                          </div>
                        )}

                        {isVerifyingToDisable && (
                          <div className="space-y-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Enter PIN to Deactivate</label>
                              <input
                                type="password"
                                maxLength={4}
                                value={pinInput}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setPinInput(val);
                                }}
                                placeholder="••••"
                                className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-center tracking-[1em] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-white"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setIsVerifyingToDisable(false);
                                  setPinInput('');
                                  setSecurityError('');
                                }}
                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-[9px] font-bold uppercase tracking-wider transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleDisablePin}
                                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase tracking-wider transition-all"
                              >
                                Deactivate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {activeTab === 'Data' && (
                  <>
                    {/* Data Management */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Upload className="w-3.5 h-3.5 text-blue-400" />
                        <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.2em]">Data Management</h3>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                           <button 
                             onClick={exportData}
                             className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/5 hover:bg-white/5 transition-all group"
                           >
                             <Download className="w-3.5 h-3.5 text-white/50 group-hover:text-blue-400 transition-colors" />
                             <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight">Export</span>
                           </button>
                           <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/5 hover:bg-white/5 transition-all group"
                           >
                             <Upload className="w-3.5 h-3.5 text-white/50 group-hover:text-green-400 transition-colors" />
                             <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight">Import</span>
                             <input 
                               type="file" 
                               ref={fileInputRef} 
                               onChange={handleImport} 
                               accept=".json" 
                               className="hidden" 
                             />
                           </button>
                        </div>
                        <button 
                           onClick={handleReset}
                           className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all group ${
                             resetConfirm 
                               ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                               : 'bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                           }`}
                        >
                          <Trash2 className={`w-3.5 h-3.5 transition-colors ${resetConfirm ? 'text-white' : 'text-red-500/50 group-hover:text-red-500'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${resetConfirm ? 'text-white' : 'text-red-500/80'}`}>
                            {resetConfirm ? 'Click again to confirm' : 'Reset Factory'}
                          </span>
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

