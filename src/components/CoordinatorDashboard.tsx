import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getDocs, onSnapshot, collection as firestoreCollection, doc, updateDoc, query, limit } from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { HACKATHON_TRACKS, OFFICIAL_LOGOS, INITIAL_REGISTRATIONS, SubmissionStatus, TeamMember, calculateRegistrationFee } from '../utils/hackathonLogic';
import { fetchActivePaymentQr, updateActivePaymentQr, DEFAULT_PAYMENT_QR_URL } from '../utils/paymentQr';
import {
  Users,
  LogOut,
  RefreshCw,
  Trophy,
  BarChart3,
  Shield,
  Search,
  FileText,
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
  Download,
  Calendar,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  QrCode,
  Image,
  Eye,
  CheckCheck,
  AlertCircle,
  Upload,
} from 'lucide-react';

interface CoordinatorUser {
  username: string;
  role: 'coordinator';
  displayName: string;
}

interface CoordinatorDashboardProps {
  coordinator: CoordinatorUser;
  onSignOut: () => void;
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
  // Mandatory Server-Trusted Payment Fields
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
  linguaverse: 'bg-blue-100 text-blue-800 border-blue-200',
  abilityx: 'bg-green-100 text-green-800 border-green-200',
  roots: 'bg-amber-100 text-amber-800 border-amber-200',
  flowforge: 'bg-purple-100 text-purple-800 border-purple-200',
  iotverse: 'bg-slate-100 text-slate-800 border-slate-200',
};

const STATUS_COLOR_MAP: Record<SubmissionStatus, string> = {
  Submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  'Under Review': 'bg-amber-100 text-amber-800 border-amber-200',
  Shortlisted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Finalist: 'bg-purple-100 text-purple-800 border-purple-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
};

