import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, Building2, CheckCircle2, ChevronRight } from 'lucide-react';
import { OFFICIAL_LOGOS } from '../utils/hackathonLogic';
import { db, auth, doc, setDoc, handleFirestoreError, OperationType } from '../lib/firebase';

export interface ParticipantProfile {
  fullName: string;
  email: string;
  mobile: string;
  whatsapp: string;
  department: string;
  institution: string;
  profileComplete: boolean;
  createdAt: string;
}

interface ParticipantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialEmail: string;
  initialInstitution: string;
  onProfileComplete: (profile: ParticipantProfile) => void;
}

function validateMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.trim());
}

export const ParticipantProfileModal: React.FC<ParticipantProfileModalProps> = ({
  isOpen,
  onClose,
  initialName,
  initialEmail,
  initialInstitution,
  onProfileComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  const [fullName, setFullName] = useState(initialName || '');
  const [mobile, setMobile] = useState('');
  const [sameAsWhatsapp, setSameAsWhatsapp] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [department, setDepartment] = useState('');
  const [institution, setInstitution] = useState(initialInstitution || 'Rajalakshmi Institute of Technology');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resolvedWhatsapp = sameAsWhatsapp ? mobile : whatsapp;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required (at least 2 characters).';
    }
    if (!validateMobile(mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit Indian mobile number starting with 6–9.';
    }
    if (!sameAsWhatsapp && whatsapp.trim() && !validateMobile(whatsapp)) {
      newErrors.whatsapp = 'Enter a valid 10-digit WhatsApp number or leave blank.';
    }
    if (!department.trim()) {
      newErrors.department = 'Department/Year is required (e.g. CSE - 3rd Year).';
    }
    if (!institution.trim()) {
      newErrors.institution = 'Institution name is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(2);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    setSaveError(null);
    const uid = auth.currentUser?.uid || `participant-${mobile.trim()}`;
    const profile: ParticipantProfile = {
      fullName: fullName.trim(),
      email: initialEmail || auth.currentUser?.email || '',
      mobile: mobile.trim(),
      whatsapp: resolvedWhatsapp.trim(),
      department: department.trim(),
      institution: institution.trim(),
      profileComplete: true,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save to Firestore with a 3000ms race timeout to prevent infinite "Saving..."
      const firestoreWrite = setDoc(doc(db, 'participants', uid), profile);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network write delayed. Fast local sync active.')), 3000)
      );
      await Promise.race([firestoreWrite, timeoutPromise]);
    } catch (error) {
      console.warn('[HARMONIA] Firestore profile write notice:', error);
      handleFirestoreError(error, OperationType.WRITE, `participants/${uid}`);
    } finally {
      // 2. Guaranteed local storage fallback and state transition
      try {
        localStorage.setItem('harmonia_participant_profile_v1', JSON.stringify(profile));
      } catch (err) {
        console.error('[HARMONIA] LocalStorage write error:', err);
      }
      setIsSaving(false);
      onProfileComplete(profile);
    }
  };

  const progressPercent = step === 1 ? 50 : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg max-h-[92dvh] flex flex-col rounded-3xl border border-white/90 bg-gradient-to-b from-white via-[#FFF9F2] to-white p-5 sm:p-7 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-8 sm:h-9 w-auto object-contain"
            />
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                <User className="h-3 w-3" />
                <span>Participant Profile</span>
              </div>
              <h2
                id="profile-modal-title"
                className="text-base sm:text-lg font-extrabold text-[#172347]"
              >
                Complete Your Profile
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile modal"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="my-3 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-[#172347] mb-1.5">
            <span className={step === 1 ? 'text-[#6B1FE0]' : 'text-slate-400'}>
              Step 1: Personal Details
            </span>
            <span className={step === 2 ? 'text-[#6B1FE0]' : 'text-slate-400'}>
              Step 2: Confirm
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#6B1FE0]"
              initial={{ width: '50%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {saveError && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 shrink-0">
            {saveError}
          </div>
        )}

        {/* Step 1: Personal Details Form */}
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleStep1Submit}
            className="flex-1 overflow-y-auto px-1 py-1 space-y-3.5 pr-2"
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="profile-fullname"
                className="block text-xs font-bold text-[#172347] mb-1"
              >
                Full Name *
              </label>
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label
                htmlFor="profile-mobile"
                className="block text-xs font-bold text-[#172347] mb-1"
              >
                Mobile Number * <span className="font-normal text-slate-500">(10-digit Indian mobile)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono text-slate-600 shrink-0">+91</span>
                <input
                  id="profile-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setMobile(val);
                  }}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                />
              </div>
              {errors.mobile && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.mobile}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="profile-whatsapp"
                  className="text-xs font-bold text-[#172347]"
                >
                  WhatsApp Number <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsWhatsapp}
                    onChange={(e) => setSameAsWhatsapp(e.target.checked)}
                    className="rounded accent-[#6B1FE0]"
                  />
                  Same as mobile
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono text-slate-600 shrink-0">+91</span>
                <input
                  id="profile-whatsapp"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={sameAsWhatsapp ? mobile : whatsapp}
                  onChange={(e) => {
                    if (!sameAsWhatsapp) {
                      const val = e.target.value.replace(/\D/g, '');
                      setWhatsapp(val);
                    }
                  }}
                  disabled={sameAsWhatsapp}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 focus:border-[#6B1FE0] focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              {errors.whatsapp && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.whatsapp}</p>
              )}
            </div>

            {/* Department / Year */}
            <div>
              <label
                htmlFor="profile-department"
                className="block text-xs font-bold text-[#172347] mb-1"
              >
                Department / Year *
              </label>
              <input
                id="profile-department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. CSE - 3rd Year"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
              />
              {errors.department && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.department}</p>
              )}
            </div>

            {/* College / Institution */}
            <div>
              <label
                htmlFor="profile-institution"
                className="block text-xs font-bold text-[#172347] mb-1"
              >
                College / Institution *
              </label>
              <input
                id="profile-institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Rajalakshmi Institute of Technology"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
              />
              {errors.institution && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.institution}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[#6B1FE0] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#8F28E8] transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.form>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-between overflow-hidden"
          >
            <div className="overflow-y-auto space-y-3.5 pr-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#172347]">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Review your details before proceeding</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 divide-y divide-slate-200 overflow-hidden text-xs">
                <div className="flex items-start gap-3 p-3">
                  <User className="h-4 w-4 text-[#6B1FE0] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#172347]">Full Name</div>
                    <div className="mt-0.5 text-[#25335A] font-medium">{fullName}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <Phone className="h-4 w-4 text-[#6B1FE0] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#172347]">Mobile</div>
                    <div className="mt-0.5 text-[#25335A] font-mono font-medium">+91 {mobile}</div>
                  </div>
                </div>
                {resolvedWhatsapp && (
                  <div className="flex items-start gap-3 p-3">
                    <Phone className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#172347]">WhatsApp</div>
                      <div className="mt-0.5 text-[#25335A] font-mono">
                        +91 {resolvedWhatsapp}
                        {sameAsWhatsapp && <span className="ml-2 text-slate-400 font-sans">(same as mobile)</span>}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3">
                  <Building2 className="h-4 w-4 text-[#6B1FE0] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#172347]">Department / Year</div>
                    <div className="mt-0.5 text-[#25335A]">{department}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <Building2 className="h-4 w-4 text-[#13354B] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#172347]">Institution</div>
                    <div className="mt-0.5 text-[#25335A]">{institution}</div>
                  </div>
                </div>
                {initialEmail && (
                  <div className="flex items-start gap-3 p-3">
                    <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#172347]">Email</div>
                      <div className="mt-0.5 text-[#25335A] font-mono">{initialEmail}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 mt-3 shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-slate-300 bg-white px-4 sm:px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ← Edit Details
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#13354B] px-5 sm:px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1E5070] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {isSaving ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Proceed to Team Registration</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
