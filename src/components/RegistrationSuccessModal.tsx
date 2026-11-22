import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldCheck, ArrowRight, LogOut, Copy, Check, FileText } from 'lucide-react';
import { TeamRegistration, HACKATHON_TRACKS, OFFICIAL_LOGOS } from '../utils/hackathonLogic';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: TeamRegistration | null;
  onGoToDashboard: () => void;
  onSignOut: () => void;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  isOpen,
  onClose,
  registration,
  onGoToDashboard,
  onSignOut,
}) => {
  const [copiedId, setCopiedId] = React.useState(false);

  if (!isOpen || !registration) return null;

  const trackObj = HACKATHON_TRACKS.find((t) => t.id === registration.trackId);

  const handleCopyId = () => {
    navigator.clipboard.writeText(registration.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl border border-white/90 bg-white p-6 sm:p-8 shadow-2xl"
        >
          {/* Header Graphic */}
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Identity &amp; Phone Verified</span>
            </div>
            <h2
              id="success-modal-title"
              className="text-2xl font-black tracking-tight text-[#172347]"
            >
              TEAM REGISTRATION SUCCESSFUL
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Welcome to <span className="font-bold text-[#13354B]">HARMONIA 2027</span>. Your project abstract and team have been securely submitted.
            </p>
          </div>

          {/* Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Team Name</span>
              <span className="font-extrabold text-sm text-[#172347]">{registration.teamName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Registration ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-[#6B1FE0] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {registration.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  title="Copy Registration ID"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Selected Track</span>
              <span className="font-bold text-[#13354B] text-right truncate max-w-[240px]">
                {trackObj ? `Track 0${trackObj.number}: ${trackObj.title}` : registration.trackId}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Team Lead</span>
              <span className="font-bold text-[#172347]">{registration.leaderName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Mobile Number</span>
              <span className="font-mono font-bold text-[#172347]">
                +91 {registration.leaderMobile}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Email Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{registration.leaderEmail} · Verified</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Registration Fee</span>
              <span className="font-extrabold text-[#172347]">
                ₹{registration.registrationFee || (registration.memberCount === 4 ? 500 : registration.memberCount * 150)} ({registration.memberCount} {registration.memberCount === 1 ? 'member' : 'members'})
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Pending Coordinator Verification</span>
              </span>
            </div>

            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Project Title
              </span>
              <p className="font-bold text-[#172347] bg-white p-2.5 rounded-xl border border-slate-200">
                {registration.projectTitle}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToDashboard();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#13354B] to-[#1E5372] py-3 text-xs font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition-all cursor-pointer"
            >
              <span>Go to Participant Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToDashboard();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-[#6B1FE0]" />
              <span>View Submission</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-3 px-3.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