const PAYMENT_STATUS_COLOR_MAP: Record<'PENDING' | 'VERIFIED' | 'REJECTED', string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
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

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  coordinator,
  onSignOut,
}) => {
  const [registrations, setRegistrations] = useState<RegistrationDoc[]>([]);
  const [participants, setParticipants] = useState<Record<string, ParticipantDoc>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Main Dashboard Tab: 'submissions' | 'payments' | 'qr_management'
  const [dashboardTab, setDashboardTab] = useState<'submissions' | 'payments' | 'qr_management'>('submissions');

  // Filters & Views for Submissions
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
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

  // CSV Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Pagination for high scalability (10k participants)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Status Change Confirmation Modal
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    team: RegistrationDoc;
    nextStatus: SubmissionStatus;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

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

  const fetchData = async () => {
    setIsLoading(true);
    let allRegs: RegistrationDoc[] = [];

    // 1. Fetch from Firestore with bounded limit for high performance
    try {
      const regSnap = await getDocs(
        query(firestoreCollection(db, 'registrations'), limit(500))
      );
      if (!regSnap.empty) {
        allRegs = regSnap.docs.map(parseRegistrationDoc);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'registrations');
    }

    // 2. Fallback to mock records only if completely empty across the database
    if (allRegs.length === 0) {
      allRegs = INITIAL_REGISTRATIONS.map((r) => ({
        ...r,
        registrationFee: calculateRegistrationFee(r.memberCount),
        paymentStatus: 'VERIFIED',
      }));
    }

    // 3. Fetch participant profiles
    try {
      const partSnap = await getDocs(
        query(firestoreCollection(db, 'participants'), limit(500))
      );
      const partMap: Record<string, ParticipantDoc> = {};
      partSnap.forEach((d) => {
        const p = d.data() as ParticipantDoc;
        if (p.mobile) {
          partMap[p.mobile.replace(/\D/g, '')] = p;
        }
        if (p.email) {
          partMap[p.email.toLowerCase()] = p;
        }
      });
      setParticipants(partMap);
    } catch {
      // ignore
    }

    setRegistrations(sortRegistrationsDesc(allRegs));
    setIsLoading(false);
    setLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Real-Time Cross-Device Synchronization Listener
  useEffect(() => {
    setIsLoading(true);
    const q = query(firestoreCollection(db, 'registrations'), limit(500));
    
    // Set up active real-time snapshot listener on Cloud Firestore
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudRegs = snapshot.docs.map(parseRegistrationDoc);
          setRegistrations(sortRegistrationsDesc(cloudRegs));
        } else {
          // If no registrations in Firestore, fallback to initial mock records
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

    // Fetch participant profiles for cross-referencing contact info
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

    const matchesTrack =
      selectedTrackFilter === 'all' || reg.trackId === selectedTrackFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' || (reg.status || 'Submitted') === selectedStatusFilter;

    const matchesSize =
      selectedSizeFilter === 'all' || reg.memberCount === Number(selectedSizeFilter);

    const matchesPayment =
      paymentStatusFilter === 'all' || (reg.paymentStatus || 'PENDING') === paymentStatusFilter;

    if (dashboardTab === 'payments') {
      return matchesSearch && matchesPayment && matchesTrack;
    }

    return matchesSearch && matchesTrack && matchesStatus && matchesSize;
  });

  const totalPages = Math.ceil(filteredRegistrations.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRegistrations = filteredRegistrations.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const handleCopyAbstract = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ================= STATUS MANAGEMENT =================
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    const { team, nextStatus } = statusConfirmTarget;

    try {
      const docRef = doc(db, 'registrations', team.id);
      await updateDoc(docRef, {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Local fallback
    }

    setRegistrations((prev) =>
      prev.map((r) => (r.id === team.id ? { ...r, status: nextStatus } : r))
    );

    if (selectedAbstractTeam && selectedAbstractTeam.id === team.id) {
      setSelectedAbstractTeam((prev) =>
        prev ? { ...prev, status: nextStatus } : null
      );
    }

    setStatusNotice(
      `Team "${team.teamName}" status updated to ${nextStatus}.`
    );
    setStatusConfirmTarget(null);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // ================= PAYMENT ACTIONS =================
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
      console.warn('[HARMONIA] Firestore payment verification notice:', err);
    }

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === team.id
          ? {
              ...r,
              paymentStatus: 'VERIFIED',
              paymentVerifiedAt: timestamp,
              paymentVerifiedBy: verifiedBy,
            }
          : r
      )
    );

    if (selectedAbstractTeam && selectedAbstractTeam.id === team.id) {
      setSelectedAbstractTeam((prev) =>
        prev ? { ...prev, paymentStatus: 'VERIFIED' } : null
      );
    }

    setStatusNotice(`Payment for "${team.teamName}" (₹${team.registrationFee}) officially verified!`);
    setSelectedScreenshotReg(null);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  const handleOpenRejectModal = (team: RegistrationDoc) => {
    setPaymentRejectTarget(team);
    setRejectReason('Payment screenshot is unclear or truncated.');
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
      console.warn('[HARMONIA] Firestore payment reject notice:', err);
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
            }
          : r
      )
    );

    if (selectedAbstractTeam && selectedAbstractTeam.id === paymentRejectTarget.id) {
      setSelectedAbstractTeam((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: 'REJECTED',
              paymentRejectionReason: finalReason,
            }
          : null
      );
    }

    setStatusNotice(`Payment for "${paymentRejectTarget.teamName}" rejected. Participant notified.`);
    setPaymentRejectTarget(null);
    setSelectedScreenshotReg(null);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // ================= QR MANAGEMENT =================
  const handleQrFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Please upload a PNG, JPG, WEBP, or SVG QR code image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewQrFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmQrReplace = async () => {
    if (!newQrFilePreview) return;
    setIsUpdatingQr(true);
    try {
      await updateActivePaymentQr(newQrFilePreview, coordinator.displayName || coordinator.username);
      setActivePaymentQr(newQrFilePreview);
      setNewQrFilePreview(null);
      setQrUpdateSuccess('Payment QR code updated successfully! All participants now see this active QR.');
      setTimeout(() => setQrUpdateSuccess(null), 5000);
    } catch (err) {
      console.error('[HARMONIA] QR update error:', err);
      alert('Unable to update payment QR. Please try again.');
    } finally {
      setIsUpdatingQr(false);
    }
  };

  // ================= ENHANCED CSV EXPORT =================
  const handleExecuteCsvExport = (
    exportType: 'all' | 'verified_payments' | 'pending_payments' | 'rejected_payments' | 'participants'
  ) => {
    setExportNotice('Preparing structured CSV export...');

    let targets = [...registrations];
    if (exportType === 'verified_payments') {
      targets = targets.filter((r) => r.paymentStatus === 'VERIFIED');
    } else if (exportType === 'pending_payments') {
      targets = targets.filter((r) => r.paymentStatus === 'PENDING');
    } else if (exportType === 'rejected_payments') {
      targets = targets.filter((r) => r.paymentStatus === 'REJECTED');
    }

    const today = new Date().toISOString().slice(0, 10);
    const escapeCell = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    if (exportType === 'participants') {
      // Individual participant level export
      const headers = [
        'Participant Role',
        'Full Name',
        'Email Address',
        'Mobile Number (+91)',
        'Team Name',
        'Registration ID',
        'Institution',
        'Track',
        'Team Size',
        'Payment Status',
        'Registration Date',
      ];

      const rows: (string | number)[][] = [];
      targets.forEach((team) => {
        // Team Lead
        rows.push([
          'Team Lead',
          team.leaderName,
          team.leaderEmail,
          getEffectiveMobile(team) ? `+91 ${getEffectiveMobile(team)}` : '',
          team.teamName,
          team.id,
          team.institution,
          team.trackId,
          team.memberCount,
          team.paymentStatus || 'PENDING',
          formatDate(team.createdAt),
        ]);

        // Members
        if (team.members && team.members.length > 0) {
          team.members.forEach((m, idx) => {
            rows.push([
              `Member #${idx + 2}`,
              m.name,
              m.email,
              m.mobile ? `+91 ${m.mobile}` : '',
              team.teamName,
              team.id,
              team.institution,
              team.trackId,
              team.memberCount,
              team.paymentStatus || 'PENDING',
              formatDate(team.createdAt),
            ]);
          });
        }
      });

      const csvContent =
        '\uFEFF' +
        [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `harmonia-2027-participants-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Team Registration Level Export
      const headers = [
        'Registration ID',
        'Team Name',
        'Team Size',
        'Registration Fee (INR)',
        'Payment Status',
        'Payment Rejection Reason',
        'Team Lead Name',
        'Team Lead Email',
        'Team Lead Mobile',
        'Member 2 Name',
        'Member 2 Email',
        'Member 2 Mobile',
        'Member 3 Name',
        'Member 3 Email',
        'Member 3 Mobile',
        'Member 4 Name',
        'Member 4 Email',
        'Member 4 Mobile',
        'Institution',
        'Track',
        'Project Title',
        'Technical Abstract',
        'IEEE Member Number',
        'Faculty Mentor',
        'Inclusion Impact',
        'Submission Status',
        'Created At',
        'Updated At',
      ];

      const rows: (string | number)[][] = targets.map((r) => {
        const m2 = r.members?.[0];
        const m3 = r.members?.[1];
        const m4 = r.members?.[2];

        return [
          r.id,
          r.teamName,
          r.memberCount,
          r.registrationFee || calculateRegistrationFee(r.memberCount),
          r.paymentStatus || 'PENDING',
          r.paymentRejectionReason || '',
          r.leaderName,
          r.leaderEmail,
          getEffectiveMobile(r) ? `+91 ${getEffectiveMobile(r)}` : '',
          m2?.name || '',
          m2?.email || '',
          m2?.mobile ? `+91 ${m2.mobile}` : '',
          m3?.name || '',
          m3?.email || '',
          m3?.mobile ? `+91 ${m3.mobile}` : '',
          m4?.name || '',
          m4?.email || '',
          m4?.mobile ? `+91 ${m4.mobile}` : '',
          r.institution,
          r.trackId,
          r.projectTitle,
          r.abstract,
          r.ieeeMemberId || '',
          r.mentorName || '',
          r.inclusionImpact || '',
          r.status || 'Submitted',
          formatDate(r.createdAt),
          r.updatedAt ? formatDate(r.updatedAt) : '',
        ];
      });

      const csvContent =
        '\uFEFF' +
        [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `harmonia-2027-${exportType}-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setExportNotice('✓ CSV exported successfully!');
    setTimeout(() => {
      setExportNotice(null);
      setIsExportModalOpen(false);
    }, 2000);
  };

  // Metric Computations
  const totalTeams = registrations.length;
  const totalParticipants = registrations.reduce(
    (sum, r) => sum + (Number(r.memberCount) || 1),
    0
  );
  const pendingPaymentsCount = registrations.filter(
    (r) => (r.paymentStatus || 'PENDING') === 'PENDING'
  ).length;
  const verifiedPaymentsCount = registrations.filter(
    (r) => r.paymentStatus === 'VERIFIED'
  ).length;
  const rejectedPaymentsCount = registrations.filter(
    (r) => r.paymentStatus === 'REJECTED'
  ).length;
  const totalRevenue = registrations
    .filter((r) => r.paymentStatus === 'VERIFIED')
    .reduce((sum, r) => sum + (r.registrationFee || calculateRegistrationFee(r.memberCount)), 0);

  const shortlistedCount = registrations.filter(
    (r) => r.status === 'Shortlisted' || r.status === 'Finalist'
  ).length;

  const trackBreakdown = HACKATHON_TRACKS.map((t) => ({
    track: t,
    count: registrations.filter((r) => r.trackId === t.id).length,
  }));

  return (
    <div className="relative min-h-screen bg-slate-100 text-[#172347]">
      {/* Top Coordinator Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-[#13354B] px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain rounded bg-white/20 p-1"
            />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>Coordinator Management Portal</span>
              </div>
              <h1 className="text-sm font-extrabold text-white">
                HARMONIA 2027 · International Hackathon Admin
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{coordinator.displayName}</div>
              {lastFetched && (
                <div className="text-[11px] text-teal-200">Refreshed: {lastFetched}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              title="Download all abstracts and team details as CSV"
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/40 bg-teal-500/20 px-3.5 py-1.5 text-xs font-bold text-teal-100 hover:bg-teal-500/30 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Export Data</span>
            </button>

            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="rounded-full border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-60"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600/80 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mx-auto max-w-7xl mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setDashboardTab('submissions');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              dashboardTab === 'submissions'
                ? 'bg-white text-[#13354B] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Submissions &amp; Abstracts ({totalTeams})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDashboardTab('payments');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              dashboardTab === 'payments'
                ? 'bg-white text-[#13354B] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Payment Verification</span>
            {pendingPaymentsCount > 0 && (
              <span className="rounded-full bg-amber-400 text-amber-950 px-2 py-0.2 text-[10px] font-extrabold">
                {pendingPaymentsCount} Pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('qr_management')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              dashboardTab === 'qr_management'
                ? 'bg-white text-[#13354B] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Payment QR Management</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {statusNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{statusNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* ================= TAB 1: SUBMISSIONS & ABSTRACTS ================= */}
        {dashboardTab === 'submissions' && (
          <div className="space-y-6">
            {/* Stats Summary Banner */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#13354B] to-[#1E5070] p-5 text-white shadow-sm">
                <div className="flex items-center gap-2 text-teal-200 text-xs font-bold mb-1">
                  <Trophy className="h-4 w-4" />
                  <span>Total Teams</span>
                </div>
                <div className="text-3xl font-extrabold">{totalTeams}</div>
                <div className="mt-1 text-[11px] text-teal-200/80">With full submitted abstracts</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#6B1FE0] to-[#8F28E8] p-5 text-white shadow-sm">
                <div className="flex items-center gap-2 text-purple-200 text-xs font-bold mb-1">
                  <Users className="h-4 w-4" />
                  <span>Total Innovators</span>
                </div>
                <div className="text-3xl font-extrabold">{totalParticipants}</div>
                <div className="mt-1 text-[11px] text-purple-200/80">All team members combined</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-sm">
                <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verified Payments</span>
                </div>
                <div className="text-3xl font-extrabold">{verifiedPaymentsCount}</div>
                <div className="mt-1 text-[11px] text-emerald-200/80">₹{totalRevenue.toLocaleString('en-IN')} total revenue</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-600 to-orange-700 p-5 text-white shadow-sm">
                <div className="flex items-center gap-2 text-amber-200 text-xs font-bold mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Pending Payments</span>
                </div>
                <div className="text-3xl font-extrabold">{pendingPaymentsCount}</div>
                <div className="mt-1 text-[11px] text-amber-200/80">Awaiting payment verification</div>
              </div>
            </div>

            {/* Track Distribution Pills */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <div className="flex items-center gap-2 text-[#172347]">
                  <BarChart3 className="h-4 w-4 text-[#6B1FE0]" />
                  <span>Submissions by Problem Track</span>
                </div>
                <span className="text-slate-400 font-normal">Click a track to filter</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {trackBreakdown.map(({ track, count }) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() =>
                      setSelectedTrackFilter(
                        selectedTrackFilter === track.id ? 'all' : track.id
                      )
                    }
                    className={`rounded-xl border p-2 text-center transition-all cursor-pointer ${
                      selectedTrackFilter === track.id
                        ? 'border-[#6B1FE0] bg-purple-50 ring-2 ring-purple-400'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] font-bold truncate text-[#172347]">
                      {track.title}
                    </div>
                    <div className="mt-0.5 text-base font-extrabold text-[#6B1FE0]">
                      {count}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & View Controls */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search abstracts, ideas, titles, team names, leads, mobile..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-[#172347] placeholder:text-slate-400 focus:border-[#6B1FE0] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Filters & View Mode */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Track Filter */}
                <select
                  value={selectedTrackFilter}
                  onChange={(e) => setSelectedTrackFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#172347] focus:border-[#6B1FE0] focus:outline-none"
                >
                  <option value="all">All 5 Tracks</option>
                  {HACKATHON_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#172347] focus:border-[#6B1FE0] focus:outline-none"
                >
                  <option value="all">All Review Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Finalist">Finalist</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {/* Team Size Filter */}
                <select
                  value={selectedSizeFilter}
                  onChange={(e) => setSelectedSizeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#172347] focus:border-[#6B1FE0] focus:outline-none"
                >
                  <option value="all">All Team Sizes (1–4)</option>
                  <option value="1">1 Member (Solo)</option>
                  <option value="2">2 Members</option>
                  <option value="3">3 Members</option>
                  <option value="4">4 Members</option>
                </select>

                {/* Toggle View Mode */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white text-[#6B1FE0] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💡 Cards ({filteredRegistrations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-[#6B1FE0] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Table View
                  </button>
                </div>
              </div>
            </div>

            {/* Results Display */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-slate-200 bg-white">
                <RefreshCw className="h-8 w-8 animate-spin text-[#6B1FE0] mb-3" />
                <span className="font-semibold text-xs text-slate-600">Loading all participant abstracts &amp; submissions...</span>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm font-bold text-slate-700">No submissions found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery
                    ? `No abstracts match "${searchQuery}". Try searching with different keywords.`
                    : 'Submissions from teams will appear here with full abstracts and contact details.'}
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              /* ABSTRACT & IDEA CARDS VIEW */
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {paginatedRegistrations.map((reg) => {
                  const trackObj = HACKATHON_TRACKS.find((t) => t.id === reg.trackId);
                  const mobile = getEffectiveMobile(reg);
                  const status = reg.status || 'Submitted';

                  return (
                    <motion.div
                      key={reg.id}
                      whileHover={{ y: -3 }}
                      className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="space-y-4">
                        {/* Header: ID, Team Name & Badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              {reg.id}
                            </span>
                            <h3 className="text-base font-extrabold text-[#172347]">
                              {reg.teamName}
                            </h3>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{reg.institution}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                TRACK_COLOR_MAP[reg.trackId] ||
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {trackObj?.title || reg.trackId}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                STATUS_COLOR_MAP[status] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>

                        {/* Project Idea Title */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B1FE0] block">
                            Proposed Solution Title
                          </span>
                          <p className="mt-0.5 text-xs font-bold text-[#172347]">
                            {reg.projectTitle}
                          </p>
                        </div>

                        {/* Technical Abstract */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1 text-[#13354B]">
                              <FileText className="h-3.5 w-3.5 text-[#6B1FE0]" />
                              <span>Submitted Abstract</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyAbstract(reg.id, reg.abstract)}
                              className="text-[10px] text-[#6B1FE0] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === reg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 bg-purple-50/40 p-3 rounded-xl border border-purple-100/60">
                            {reg.abstract}
                          </p>
                        </div>

                        {/* Team Lead & Member Breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Team Lead
                            </span>
                            <span className="font-semibold text-[#172347]">{reg.leaderName}</span>
                            <span className="text-[11px] text-slate-500 block truncate">{reg.leaderEmail}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Team Size &amp; Fee
                            </span>
                            <span className="font-semibold text-[#172347]">
                              {reg.memberCount} {reg.memberCount === 1 ? 'Member (Solo)' : 'Members'} · ₹{reg.registrationFee || calculateRegistrationFee(reg.memberCount)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${PAYMENT_STATUS_COLOR_MAP[reg.paymentStatus || 'PENDING']}`}>
                              Payment: {reg.paymentStatus || 'PENDING'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {mobile ? (
                            <div className="flex items-center gap-2 font-mono font-bold text-[#172347] text-xs">
                              <span>+91 {mobile}</span>
                              <a
                                href={`tel:+91${mobile}`}
                                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              >
                                Call
                              </a>
                              <a
                                href={`https://wa.me/91${mobile}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                              >
                                WhatsApp
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">No phone</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedAbstractTeam(reg)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#13354B] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-[#172347]">ID &amp; Team</th>
                        <th className="px-4 py-3 text-left font-bold text-[#172347]">Track</th>
                        <th className="px-4 py-3 text-left font-bold text-[#172347]">Review Status</th>
                        <th className="px-4 py-3 text-left font-bold text-[#172347]">Payment Status</th>
                        <th className="px-4 py-3 text-left font-bold text-[#172347]">Project Idea</th>
                        <th className="px-4 py-3 text-left font-bold text-[#172347]">Leader &amp; Mobile</th>
                        <th className="px-4 py-3 text-center font-bold text-[#172347]">Size</th>
                        <th className="px-4 py-3 text-center font-bold text-[#172347]">Fee</th>
                        <th className="px-4 py-3 text-center font-bold text-[#172347]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRegistrations.map((reg) => {
                        const trackObj = HACKATHON_TRACKS.find((t) => t.id === reg.trackId);
                        const mobile = getEffectiveMobile(reg);
                        const status = reg.status || 'Submitted';

                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-bold text-[#172347] whitespace-nowrap">
                              <div>{reg.teamName}</div>
                              <div className="text-[10px] font-mono text-slate-400 font-normal">{reg.id}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                  TRACK_COLOR_MAP[reg.trackId] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {trackObj?.title || reg.trackId}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                  STATUS_COLOR_MAP[status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                  PAYMENT_STATUS_COLOR_MAP[reg.paymentStatus || 'PENDING']
                                }`}
                              >
                                {reg.paymentStatus || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[240px]">
                              <div className="font-bold text-[#172347] truncate">
                                {reg.projectTitle}
                              </div>
                              <div className="text-slate-500 truncate text-[11px] mt-0.5">
                                {reg.abstract}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-semibold text-[#172347]">{reg.leaderName}</div>
                              <div className="font-mono text-emerald-700 font-bold text-[11px]">
                                {mobile ? `+91 ${mobile}` : '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold">
                              {reg.memberCount}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-800">
                              ₹{reg.registrationFee || calculateRegistrationFee(reg.memberCount)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedAbstractTeam(reg)}
                                className="rounded-full bg-[#13354B] px-3.5 py-1 text-[11px] font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: PAYMENT VERIFICATION ================= */}
        {dashboardTab === 'payments' && (
          <div className="space-y-6">
            {/* Payment Stats Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Pending Verification</div>
                <div className="text-3xl font-extrabold text-amber-600 mt-1">{pendingPaymentsCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Require screenshot approval</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Verified Payments</div>
                <div className="text-3xl font-extrabold text-emerald-600 mt-1">{verifiedPaymentsCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Approved registrations</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Rejected Payments</div>
                <div className="text-3xl font-extrabold text-red-600 mt-1">{rejectedPaymentsCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Requires re-upload by team</div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="text-xs font-bold text-emerald-800 uppercase">Total Revenue (Verified)</div>
                <div className="text-3xl font-extrabold text-emerald-950 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Direct UPI hackathon collections</div>
              </div>
            </div>

            {/* Payment Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Filter Status:</span>
                {(['all', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setPaymentStatusFilter(st);
                      setCurrentPage(1);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      paymentStatusFilter === st
                        ? 'bg-[#13354B] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All Payments' : st}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500">
                Showing <span className="font-bold text-[#172347]">{filteredRegistrations.length}</span> payment records
              </div>
            </div>

            {/* Payments List */}
            <div className="space-y-4">
              {filteredRegistrations.map((reg) => {
                const effectiveMobile = getEffectiveMobile(reg);
                const fee = reg.registrationFee || calculateRegistrationFee(reg.memberCount);
                const pStatus = reg.paymentStatus || 'PENDING';

                return (
                  <div
                    key={reg.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-300 transition-all"
                  >
                    {/* Left: Team and Contact Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{reg.id}</span>
                        <h4 className="text-sm font-extrabold text-[#172347]">{reg.teamName}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${PAYMENT_STATUS_COLOR_MAP[pStatus]}`}>
                          {pStatus}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span><strong>Lead:</strong> {reg.leaderName}</span>
                        <span><strong>Email:</strong> {reg.leaderEmail}</span>
                        {effectiveMobile && (
                          <span className="font-mono font-bold text-emerald-700">
                            +91 {effectiveMobile}
                          </span>
                        )}
                        <span><strong>Team Size:</strong> {reg.memberCount} Members</span>
                      </div>

                      <div className="text-xs text-slate-500">
                        <span><strong>Track:</strong> {HACKATHON_TRACKS.find((t) => t.id === reg.trackId)?.title || reg.trackId}</span>
                        <span className="mx-2">·</span>
                        <span><strong>Submitted:</strong> {formatDate(reg.createdAt)}</span>
                      </div>

                      {pStatus === 'REJECTED' && reg.paymentRejectionReason && (
                        <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                          <strong>Rejection Reason:</strong> {reg.paymentRejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Center: Fee & Screenshot Thumbnail */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Amount Due</div>
                        <div className="text-lg font-black text-emerald-800">₹{fee}</div>
                      </div>

                      {reg.paymentScreenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshotReg(reg)}
                          className="group relative h-16 w-16 rounded-xl border border-purple-200 overflow-hidden bg-slate-100 hover:ring-2 hover:ring-[#6B1FE0] transition cursor-pointer"
                          title="Click to view full payment screenshot"
                        >
                          <img
                            src={reg.paymentScreenshotUrl}
                            alt="Payment Proof"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 text-center">
                          <Image className="h-4 w-4 mb-0.5 text-slate-300" />
                          <span>No Proof</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Verification Action Buttons */}
                    <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 shrink-0">
                      {reg.paymentScreenshotUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshotReg(reg)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Proof</span>
                        </button>
                      )}

                      {pStatus !== 'VERIFIED' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyPayment(reg)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Verify Payment</span>
                        </button>
                      )}

                      {pStatus !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(reg)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Reject Payment</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 3: PAYMENT QR MANAGEMENT (COORDINATOR PRIVATE) ================= */}
        {dashboardTab === 'qr_management' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-slate-200 pb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[#6B1FE0] border border-purple-200 mb-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Coordinator-Only Access</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#172347]">
                Payment QR Code Management
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage the official UPI payment QR code displayed to hackathon participants during registration. Only authorized coordinators can upload or replace this QR code.
              </p>
            </div>

            {qrUpdateSuccess && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{qrUpdateSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Left: Active QR Code */}
              <div className="flex flex-col items-center p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                  Current Active Payment QR
                </span>
                <div className="h-56 w-56 rounded-2xl border-2 border-slate-300 bg-white p-2 shadow-sm overflow-hidden flex items-center justify-center">
                  <img
                    src={activePaymentQr}
                    alt="Active Payment QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Visible to all participants at Step 4 of Registration
                </div>
              </div>

              {/* Right: Upload / Replace Action */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-2 text-xs">
                  <p className="font-bold text-[#172347]">Upload New UPI QR Code</p>
                  <p className="text-slate-600">
                    Upload an updated official QR code (PNG, JPG, SVG, or WEBP). Ensure the QR code has high contrast and includes your official UPI ID.
                  </p>
                </div>

                <label className="block">
                  <span className="text-xs font-bold text-[#172347] block mb-2">
                    Select New QR Code Image
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleQrFileInputChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#13354B] file:text-white hover:file:bg-[#6B1FE0] file:cursor-pointer cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-2"
                  />
                </label>

                {newQrFilePreview && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-amber-900">
                      Preview of New QR Code:
                    </p>
                    <div className="h-40 w-40 mx-auto rounded-xl border border-amber-300 bg-white p-2 shadow-xs">
                      <img
                        src={newQrFilePreview}
                        alt="New QR Preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewQrFilePreview(null)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmQrReplace}
                        disabled={isUpdatingQr}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B1FE0] px-5 py-2 text-xs font-bold text-white hover:bg-[#8F28E8] shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingQr ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Updating QR...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Confirm &amp; Update QR</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pagination Bar */}
        {dashboardTab === 'submissions' && filteredRegistrations.length > PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-[#172347]">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-[#172347]">
                {Math.min(startIndex + PAGE_SIZE, filteredRegistrations.length)}
              </span>{' '}
              of <span className="font-bold text-[#172347]">{filteredRegistrations.length}</span> submissions
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <div className="flex items-center gap-1 px-2 text-xs font-bold text-slate-700">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: FULL TEAM & ABSTRACT DETAILS ================= */}
      <AnimatePresence>
        {selectedAbstractTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-2xl rounded-3xl border border-white/90 bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                        TRACK_COLOR_MAP[selectedAbstractTeam.trackId] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {HACKATHON_TRACKS.find((t) => t.id === selectedAbstractTeam.trackId)?.title || selectedAbstractTeam.trackId}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                        STATUS_COLOR_MAP[selectedAbstractTeam.status || 'Submitted']
                      }`}
                    >
                      Status: {selectedAbstractTeam.status || 'Submitted'}
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                      {selectedAbstractTeam.id}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-extrabold text-[#172347]">
                    {selectedAbstractTeam.teamName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAbstractTeam(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status Management Actions */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Coordinator Status Management
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['Under Review', 'Shortlisted', 'Finalist', 'Rejected'] as SubmissionStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={selectedAbstractTeam.status === st}
                      onClick={() =>
                        setStatusConfirmTarget({
                          team: selectedAbstractTeam,
                          nextStatus: st,
                        })
                      }
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        st === 'Shortlisted'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : st === 'Finalist'
                          ? 'bg-purple-700 text-white hover:bg-purple-800'
                          : st === 'Under Review'
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      Mark as {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Title */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#6B1FE0]">
                  Project Title
                </div>
                <h3 className="mt-1 text-lg font-extrabold text-[#172347]">
                  {selectedAbstractTeam.projectTitle}
                </h3>
              </div>

              {/* Full Abstract Text */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900">
                    Full Technical Abstract &amp; Solution Architecture
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyAbstract(selectedAbstractTeam.id, selectedAbstractTeam.abstract)
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6B1FE0] shadow-xs hover:bg-purple-50 cursor-pointer"
                  >
                    {copiedId === selectedAbstractTeam.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Abstract</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-[#25335A] whitespace-pre-line">
                  {selectedAbstractTeam.abstract}
                </p>
              </div>

              {/* Payment Info Card Inside Detail View */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase tracking-wider text-[#13354B] flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-[#6B1FE0]" />
                    <span>Payment Verification Details</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${PAYMENT_STATUS_COLOR_MAP[selectedAbstractTeam.paymentStatus || 'PENDING']}`}>
                    {selectedAbstractTeam.paymentStatus || 'PENDING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Registration Fee</span>
                    <span className="text-base font-extrabold text-emerald-800">
                      ₹{selectedAbstractTeam.registrationFee || calculateRegistrationFee(selectedAbstractTeam.memberCount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment Proof</span>
                    {selectedAbstractTeam.paymentScreenshotUrl ? (
                      <button
                        type="button"
                        onClick={() => setSelectedScreenshotReg(selectedAbstractTeam)}
                        className="inline-flex items-center gap-1 text-[#6B1FE0] font-bold hover:underline cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Screenshot</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">No proof uploaded</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {selectedAbstractTeam.paymentStatus !== 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => handleVerifyPayment(selectedAbstractTeam)}
                      className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Approve &amp; Verify Payment
                    </button>
                  )}
                  {selectedAbstractTeam.paymentStatus !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(selectedAbstractTeam)}
                      className="rounded-xl border border-red-300 bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                    >
                      Reject Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Team Lead & Contacts */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div>
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Team Lead</div>
                  <div className="mt-1 font-extrabold text-sm text-[#172347]">
                    {selectedAbstractTeam.leaderName}
                  </div>
                  <div className="mt-0.5 text-slate-600">{selectedAbstractTeam.leaderEmail}</div>
                </div>

                <div>
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Mobile Contact</div>
                  <div className="mt-1 font-mono font-extrabold text-sm text-[#172347]">
                    {getEffectiveMobile(selectedAbstractTeam)
                      ? `+91 ${getEffectiveMobile(selectedAbstractTeam)}`
                      : 'Not provided'}
                  </div>
                  {getEffectiveMobile(selectedAbstractTeam) && (
                    <div className="mt-1 flex items-center gap-2">
                      <a
                        href={`tel:+91${getEffectiveMobile(selectedAbstractTeam)}`}
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        Call Lead
                      </a>
                      <span aria-hidden="true">·</span>
                      <a
                        href={`https://wa.me/91${getEffectiveMobile(selectedAbstractTeam)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Institution</div>
                  <div className="mt-1 font-semibold text-[#172347]">
                    {selectedAbstractTeam.institution}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Team Size &amp; Submitted Date</div>
                  <div className="mt-1 font-semibold text-[#172347]">
                    {selectedAbstractTeam.memberCount} Members · {formatDate(selectedAbstractTeam.createdAt)}
                  </div>
                </div>
              </div>

              {/* Additional Team Members */}
              {selectedAbstractTeam.members && selectedAbstractTeam.members.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#6B1FE0]">
                    Additional Team Members ({selectedAbstractTeam.members.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAbstractTeam.members.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1"
                      >
                        <div className="font-bold text-[#172347]">
                          Member {mIdx + 2}: {m.name}
                        </div>
                        <div className="text-slate-600 truncate">{m.email}</div>
                        <div className="font-mono font-bold text-emerald-700">
                          +91 {m.mobile}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAbstractTeam(null)}
                  className="rounded-full bg-[#13354B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
                >
                  Close Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: PAYMENT SCREENSHOT INSPECTION ================= */}
      <AnimatePresence>
        {selectedScreenshotReg && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#172347]">
                    Payment Proof Inspection
                  </h3>
                  <p className="text-xs text-slate-500">
                    Team: <strong>{selectedScreenshotReg.teamName}</strong> ({selectedScreenshotReg.id})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedScreenshotReg(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Full Screenshot Display */}
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-2 overflow-hidden flex items-center justify-center max-h-[50vh]">
                {selectedScreenshotReg.paymentScreenshotUrl ? (
                  <img
                    src={selectedScreenshotReg.paymentScreenshotUrl}
                    alt="Payment Proof"
                    className="max-h-[48vh] w-auto object-contain rounded-xl shadow-xs"
                  />
                ) : (
                  <p className="text-xs text-slate-400 py-10">No image provided</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Fee Expected</span>
                  <span className="font-extrabold text-emerald-800 text-sm">
                    ₹{selectedScreenshotReg.registrationFee || calculateRegistrationFee(selectedScreenshotReg.memberCount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PAYMENT_STATUS_COLOR_MAP[selectedScreenshotReg.paymentStatus || 'PENDING']}`}>
                    {selectedScreenshotReg.paymentStatus || 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Actions right inside the screenshot inspector */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                {selectedScreenshotReg.paymentStatus !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => handleOpenRejectModal(selectedScreenshotReg)}
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 cursor-pointer"
                  >
                    Reject Payment
                  </button>
                )}

                {selectedScreenshotReg.paymentStatus !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => handleVerifyPayment(selectedScreenshotReg)}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    Approve &amp; Verify Payment
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: PAYMENT REJECTION REASON ================= */}
      <AnimatePresence>
        {paymentRejectTarget && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-md rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-base font-extrabold text-[#172347]">
                  Reject Payment Screenshot
                </h3>
              </div>

              <p className="text-xs text-slate-600">
                Please select or specify why the payment screenshot for <strong>{paymentRejectTarget.teamName}</strong> cannot be verified. The participant will see this reason in their dashboard and will be prompted to re-upload proof.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Reason:
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none"
                >
                  <option value="Payment screenshot is unclear or truncated.">Payment screenshot is unclear or truncated.</option>
                  <option value="Incorrect amount paid. Does not match official registration fee.">Incorrect amount paid. Does not match official registration fee.</option>
                  <option value="Payment reference / UTR transaction ID could not be found.">Payment reference / UTR transaction ID could not be found.</option>
                  <option value="Duplicate screenshot already used for another team.">Duplicate screenshot already used for another team.</option>
                  <option value="Other">Custom Reason (Type below)</option>
                </select>

                {rejectReason === 'Other' && (
                  <textarea
                    rows={3}
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    placeholder="Enter custom rejection reason..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none mt-2"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentRejectTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectPayment}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-xs cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: STATUS CHANGE CONFIRMATION ================= */}
      <AnimatePresence>
        {statusConfirmTarget && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-base font-extrabold text-[#172347]">
                  Confirm Status Change
                </h3>
              </div>

              <p className="text-xs text-slate-600">
                Are you sure you want to change the status of{' '}
                <strong>{statusConfirmTarget.team.teamName}</strong> from{' '}
                <span className="font-bold text-slate-800">
                  {statusConfirmTarget.team.status || 'Submitted'}
                </span>{' '}
                to{' '}
                <span className="font-bold text-[#6B1FE0]">
                  {statusConfirmTarget.nextStatus}
                </span>
                ?
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusConfirmTarget(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusChange}
                  className="rounded-full bg-[#6B1FE0] px-5 py-2 text-xs font-bold text-white hover:bg-[#8F28E8] transition-colors cursor-pointer"
                >
                  Confirm Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ENHANCED CSV EXPORT ================= */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-lg rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#172347] flex items-center gap-2">
                    <Download className="h-4 w-4 text-[#6B1FE0]" />
                    <span>Export Hackathon Data (CSV)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Download clean, UTF-8 formatted CSV spreadsheets for Excel &amp; Google Sheets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {exportNotice && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{exportNotice}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleExecuteCsvExport('all')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition text-left cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-extrabold text-[#172347] group-hover:text-[#6B1FE0]">
                      Export All Registrations &amp; Abstracts
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Complete dataset of all {totalTeams} registered teams with full abstract text.
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-slate-400 group-hover:text-[#6B1FE0]" />
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteCsvExport('verified_payments')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 transition text-left cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-extrabold text-emerald-900">
                      Export Verified Payments Only ({verifiedPaymentsCount})
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Official attendee list for verified hackathon participants.
                    </div>
                  </div>
                  <CheckCheck className="h-4 w-4 text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteCsvExport('pending_payments')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition text-left cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-extrabold text-amber-900">
                      Export Pending Payments ({pendingPaymentsCount})
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Teams awaiting coordinator payment verification.
                    </div>
                  </div>
                  <Clock className="h-4 w-4 text-amber-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteCsvExport('participants')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 transition text-left cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-extrabold text-[#172347] group-hover:text-teal-700">
                      Export Individual Participants List ({totalParticipants})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Flattened roster with each lead and member on their own row.
                    </div>
                  </div>
                  <Users className="h-4 w-4 text-slate-400 group-hover:text-teal-700" />
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
