import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getDocs,
  onSnapshot,
  collection as firestoreCollection,
  doc,
  updateDoc,
  query,
  limit,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  HACKATHON_TRACKS,
  OFFICIAL_LOGOS,
  INITIAL_REGISTRATIONS,
  SubmissionStatus,
  TeamMember,
  calculateRegistrationFee,
} from '../utils/hackathonLogic';
import { fetchActivePaymentQr, updateActivePaymentQr, DEFAULT_PAYMENT_QR_URL } from '../utils/paymentQr';
import {
  Users,
  LogOut,
  RefreshCw,
  Trophy,
  BarChart3,
  Shield,
  Search,
  Copy,
  Check,
  Download,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  QrCode,
  Image as ImageIcon,
  Eye,
  LayoutDashboard,
  UserCheck,
  Lightbulb,
  FileSpreadsheet,
  ArrowLeft,
  Lock,
  EyeOff,
  Menu,
} from 'lucide-react';

export interface CoordinatorUser {
  username: string;
  role: 'coordinator';
  displayName: string;
}

interface CoordinatorPortalProps {
  coordinatorUser: CoordinatorUser | null;
  onLoginSuccess: (coordinator: CoordinatorUser) => void;
  onSignOut: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export interface RegistrationDoc {
  id: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderMobile?: string;
  leaderMobileVerified?: boolean;
  institution: string;
  trackId: string;
  memberCount: number;
  projectTitle: string;
  abstract: string;
  inclusionImpact?: string;
  mentorName?: string;
  ieeeMemberId?: string;
  members?: TeamMember[];
  status?: SubmissionStatus;
  createdAt: string;
  updatedAt?: string;
  registrationFee?: number;
  paymentStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  paymentScreenshotUrl?: string;
  paymentScreenshotName?: string;
  paymentScreenshotSize?: number;
  paymentUploadedAt?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  paymentRejectedAt?: string;
  paymentRejectedBy?: string;
  paymentRejectionReason?: string;
}

interface ParticipantDoc {
  fullName: string;
  email: string;
  mobile: string;
  whatsapp?: string;
  department?: string;
  institution?: string;
}

const TRACK_COLOR_MAP: Record<string, string> = {
  linguaverse: 'bg-blue-50 text-blue-700 border-blue-200',
  abilityx: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  roots: 'bg-amber-50 text-amber-700 border-amber-200',
  flowforge: 'bg-purple-50 text-purple-700 border-purple-200',
  iotverse: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const PAYMENT_STATUS_COLOR_MAP: Record<'PENDING' | 'VERIFIED' | 'REJECTED', string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-300',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-300',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const CoordinatorPortal: React.FC<CoordinatorPortalProps> = ({
  coordinatorUser,
  onLoginSuccess,
  onSignOut,
  currentPath,
  onNavigate,
}) => {
  // If not authenticated, render dedicated Coordinator Login screen in Light Theme
  if (!coordinatorUser) {
    return (
      <CoordinatorLoginView
        onLoginSuccess={onLoginSuccess}
        onNavigateHome={() => onNavigate('/')}
      />
    );
  }

  return (
    <CoordinatorAppShell
      coordinator={coordinatorUser}
      onSignOut={onSignOut}
      currentPath={currentPath}
      onNavigate={onNavigate}
    />
  );
};

// =========================================================================
// 1. DEDICATED COORDINATOR LOGIN VIEW (Crisp Light Theme, Zero Homepage Below)
// =========================================================================
interface CoordinatorLoginViewProps {
  onLoginSuccess: (coordinator: CoordinatorUser) => void;
  onNavigateHome: () => void;
}

const VALID_USERNAME = 'Harshana';
const VALID_PASSWORD = 'Rit@1432#';

const CoordinatorLoginView: React.FC<CoordinatorLoginViewProps> = ({
  onLoginSuccess,
  onNavigateHome,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        onLoginSuccess({
          username: 'Harshana',
          role: 'coordinator',
          displayName: 'Ms. B. Harshana',
        });
      } else {
        setError('Invalid credentials. Please verify coordinator username and password.');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-[#F8FAFC] to-[#EFF6FF] text-slate-800 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Public Website</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-full shadow-2xs">
          <Shield className="h-4 w-4 text-[#6B1FE0]" />
          <span className="font-semibold text-slate-700">HARMONIA 2027 Admin Subsystem</span>
        </div>
      </div>

      {/* Center Login Box */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/50 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <img
                src={OFFICIAL_LOGOS.rit}
                alt="RIT Logo"
                className="h-9 w-auto object-contain rounded border border-slate-200 px-1 py-0.5 bg-white"
              />
              <img
                src={OFFICIAL_LOGOS.harmonia}
                alt="HARMONIA Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                <Shield className="h-3 w-3" />
                <span>Restricted Access</span>
              </div>
              <h1 className="text-lg font-black text-[#13354B]">
                Coordinator Portal
              </h1>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Authorized portal for Rajalakshmi Institute of Technology faculty and student coordinators to review live registrations, evaluate abstracts, and verify UPI payments.
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2 shadow-2xs"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Coordinator Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter coordinator username"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6B1FE0] focus:ring-2 focus:ring-purple-100 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6B1FE0] focus:ring-2 focus:ring-purple-100 focus:outline-none pr-10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#13354B] to-[#6B1FE0] py-3 text-xs font-extrabold text-white hover:opacity-95 shadow-md shadow-purple-500/15 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Coordinator Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-500">
            Confidential · Harmonia 2027 RIT Chennai
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 max-w-5xl mx-auto w-full">
        Department of Computer Science &amp; Engineering · Rajalakshmi Institute of Technology
      </div>
    </div>
  );
};

// =========================================================================
// 2. COORDINATOR APP SHELL (Top Header + Sidebar Navigation + Dedicated Views)
// =========================================================================
interface CoordinatorAppShellProps {
  coordinator: CoordinatorUser;
  onSignOut: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

type CoordinatorTab =
  | 'dashboard'
  | 'registrations'
  | 'payments'
  | 'abstracts'
  | 'participants'
  | 'qr-settings'
  | 'export';

function getTabFromPath(path: string): CoordinatorTab {
  const clean = path.toLowerCase().trim();
  if (clean.includes('/payments')) return 'payments';
  if (clean.includes('/registrations')) return 'registrations';
  if (clean.includes('/abstracts')) return 'abstracts';
  if (clean.includes('/participants')) return 'participants';
  if (clean.includes('/qr-settings') || clean.includes('/qr')) return 'qr-settings';
  if (clean.includes('/export')) return 'export';
  return 'dashboard';
}

const CoordinatorAppShell: React.FC<CoordinatorAppShellProps> = ({
  coordinator,
  onSignOut,
  currentPath,
  onNavigate,
}) => {
  const activeTab = getTabFromPath(currentPath);

  const [registrations, setRegistrations] = useState<RegistrationDoc[]>([]);
  const [participants, setParticipants] = useState<Record<string, ParticipantDoc>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Filters & State for Registrations
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedAbstractTeam, setSelectedAbstractTeam] = useState<RegistrationDoc | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters for Payments
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedScreenshotReg, setSelectedScreenshotReg] = useState<RegistrationDoc | null>(null);

  // Payment Rejection Modal State
  const [paymentRejectTarget, setPaymentRejectTarget] = useState<RegistrationDoc | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Payment screenshot is unclear or incomplete.');
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Payment QR Management State
  const [activePaymentQr, setActivePaymentQr] = useState<string>(DEFAULT_PAYMENT_QR_URL);
  const [newQrFilePreview, setNewQrFilePreview] = useState<string | null>(null);
  const [isUpdatingQr, setIsUpdatingQr] = useState(false);
  const [qrUpdateSuccess, setQrUpdateSuccess] = useState<string | null>(null);

  // Status Change Confirmation Modal
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    team: RegistrationDoc;
    nextStatus: SubmissionStatus;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // CSV Export Modal State
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const parseRegistrationDoc = (d: { id: string; data: () => Record<string, unknown> }): RegistrationDoc => {
    const data = d.data();
    const count = Number(data.memberCount) || 1;
    const fee = Number(data.registrationFee) || calculateRegistrationFee(count);
    return {
      id: (data.id as string) || d.id,
      teamName: (data.teamName as string) || '',
      leaderName: (data.leaderName as string) || '',
      leaderEmail: (data.leaderEmail as string) || '',
      leaderMobile: (data.leaderMobile as string) || '',
      leaderMobileVerified: (data.leaderMobileVerified as boolean) ?? true,
      institution: (data.institution as string) || '',
      trackId: (data.trackId as string) || '',
      memberCount: count,
      projectTitle: (data.projectTitle as string) || '',
      abstract: (data.abstract as string) || '',
      inclusionImpact: (data.inclusionImpact as string) || '',
      mentorName: (data.mentorName as string) || '',
      ieeeMemberId: data.ieeeMemberId as string | undefined,
      members: (data.members as TeamMember[]) || [],
      status: ((data.status as string) as SubmissionStatus) || 'Submitted',
      createdAt: (data.createdAt as string) || '',
      updatedAt: data.updatedAt as string | undefined,
      registrationFee: fee,
      paymentStatus: ((data.paymentStatus as string) as 'PENDING' | 'VERIFIED' | 'REJECTED') || 'PENDING',
      paymentScreenshotUrl: data.paymentScreenshotUrl as string | undefined,
      paymentScreenshotName: data.paymentScreenshotName as string | undefined,
      paymentScreenshotSize: data.paymentScreenshotSize as number | undefined,
      paymentUploadedAt: data.paymentUploadedAt as string | undefined,
      paymentVerifiedAt: data.paymentVerifiedAt as string | undefined,
      paymentVerifiedBy: data.paymentVerifiedBy as string | undefined,
      paymentRejectedAt: data.paymentRejectedAt as string | undefined,
      paymentRejectedBy: data.paymentRejectedBy as string | undefined,
      paymentRejectionReason: data.paymentRejectionReason as string | undefined,
    };
  };

  const sortRegistrationsDesc = (list: RegistrationDoc[]): RegistrationDoc[] => {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  };

  // Real-time Firestore sync
  useEffect(() => {
    setIsLoading(true);
    const q = query(firestoreCollection(db, 'registrations'), limit(500));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudRegs = snapshot.docs.map(parseRegistrationDoc);
          setRegistrations(sortRegistrationsDesc(cloudRegs));
        } else {
          setRegistrations(
            INITIAL_REGISTRATIONS.map((r) => ({
              ...r,
              registrationFee: calculateRegistrationFee(r.memberCount),
              paymentStatus: 'VERIFIED',
            }))
          );
        }
        setIsLoading(false);
        setLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      },
      (error) => {
        console.error('[HARMONIA] Real-time coordinator listener error:', error);
        handleFirestoreError(error, OperationType.LIST, 'registrations');
        setIsLoading(false);
      }
    );

