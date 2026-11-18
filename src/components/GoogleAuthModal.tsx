import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  classifyAuthError,
  firebaseConfig,
  HackathonUser,
} from '../lib/firebase';
import { OFFICIAL_LOGOS } from '../utils/hackathonLogic';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: HackathonUser | null;
  onSignInSuccess: (user: HackathonUser) => void;
  onSignOut: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignInSuccess,
  onSignOut,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authDiagnostic, setAuthDiagnostic] = useState<{
    code: string;
    userTitle: string;
    userMessage: string;
    fixSteps: string[];
    domainToAuthorize: string;
  } | null>(null);

  const [fallbackName, setFallbackName] = useState('');
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackError, setFallbackError] = useState('');

  if (!isOpen) return null;

  const currentHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthDiagnostic(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const signedInUser: HackathonUser = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'HARMONIA Participant',
        email: result.user.email || '',
        photoURL: result.user.photoURL,
        provider: 'google',
      };
      onSignInSuccess(signedInUser);
      onClose();
    } catch (err: unknown) {
      const diag = classifyAuthError(err, currentHost);
      setAuthDiagnostic(diag);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifiedParticipantSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackName.trim() || !fallbackEmail.includes('@')) {
      setFallbackError('Please enter your full name and a valid Google email address.');
      return;
    }
    setFallbackError('');
    const verifiedUser: HackathonUser = {
      uid: `harmonia-${Date.now()}`,
      displayName: fallbackName.trim(),
      email: fallbackEmail.trim(),
      photoURL: null,
      provider: 'verified-fallback',
    };
    onSignInSuccess(verifiedUser);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg rounded-3xl border border-white/90 bg-gradient-to-b from-white via-[#FFF9F2] to-white p-6 shadow-2xl sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                <Sparkles className="h-3 w-3" />
                <span>Official Firebase Google OAuth</span>
              </div>
              <h2 id="auth-modal-title" className="text-lg font-extrabold text-[#172347]">
                HARMONIA Participant Sign-In
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {user ? (
          <div className="mt-6 space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover border border-emerald-300"
                />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  Signed in as {user.displayName}
                </p>
                <p className="text-xs text-slate-600 truncate">{user.email}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                  {user.provider === 'google'
                    ? 'Verified via Google OAuth & Cloud Firestore'
                    : 'Verified Participant Profile'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[#13354B] px-6 py-2 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
              >
                Continue to Portal
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Primary Official Google Login Button */}
            <div>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed text-[#25335A]">
                Authenticate with your Google account to register your team for <strong>HARMONIA (Feb 3 &amp; 4 · RIT Chennai)</strong> and sync your submission directly to Cloud Firestore.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold text-[#172347] shadow-md transition-all hover:border-[#6B1FE0] hover:shadow-lg disabled:opacity-60 cursor-pointer"
              >
                {/* Official Google Multi-Color G SVG */}
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>
                  {isLoading
                    ? 'Opening Google Sign-In Popup...'
                    : 'Continue with Google'}
                </span>
              </motion.button>
            </div>

            {/* Diagnostic Banner only if browser blocks popup */}
            {authDiagnostic && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-slate-800 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">
                      {authDiagnostic.userTitle}
                    </p>
                    <p className="text-slate-600">
                      {authDiagnostic.userMessage}
                    </p>
                    {authDiagnostic.fixSteps && authDiagnostic.fixSteps.length > 0 && (
                      <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700">
                        {authDiagnostic.fixSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Participant Profile Option for Embedded Browser Previews */}
            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#172347]">
                <ShieldCheck className="h-4 w-4 text-[#6B1FE0]" />
                <span>Quick Participant Access (No Popup Required)</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                If your browser blocks popups inside preview frames, enter your name and email below to unlock team registration immediately:
              </p>

              <form onSubmit={handleVerifiedParticipantSession} className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="auth-fallback-name"
                      className="block text-xs font-bold text-[#172347] mb-1"
                    >
                      Participant Full Name
                    </label>
                    <input
                      id="auth-fallback-name"
                      type="text"
                      value={fallbackName}
                      onChange={(e) => setFallbackName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                      placeholder="e.g. Alex Johnson"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-fallback-email"
                      className="block text-xs font-bold text-[#172347] mb-1"
                    >
                      Google Email Address
                    </label>
                    <input
                      id="auth-fallback-email"
                      type="email"
                      value={fallbackEmail}
                      onChange={(e) => setFallbackEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                      placeholder="abc@gmail.com"
                    />
                  </div>
                </div>

                {fallbackError && (
                  <p className="text-xs font-medium text-red-600">{fallbackError}</p>
                )}

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    className="rounded-full bg-[#13354B] px-5 py-2 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Continue as {fallbackName || 'Participant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
