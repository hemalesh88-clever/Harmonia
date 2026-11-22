import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { OFFICIAL_LOGOS } from '../utils/hackathonLogic';

interface CoordinatorUser {
  username: string;
  role: 'coordinator';
  displayName: string;
}

interface CoordinatorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (coordinator: CoordinatorUser) => void;
}

const VALID_USERNAME = 'Harshana';
const VALID_PASSWORD = 'Rit@1432#';

export const CoordinatorLoginModal: React.FC<CoordinatorLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate small async delay for UX
    setTimeout(() => {
      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        onLoginSuccess({
          username: 'Harshana',
          role: 'coordinator',
          displayName: 'Ms. B. Harshana',
        });
        setUsername('');
        setPassword('');
        setError('');
      } else {
        setError('Invalid credentials. Please check your username and password.');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coordinator-login-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl border border-white/90 bg-gradient-to-b from-white via-[#F0F4FF] to-white p-6 shadow-2xl sm:p-8"
      >
        {/* Dark-teal header */}
        <div className="flex items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#13354B] to-[#1E5070] p-5 mb-6 -mt-0">
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain rounded bg-white/20 p-1"
            />
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-200">
                <Shield className="h-3 w-3" />
                <span>Secure Access</span>
              </div>
              <h2
                id="coordinator-login-title"
                className="text-base font-extrabold text-white"
              >
                Coordinator Portal
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close coordinator login modal"
            className="rounded-full p-1.5 text-white/60 hover:bg-white/20 hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="coord-username"
              className="block text-xs font-bold text-[#172347] mb-1.5"
            >
              Username
            </label>
            <input
              id="coord-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#13354B] focus:outline-none focus:ring-2 focus:ring-[#13354B]/20"
            />
          </div>

          <div>
            <label
              htmlFor="coord-password"
              className="block text-xs font-bold text-[#172347] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="coord-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 focus:border-[#13354B] focus:outline-none focus:ring-2 focus:ring-[#13354B]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="inline-flex items-center gap-2 rounded-full bg-[#13354B] px-6 py-2 text-xs font-bold text-white hover:bg-[#1E5070] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </div>
        </form>

        {/* Info note */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Coordinator access only · HARMONIA 2027
        </p>
      </motion.div>
    </div>
  );
};
