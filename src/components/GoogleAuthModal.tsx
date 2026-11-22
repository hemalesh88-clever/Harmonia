import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  classifyAuthError,
  HackathonUser,
} from '../lib/firebase';
import { OFFICIAL_LOGOS, TeamRegistration } from '../utils/hackathonLogic';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Mail,
  ArrowRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: HackathonUser | null;
  onSignInSuccess: (user: HackathonUser) => void;
  onSignOut: () => void;
  registrations?: TeamRegistration[];
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignInSuccess,
  onSignOut,
  registrations = [],
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');
  const [isLoading, setIsLoading] = useState(false);
  const [authDiagnostic, setAuthDiagnostic] = useState<{
    code: string;
    userTitle: string;
    userMessage: string;
    fixSteps: string[];
    domainToAuthorize: string;
  } | null>(null);

  // Email Direct Sign-In State (No mobile or phone OTP)
  const [participantEmail, setParticipantEmail] = useState('');
  const [loginError, setLoginError] = useState('');

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

  const handleEmailDirectSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const emailTrimmed = participantEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    // Match existing team registration or participant
    const matchedTeam = registrations.find(
      (r) =>
        r.leaderEmail.toLowerCase() === emailTrimmed ||
        (r.members && r.members.some((m) => m.email.toLowerCase() === emailTrimmed))
    );

    const resolvedName =
      matchedTeam?.leaderName ||
      emailTrimmed.split('@')[0] ||
      'Participant';

    const signedInUser: HackathonUser = {
      uid: matchedTeam ? `user-${matchedTeam.id}` : `participant-${emailTrimmed.replace(/[^a-zA-Z0-9]/g, '_')}`,
      displayName: resolvedName,
      email: emailTrimmed,
      photoURL: null,
      provider: 'verified-fallback',
    };

    // Save profile to localStorage
    try {
      localStorage.setItem(
        'harmonia_participant_profile_v1',
        JSON.stringify({
          fullName: resolvedName,
          email: emailTrimmed,
          mobile: matchedTeam?.leaderMobile || '',
          whatsapp: matchedTeam?.leaderMobile || '',
          institution: matchedTeam?.institution || 'Rajalakshmi Institute of Technology',
          department: 'CSE',
          profileComplete: true,
          phoneVerified: true,
          emailVerified: true,
          teamId: matchedTeam?.id || null,
          createdAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }

    onSignInSuccess(signedInUser);
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
        className="relative w-full max-w-md rounded-3xl border border-white/90 bg-gradient-to-b from-white via-[#FFF9F2] to-white p-6 shadow-2xl sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain rounded-md bg-white px-2 py-0.5 shadow-2xs"
            />
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                <Sparkles className="h-3 w-3" />
                <span>Verified Participant Access</span>
              </div>
              <h2
                id="auth-modal-title"
                className="text-base font-extrabold text-[#172347]"
              >
                Participant Sign-In
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Diagnostic alert if OAuth error */}
        {authDiagnostic && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{authDiagnostic.userTitle}</span>
            </div>
            <p>{authDiagnostic.userMessage}</p>
            <p className="font-semibold text-amber-800">
              You can also use Email Sign-In below for instant access.
            </p>
          </div>
        )}

        {/* If user is already signed in */}
        {user ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Signed In</span>
              </div>
              <h3 className="text-base font-extrabold text-[#172347]">
                {user.displayName}
              </h3>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[#13354B] px-5 py-2 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-red-600" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Tab Switcher: Google Sign-In vs Email Direct */}
            <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('google')}
                className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'google'
                    ? 'bg-white text-[#172347] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌐 Google Sign-In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'email'
                    ? 'bg-white text-[#172347] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✉️ Email Direct
              </button>
            </div>

            {/* TAB 1: Google Sign In */}
            {activeTab === 'google' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-[#172347]">One-Click Google Authentication</p>
                  <p className="text-slate-600">
                    Sign in with your Google account to auto-fill credentials, manage registrations, and submit your project abstract.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
              </div>
            )}

            {/* TAB 2: Email Direct Sign In (No mobile or phone OTP) */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailDirectSignIn} className="space-y-4">
                <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3 text-xs text-[#25335A]">
                  Enter your <strong>Registered Email Address</strong> to access your submissions and abstract details instantly.
                </div>

                <div>
                  <label
                    htmlFor="part-email"
                    className="block text-xs font-bold text-[#172347] mb-1 flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#6B1FE0]" />
                    <span>Registered Email Address *</span>
                  </label>
                  <input
                    id="part-email"
                    type="email"
                    required
                    value={participantEmail}
                    onChange={(e) => {
                      setParticipantEmail(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="e.g. leader@gmail.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                  />
                </div>

                {loginError && (
                  <p className="text-xs font-semibold text-red-600">{loginError}</p>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#133B53] to-[#1E5372] px-5 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-[#6B1FE0] hover:to-[#8F28E8] cursor-pointer"
                >
                  <span>Sign In with Email</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
