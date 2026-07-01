import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, User, BadgeCheck, Sparkles, ShieldAlert } from 'lucide-react';

export const FirstTimeIdentityModal: React.FC = () => {
  const { userProfile, setUserProfile } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Pro Member');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Alex');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if identity has been prompted before
    const isConfigured = localStorage.getItem('nexus-identity-prompted');
    if (!isConfigured) {
      // Prepopulate with store defaults so they have a starting point
      setName(userProfile.name || '');
      setRole(userProfile.role || 'Pro Member');
      setAvatar(userProfile.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex');
      setIsOpen(true);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter your name to complete setup.');
      return;
    }
    setUserProfile({ name: name.trim(), role: role.trim(), avatar });
    localStorage.setItem('nexus-identity-prompted', 'true');
    setIsOpen(false);
  };

  // Preset seeds for fun identity creation
  const avatarPresets = [
    { name: 'Alex', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { name: 'Jordan', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' },
    { name: 'Taylor', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor' },
    { name: 'Morgan', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan' },
    { name: 'Sam', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[120] p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="w-full max-w-lg glass-dark rounded-[32px] border border-white/10 shadow-[0_0_80px_rgba(59,130,246,0.15)] relative overflow-hidden"
          >
            {/* Ambient Background Glow inside modal */}
            <div className="absolute top-0 left-1/4 w-1/2 h-40 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

            <div className="p-6 md:p-10 relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Establish Your Identity
                </h2>
                <p className="text-xs md:text-sm text-white/50 mt-2 max-w-md mx-auto">
                  Welcome to your dashboard. Configure your workspace username and profile to personalize your digital navigation.
                </p>
              </div>

              {/* Avatar Selector Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px] shadow-2xl shadow-blue-500/20">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/10">
                      <img src={avatar} alt="Selected Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-500 transition-all active:scale-90 border-4 border-[#09090b]"
                    title="Upload Custom Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Preset Avatar Selection */}
                <div className="flex gap-2.5 mt-4">
                  {avatarPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setAvatar(preset.url)}
                      className={`w-8 h-8 rounded-full border transition-all overflow-hidden ${
                        avatar === preset.url
                          ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/10'
                          : 'border-white/10 hover:border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                {/* Full Name Input */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Your Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 focus:bg-white/10 transition-all text-white font-medium"
                      placeholder="e.g. Alex Rivera"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Role / Status Input */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Role or Status</label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 focus:bg-white/10 transition-all text-white font-medium"
                      placeholder="e.g. Pro Member"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Action */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full py-4 bg-white text-black hover:bg-white/90 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-xl hover:shadow-white/5 active:scale-[0.98] flex items-center justify-center gap-2.5"
                  >
                    Set Identity & Enter
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
