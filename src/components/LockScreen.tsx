import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield, ArrowRight, Delete, RotateCcw } from 'lucide-react';

interface LockScreenProps {
  correctPin: string;
  onUnlock: () => void;
  onReset: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ correctPin, onUnlock, onReset }) => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isError) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(() => {
            onUnlock();
          }, 200);
        } else {
          setTimeout(() => {
            setIsError(true);
            // Shake effect then clear
            setTimeout(() => {
              setPin('');
              setIsError(false);
            }, 600);
          }, 150);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !isError) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm px-6 text-center z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 relative shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/10 animate-pulse z-0" />
            <img src="/logo.png" alt="Nexus Logo" className="w-10 h-10 object-contain relative z-10" />
          </div>
          <h2 className="text-xl font-bold text-white font-sans tracking-tight">Nexus Security</h2>
          <p className="text-xs text-white/40 mt-1">Authorized access only. Enter security PIN.</p>
        </div>

        {/* PIN Dot Indicators */}
        <motion.div 
          animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex justify-center gap-4 mb-10"
        >
          {[0, 1, 2, 3].map((index) => {
            const isActive = pin.length > index;
            return (
              <div 
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  isError 
                    ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]' 
                    : isActive 
                      ? 'bg-blue-400 scale-110 shadow-[0_0_10px_rgba(96,165,250,0.6)]' 
                      : 'bg-white/10 border border-white/5'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {numKeys.map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 text-lg font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/15 active:scale-95 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          
          {/* Action Row */}
          <button
            onClick={handleClear}
            className="h-16 rounded-2xl bg-white/[0.01] border border-transparent text-xs font-semibold uppercase tracking-wider text-white/30 hover:text-white/60 active:scale-95 transition-all flex items-center justify-center"
          >
            Clear
          </button>
          
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 text-lg font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/15 active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-white/[0.01] border border-transparent text-white/30 hover:text-white/60 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Reset Option if Forgot */}
        <div className="mt-4 flex justify-center">
          <button 
            onClick={() => {
              if (confirm("Reset Factor will wipe all data on this device to remove the PIN lock and restore defaults. Proceed?")) {
                onReset();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            WIPE & RESET DEVICE LOCK
          </button>
        </div>
      </motion.div>
    </div>
  );
};