    // Fetch participant profiles for lookup
    getDocs(query(firestoreCollection(db, 'participants'), limit(500)))
      .then((partSnap) => {
        const partMap: Record<string, ParticipantDoc> = {};
        partSnap.forEach((d) => {
          const p = d.data() as ParticipantDoc;
          if (p.mobile) partMap[p.mobile.replace(/\D/g, '')] = p;
          if (p.email) partMap[p.email.toLowerCase()] = p;
        });
        setParticipants(partMap);
      })
      .catch(() => {});

    // Fetch active payment QR
    fetchActivePaymentQr().then((qr) => {
      if (qr) setActivePaymentQr(qr);
    });

    return () => unsubscribe();
  }, []);

  const getEffectiveMobile = (reg: RegistrationDoc): string => {
    if (reg.leaderMobile) return reg.leaderMobile;
    const byEmail = participants[reg.leaderEmail.toLowerCase()];
    if (byEmail?.mobile) return byEmail.mobile;
    return '';
  };

  // Force manual refresh
  const handleForceRefresh = async () => {
    setIsLoading(true);
    try {
      const regSnap = await getDocs(
        query(firestoreCollection(db, 'registrations'), limit(500))
      );
      if (!regSnap.empty) {
        setRegistrations(sortRegistrationsDesc(regSnap.docs.map(parseRegistrationDoc)));
      }
    } catch (err) {
      console.warn('[HARMONIA] Force refresh notice:', err);
    } finally {
      setIsLoading(false);
      setLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  // Verify payment action
  const handleVerifyPayment = async (team: RegistrationDoc) => {
    const timestamp = new Date().toISOString();
    const verifiedBy = coordinator.displayName || coordinator.username;

    try {
      const docRef = doc(db, 'registrations', team.id);
      await updateDoc(docRef, {
        paymentStatus: 'VERIFIED',
        paymentVerifiedAt: timestamp,
        paymentVerifiedBy: verifiedBy,
        updatedAt: timestamp,
      });
    } catch (err) {
      console.warn('[HARMONIA] Payment verification update notice:', err);
    }

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === team.id
          ? {
              ...r,
              paymentStatus: 'VERIFIED',
              paymentVerifiedAt: timestamp,
              paymentVerifiedBy: verifiedBy,
              updatedAt: timestamp,
            }
          : r
      )
    );

    setStatusNotice(`Payment for "${team.teamName}" (₹${team.registrationFee}) officially verified!`);
    setSelectedScreenshotReg(null);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Reject payment action
  const handleOpenRejectModal = (team: RegistrationDoc) => {
    setPaymentRejectTarget(team);
    setRejectReason('Payment screenshot is unclear or incomplete.');
    setCustomRejectReason('');
  };

  const handleConfirmRejectPayment = async () => {
    if (!paymentRejectTarget) return;
    const finalReason = customRejectReason.trim() || rejectReason;
    const timestamp = new Date().toISOString();
    const rejectedBy = coordinator.displayName || coordinator.username;

    try {
      const docRef = doc(db, 'registrations', paymentRejectTarget.id);
      await updateDoc(docRef, {
        paymentStatus: 'REJECTED',
        paymentRejectedAt: timestamp,
        paymentRejectedBy: rejectedBy,
        paymentRejectionReason: finalReason,
        updatedAt: timestamp,
      });
    } catch (err) {
      console.warn('[HARMONIA] Payment rejection notice:', err);
    }

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === paymentRejectTarget.id
          ? {
              ...r,
              paymentStatus: 'REJECTED',
              paymentRejectedAt: timestamp,
              paymentRejectedBy: rejectedBy,
              paymentRejectionReason: finalReason,
              updatedAt: timestamp,
            }
          : r
      )
    );

    setStatusNotice(`Payment for "${paymentRejectTarget.teamName}" marked rejected. Participant notified.`);
    setPaymentRejectTarget(null);
    setSelectedScreenshotReg(null);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Status Change
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    const { team, nextStatus } = statusConfirmTarget;
    const timestamp = new Date().toISOString();

    try {
      const docRef = doc(db, 'registrations', team.id);
      await updateDoc(docRef, {
        status: nextStatus,
        updatedAt: timestamp,
      });
    } catch (err) {
      console.warn('[HARMONIA] Status change notice:', err);
    }

    setRegistrations((prev) =>
      prev.map((r) => (r.id === team.id ? { ...r, status: nextStatus, updatedAt: timestamp } : r))
    );

    setStatusNotice(`Team "${team.teamName}" status updated to ${nextStatus}.`);
    setStatusConfirmTarget(null);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // QR Code upload
  const handleQrFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setNewQrFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmQrReplace = async () => {
    if (!newQrFilePreview) return;
    setIsUpdatingQr(true);
    setQrUpdateSuccess(null);

    try {
      await updateActivePaymentQr(
        newQrFilePreview,
        coordinator.displayName || coordinator.username
      );
      setActivePaymentQr(newQrFilePreview);
      setNewQrFilePreview(null);
      setQrUpdateSuccess('Payment QR code updated successfully and active in participant registration.');
    } catch {
      alert('Unable to update payment QR. Please try again.');
    } finally {
      setIsUpdatingQr(false);
    }
  };

  // CSV Export
  const handleDownloadCsv = (type: 'all' | 'verified_payments' | 'pending_payments' | 'participants') => {
    setExportNotice('Exporting CSV data...');
    let targets = [...registrations];

    if (type === 'verified_payments') {
      targets = targets.filter((r) => r.paymentStatus === 'VERIFIED');
    } else if (type === 'pending_payments') {
      targets = targets.filter((r) => (r.paymentStatus || 'PENDING') === 'PENDING');
    }

    const today = new Date().toISOString().slice(0, 10);
    const escapeCell = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    let csvContent = '';
    if (type === 'participants') {
      const headers = ['Role', 'Name', 'Email', 'Mobile', 'Team Name', 'Reg ID', 'College', 'Track', 'Payment'];
      const rows: (string | number)[][] = [];

      targets.forEach((t) => {
        rows.push([
          'Team Lead',
          t.leaderName,
          t.leaderEmail,
          getEffectiveMobile(t) ? `+91 ${getEffectiveMobile(t)}` : '',
          t.teamName,
          t.id,
          t.institution,
          t.trackId,
          t.paymentStatus || 'PENDING',
        ]);
        if (t.members) {
          t.members.forEach((m, idx) => {
            rows.push([
              `Member #${idx + 2}`,
              m.name,
              m.email,
              m.mobile ? `+91 ${m.mobile}` : '',
              t.teamName,
              t.id,
              t.institution,
              t.trackId,
              t.paymentStatus || 'PENDING',
            ]);
          });
        }
      });

      csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');
    } else {
      const headers = [
        'Registration ID',
        'Team Name',
        'Track',
        'Lead Name',
        'Lead Email',
        'Lead Mobile',
        'Team Size',
        'Fee (INR)',
        'Payment Status',
        'Project Title',
        'Abstract',
        'College',
        'Submitted At',
      ];
      const rows = targets.map((t) => [
        t.id,
        t.teamName,
        t.trackId,
        t.leaderName,
        t.leaderEmail,
        getEffectiveMobile(t),
        t.memberCount,
        t.registrationFee || calculateRegistrationFee(t.memberCount),
        t.paymentStatus || 'PENDING',
        t.projectTitle,
        t.abstract,
        t.institution,
        formatDate(t.createdAt),
      ]);
      csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `harmonia-2027-${type}-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportNotice(null);
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const q = searchQuery.toLowerCase().trim();
    const effectiveMobile = getEffectiveMobile(reg);

    const matchesSearch =
      !q ||
      reg.teamName.toLowerCase().includes(q) ||
      reg.leaderName.toLowerCase().includes(q) ||
      reg.leaderEmail.toLowerCase().includes(q) ||
      reg.institution.toLowerCase().includes(q) ||
      reg.projectTitle.toLowerCase().includes(q) ||
      reg.abstract.toLowerCase().includes(q) ||
      reg.id.toLowerCase().includes(q) ||
      effectiveMobile.includes(q) ||
      (reg.members && reg.members.some((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.mobile.includes(q)));

    const matchesTrack = selectedTrackFilter === 'all' || reg.trackId === selectedTrackFilter;
    const matchesStatus = selectedStatusFilter === 'all' || (reg.status || 'Submitted') === selectedStatusFilter;
    const matchesSize = selectedSizeFilter === 'all' || reg.memberCount === Number(selectedSizeFilter);
    const matchesPayment = paymentStatusFilter === 'all' || (reg.paymentStatus || 'PENDING') === paymentStatusFilter;

    if (activeTab === 'payments') {
      return matchesSearch && matchesPayment && matchesTrack;
    }
    return matchesSearch && matchesTrack && matchesStatus && matchesSize;
  });

  const totalPages = Math.ceil(filteredRegistrations.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, startIndex + PAGE_SIZE);

  // Key KPI Metrics
  const totalTeams = registrations.length;
  const totalParticipants = registrations.reduce((sum, r) => sum + r.memberCount, 0);
  const pendingPaymentsCount = registrations.filter((r) => (r.paymentStatus || 'PENDING') === 'PENDING').length;
  const verifiedPaymentsCount = registrations.filter((r) => r.paymentStatus === 'VERIFIED').length;
  const rejectedPaymentsCount = registrations.filter((r) => r.paymentStatus === 'REJECTED').length;
  const totalRevenue = registrations
    .filter((r) => r.paymentStatus === 'VERIFIED')
    .reduce((sum, r) => sum + (r.registrationFee || calculateRegistrationFee(r.memberCount)), 0);

  const trackBreakdown = HACKATHON_TRACKS.map((t) => ({
    track: t,
    count: registrations.filter((r) => r.trackId === t.id).length,
  }));

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/coordinator/dashboard' },
    { id: 'registrations', label: 'Registrations', icon: Users, path: '/coordinator/registrations', badge: totalTeams },
    { id: 'payments', label: 'Payment Verification', icon: CreditCard, path: '/coordinator/payments', badge: pendingPaymentsCount, alertBadge: true },
    { id: 'abstracts', label: 'Abstracts & Ideas', icon: Lightbulb, path: '/coordinator/abstracts' },
    { id: 'participants', label: 'Participant Roster', icon: UserCheck, path: '/coordinator/participants' },
    { id: 'qr-settings', label: 'Payment QR Settings', icon: QrCode, path: '/coordinator/qr-settings' },
    { id: 'export', label: 'CSV Data Export', icon: FileSpreadsheet, path: '/coordinator/export' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* ========================================================= */}
      {/* TOP COORDINATOR HEADER BAR (Crisp Light Professional Theme) */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src={OFFICIAL_LOGOS.rit}
                alt="RIT Logo"
                className="h-8 w-auto object-contain rounded border border-slate-200 px-1 py-0.5 bg-white"
              />
              <span className="h-5 w-[1px] bg-slate-200" />
              <img
                src={OFFICIAL_LOGOS.harmonia}
                alt="HARMONIA Logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                  Coordinator Administrative Portal
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
              <div className="text-xs font-bold text-[#13354B]">
                HARMONIA 2027 · International Hackathon Management
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:block text-right">
              <div className="text-xs font-extrabold text-slate-900">{coordinator.displayName}</div>
              {lastFetched && (
                <div className="text-[10px] text-slate-500 font-medium">Synced: {lastFetched}</div>
              )}
            </div>

            {/* Quick manual refresh */}
            <button
              type="button"
              onClick={handleForceRefresh}
              disabled={isLoading}
              title="Force Refresh Data"
              className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#6B1FE0]' : ''}`} />
            </button>

            {/* Open Public Website Link */}
            <button
              type="button"
              onClick={() => onNavigate('/')}
              title="Open Public Hackathon Website"
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-[#6B1FE0] hover:bg-purple-100 transition shadow-xs cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Public Site</span>
            </button>

            {/* Sign Out */}
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* BODY WORKSPACE: Persistent Light Sidebar + Clean Views    */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP LIGHT SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/90 bg-white p-4 space-y-6 shrink-0 shadow-2xs">
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.path);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-purple-50 text-[#6B1FE0] border border-purple-200 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#6B1FE0]' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        item.alertBadge
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs space-y-1 shadow-2xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Cloud Firestore</span>
              </div>
              <div className="text-[11px] text-[#6B1FE0] font-mono font-bold">harmonium-f3bba</div>
              <div className="text-[10px] text-slate-500 leading-tight">Live sync active across all participant phones &amp; laptops.</div>
            </div>
          </div>
        </aside>

        {/* MOBILE NAVIGATION DRAWER */}
        <AnimatePresence>
          {isMobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, x: -200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -200 }}
              className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex"
            >
              <div className="w-72 bg-white border-r border-slate-200 p-5 space-y-6 flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <span className="text-xs font-extrabold text-[#6B1FE0] uppercase tracking-wider">Coordinator Menu</span>
                    <button
                      type="button"
                      onClick={() => setIsMobileNavOpen(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onNavigate(item.path);
                            setIsMobileNavOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-purple-50 text-[#6B1FE0] border border-purple-200 shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`h-4 w-4 ${isActive ? 'text-[#6B1FE0]' : 'text-slate-500'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/');
                    setIsMobileNavOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 py-2.5 text-xs font-bold text-[#6B1FE0] shadow-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Public Website</span>
                </button>
              </div>
              <div className="flex-1" onClick={() => setIsMobileNavOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN ADMIN WORKSPACE (LIGHT, CLEAN & ELEGANT) */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Status Alert Banner */}
          {statusNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{statusNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-emerald-600 hover:text-emerald-900"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: DASHBOARD OVERVIEW (/coordinator/dashboard)     */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                  Executive Hackathon Overview
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Live real-time statistics from HARMONIA 2027 registered teams, proposals, and verified UPI payments.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#13354B] to-[#1E5070] p-5 text-white shadow-md shadow-slate-300/30">
                  <div className="flex items-center gap-2 text-teal-300 text-xs font-bold mb-1">
                    <Trophy className="h-4 w-4" />
                    <span>Total Teams</span>
                  </div>
                  <div className="text-3xl font-black">{totalTeams}</div>
                  <div className="mt-1 text-[11px] text-teal-200/80">Submitted proposals</div>
                </div>

                <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-[#6B1FE0] to-[#8F28E8] p-5 text-white shadow-md shadow-purple-500/20">
                  <div className="flex items-center gap-2 text-purple-200 text-xs font-bold mb-1">
                    <Users className="h-4 w-4" />
                    <span>Total Innovators</span>
                  </div>
                  <div className="text-3xl font-black">{totalParticipants}</div>
                  <div className="mt-1 text-[11px] text-purple-200/80">Participants registered</div>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-md shadow-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified Collections</span>
                  </div>
                  <div className="text-3xl font-black">₹{totalRevenue.toLocaleString('en-IN')}</div>
                  <div className="mt-1 text-[11px] text-emerald-100/90">{verifiedPaymentsCount} verified registrations</div>
                </div>

                <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-md shadow-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-100 text-xs font-bold mb-1">
                    <Clock className="h-4 w-4" />
                    <span>Pending Proofs</span>
                  </div>
                  <div className="text-3xl font-black">{pendingPaymentsCount}</div>
                  <div className="mt-1 text-[11px] text-amber-100/90">Awaiting verification</div>
                </div>
              </div>

              {/* Track Distribution */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <BarChart3 className="h-4 w-4 text-[#6B1FE0]" />
                    <span>Registrations by Problem Track</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {trackBreakdown.map(({ track, count }) => (
                    <div
                      key={track.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-center hover:bg-white hover:border-purple-200 hover:shadow-xs transition"
                    >
                      <div className="text-[11px] font-bold text-slate-700 truncate">
                        {track.title}
                      </div>
                      <div className="mt-1 text-2xl font-black text-[#13354B]">
                        {count}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Teams</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('/coordinator/payments')}
                  className="rounded-2xl border border-amber-200 bg-white p-5 text-left hover:border-amber-400 hover:shadow-md transition cursor-pointer flex items-center justify-between bg-gradient-to-br from-amber-50/50 to-white"
                >
                  <div>
                    <div className="text-xs font-extrabold text-amber-800">Payment Verification Portal</div>
                    <div className="text-xs text-slate-500 mt-1">{pendingPaymentsCount} pending proofs to inspect</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/coordinator/registrations')}
                  className="rounded-2xl border border-purple-200 bg-white p-5 text-left hover:border-purple-400 hover:shadow-md transition cursor-pointer flex items-center justify-between bg-gradient-to-br from-purple-50/50 to-white"
                >
                  <div>
                    <div className="text-xs font-extrabold text-[#6B1FE0]">Submissions Roster</div>
                    <div className="text-xs text-slate-500 mt-1">Review all {totalTeams} teams and change review statuses</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-purple-100 text-[#6B1FE0] flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/coordinator/export')}
                  className="rounded-2xl border border-blue-200 bg-white p-5 text-left hover:border-blue-400 hover:shadow-md transition cursor-pointer flex items-center justify-between bg-gradient-to-br from-blue-50/50 to-white"
                >
                  <div>
                    <div className="text-xs font-extrabold text-blue-800">Data Export (CSV)</div>
                    <div className="text-xs text-slate-500 mt-1">Export structured spreadsheets for reports</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Download className="h-5 w-5" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: REGISTRATIONS TABLE (/coordinator/registrations) */}
          {/* ======================================================== */}
          {activeTab === 'registrations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                    Team Submissions &amp; Registrations
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Manage and review all {registrations.length} registered hackathon teams.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-[#13354B] text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-[#13354B] text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cards
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teams, leads, emails, abstracts..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6B1FE0] focus:outline-none transition"
                  />
                </div>

                <select
                  value={selectedTrackFilter}
                  onChange={(e) => setSelectedTrackFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#6B1FE0] focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All 5 Tracks</option>
                  {HACKATHON_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#6B1FE0] focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Review Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Finalist">Finalist</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  value={selectedSizeFilter}
                  onChange={(e) => setSelectedSizeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#6B1FE0] focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Sizes (1–4)</option>
                  <option value="1">1 (Solo)</option>
                  <option value="2">2 Members</option>
                  <option value="3">3 Members</option>
                  <option value="4">4 Members</option>
                </select>
              </div>

              {/* Data Table */}
              {isLoading ? (
                <div className="py-20 text-center rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#6B1FE0] mx-auto mb-2" />
                  <span className="text-xs text-slate-500 font-medium">Loading registrations...</span>
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <p className="text-sm font-bold text-slate-700">No teams found matching your filters.</p>
                </div>
              ) : viewMode === 'table' ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Team Name &amp; ID</th>
                        <th className="px-4 py-3">Track</th>
                        <th className="px-4 py-3">Leader &amp; Contact</th>
                        <th className="px-4 py-3">Institution</th>
                        <th className="px-4 py-3 text-center">Size</th>
                        <th className="px-4 py-3 text-center">Fee</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Review Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRegistrations.map((reg) => {
                        const trackObj = HACKATHON_TRACKS.find((t) => t.id === reg.trackId);
                        const mobile = getEffectiveMobile(reg);
                        const trackColor = TRACK_COLOR_MAP[reg.trackId] || 'bg-slate-100 text-slate-700 border-slate-200';
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-extrabold text-[#13354B]">{reg.teamName}</div>
                              <div className="font-mono text-[10px] text-slate-400">{reg.id}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${trackColor}`}>
                                {trackObj?.title || reg.trackId}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{reg.leaderName}</div>
                              <div className="text-[11px] text-slate-500">{reg.leaderEmail}</div>
                              {mobile && (
                                <div className="font-mono text-emerald-600 text-[10px] font-bold">+91 {mobile}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[180px] truncate text-slate-600">
                              {reg.institution}
                            </td>
                            <td className="px-4 py-3 text-center font-bold font-mono text-slate-800">
                              {reg.memberCount}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-emerald-600 font-mono">
                              ₹{reg.registrationFee || calculateRegistrationFee(reg.memberCount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                                  PAYMENT_STATUS_COLOR_MAP[reg.paymentStatus || 'PENDING']
                                }`}
                              >
                                {reg.paymentStatus || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={reg.status || 'Submitted'}
                                onChange={(e) =>
                                  setStatusConfirmTarget({
                                    team: reg,
                                    nextStatus: e.target.value as SubmissionStatus,
                                  })
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#6B1FE0] cursor-pointer"
                              >
                                <option value="Submitted">Submitted</option>
                                <option value="Under Review">Under Review</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Finalist">Finalist</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedAbstractTeam(reg)}
                                className="rounded-lg bg-purple-50 text-[#6B1FE0] border border-purple-200 px-2.5 py-1 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
                              >
                                View Abstract
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedRegistrations.map((reg) => {
                    const trackObj = HACKATHON_TRACKS.find((t) => t.id === reg.trackId);
                    const mobile = getEffectiveMobile(reg);
                    const trackColor = TRACK_COLOR_MAP[reg.trackId] || 'bg-slate-100 text-slate-700 border-slate-200';
                    return (
                      <div
                        key={reg.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono text-[10px] text-slate-400">{reg.id}</span>
                            <h3 className="text-base font-extrabold text-[#13354B]">{reg.teamName}</h3>
                            <div className="text-xs text-slate-500">{reg.institution}</div>
                          </div>
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${trackColor}`}>
                            {trackObj?.title || reg.trackId}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1">
                          <div className="text-[10px] font-bold text-[#6B1FE0] uppercase tracking-wider">Project Title</div>
                          <div className="text-xs font-extrabold text-slate-800">{reg.projectTitle}</div>
                          <div className="text-xs text-slate-600 line-clamp-2 mt-1">{reg.abstract}</div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-slate-500">Lead: </span>
                            <span className="font-bold text-slate-800">{reg.leaderName}</span>
                            {mobile && <span className="font-mono text-emerald-600 font-bold ml-1.5">+91 {mobile}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedAbstractTeam(reg)}
                            className="text-xs font-bold text-[#6B1FE0] hover:underline cursor-pointer"
                          >
                            Full Proposal →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <span>
                    Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredRegistrations.length)} of {filteredRegistrations.length} teams
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      Previous
                    </button>
                    <span className="font-bold text-slate-900">{currentPage} / {totalPages}</span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: PAYMENTS VERIFICATION (/coordinator/payments)   */}
          {/* ======================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                  Payment Verification &amp; Audit
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Inspect participant UPI transaction screenshots and approve or reject registrations in real-time.
                </p>
              </div>

              {/* Quick filter pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('all')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    paymentStatusFilter === 'all'
                      ? 'bg-[#13354B] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All ({registrations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('PENDING')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    paymentStatusFilter === 'PENDING'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Pending ({pendingPaymentsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('VERIFIED')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    paymentStatusFilter === 'VERIFIED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Verified ({verifiedPaymentsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('REJECTED')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    paymentStatusFilter === 'REJECTED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Rejected ({rejectedPaymentsCount})
                </button>
              </div>

              {/* Payment Proofs List */}
              <div className="space-y-4">
                {filteredRegistrations.map((reg) => {
                  const fee = reg.registrationFee || calculateRegistrationFee(reg.memberCount);
                  const pStatus = reg.paymentStatus || 'PENDING';
                  const mobile = getEffectiveMobile(reg);

                  return (
                    <div
                      key={reg.id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:shadow-md transition"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{reg.id}</span>
                          <h3 className="text-base font-extrabold text-[#13354B]">{reg.teamName}</h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                              PAYMENT_STATUS_COLOR_MAP[pStatus]
                            }`}
                          >
                            {pStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span><strong>Lead:</strong> {reg.leaderName}</span>
                          <span><strong>Email:</strong> {reg.leaderEmail}</span>
                          {mobile && <span className="font-mono text-emerald-600 font-bold">+91 {mobile}</span>}
                          <span><strong>Size:</strong> {reg.memberCount} Members</span>
                        </div>
                        {pStatus === 'REJECTED' && reg.paymentRejectionReason && (
                          <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                            <strong>Reason:</strong> {reg.paymentRejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Amount and Proof thumbnail */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Amount Due</div>
                          <div className="text-lg font-black text-emerald-600">₹{fee}</div>
                        </div>

                        {reg.paymentScreenshotUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshotReg(reg)}
                            className="group relative h-16 w-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-[#6B1FE0] shadow-2xs hover:shadow-xs transition cursor-pointer"
                            title="Click to zoom payment proof"
                          >
                            <img
                              src={reg.paymentScreenshotUrl}
                              alt="Payment Proof"
                              className="h-full w-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-[10px] text-slate-400 text-center p-1">
                            <ImageIcon className="h-4 w-4 mb-0.5" />
                            <span>No Proof</span>
                          </div>
                        )}
                      </div>

                      {/* Verification Controls */}
                      <div className="flex items-center md:flex-col gap-2 shrink-0">
                        {reg.paymentScreenshotUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshotReg(reg)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Proof</span>
                          </button>
                        )}

                        {pStatus !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyPayment(reg)}
                            className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Verify Payment</span>
                          </button>
                        )}

                        {pStatus !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(reg)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: ABSTRACTS & IDEAS (/coordinator/abstracts)      */}
          {/* ======================================================== */}
          {activeTab === 'abstracts' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                  Technical Abstracts &amp; Innovation Proposals
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Read, evaluate, and search the technical solutions proposed by all teams.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="rounded-2xl border border-slate-200/90 bg-white p-6 space-y-4 shadow-xs hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400">{reg.id}</span>
                        <h3 className="text-base font-extrabold text-[#13354B]">{reg.teamName}</h3>
                        <div className="text-xs font-bold text-[#6B1FE0] mt-0.5">
                          {HACKATHON_TRACKS.find((t) => t.id === reg.trackId)?.title || reg.trackId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(reg.abstract);
                          setCopiedId(reg.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {copiedId === reg.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === reg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project Title</div>
                      <div className="text-xs font-extrabold text-slate-900 mt-0.5">{reg.projectTitle}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Technical Abstract</div>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                        {reg.abstract}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span><strong>Lead:</strong> {reg.leaderName} ({reg.institution})</span>
                      <span><strong>Size:</strong> {reg.memberCount} Members</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 5: PARTICIPANT ROSTER (/coordinator/participants)   */}
          {/* ======================================================== */}
          {activeTab === 'participants' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                  Participant Directory &amp; Roster
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Individual directory of team leads and team members with contact numbers and college affiliations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Participant Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Team Name</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Mobile (+91)</th>
                      <th className="px-4 py-3">Institution</th>
                      <th className="px-4 py-3">Track</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrations.map((t) => {
                      const trackObj = HACKATHON_TRACKS.find((track) => track.id === t.trackId);
                      const leadMobile = getEffectiveMobile(t);
                      return (
                        <React.Fragment key={t.id}>
                          {/* Team Lead */}
                          <tr className="hover:bg-purple-50/30 transition bg-purple-50/15">
                            <td className="px-4 py-3 font-extrabold text-[#13354B] whitespace-nowrap">
                              {t.leaderName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-[#6B1FE0] border border-purple-200">
                                Team Lead
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                              {t.teamName}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {t.leaderEmail}
                            </td>
                            <td className="px-4 py-3 font-mono text-emerald-600 font-bold whitespace-nowrap">
                              {leadMobile ? `+91 ${leadMobile}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                              {t.institution}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                              {trackObj?.title || t.trackId}
                            </td>
                          </tr>

                          {/* Additional Members */}
                          {t.members &&
                            t.members.map((m, idx) => (
                              <tr key={`${t.id}-m-${idx}`} className="hover:bg-slate-50 transition">
                                <td className="px-4 py-2.5 text-slate-700 pl-8 whitespace-nowrap">
                                  {m.name}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                    Member #{idx + 2}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                  {t.teamName}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                  {m.email}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                                  {m.mobile ? `+91 ${m.mobile}` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">
                                  {t.institution}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                                  {trackObj?.title || t.trackId}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 6: PAYMENT QR SETTINGS (/coordinator/qr-settings)   */}
          {/* ======================================================== */}
          {activeTab === 'qr-settings' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                  Payment QR Code Settings
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Manage the official UPI payment QR code displayed to participants on the registration page.
                </p>
              </div>

              {qrUpdateSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{qrUpdateSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
                {/* Current QR */}
                <div className="flex flex-col items-center p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                    Active Payment QR
                  </span>
                  <div className="h-56 w-56 rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-xs overflow-hidden flex items-center justify-center">
                    <img
                      src={activePaymentQr}
                      alt="Active Payment QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Displayed at Step 4 of the participant registration wizard.
                  </div>
                </div>

                {/* Replace Action */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="font-bold text-slate-900">Upload New QR Code</div>
                    <div className="text-slate-600 leading-relaxed">
                      Upload an updated official UPI QR code (PNG, JPG, SVG, or WEBP). Ensure the QR code has clear contrast and contains your verified merchant UPI ID.
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      Choose New Image File
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleQrFileInputChange}
                      className="block w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#13354B] file:text-white hover:file:opacity-90 file:cursor-pointer cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-2"
                    />
                  </label>

                  {newQrFilePreview && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3 shadow-2xs">
                      <div className="text-xs font-bold text-[#6B1FE0]">Preview:</div>
                      <div className="h-40 w-40 mx-auto rounded-xl border border-purple-200 bg-white p-2 shadow-xs">
                        <img src={newQrFilePreview} alt="Preview" className="h-full w-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setNewQrFilePreview(null)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmQrReplace}
                          disabled={isUpdatingQr}
                          className="rounded-xl bg-[#6B1FE0] px-5 py-2 text-xs font-bold text-white hover:opacity-95 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdatingQr ? 'Updating...' : 'Confirm & Save QR'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 7: CSV EXPORT (/coordinator/export)                 */}
          {/* ======================================================== */}
          {activeTab === 'export' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#13354B]">
                  Data Export Center
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Download complete registration records and participant rosters in structured CSV format.
                </p>
              </div>

              {exportNotice && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-xs font-bold text-[#6B1FE0] flex items-center gap-2 shadow-xs">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{exportNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs hover:shadow-md transition">
                  <div className="font-extrabold text-[#13354B] text-sm">All Registrations</div>
                  <div className="text-xs text-slate-500">Complete list of all {totalTeams} teams, proposals, and contact details.</div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('all')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#13354B] py-2.5 text-xs font-bold text-white hover:opacity-95 shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download All Teams CSV</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs hover:shadow-md transition">
                  <div className="font-extrabold text-[#13354B] text-sm">Verified Payments Only</div>
                  <div className="text-xs text-slate-500">{verifiedPaymentsCount} teams with officially verified registrations and fees.</div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('verified_payments')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Verified CSV</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs hover:shadow-md transition">
                  <div className="font-extrabold text-[#13354B] text-sm">Pending Payments</div>
                  <div className="text-xs text-slate-500">{pendingPaymentsCount} teams awaiting verification of uploaded transaction proofs.</div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('pending_payments')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Pending CSV</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs hover:shadow-md transition">
                  <div className="font-extrabold text-[#13354B] text-sm">Individual Participants Roster</div>
                  <div className="text-xs text-slate-500">{totalParticipants} individuals (leads + all team members) with mobile numbers.</div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('participants')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B1FE0] py-2.5 text-xs font-bold text-white hover:opacity-95 shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Participants CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL: Payment Screenshot Zoom Viewer (Light Theme)     */}
      {/* ======================================================== */}
      {selectedScreenshotReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#13354B]">
                  Payment Proof — {selectedScreenshotReg.teamName}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Amount: ₹{selectedScreenshotReg.registrationFee || calculateRegistrationFee(selectedScreenshotReg.memberCount)} · Status: {selectedScreenshotReg.paymentStatus || 'PENDING'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScreenshotReg(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center">
              <img
                src={selectedScreenshotReg.paymentScreenshotUrl}
                alt="Proof screenshot"
                className="max-h-[55vh] w-auto object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedScreenshotReg(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenRejectModal(selectedScreenshotReg);
                  }}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Reject Proof
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyPayment(selectedScreenshotReg)}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Verify &amp; Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Reject Reason (Light Theme)                       */}
      {/* ======================================================== */}
      {paymentRejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-md w-full rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#13354B]">
                Reject Payment Proof — {paymentRejectTarget.teamName}
              </h3>
              <button
                type="button"
                onClick={() => setPaymentRejectTarget(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Select Reason for Rejection:
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-[#6B1FE0] focus:outline-none cursor-pointer"
              >
                <option value="Payment screenshot is unclear or incomplete.">Screenshot is blurry or unreadable</option>
                <option value="Transaction reference (UTR) is missing or cropped out.">UTR / Transaction ID missing</option>
                <option value="Amount paid does not match the team fee calculation.">Incorrect amount paid</option>
                <option value="Duplicate screenshot submitted for multiple teams.">Duplicate payment screenshot</option>
                <option value="custom">Other (write custom message below)</option>
              </select>

              {rejectReason === 'custom' && (
                <textarea
                  rows={3}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Enter specific instructions for the participant..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:border-[#6B1FE0] focus:outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setPaymentRejectTarget(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectPayment}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Full Abstract Detail Viewer (Light Theme)         */}
      {/* ======================================================== */}
      {selectedAbstractTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs text-slate-400">{selectedAbstractTeam.id}</span>
                <h2 className="text-lg font-black text-[#13354B]">{selectedAbstractTeam.teamName}</h2>
                <div className="text-xs font-bold text-[#6B1FE0] mt-0.5">
                  Track: {HACKATHON_TRACKS.find((t) => t.id === selectedAbstractTeam.trackId)?.title || selectedAbstractTeam.trackId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAbstractTeam(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-bold text-[#6B1FE0] uppercase tracking-wider">Proposed Solution Title</div>
              <div className="text-sm font-extrabold text-slate-900 mt-1">{selectedAbstractTeam.projectTitle}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submitted Technical Abstract</div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80 whitespace-pre-wrap">
                {selectedAbstractTeam.abstract}
              </p>
            </div>

            {selectedAbstractTeam.inclusionImpact && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inclusion &amp; Social Impact</div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80 whitespace-pre-wrap">
                  {selectedAbstractTeam.inclusionImpact}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team Members &amp; Contacts</div>
              <div className="text-xs text-slate-800">
                <strong>Team Lead:</strong> {selectedAbstractTeam.leaderName} ({selectedAbstractTeam.leaderEmail}) · Phone: +91 {getEffectiveMobile(selectedAbstractTeam)}
              </div>
              {selectedAbstractTeam.members && selectedAbstractTeam.members.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1 text-xs text-slate-600">
                  {selectedAbstractTeam.members.map((m, idx) => (
                    <div key={idx}>
                      <strong>Member #{idx + 2}:</strong> {m.name} ({m.email}) {m.mobile ? `· +91 ${m.mobile}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedAbstractTeam(null)}
                className="rounded-xl bg-[#13354B] px-5 py-2 text-xs font-bold text-white hover:opacity-95 shadow-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Status Change Confirm (Light Theme)               */}
      {/* ======================================================== */}
      {statusConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-md w-full rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-[#13354B]">
              Confirm Status Change
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to update review status of team <strong>&quot;{statusConfirmTarget.team.teamName}&quot;</strong> to <span className="text-[#6B1FE0] font-bold">{statusConfirmTarget.nextStatus}</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusConfirmTarget(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="rounded-xl bg-[#6B1FE0] px-5 py-2 text-xs font-bold text-white hover:opacity-95 shadow-xs cursor-pointer"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
