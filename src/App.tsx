import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HACKATHON_TRACKS,
  INITIAL_REGISTRATIONS,
  OFFICIAL_LOGOS,
  TIMELINE_MILESTONES,
  FAQ_ITEMS,
  EVENT_DETAILS,
  PAGE_ORDER,
  PAGE_LABELS,
  PageId,
  TrackId,
  TeamRegistration,
  TeamMember,
  SubmissionStatus,
  PaymentStatus,
  generateRegistrationId,
  filterTracks,
  filterRegistrations,
  validateTeamRegistration,
  calculateHackathonStats,
  calculateRegistrationFee,
  normalizeEmail,
  normalizeMobile,
} from './utils/hackathonLogic';
import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  onAuthStateChanged,
  firebaseSignOut,
  handleFirestoreError,
  OperationType,
  firebaseConfig,
  HackathonUser,
} from './lib/firebase';
import { checkGlobalIdentityUniqueness, reserveParticipantIdentities, ParticipantIdentity } from './utils/identityReservation';
import { compressPaymentScreenshot } from './utils/imageCompressor';
import { fetchActivePaymentQr, DEFAULT_PAYMENT_QR_URL } from './utils/paymentQr';
import { HeroSection } from './components/HeroSection';
import { CoordinatorsSection } from './components/CoordinatorsSection';
import { InteractiveBackground } from './components/InteractiveBackground';

// Code-split heavy deferred components so critical homepage loads instantly
const GoogleAuthModal = React.lazy(() =>
  import('./components/GoogleAuthModal').then((m) => ({ default: m.GoogleAuthModal }))
);
const CoordinatorLoginModal = React.lazy(() =>
  import('./components/CoordinatorLoginModal').then((m) => ({ default: m.CoordinatorLoginModal }))
);
const ParticipantProfileModal = React.lazy(() =>
  import('./components/ParticipantProfileModal').then((m) => ({ default: m.ParticipantProfileModal }))
);
const CoordinatorPortal = React.lazy(() =>
  import('./components/CoordinatorPortal').then((m) => ({ default: m.CoordinatorPortal }))
);
const RegistrationSuccessModal = React.lazy(() =>
  import('./components/RegistrationSuccessModal').then((m) => ({ default: m.RegistrationSuccessModal }))
);
import {
  Search,
  CheckCircle2,
  ArrowUpRight,
  Users,
  PlusCircle,
  LogIn,
  Shield,
  Trophy,
  Calendar,
  HelpCircle,
  ChevronDown,
  Award,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Smartphone,
  Lock,
  User,
  Menu,
  X,
  Edit3,
  ArrowLeft,
  QrCode,
  Upload,
  Download,
  CreditCard,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react';

const STORAGE_KEY = 'harmonia_2027_registrations_v3';
const USER_STORAGE_KEY = 'harmonia_2027_user_v1';

interface CoordinatorUser {
  username: string;
  role: 'coordinator';
  displayName: string;
}

interface ParticipantProfile {
  fullName: string;
  email: string;
  mobile: string;
  whatsapp: string;
  department: string;
  institution: string;
  profileComplete: boolean;
  createdAt: string;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase() || '/';
    }
    return '/';
  });

  const [currentPage, setCurrentPage] = useState<PageId>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/tracks')) return 'tracks';
      if (p.startsWith('/timeline')) return 'timeline';
      if (p.startsWith('/prizes')) return 'prizes';
      if (p.startsWith('/faq')) return 'faq';
      if (p.startsWith('/register') || p.startsWith('/dashboard') || p.startsWith('/participant')) return 'dashboard';
    }
    return 'home';
  });
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [registrations, setRegistrations] = useState<TeamRegistration[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_REGISTRATIONS;
  });

  const [user, setUser] = useState<HackathonUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [coordinatorUser, setCoordinatorUser] = useState<CoordinatorUser | null>(() => {
    try { const s = localStorage.getItem('harmonia_coordinator_v1'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [participantProfile, setParticipantProfile] = useState<ParticipantProfile | null>(() => {
    try { const s = localStorage.getItem('harmonia_participant_profile_v1'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Team Registration Form State (Team Size 1-4 per official poster)
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderMobile, setLeaderMobile] = useState('');
  const [institution, setInstitution] = useState('Rajalakshmi Institute of Technology');
  const [ieeeMemberId, setIeeeMemberId] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [inclusionImpact, setInclusionImpact] = useState('');
  const [formTrackId, setFormTrackId] = useState<Exclude<TrackId, 'all'>>('linguaverse');
  const [projectTitle, setProjectTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [memberCount, setMemberCount] = useState<number>(4);
  const [members, setMembers] = useState<TeamMember[]>([
    { name: '', email: '', mobile: '' },
    { name: '', email: '', mobile: '' },
    { name: '', email: '', mobile: '' },
  ]);

  // Phone OTP Verification State for Registration


  // Form Validation UX State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Registration Success Modal State
  const [successRegistration, setSuccessRegistration] = useState<TeamRegistration | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [showAdditionalRegistration, setShowAdditionalRegistration] = useState(false);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Payment Proof & QR Code State
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [paymentScreenshotName, setPaymentScreenshotName] = useState<string | null>(null);
  const [paymentScreenshotSize, setPaymentScreenshotSize] = useState<number | null>(null);
  const [activePaymentQr, setActivePaymentQr] = useState<string>(DEFAULT_PAYMENT_QR_URL);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Payment Proof Re-upload State (for rejected payments)
  const [reuploadTargetRegistration, setReuploadTargetRegistration] = useState<TeamRegistration | null>(null);
  const [reuploadScreenshotUrl, setReuploadScreenshotUrl] = useState<string | null>(null);
  const [reuploadScreenshotName, setReuploadScreenshotName] = useState<string | null>(null);
  const [reuploadScreenshotSize, setReuploadScreenshotSize] = useState<number | null>(null);
  const [isSubmittingReupload, setIsSubmittingReupload] = useState(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);

  // Load latest active payment QR code from Firestore configuration
  useEffect(() => {
    fetchActivePaymentQr().then((qr) => {
      if (qr) setActivePaymentQr(qr);
    });
  }, []);



  const handleMemberChange = (index: number, field: keyof TeamMember, val: string) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
    setFormErrors((prev) => ({ ...prev, [`member_${index + 2}_${field}`]: '' }));
  };

  const showError = (field: string) => {
    return (hasSubmittedOnce || !!touchedFields[field]) && !!formErrors[field];
  };

  // Sync Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const mappedUser: HackathonUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || 'HARMONIA Participant',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL,
          provider: 'google',
        };
        setUser(mappedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization for hackathon registrations across all devices
  useEffect(() => {
    const q = query(collection(db, 'registrations'), limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudTeams: TeamRegistration[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const count = Number(data.memberCount) || 1;
            const fee = Number(data.registrationFee) || calculateRegistrationFee(count);
            return {
              id: (data.id as string) || docSnap.id,
              teamName: (data.teamName as string) || '',
              leaderName: (data.leaderName as string) || '',
              leaderEmail: (data.leaderEmail as string) || '',
              leaderMobile: (data.leaderMobile as string) || '',
              institution: (data.institution as string) || '',
              ieeeMemberId: data.ieeeMemberId as string | undefined,
              mentorName: data.mentorName as string | undefined,
              inclusionImpact: data.inclusionImpact as string | undefined,
              trackId: (data.trackId as Exclude<TrackId, 'all'>) || 'linguaverse',
              projectTitle: (data.projectTitle as string) || '',
              abstract: (data.abstract as string) || '',
              memberCount: count,
              members: (data.members as TeamMember[]) || [],
              status: ((data.status as string) as SubmissionStatus) || 'Submitted',
              createdAt: (data.createdAt as string) || '',
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
          });

          // Sort descending by registration date (newest first)
          cloudTeams.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });

          setRegistrations((prev) => {
            const existingIds = new Set(cloudTeams.map((t) => t.id));
            return [...cloudTeams, ...prev.filter((p) => !existingIds.has(p.id))];
          });
        }
      },
      (error) => {
        console.warn('[HARMONIA] Firestore registrations sync note:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Pre-fill leader name, email & mobile when user or participantProfile updates
  useEffect(() => {
    if (participantProfile?.profileComplete) {
      if (participantProfile.fullName) setLeaderName(participantProfile.fullName);
      if (participantProfile.email) setLeaderEmail(participantProfile.email);
      if (participantProfile.mobile) {
        setLeaderMobile(participantProfile.mobile);
        
      }
      if (participantProfile.institution) setInstitution(participantProfile.institution);
    } else if (user) {
      if (!leaderName) setLeaderName(user.displayName);
      if (!leaderEmail) setLeaderEmail(user.email);
    }
  }, [user, participantProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    } catch {
      // ignore storage errors
    }
  }, [registrations]);

  const navigateToPath = (path: string) => {
    const cleanPath = path.toLowerCase();
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setCurrentPath(cleanPath);

    if (cleanPath === '/' || cleanPath === '/home') {
      setCurrentPage('home');
    } else if (cleanPath.startsWith('/tracks')) {
      setCurrentPage('tracks');
    } else if (cleanPath.startsWith('/timeline')) {
      setCurrentPage('timeline');
    } else if (cleanPath.startsWith('/prizes')) {
      setCurrentPage('prizes');
    } else if (cleanPath.startsWith('/faq')) {
      setCurrentPage('faq');
    } else if (cleanPath.startsWith('/register') || cleanPath.startsWith('/dashboard') || cleanPath.startsWith('/participant')) {
      setCurrentPage('dashboard');
    }
  };

  const navigateToPage = (page: PageId) => {
    const targetPath = page === 'home' ? '/' : `/${page}`;
    navigateToPath(targetPath);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const p = window.location.pathname.toLowerCase() || '/';
        setCurrentPath(p);
        if (p === '/' || p === '/home') setCurrentPage('home');
        else if (p.startsWith('/tracks')) setCurrentPage('tracks');
        else if (p.startsWith('/timeline')) setCurrentPage('timeline');
        else if (p.startsWith('/prizes')) setCurrentPage('prizes');
        else if (p.startsWith('/faq')) setCurrentPage('faq');
        else if (p.startsWith('/register') || p.startsWith('/dashboard') || p.startsWith('/participant')) setCurrentPage('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSignInSuccess = (signedInUser: HackathonUser) => {
    setUser(signedInUser);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(signedInUser));
    } catch {
      // ignore
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleCoordinatorLogin = (coord: CoordinatorUser) => {
    setCoordinatorUser(coord);
    try {
      localStorage.setItem('harmonia_coordinator_v1', JSON.stringify(coord));
    } catch {
      // ignore
    }
    setIsCoordinatorModalOpen(false);
    navigateToPath('/coordinator/dashboard');
  };

  const handleCoordinatorSignOut = () => {
    setCoordinatorUser(null);
    try {
      localStorage.removeItem('harmonia_coordinator_v1');
    } catch {
      // ignore
    }
    navigateToPath('/coordinator/login');
  };

  const handleProfileComplete = (profile: ParticipantProfile) => {
    setParticipantProfile(profile);
    setLeaderName(profile.fullName);
    setLeaderEmail(profile.email);
    setLeaderMobile(profile.mobile);
    setInstitution(profile.institution);
    
    setIsProfileModalOpen(false);
    navigateToPage('dashboard');
  };

  const handleSelectTrackForRegistration = (trackId: Exclude<TrackId, 'all'>) => {
    setFormTrackId(trackId);
    navigateToPage('dashboard');
  };

  // Team size selector with strict error purging for inactive members
  const handleSelectMemberCount = (count: number) => {
    const bounded = Math.min(4, Math.max(1, Math.round(count)));
    setMemberCount(bounded);
    setMembers((prev) => {
      const copy = [...prev];
      while (copy.length < 3) {
        copy.push({ name: '', email: '', mobile: '' });
      }
      return copy;
    });
    // Immediately purge validation errors for inactive member slots
    setFormErrors((prev) => {
      const updated = { ...prev };
      delete updated.memberCount;
      delete updated.members;
      for (let slot = bounded + 1; slot <= 4; slot++) {
        delete updated[`member_${slot}_name`];
        delete updated[`member_${slot}_email`];
        delete updated[`member_${slot}_mobile`];
      }
      return updated;
    });
  };

  // Payment Screenshot Upload handler with automatic canvas compression (< 150KB)
  const handlePaymentScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({
        ...prev,
        paymentScreenshot: 'Invalid file format. Please upload a JPG, PNG, or WEBP image screenshot.',
      }));
      return;
    }

    try {
      const compressed = await compressPaymentScreenshot(file);
      setPaymentScreenshotUrl(compressed.dataUrl);
      setPaymentScreenshotName(compressed.name);
      setPaymentScreenshotSize(compressed.size);
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.paymentScreenshot;
        return next;
      });
    } catch (err) {
      console.warn('[HARMONIA] Image compression notice:', err);
      setFormErrors((prev) => ({
        ...prev,
        paymentScreenshot: 'Unable to process image. Please try a different screenshot.',
      }));
    }
  };

  // Re-upload payment screenshot handler (for rejected payments) with canvas compression
  const handleReuploadScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReuploadError('Invalid file format. Please upload a JPG, PNG, or WEBP image screenshot.');
      return;
    }

    try {
      const compressed = await compressPaymentScreenshot(file);
      setReuploadScreenshotUrl(compressed.dataUrl);
      setReuploadScreenshotName(compressed.name);
      setReuploadScreenshotSize(compressed.size);
      setReuploadError(null);
    } catch {
      setReuploadError('Unable to process image. Please try a different screenshot.');
    }
  };

  const handleSubmitPaymentReupload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reuploadTargetRegistration || !reuploadScreenshotUrl || isSubmittingReupload) return;

    setIsSubmittingReupload(true);
    setReuploadError(null);
    try {
      const regRef = doc(db, 'registrations', reuploadTargetRegistration.id);
      const updatePayload: Record<string, unknown> = {
        paymentScreenshotUrl: reuploadScreenshotUrl,
        paymentScreenshotName: reuploadScreenshotName || 'payment_proof.jpg',
        paymentScreenshotSize: reuploadScreenshotSize || null,
        paymentStatus: 'PENDING',
        paymentUploadedAt: new Date().toISOString(),
        paymentRejectionReason: null,
      };

      await updateDoc(regRef, updatePayload);

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === reuploadTargetRegistration.id
            ? {
                ...r,
                paymentScreenshotUrl: reuploadScreenshotUrl,
                paymentScreenshotName: reuploadScreenshotName || 'payment_proof.jpg',
                paymentScreenshotSize: reuploadScreenshotSize || undefined,
                paymentStatus: 'PENDING',
                paymentUploadedAt: new Date().toISOString(),
                paymentRejectionReason: undefined,
              }
            : r
        )
      );

      setReuploadTargetRegistration(null);
      setReuploadScreenshotUrl(null);
      setReuploadScreenshotName(null);
      setReuploadScreenshotSize(null);
    } catch (err) {
      console.error('[HARMONIA] Error re-uploading payment proof:', err);
      setReuploadError('Unable to upload payment proof. Please check your network connection and retry.');
    } finally {
      setIsSubmittingReupload(false);
    }
  };

  const handleStep3Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!projectTitle || projectTitle.trim().length < 6) {
      newErrors.projectTitle = 'Project title must be at least 6 characters.';
    }
    if (!abstract || abstract.trim().length < 20) {
      newErrors.abstract = 'Project abstract must be at least 20 characters.';
    }
    if (Object.keys(newErrors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...newErrors }));
      setTouchedFields((prev) => ({ ...prev, projectTitle: true, abstract: true }));
      return;
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.projectTitle;
      delete next.abstract;
      return next;
    });
    setFormStep(4);
  };

  const handleStep4Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormStep(5);
  };

  const handleStep1Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!teamName || teamName.trim().length < 3) {
      newErrors.teamName = 'Team name must be at least 3 characters.';
    }
    if (!leaderName || leaderName.trim().length < 2) {
      newErrors.leaderName = 'Team lead full name is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!leaderEmail || !emailRegex.test(leaderEmail.trim())) {
      newErrors.leaderEmail = 'Please enter a valid email address.';
    }
    const cleanedMobile = leaderMobile.replace(/\D/g, '');
    if (!cleanedMobile || cleanedMobile.length !== 10 || !/^[6-9]/.test(cleanedMobile)) {
      newErrors.leaderMobile = 'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).';
    }
    if (!institution || institution.trim().length < 3) {
      newErrors.institution = 'Institution / Organization is required.';
    }
    if (memberCount < 1 || memberCount > 4) {
      newErrors.memberCount = 'Team size must be between 1 and 4 members.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      setTouchedFields((prev) => ({
        ...prev,
        teamName: true,
        leaderName: true,
        leaderEmail: true,
        leaderMobile: true,
        institution: true,
        memberCount: true,
      }));
      return;
    }

    setFormErrors({});
    setFormStep(2);
  };

  const handleStep2Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (memberCount > 1) {
      const needed = memberCount - 1;
      const seenEmails = new Set<string>([leaderEmail.trim().toLowerCase()]);
      const seenMobiles = new Set<string>([leaderMobile.replace(/\D/g, '')]);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (let i = 0; i < needed; i++) {
        const m = members[i] || { name: '', email: '', mobile: '' };
        const memberNum = i + 2;

        if (!m.name || m.name.trim().length < 2) {
          newErrors[`member_${memberNum}_name`] = `Member ${memberNum} full name is required.`;
        }

        const mEmail = (m.email || '').trim().toLowerCase();
        if (!mEmail || !emailRegex.test(mEmail)) {
          newErrors[`member_${memberNum}_email`] = `Enter a valid email for Member ${memberNum}.`;
        } else if (seenEmails.has(mEmail)) {
          newErrors[`member_${memberNum}_email`] = `Duplicate email for Member ${memberNum}. Each participant must have a unique email.`;
        } else {
          seenEmails.add(mEmail);
        }

        const mMobile = (m.mobile || '').replace(/\D/g, '');
        if (!mMobile || mMobile.length !== 10 || !/^[6-9]/.test(mMobile)) {
          newErrors[`member_${memberNum}_mobile`] = `Enter a valid 10-digit mobile number for Member ${memberNum}.`;
        } else if (seenMobiles.has(mMobile)) {
          newErrors[`member_${memberNum}_mobile`] = `Duplicate mobile for Member ${memberNum}. Each participant must have a unique mobile.`;
        } else {
          seenMobiles.add(mMobile);
        }
      }

      if (Object.keys(newErrors).length > 0) {
        newErrors.members = `Please complete the details for all ${memberCount} team members.`;
        setFormErrors(newErrors);
        return;
      }
    }

    setFormErrors({});
    setFormStep(3);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTeam) return;

    setHasSubmittedOnce(true);
    setSubmissionSuccess(null);
    setSubmissionError(null);



    // Step 5 payment screenshot is required
    if (!paymentScreenshotUrl) {
      setFormErrors((prev) => ({
        ...prev,
        paymentScreenshot: 'Please upload your payment screenshot proof before completing registration.',
      }));
      setFormStep(5);
      return;
    }

    const activeMembers = memberCount > 1 ? members.slice(0, memberCount - 1) : [];

    const validation = validateTeamRegistration({
      teamName,
      leaderName,
      leaderEmail,
      leaderMobile,
      institution,
      trackId: formTrackId,
      projectTitle,
      abstract,
      memberCount,
      members: activeMembers,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      if (
        validation.errors.teamName ||
        validation.errors.leaderName ||
        validation.errors.leaderEmail ||
        validation.errors.leaderMobile ||
        validation.errors.institution
      ) {
        setFormStep(1);
      } else if (Object.keys(validation.errors).some((k) => k.startsWith('member_') || k === 'members')) {
        setFormStep(2);
      } else if (validation.errors.projectTitle || validation.errors.abstract) {
        setFormStep(3);
      }
      return;
    }

    setIsSubmittingTeam(true);
    try {
      setFormErrors({});

      // Strict Global Uniqueness Verification (Requirement 63)
      const allIdentities: ParticipantIdentity[] = [
        { email: leaderEmail, mobile: leaderMobile, role: 'Team Lead', name: leaderName },
        ...activeMembers.map((m, idx) => ({
          email: m.email,
          mobile: m.mobile,
          role: `Member #${idx + 2}`,
          name: m.name,
        })),
      ];

      const uniquenessCheck = await checkGlobalIdentityUniqueness(allIdentities);
      if (!uniquenessCheck.valid) {
        setSubmissionError(
          uniquenessCheck.errorMessage ||
            'Duplicate registration detected. Each participant (email and mobile) can only be registered once across the entire hackathon.'
        );

        if (uniquenessCheck.conflictType === 'email') {
          if (normalizeEmail(leaderEmail) === uniquenessCheck.conflictingValue) {
            setFormErrors((prev) => ({
              ...prev,
              leaderEmail: 'This email is already registered. Please use a different email address.',
            }));
            setFormStep(1);
          } else {
            const mIdx = activeMembers.findIndex((m) => normalizeEmail(m.email) === uniquenessCheck.conflictingValue);
            if (mIdx >= 0) {
              setFormErrors((prev) => ({
                ...prev,
                [`member_${mIdx + 2}_email`]: 'This email is already registered. Please use a different email address.',
              }));
              setFormStep(2);
            }
          }
        } else if (uniquenessCheck.conflictType === 'mobile') {
          if (normalizeMobile(leaderMobile) === uniquenessCheck.conflictingValue) {
            setFormErrors((prev) => ({
              ...prev,
              leaderMobile: 'This mobile number is already registered. Please use a different mobile number.',
            }));
            setFormStep(1);
          } else {
            const mIdx = activeMembers.findIndex((m) => normalizeMobile(m.mobile) === uniquenessCheck.conflictingValue);
            if (mIdx >= 0) {
              setFormErrors((prev) => ({
                ...prev,
                [`member_${mIdx + 2}_mobile`]: 'This mobile number is already registered. Please use a different mobile number.',
              }));
              setFormStep(2);
            }
          }
        }
        setIsSubmittingTeam(false);
        return;
      }

      // Exact server-trusted fee calculation (1=150, 2=300, 3=450, 4=500)
      const exactFee = calculateRegistrationFee(memberCount);
      const regId = generateRegistrationId();
      const nowIso = new Date().toISOString();

      const newTeam: TeamRegistration = {
        id: regId,
        teamName: teamName.trim().slice(0, 80),
        leaderName: leaderName.trim().slice(0, 80),
        leaderEmail: leaderEmail.trim().slice(0, 120),
        leaderMobile: leaderMobile.trim().slice(0, 15),
        leaderMobileVerified: true,
        institution: institution.trim().slice(0, 120),
        ieeeMemberId: ieeeMemberId.trim() || undefined,
        mentorName: mentorName.trim() || undefined,
        inclusionImpact: inclusionImpact.trim() || undefined,
        trackId: formTrackId,
        projectTitle: projectTitle.trim().slice(0, 140),
        abstract: abstract.trim().slice(0, 1000),
        memberCount: Math.min(4, Math.max(1, Math.round(memberCount))),
        members: activeMembers,
        status: 'Submitted',
        createdAt: nowIso,
        registrationFee: exactFee,
        paymentStatus: 'PENDING',
        paymentScreenshotUrl: paymentScreenshotUrl || undefined,
        paymentScreenshotName: paymentScreenshotName || undefined,
        paymentScreenshotSize: paymentScreenshotSize || undefined,
        paymentUploadedAt: nowIso,
      };

      const ownerUid = auth.currentUser?.uid || user?.uid || `participant-${newTeam.leaderMobile}`;
      const firestorePayload: Record<string, unknown> = {
          id: newTeam.id,
          ownerId: ownerUid,
          teamName: newTeam.teamName,
          leaderName: newTeam.leaderName,
          leaderEmail: newTeam.leaderEmail,
          leaderMobile: newTeam.leaderMobile,
          leaderMobileVerified: true,
          institution: newTeam.institution,
          trackId: newTeam.trackId,
          projectTitle: newTeam.projectTitle,
          abstract: newTeam.abstract,
          memberCount: newTeam.memberCount,
          status: 'Submitted',
          createdAt: newTeam.createdAt,
          registrationFee: exactFee,
          paymentStatus: 'PENDING',
          paymentScreenshotUrl: newTeam.paymentScreenshotUrl,
          paymentScreenshotName: newTeam.paymentScreenshotName,
          paymentScreenshotSize: newTeam.paymentScreenshotSize,
          paymentUploadedAt: newTeam.paymentUploadedAt,
        };
        if (newTeam.ieeeMemberId) firestorePayload.ieeeMemberId = newTeam.ieeeMemberId;
        if (newTeam.mentorName) firestorePayload.mentorName = newTeam.mentorName;
        if (newTeam.inclusionImpact) firestorePayload.inclusionImpact = newTeam.inclusionImpact;
        if (newTeam.members && newTeam.members.length > 0) firestorePayload.members = newTeam.members;

        // 1. Primary write to Cloud Firestore database
        await setDoc(doc(db, 'registrations', newTeam.id), firestorePayload);

        // 2. Atomic identity reservations
        try {
          await reserveParticipantIdentities(allIdentities, newTeam.id, newTeam.teamName);
        } catch (identErr) {
          console.warn('[HARMONIA] Identity reservation notice (non-fatal):', identErr);
        }

      // Ensure participant session & profile are saved so they can view their abstract
      const activeParticipant: HackathonUser = user || {
        uid: ownerUid,
        displayName: newTeam.leaderName,
        email: newTeam.leaderEmail,
        photoURL: null,
        provider: 'verified-fallback',
      };
      setUser(activeParticipant);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(activeParticipant));
        localStorage.setItem(
          'harmonia_participant_profile_v1',
          JSON.stringify({
            fullName: newTeam.leaderName,
            email: newTeam.leaderEmail,
            mobile: newTeam.leaderMobile,
            whatsapp: newTeam.leaderMobile,
            institution: newTeam.institution,
            department: 'CSE',
            profileComplete: true,
            phoneVerified: true,
            emailVerified: true,
            teamId: newTeam.id,
            createdAt: nowIso,
          })
        );
      } catch {
        // ignore
      }

      setRegistrations((prev) => [newTeam, ...prev]);
      setSubmissionSuccess(
        `Team "${newTeam.teamName}" is officially registered under Track: ${
          HACKATHON_TRACKS.find((t) => t.id === newTeam.trackId)?.title
        }. Your payment proof and abstract have been submitted for coordinator verification!`
      );
      setSuccessRegistration(newTeam);
      setIsSuccessModalOpen(true);
      setFormStep(1);
      setTeamName('');
      setProjectTitle('');
      setAbstract('');
      setMentorName('');
      setInclusionImpact('');
      setPaymentScreenshotUrl(null);
      setPaymentScreenshotName(null);
      setPaymentScreenshotSize(null);
      setHasSubmittedOnce(false);
      setShowAdditionalRegistration(false);
    } catch (err) {
      console.error('[HARMONIA] Registration submission error:', err);
      setSubmissionError(
        'Unable to complete submission right now. All your entered details are preserved. Please check your connection and tap Retry.'
      );
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const [copiedAbstractId, setCopiedAbstractId] = useState<string | null>(null);
  const handleCopyAbstractText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAbstractId(id);
    setTimeout(() => setCopiedAbstractId(null), 2000);
  };

  const userRegistrations = registrations.filter((r) => {
    if (!user && !participantProfile?.mobile && !leaderMobile) return false;
    const userEmail = (user?.email || participantProfile?.email || '').toLowerCase().trim();
    const userMobile = (participantProfile?.mobile || leaderMobile || '').replace(/\D/g, '');
    const rEmail = (r.leaderEmail || '').toLowerCase().trim();
    const rMobile = (r.leaderMobile || '').replace(/\D/g, '');

    if (userEmail && rEmail && userEmail === rEmail) return true;
    if (userMobile && rMobile && userMobile === rMobile) return true;
    return false;
  });

  const visibleTracks = filterTracks(HACKATHON_TRACKS, selectedTrack, searchQuery);
  const visibleRegistrations = filterRegistrations(
    registrations,
    selectedTrack,
    searchQuery
  );
  const stats = calculateHackathonStats(HACKATHON_TRACKS, registrations);

  // 1. ISOLATED COORDINATOR PORTAL ARCHITECTURE
  // If the current URL path begins with /coordinator, render ONLY the dedicated Coordinator Portal.
  // The public homepage, navbar, background, hero, and footer NEVER render here.
  if (currentPath.startsWith('/coordinator')) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent mb-3" />
            <div className="text-xs font-bold tracking-wider uppercase text-teal-300">
              Loading HARMONIA Coordinator Portal...
            </div>
          </div>
        }
      >
        <CoordinatorPortal
          coordinatorUser={coordinatorUser}
          onLoginSuccess={handleCoordinatorLogin}
          onSignOut={handleCoordinatorSignOut}
          currentPath={currentPath}
          onNavigate={navigateToPath}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#E5CBE0] via-[#F6DCBD] to-[#F3D1AE] text-[#172347] flex flex-col overflow-x-hidden">
      {/* Live Interactive Moving Background Layer Across All Pages */}
      <InteractiveBackground
        variant={currentPage === 'faq' ? 'light' : 'sunset'}
      />

      {/* Top Navigation Bar — Responsive with Mobile Drawer Menu */}
      <header className="sticky top-0 z-40 border-b border-white/50 bg-[#F4E6EC]/90 px-3.5 sm:px-6 py-2.5 sm:py-3 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Brand Lockup (RIT Logo | HARMONIA Logo) */}
          <button
            type="button"
            onClick={() => {
              navigateToPage('home');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer"
          >
            <img
              src={OFFICIAL_LOGOS.rit}
              alt="Rajalakshmi Institute of Technology (RIT)"
              referrerPolicy="no-referrer"
              className="h-7 sm:h-9 w-auto object-contain rounded-md bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-2xs"
            />
            <span className="h-5 sm:h-6 w-[1.5px] bg-[#1B2845]/25" aria-hidden="true" />
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-7 sm:h-9 w-auto object-contain rounded-md bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-2xs"
            />
          </button>

          {/* Zone 2: Center Dark Teal Navigation Capsule (Home | Tracks | Timeline | Prizes | FAQ) — Desktop */}
          <nav
            aria-label="Primary Page Navigation"
            className="hidden md:flex items-center gap-1 rounded-full bg-[#13354B] p-1.5 text-xs font-semibold text-white/85 shadow-[0_8px_20px_rgba(19,53,75,0.28)]"
          >
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'tracks', label: 'Tracks' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'prizes', label: 'Prizes' },
                { id: 'faq', label: 'FAQ' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-${item.id}`}
                onClick={() => navigateToPage(item.id)}
                className={`rounded-full px-4 py-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  currentPage === item.id
                    ? 'bg-[#265673] text-white shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Desktop Right Actions (In association with + Sign In + Dashboard + Coordinator) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <div className="hidden xl:flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold leading-tight text-[#25335A]">
                <div>In association with</div>
              </div>
              <img
                src={OFFICIAL_LOGOS.idatamind}
                alt="iDataMind Logo"
                referrerPolicy="no-referrer"
                className="h-5 w-auto object-contain"
              />
              <img
                src={OFFICIAL_LOGOS.ieee}
                alt="IEEE Logo"
                referrerPolicy="no-referrer"
                className="h-5 w-auto object-contain"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#13354B]/20 bg-white/90 px-3.5 py-2 text-xs font-bold text-[#172347] shadow-2xs transition-all hover:border-[#6B1FE0] hover:text-[#6B1FE0] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{user ? user.displayName : 'Participant Sign-In'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage('dashboard')}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(22,61,87,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'dashboard'
                  ? 'bg-[#6B1FE0]'
                  : 'bg-[#163D57] hover:bg-[#1E5070]'
              }`}
            >
              <span>Dashboard</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => navigateToPath('/coordinator/dashboard')}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#13354B] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1E5070] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{coordinatorUser ? coordinatorUser.displayName : 'Coordinator'}</span>
            </button>
          </div>

          {/* Mobile Right Controls: User Quick Avatar + Responsive Hamburger Menu Button */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-slate-200 px-2.5 py-1 text-xs font-bold text-[#172347] shadow-2xs max-w-[120px] truncate"
              >
                <User className="h-3.5 w-3.5 text-[#6B1FE0] shrink-0" />
                <span className="truncate">{user.displayName.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-[#172347] shadow-2xs"
              >
                <LogIn className="h-3 w-3 text-[#13354B]" />
                <span>Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex items-center justify-center rounded-xl bg-[#13354B] p-2 text-white shadow-xs hover:bg-[#1E5070] transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="md:hidden overflow-hidden border-t border-white/60 bg-[#F4E6EC]/98 backdrop-blur-lg px-4 pt-3 pb-4 space-y-3 mt-2 rounded-2xl shadow-lg"
            >
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'tracks', label: 'Tracks' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'prizes', label: 'Prizes' },
                  { id: 'faq', label: 'FAQ & Contact' },
                  { id: 'dashboard', label: 'Team Dashboard' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigateToPage(item.id as PageId);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      currentPage === item.id
                        ? 'bg-[#13354B] text-white shadow-xs'
                        : 'bg-white/80 text-[#172347] border border-slate-200/80 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60">
                {user ? (
                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200">
                    <div className="text-xs">
                      <div className="font-bold text-[#172347] truncate max-w-[190px]">{user.displayName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[190px]">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#13354B] py-2.5 text-xs font-bold text-white hover:bg-[#1E5070] cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Participant Sign-In</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigateToPath('/coordinator/dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-300 bg-purple-50 py-2.5 text-xs font-bold text-purple-900 hover:bg-purple-100 cursor-pointer"
                >
                  <Shield className="h-4 w-4 text-[#6B1FE0]" />
                  <span>{coordinatorUser ? `Coordinator: ${coordinatorUser.displayName}` : 'Coordinator Portal'}</span>
                </button>
              </div>

              {/* RIT / IEEE / iDataMind association caption */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-[#25335A] font-semibold pt-1">
                <span>In association with</span>
                <span className="font-bold text-[#6B1FE0]">RIT · IEEE · iDataMind</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Multi-Page Content Viewport — Only Active Page Renders (No Bottom Page Stepper Bar) */}
      <main id="top" className="relative z-10 flex-1 flex flex-col">
        {/* PAGE 1: HOME */}
        {currentPage === 'home' && (
          <motion.div
            key="page-home"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
              <HeroSection
                totalTeams={stats.totalTeams}
                totalParticipants={stats.totalParticipants}
                prizePoolLabel={stats.prizePoolLabel}
                selectedTrack={selectedTrack}
                onSelectTrack={(trackId) => {
                  setSelectedTrack(trackId);
                  navigateToPage('tracks');
                }}
                onGetStarted={() => navigateToPage('dashboard')}
                onExploreTracks={() => navigateToPage('tracks')}
              />
            </motion.div>
          )}

          {/* PAGE 2: TRACKS */}
          {currentPage === 'tracks' && (
            <motion.section
              key="page-tracks"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="py-12 lg:py-16"
            >
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0] shadow-2xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Problem Statements &amp; Deliverables</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172347] sm:text-4xl">
                      The 5 Official HARMONIA Hackathon Tracks
                    </h1>
                    <p className="mt-2 text-sm text-[#25335A]">
                      Select any track below to filter problem statements or proceed directly to team registration.
                    </p>
                  </div>

                  {/* Interactive Track Filter Controls + Search Input */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div
                      role="group"
                      aria-label="Filter tracks by theme"
                      className="flex flex-wrap items-center gap-1 rounded-full bg-[#13354B]/10 p-1.5 backdrop-blur-xs"
                    >
                      {(
                        [
                          { id: 'all', label: 'All 5 Tracks' },
                          { id: 'linguaverse', label: 'Linguaverse' },
                          { id: 'abilityx', label: 'AbilityX' },
                          { id: 'roots', label: 'Roots to Futures' },
                          { id: 'flowforge', label: 'FlowForge' },
                          { id: 'iotverse', label: 'IoTVerse' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSelectedTrack(tab.id)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                            selectedTrack === tab.id
                              ? 'bg-[#13354B] text-white shadow-xs'
                              : 'text-[#172347] hover:bg-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3C4A6B]"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        aria-label="Search tracks"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tracks..."
                        className="w-full sm:w-52 rounded-full border border-[#13354B]/25 bg-white/90 pl-9 pr-4 py-1.5 text-xs text-[#172347] placeholder:text-[#3C4A6B]/70 focus:border-[#6B1FE0] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Detailed Track Cards Grid — Centered balanced layout */}
                <div className="mt-10 flex flex-wrap justify-center gap-6">
                  {visibleTracks.map((track, idx) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.06 }}
                      whileHover={{ y: -8, scale: 1.01 }}
                      className="group flex flex-col justify-between rounded-3xl border border-white/90 bg-white/92 backdrop-blur-md p-6 shadow-[0_12px_32px_rgba(27,40,69,0.08)] transition-all hover:border-purple-300 hover:shadow-[0_18px_40px_rgba(107,31,224,0.14)] w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#6B1FE0]">
                            Track {track.number} · {track.organization}
                          </span>
                          <span className="text-amber-700">
                            Award: {track.prizeStatus}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-extrabold text-[#172347] group-hover:text-[#6B1FE0] transition-colors">
                          {track.title}
                        </h2>
                        <p className="text-xs font-bold text-[#C2410C]">
                          {track.tagline}
                        </p>

                        <p className="mt-3 text-sm leading-relaxed text-[#25335A]">
                          {track.summary}
                        </p>
                      </div>

                      <div className="mt-6 border-t border-slate-200/80 pt-4 flex items-center justify-between gap-2">
                        <div className="text-xs text-[#3C4A6B]">
                          <span className="font-bold text-[#172347]">Deliverable:</span>{' '}
                          {track.deliverableRequirement}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectTrackForRegistration(track.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#13354B] px-4 py-2 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Register Track</span>
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* PAGE 3: TIMELINE */}
          {currentPage === 'timeline' && (
            <motion.section
              key="page-timeline"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="py-12 lg:py-16"
            >
              <div className="mx-auto max-w-5xl px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0] shadow-2xs">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Official Schedule · February 3 &amp; 4</span>
                  </div>
                  <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172347] sm:text-4xl">
                    HARMONIA 24-Hour Hackathon Timeline
                  </h1>
                  <p className="mt-2 text-sm text-[#25335A]">
                    Hosted by {EVENT_DETAILS.organizerInstitution} ({EVENT_DETAILS.presentingDepartment}) in association with IEEE and iDataMind.
                  </p>
                </div>

                {/* Key Poster Highlights Banner */}
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-white/90 bg-white/95 p-5 text-center shadow-sm"
                  >
                    <Calendar className="mx-auto h-6 w-6 text-[#C2410C]" />
                    <div className="mt-2 text-xs font-bold uppercase text-slate-500">Event Dates</div>
                    <div className="mt-1 text-lg font-extrabold text-[#172347]">February 3 &amp; 4</div>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-white/90 bg-white/95 p-5 text-center shadow-sm"
                  >
                    <MapPin className="mx-auto h-6 w-6 text-[#6B1FE0]" />
                    <div className="mt-2 text-xs font-bold uppercase text-slate-500">Official Venue</div>
                    <div className="mt-1 text-lg font-extrabold text-[#172347]">RIT Campus, Chennai</div>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-white/90 bg-white/95 p-5 text-center shadow-sm"
                  >
                    <Users className="mx-auto h-6 w-6 text-[#13354B]" />
                    <div className="mt-2 text-xs font-bold uppercase text-slate-500">Team Size</div>
                    <div className="mt-1 text-lg font-extrabold text-[#172347]">1 – 4 Members</div>
                  </motion.div>
                </div>

                <div className="mt-8 space-y-4">
                  {TIMELINE_MILESTONES.map((item, idx) => (
                    <motion.div
                      key={item.phase}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: idx * 0.07 }}
                      whileHover={{ x: 6 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/90 bg-white/95 p-6 shadow-sm transition-all hover:border-purple-300"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="text-[#6B1FE0]">{item.phase}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[#C2410C]">{item.date}</span>
                        </div>
                        <h2 className="text-lg font-extrabold text-[#172347]">
                          {item.title}
                        </h2>
                        <p className="text-sm leading-relaxed text-[#3C4A6B]">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-xs font-extrabold text-[#13354B] shrink-0">
                        {item.badge}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* PAGE 4: PRIZES (AWARD MONEY WILL BE ANNOUNCED SHORTLY) */}
          {currentPage === 'prizes' && (
            <motion.section
              key="page-prizes"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="py-12 lg:py-16"
            >
              <div className="mx-auto max-w-5xl px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/90 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-[#B45309] shadow-2xs">
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Honors, Grants &amp; Recognition</span>
                  </div>
                  <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172347] sm:text-4xl">
                    Hackathon Awards &amp; Recognition
                  </h1>
                  <p className="mt-2 text-sm text-[#25335A]">
                    Backed by Rajalakshmi Institute of Technology (Department of CSE), Institution&apos;s Innovation Council (IIC), IEEE, and iDataMind.
                  </p>
                </div>

                {/* Main Announcement Banner: Award Money Will Be Announced Shortly */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ scale: 1.01 }}
                  className="mt-10 rounded-3xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-50/95 via-white to-amber-50/95 p-8 sm:p-10 text-center shadow-[0_16px_40px_rgba(217,119,6,0.15)]"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 mb-4">
                    <Award className="h-9 w-9" />
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-amber-800">
                    Official Prize Pool &amp; Cash Awards
                  </div>
                  <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-[#172347]">
                    Award Money Will Be Announced Shortly
                  </h2>
                  <p className="mt-3 max-w-2xl mx-auto text-sm leading-relaxed text-[#3C4A6B]">
                    The grand champion cash prize, runner-up purses, and special category grants across all 5 HARMONIA tracks (<strong className="text-[#172347]">Linguaverse, AbilityX, Roots to Futures, FlowForge, and IoTVerse</strong>) are being finalized by the organizing committee and will be announced shortly.
                  </p>
                </motion.div>

                {/* Non-Monetary Perks & Recognition Cards */}
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                  <motion.div
                    whileHover={{ y: -6 }}
                    className="rounded-2xl border border-white/90 bg-white/95 p-6 shadow-sm"
                  >
                    <Sparkles className="h-6 w-6 text-[#6B1FE0]" />
                    <h3 className="mt-3 text-base font-extrabold text-[#172347]">
                      5 Track Championship Titles
                    </h3>
                    <p className="mt-1 text-xs font-bold text-amber-700">
                      Award Money: Will be announced shortly
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#3C4A6B]">
                      Dedicated awards for the winning team in each of the 5 tracks evaluated by IEEE and iDataMind domain experts.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -6 }}
                    className="rounded-2xl border border-white/90 bg-white/95 p-6 shadow-sm"
                  >
                    <Trophy className="h-6 w-6 text-[#D97706]" />
                    <h3 className="mt-3 text-base font-extrabold text-[#172347]">
                      iDataMind &amp; IEEE Mentorship
                    </h3>
                    <p className="mt-1 text-xs font-bold text-[#13354B]">
                      Industry Incubation &amp; Fellowships
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#3C4A6B]">
                      Top teams receive fast-track internship interviews, cloud intelligence credits, and IEEE publication support.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -6 }}
                    className="rounded-2xl border border-white/90 bg-white/95 p-6 shadow-sm"
                  >
                    <Users className="h-6 w-6 text-[#059669]" />
                    <h3 className="mt-3 text-base font-extrabold text-[#172347]">
                      Official Certificates for All Finalists
                    </h3>
                    <p className="mt-1 text-xs font-bold text-[#059669]">
                      RIT · IIC · IEEE Co-Branded
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#3C4A6B]">
                      Verified participation and merit certificates issued by the Department of Computer Science &amp; Engineering, RIT.
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.section>
          )}

          {/* PAGE 5: FAQ & COORDINATORS (FACULTY + STUDENT COORDINATORS FROM POSTER) */}
          {currentPage === 'faq' && (
            <motion.section
              key="page-faq"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="py-10 lg:py-14 bg-[#FBF7F4]/90"
            >
              {/* Frequently Asked Questions */}
              <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8 pb-8">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0] shadow-2xs">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Frequently Asked Questions &amp; Coordinators</span>
                  </div>
                  <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172347] sm:text-3xl">
                    Everything You Need to Know About HARMONIA
                  </h1>
                </div>

                <div className="mt-6 space-y-3">
                  {FAQ_ITEMS.map((faq, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div
                        key={faq.question}
                        className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md overflow-hidden shadow-2xs transition-all hover:border-purple-300"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-extrabold text-[#172347] hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span>{faq.question}</span>
                          <ChevronDown
                            className={`h-4 w-4 text-[#6B1FE0] transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4 text-xs leading-relaxed text-[#25335A]">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Faculty & Student Coordinators Cards Matching Screenshot 2 + Poster Details */}
              <CoordinatorsSection />
            </motion.section>
          )}

          {/* PAGE 6: TEAM REGISTRATION & DASHBOARD */}
          {currentPage === 'dashboard' && (
            <motion.section
              key="page-dashboard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="py-12 lg:py-16"
            >
              <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-14">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                  {/* Left Column: Instructions & Firebase Auth Status Card */}
                  <div className="lg:col-span-5 space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0] shadow-2xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Official Team Registration &amp; Dashboard</span>
                      </div>
                      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172347] sm:text-3xl">
                        Register Your Team for HARMONIA
                      </h1>
                      <p className="mt-2 text-sm leading-relaxed text-[#25335A]">
                        Date: <strong>February 3 &amp; 4</strong> · Venue: <strong>RIT, Chennai</strong> · Allowed Team Size: <strong>1–4 Members</strong>.
                      </p>
                    </div>

                    {/* Firebase Google Auth Status Card */}
                    <div className="rounded-2xl border border-white/90 bg-white/95 backdrop-blur-md p-6 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-extrabold text-[#172347]">
                            Google Authentication &amp; Cloud Sync
                          </h2>
                          <p className="mt-1 text-xs text-[#3C4A6B]">
                            Provisioned Firebase Project: <code className="font-mono text-[#6B1FE0]">{firebaseConfig.projectId}</code>
                          </p>
                        </div>
                        <Shield className="h-5 w-5 text-[#13354B] shrink-0" />
                      </div>

                      {user ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs">
                          <p className="font-bold text-slate-900">
                            Verified Session: {user.displayName}
                          </p>
                          <p className="mt-0.5 text-slate-600">{user.email}</p>
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIsAuthModalOpen(true)}
                              className="font-bold text-[#13354B] hover:underline cursor-pointer"
                            >
                              Account Details
                            </button>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={handleSignOut}
                              className="font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Sign Out
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs leading-relaxed text-[#25335A]">
                            Sign in with your Google account to auto-fill your team lead credentials and save your team registration to Cloud Firestore.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAuthModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#13354B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            <span>Continue with Google Sign-In</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Submitted Abstract View or Registration Form */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* View My Submitted Abstracts Card if Signed In / Registered */}
                    {userRegistrations.length > 0 && (
                      <div className="rounded-3xl border-2 border-[#6B1FE0]/40 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_18px_45px_rgba(107,31,224,0.12)] space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Registration Confirmed · Under Evaluation</span>
                            </span>
                            <h2 className="mt-2 text-xl font-extrabold text-[#172347]">
                              My Submitted Team &amp; Abstract
                            </h2>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setShowAdditionalRegistration(!showAdditionalRegistration)
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#13354B] px-4 py-2 text-xs font-bold text-white hover:bg-[#6B1FE0] transition-colors cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>
                              {showAdditionalRegistration
                                ? 'Close Registration Form'
                                : '+ Register Another Team'}
                            </span>
                          </button>
                        </div>

                        {/* List of User's Submitted Teams & Abstracts */}
                        <div className="space-y-6">
                          {userRegistrations.map((team) => {
                            const trackObj = HACKATHON_TRACKS.find(
                              (t) => t.id === team.trackId
                            );
                            return (
                              <div
                                key={team.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
                                      {trackObj
                                        ? `Track ${trackObj.number}: ${trackObj.title}`
                                        : team.trackId}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                      ID: {team.id}
                                    </span>
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                        team.status === 'Shortlisted'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : team.status === 'Finalist'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : team.status === 'Under Review'
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : team.status === 'Rejected'
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : 'bg-purple-50 text-purple-800 border-purple-200'
                                      }`}
                                    >
                                      Status: {team.status || 'Submitted'}
                                    </span>

                                    {/* Real-time Payment Status Pill */}
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                        team.paymentStatus === 'VERIFIED'
                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                          : team.paymentStatus === 'REJECTED'
                                          ? 'bg-red-100 text-red-900 border-red-300'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {team.paymentStatus === 'VERIFIED' ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                          <span>Payment Verified (₹{team.registrationFee || calculateRegistrationFee(team.memberCount)})</span>
                                        </>
                                      ) : team.paymentStatus === 'REJECTED' ? (
                                        <>
                                          <AlertTriangle className="h-3 w-3 text-red-700" />
                                          <span>Payment Rejected</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="h-3 w-3 text-amber-700" />
                                          <span>Payment Pending Verification (₹{team.registrationFee || calculateRegistrationFee(team.memberCount)})</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 font-medium">
                                    Submitted: {new Date(team.createdAt).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>

                                {/* Rejection Notice & Re-upload Callout if Rejected */}
                                {team.paymentStatus === 'REJECTED' && (
                                  <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-2 text-xs">
                                    <div className="flex items-center gap-2 font-bold text-red-800">
                                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                                      <span>Payment Verification Notice from Hackathon Coordinator:</span>
                                    </div>
                                    <p className="text-red-700 pl-6 italic">
                                      "{team.paymentRejectionReason || 'Payment screenshot unclear or transaction ID could not be matched. Please re-upload a clear screenshot.'}"
                                    </p>
                                    <div className="pl-6 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReuploadTargetRegistration(team);
                                          setReuploadScreenshotUrl(null);
                                          setReuploadScreenshotName(null);
                                          setReuploadError(null);
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>Upload Corrected Payment Proof</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                                    <Phone className="h-3 w-3 text-[#6B1FE0]" />
                                    <span>Mobile: +91 {team.leaderMobile}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                                    <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                    <span>Email Verified</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                                    <CreditCard className="h-3 w-3 text-purple-600" />
                                    <span>Fee: ₹{team.registrationFee || calculateRegistrationFee(team.memberCount)} ({team.memberCount} {team.memberCount === 1 ? 'member' : 'members'})</span>
                                  </span>
                                  {team.paymentScreenshotUrl && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                                      <FileText className="h-3 w-3 text-slate-500" />
                                      <span>Payment Proof Attached</span>
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Team Name
                                  </div>
                                  <h3 className="text-lg font-extrabold text-[#172347]">
                                    {team.teamName}
                                  </h3>
                                </div>

                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wider text-[#6B1FE0]">
                                    Project Idea &amp; Title
                                  </div>
                                  <h4 className="mt-0.5 text-base font-extrabold text-[#172347]">
                                    {team.projectTitle}
                                  </h4>
                                </div>

                                {/* Abstract Box */}
                                <div className="rounded-xl border border-purple-200 bg-white p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#6B1FE0] flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5" />
                                      <span>Technical Abstract</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyAbstractText(team.id, team.abstract)
                                      }
                                      className="inline-flex items-center gap-1 text-xs font-bold text-[#6B1FE0] hover:underline cursor-pointer"
                                    >
                                      {copiedAbstractId === team.id ? (
                                        <>
                                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                                          <span className="text-emerald-600">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3.5 w-3.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-xs leading-relaxed text-[#25335A] whitespace-pre-line">
                                    {team.abstract}
                                  </p>
                                </div>

                                {/* Inclusion & Impact / Mentor if present */}
                                {(team.mentorName || team.inclusionImpact) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                                    {team.mentorName && (
                                      <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                          Faculty Mentor
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                          {team.mentorName}
                                        </span>
                                      </div>
                                    )}
                                    {team.inclusionImpact && (
                                      <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                          Inclusion &amp; Accessibility Impact
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                          {team.inclusionImpact}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Team Members Breakdown */}
                                <div className="border-t border-slate-200 pt-3 space-y-2">
                                  <div className="text-xs font-bold uppercase tracking-wider text-[#172347] flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-[#6B1FE0]" />
                                    <span>Team Members ({team.memberCount})</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                      <div className="font-bold text-[#172347]">
                                        {team.leaderName} <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Lead</span>
                                      </div>
                                      <div className="text-slate-500 text-[11px] truncate">{team.leaderEmail}</div>
                                      <div className="text-emerald-700 font-mono text-[11px] font-semibold">+91 {team.leaderMobile}</div>
                                    </div>

                                    {team.members && team.members.map((m, mIdx) => (
                                      <div key={mIdx} className="bg-white p-2.5 rounded-lg border border-slate-200">
                                        <div className="font-bold text-[#172347]">
                                          {m.name} <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Member {mIdx + 2}</span>
                                        </div>
                                        <div className="text-slate-500 text-[11px] truncate">{m.email}</div>
                                        <div className="text-slate-700 font-mono text-[11px] font-semibold">+91 {m.mobile}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 text-[11px] text-slate-600 flex items-center gap-2">
                                  <Lock className="h-3.5 w-3.5 text-[#6B1FE0] shrink-0" />
                                  <span>Private Submission: Only you and authorized HARMONIA Coordinators can view this abstract and project proposal.</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STEP 1: Not Signed In Prompt */}
                    {!user && (
                      <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_18px_45px_rgba(27,40,69,0.1)] space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                          <div>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0]">
                              Step 1 of 3 · Authentication Required
                            </span>
                            <h2 className="mt-1 text-xl font-extrabold text-[#172347]">
                              Participant Sign-In
                            </h2>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <span className="h-6 w-6 rounded-full bg-[#6B1FE0] text-white flex items-center justify-center text-xs">1</span>
                            <span className="h-0.5 w-4 bg-slate-300"></span>
                            <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">2</span>
                            <span className="h-0.5 w-4 bg-slate-300"></span>
                            <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">3</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 via-white to-pink-50/50 p-5 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#6B1FE0]">
                              <Shield className="h-4 w-4" />
                              <span>Official HARMONIA Registration Order</span>
                            </div>
                            <p className="text-xs leading-relaxed text-[#25335A]">
                              To ensure secure abstract tracking and private access to your team proposal, all participants and team leads must first sign in before submitting team details.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-semibold text-slate-600 pt-1">
                              <div className="flex items-center gap-1.5 bg-white/80 p-2.5 rounded-xl border border-purple-200">
                                <span className="h-5 w-5 rounded-full bg-purple-100 text-[#6B1FE0] flex items-center justify-center text-[10px] font-bold">1</span>
                                <span className="font-bold text-[#172347]">Sign In</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/80 p-2.5 rounded-xl border border-purple-100">
                                <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">2</span>
                                <span>Complete Profile</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/80 p-2.5 rounded-xl border border-purple-100">
                                <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">3</span>
                                <span>Register Team</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => setIsAuthModalOpen(true)}
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#13354B] to-[#1E5070] px-6 py-3.5 text-xs font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition-all cursor-pointer"
                            >
                              <LogIn className="h-4 w-4" />
                              <span>Sign In with Google or Mobile OTP</span>
                            </button>
                          </div>
                          <p className="text-center text-[11px] text-slate-400">
                            Authorized participants only · RIT Chennai &amp; IEEE / iDataMind
                          </p>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Signed In but Profile Incomplete Prompt */}
                    {user && (!participantProfile || !participantProfile.profileComplete) && (
                      <div className="rounded-3xl border-2 border-amber-300 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_18px_45px_rgba(245,158,11,0.12)] space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                          <div>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                              Step 2 of 3 · Profile Required
                            </span>
                            <h2 className="mt-1 text-xl font-extrabold text-[#172347]">
                              Complete Your Participant Profile
                            </h2>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
                            <span className="h-0.5 w-4 bg-emerald-600"></span>
                            <span className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">2</span>
                            <span className="h-0.5 w-4 bg-slate-300"></span>
                            <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">3</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-950 space-y-1">
                              <div className="font-bold">
                                Profile Incomplete: Mobile &amp; Institutional Details Required
                              </div>
                              <p className="leading-relaxed text-amber-900">
                                Welcome, <strong>{user.displayName}</strong>! Before registering your team and submitting your technical abstract, please complete your participant profile with your 10-digit mobile number, department/year, and college name.
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                            <div className="font-bold text-[#172347]">Quick Profile Verification (2 Steps)</div>
                            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                              <li>Step 1: Enter your full name, 10-digit mobile number, WhatsApp, department, and institution.</li>
                              <li>Step 2: Review &amp; confirm details, then immediately unlock the Team Registration Form.</li>
                            </ul>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsProfileModalOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6B1FE0] to-[#8F28E8] py-3.5 px-6 text-xs font-bold text-white shadow hover:from-[#5A17C2] hover:to-[#7E1FD4] transition-all cursor-pointer"
                          >
                            <User className="h-4 w-4" />
                            <span>Complete My Profile (Step 2 of 3)</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Multi-Step Team Registration Wizard — Shown when user & profile are complete */}
                    {user && participantProfile?.profileComplete && (userRegistrations.length === 0 || showAdditionalRegistration) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (formStep === 1) handleStep1Next(e);
                          else if (formStep === 2) handleStep2Next(e);
                          else if (formStep === 3) handleStep3Next(e);
                          else if (formStep === 4) handleStep4Next(e);
                          else handleRegisterSubmit(e);
                        }}
                        noValidate
                        className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-md p-5 sm:p-8 shadow-[0_18px_45px_rgba(27,40,69,0.1)] space-y-6"
                      >
                        {/* Stepper Header */}
                        <div className="border-b border-slate-200 pb-5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B1FE0] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  Step {formStep} of 5
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Profile Verified
                                </span>
                              </div>
                              <h2 className="text-base sm:text-lg font-extrabold text-[#172347] mt-1">
                                {formStep === 1 && 'Step 1: Team & Lead Registration'}
                                {formStep === 2 && 'Step 2: Team Members Information'}
                                {formStep === 3 && 'Step 3: Project Proposal & Abstract'}
                                {formStep === 4 && 'Step 4: Registration Fee Payment'}
                                {formStep === 5 && 'Step 5: Payment Proof Upload & Final Review'}
                              </h2>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formStep === 1 && 'Configure your team identity, select team size (1–4 members), problem track, and verify lead.'}
                                {formStep === 2 && `Enter individual details for each participant (Total Team Size: ${memberCount}).`}
                                {formStep === 3 && 'Submit your problem solution, abstract (min 20 chars), and optional faculty mentor info.'}
                                {formStep === 4 && `Scan official UPI QR code to complete registration fee of ₹${calculateRegistrationFee(memberCount)}.`}
                                {formStep === 5 && 'Upload payment screenshot showing Transaction ID / UTR and complete official registration.'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className="text-xs font-semibold text-[#6B1FE0] bg-purple-50/80 px-3 py-1.5 rounded-full border border-purple-100">
                                Team Size: {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                              </span>
                              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                                Fee: ₹{calculateRegistrationFee(memberCount)}
                              </span>
                            </div>
                          </div>

                          {/* 5-Step Progress Bar */}
                          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                            {/* Step 1 Pill */}
                            <button
                              type="button"
                              onClick={() => setFormStep(1)}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                formStep === 1
                                  ? 'border-[#6B1FE0] bg-purple-50/90 text-[#6B1FE0] shadow-xs'
                                  : formStep > 1
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-extrabold shrink-0 ${
                                  formStep === 1
                                    ? 'bg-[#6B1FE0] text-white'
                                    : formStep > 1
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {formStep > 1 ? <Check className="h-3 w-3" /> : '1'}
                              </div>
                              <div className="hidden sm:block min-w-0">
                                <p className="text-[9px] uppercase font-bold tracking-wider opacity-75">Step 1</p>
                                <p className="text-[11px] font-extrabold truncate">Team &amp; Size</p>
                              </div>
                            </button>

                            {/* Step 2 Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                if (formStep === 1) handleStep1Next();
                                else setFormStep(2);
                              }}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                formStep === 2
                                  ? 'border-[#6B1FE0] bg-purple-50/90 text-[#6B1FE0] shadow-xs'
                                  : formStep > 2
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-extrabold shrink-0 ${
                                  formStep === 2
                                    ? 'bg-[#6B1FE0] text-white'
                                    : formStep > 2
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {formStep > 2 ? <Check className="h-3 w-3" /> : '2'}
                              </div>
                              <div className="hidden sm:block min-w-0">
                                <p className="text-[9px] uppercase font-bold tracking-wider opacity-75">Step 2</p>
                                <p className="text-[11px] font-extrabold truncate">Members ({memberCount})</p>
                              </div>
                            </button>

                            {/* Step 3 Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                if (formStep === 1) handleStep1Next();
                                else if (formStep === 2) handleStep2Next();
                                else setFormStep(3);
                              }}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                formStep === 3
                                  ? 'border-[#6B1FE0] bg-purple-50/90 text-[#6B1FE0] shadow-xs'
                                  : formStep > 3
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-extrabold shrink-0 ${
                                  formStep === 3
                                    ? 'bg-[#6B1FE0] text-white'
                                    : formStep > 3
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {formStep > 3 ? <Check className="h-3 w-3" /> : '3'}
                              </div>
                              <div className="hidden sm:block min-w-0">
                                <p className="text-[9px] uppercase font-bold tracking-wider opacity-75">Step 3</p>
                                <p className="text-[11px] font-extrabold truncate">Proposal</p>
                              </div>
                            </button>

                            {/* Step 4 Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                if (formStep === 1) handleStep1Next();
                                else if (formStep === 2) handleStep2Next();
                                else if (formStep === 3) handleStep3Next();
                                else setFormStep(4);
                              }}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                formStep === 4
                                  ? 'border-[#6B1FE0] bg-purple-50/90 text-[#6B1FE0] shadow-xs'
                                  : formStep > 4
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-extrabold shrink-0 ${
                                  formStep === 4
                                    ? 'bg-[#6B1FE0] text-white'
                                    : formStep > 4
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {formStep > 4 ? <Check className="h-3 w-3" /> : '4'}
                              </div>
                              <div className="hidden sm:block min-w-0">
                                <p className="text-[9px] uppercase font-bold tracking-wider opacity-75">Step 4</p>
                                <p className="text-[11px] font-extrabold truncate">Payment</p>
                              </div>
                            </button>

                            {/* Step 5 Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                if (formStep === 1) handleStep1Next();
                                else if (formStep === 2) handleStep2Next();
                                else if (formStep === 3) handleStep3Next();
                                else if (formStep === 4) handleStep4Next();
                              }}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                formStep === 5
                                  ? 'border-[#6B1FE0] bg-purple-50/90 text-[#6B1FE0] shadow-xs'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-extrabold shrink-0 ${
                                  formStep === 5
                                    ? 'bg-[#6B1FE0] text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                5
                              </div>
                              <div className="hidden sm:block min-w-0">
                                <p className="text-[9px] uppercase font-bold tracking-wider opacity-75">Step 5</p>
                                <p className="text-[11px] font-extrabold truncate">Proof &amp; Submit</p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* ================= STEP 1: TEAM & LEAD DETAILS + TEAM SIZE SELECTION ================= */}
                        {formStep === 1 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor="team-name"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Team Name *
                                </label>
                                <input
                                  id="team-name"
                                  type="text"
                                  value={teamName}
                                  onBlur={() => setTouchedFields((prev) => ({ ...prev, teamName: true }))}
                                  onChange={(e) => {
                                    setTeamName(e.target.value);
                                    setFormErrors((prev) => ({ ...prev, teamName: '' }));
                                  }}
                                  placeholder="e.g. Neural Pioneers"
                                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:outline-none ${
                                    showError('teamName')
                                      ? 'border-red-500 focus:border-red-500'
                                      : 'border-slate-300 focus:border-[#6B1FE0]'
                                  }`}
                                />
                                {showError('teamName') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.teamName}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="form-track"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Problem Track *
                                </label>
                                <select
                                  id="form-track"
                                  value={formTrackId}
                                  onChange={(e) =>
                                    setFormTrackId(
                                      e.target.value as Exclude<TrackId, 'all'>
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                                >
                                  {HACKATHON_TRACKS.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      Track {t.number}: {t.title} — {t.tagline}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                              <div className="sm:col-span-2">
                                <label
                                  htmlFor="institution-name"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Institution / Organization *
                                </label>
                                <input
                                  id="institution-name"
                                  type="text"
                                  value={institution}
                                  onBlur={() => setTouchedFields((prev) => ({ ...prev, institution: true }))}
                                  onChange={(e) => {
                                    setInstitution(e.target.value);
                                    setFormErrors((prev) => ({ ...prev, institution: '' }));
                                  }}
                                  placeholder="Rajalakshmi Institute of Technology"
                                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:outline-none ${
                                    showError('institution')
                                      ? 'border-red-500 focus:border-red-500'
                                      : 'border-slate-300 focus:border-[#6B1FE0]'
                                  }`}
                                />
                                {showError('institution') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.institution}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Select Team Size (1–4) *
                                </label>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[1, 2, 3, 4].map((size) => (
                                    <button
                                      key={size}
                                      type="button"
                                      onClick={() => handleSelectMemberCount(size)}
                                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                        memberCount === size
                                          ? 'border-[#6B1FE0] bg-[#6B1FE0] text-white shadow-xs'
                                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                                      }`}
                                    >
                                      {size} {size === 1 ? 'Solo' : 'Ppl'}
                                    </button>
                                  ))}
                                </div>
                                {showError('memberCount') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.memberCount}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Live Pricing Breakdown Cards for Selected Team Size */}
                            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[#6B1FE0] flex items-center gap-1.5">
                                  <CreditCard className="h-4 w-4" />
                                  <span>Official Registration Fee Structure</span>
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">Per-team pricing</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                {[
                                  { size: 1, label: '1 Member (Solo)', fee: '₹150', tag: 'Standard' },
                                  { size: 2, label: '2 Members (Duo)', fee: '₹300', tag: 'Standard' },
                                  { size: 3, label: '3 Members (Trio)', fee: '₹450', tag: 'Standard' },
                                  { size: 4, label: '4 Members (Quad)', fee: '₹500', tag: 'Team Discount' },
                                ].map((tier) => (
                                  <div
                                    key={tier.size}
                                    onClick={() => handleSelectMemberCount(tier.size)}
                                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                      memberCount === tier.size
                                        ? 'border-[#6B1FE0] bg-white shadow-xs ring-2 ring-[#6B1FE0]/20'
                                        : 'border-purple-100 bg-white/70 hover:bg-white'
                                    }`}
                                  >
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{tier.label}</p>
                                    <p className="text-base font-black text-[#172347] mt-0.5">{tier.fee}</p>
                                    <span
                                      className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                                        tier.size === 4
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {tier.tag}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Team Lead Name, Email & Mobile Number (3 Columns) */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-slate-100">
                              <div>
                                <label
                                  htmlFor="leader-name"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Team Lead Full Name *
                                </label>
                                <input
                                  id="leader-name"
                                  type="text"
                                  value={leaderName}
                                  onBlur={() => setTouchedFields((prev) => ({ ...prev, leaderName: true }))}
                                  onChange={(e) => {
                                    setLeaderName(e.target.value);
                                    setFormErrors((prev) => ({ ...prev, leaderName: '' }));
                                  }}
                                  placeholder="Full name as in ID"
                                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:outline-none ${
                                    showError('leaderName')
                                      ? 'border-red-500 focus:border-red-500'
                                      : 'border-slate-300 focus:border-[#6B1FE0]'
                                  }`}
                                />
                                {showError('leaderName') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.leaderName}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="leader-email"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Team Lead Email *
                                </label>
                                <input
                                  id="leader-email"
                                  type="email"
                                  value={leaderEmail}
                                  onBlur={() => setTouchedFields((prev) => ({ ...prev, leaderEmail: true }))}
                                  onChange={(e) => {
                                    setLeaderEmail(e.target.value);
                                    setFormErrors((prev) => ({ ...prev, leaderEmail: '' }));
                                  }}
                                  placeholder="lead@ritchennai.edu.in"
                                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:outline-none ${
                                    showError('leaderEmail')
                                      ? 'border-red-500 focus:border-red-500'
                                      : 'border-slate-300 focus:border-[#6B1FE0]'
                                  }`}
                                />
                                {showError('leaderEmail') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.leaderEmail}
                                  </p>
                                )}
                              </div>

                              {/* Lead Mobile (Clean input without OTP) */}
                              <div>
                                <label
                                  htmlFor="leader-mobile"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  10-Digit Mobile Number *
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                                    +91
                                  </span>
                                  <input
                                    id="leader-mobile"
                                    type="tel"
                                    maxLength={10}
                                    value={leaderMobile}
                                    onBlur={() => setTouchedFields((prev) => ({ ...prev, leaderMobile: true }))}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                      setLeaderMobile(val);
                                      setFormErrors((prev) => ({ ...prev, leaderMobile: '' }));
                                    }}
                                    placeholder="9876543210"
                                    className={`w-full rounded-xl border bg-white pl-11 pr-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 focus:outline-none ${
                                      showError('leaderMobile')
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-slate-300 focus:border-[#6B1FE0]'
                                    }`}
                                  />
                                </div>
                                {showError('leaderMobile') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.leaderMobile}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Step 1 Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
                              <div className="text-xs text-slate-500">
                                <span className="font-medium text-[#13354B] flex items-center gap-1.5">
                                  <CheckCircle2 className="h-4 w-4 text-[#6B1FE0]" />
                                  <span>Step 1 of 5: Team Identity &amp; Lead Information</span>
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={handleStep1Next}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#13354B] to-[#265673] px-7 py-3 text-sm font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition-all cursor-pointer"
                              >
                                <span>Next: Team Members</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ================= STEP 2: TEAM MEMBERS DETAILS ================= */}
                        {formStep === 2 && (
                          <div className="space-y-5">
                            {/* Member 1: Team Lead Info Card */}
                            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-extrabold text-[#6B1FE0]">
                                  <Users className="h-4 w-4" />
                                  <span>Member #1 — Team Lead</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> Verified Lead
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 text-xs text-slate-700">
                                <div>
                                  <span className="text-slate-400 font-medium">Name: </span>
                                  <span className="font-bold text-[#172347]">{leaderName}</span>
                                </div>
                                <div className="truncate">
                                  <span className="text-slate-400 font-medium">Email: </span>
                                  <span className="font-semibold text-[#172347]">{leaderEmail}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-medium">Mobile: </span>
                                  <span className="font-mono font-bold text-emerald-800">+91 {leaderMobile}</span>
                                </div>
                              </div>
                            </div>

                            {/* Solo Innovator Message when memberCount === 1 */}
                            {memberCount === 1 ? (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center space-y-2">
                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-[#6B1FE0]">
                                  <Sparkles className="h-5 w-5" />
                                </div>
                                <h3 className="text-sm font-bold text-[#172347]">Solo Innovator Track (1 Member)</h3>
                                <p className="text-xs text-slate-600 max-w-md mx-auto">
                                  You are participating individually. No additional member records are needed. Click below to continue directly to your project title and abstract submission.
                                </p>
                              </div>
                            ) : (
                              /* Dynamic Member Cards for Member 2 to memberCount */
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0] flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    <span>Additional Team Members ({memberCount - 1})</span>
                                  </h3>
                                  <span className="text-[11px] text-slate-500">
                                    Full Name, Email &amp; 10-Digit Mobile required
                                  </span>
                                </div>

                                {formErrors.members && (
                                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                                    <span>{formErrors.members}</span>
                                  </div>
                                )}

                                <div className="space-y-3.5">
                                  {Array.from({ length: memberCount - 1 }).map((_, idx) => {
                                    const memberNum = idx + 2;
                                    const member = members[idx] || { name: '', email: '', mobile: '' };
                                    return (
                                      <div
                                        key={memberNum}
                                        className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-3"
                                      >
                                        <div className="flex items-center justify-between text-xs font-bold text-[#172347]">
                                          <span className="flex items-center gap-1.5 text-[#13354B]">
                                            <Users className="h-3.5 w-3.5 text-[#6B1FE0]" />
                                            <span>Member #{memberNum} Details</span>
                                          </span>
                                          <span className="text-[11px] font-normal text-slate-500">
                                            Unique email &amp; mobile required
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                          <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                              Full Name *
                                            </label>
                                            <input
                                              type="text"
                                              value={member.name}
                                              onBlur={() => setTouchedFields((prev) => ({ ...prev, [`member_${memberNum}_name`]: true }))}
                                              onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                                              placeholder="Member full name"
                                              className={`w-full rounded-xl border bg-white px-3 py-2 text-base sm:text-xs text-slate-900 focus:outline-none ${
                                                showError(`member_${memberNum}_name`)
                                                  ? 'border-red-500 focus:border-red-500'
                                                  : 'border-slate-300 focus:border-[#6B1FE0]'
                                              }`}
                                            />
                                            {showError(`member_${memberNum}_name`) && (
                                              <p className="mt-1 text-[11px] font-medium text-red-600">
                                                {formErrors[`member_${memberNum}_name`]}
                                              </p>
                                            )}
                                          </div>

                                          <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                              Email Address *
                                            </label>
                                            <input
                                              type="email"
                                              value={member.email}
                                              onBlur={() => setTouchedFields((prev) => ({ ...prev, [`member_${memberNum}_email`]: true }))}
                                              onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                                              placeholder="member@domain.com"
                                              className={`w-full rounded-xl border bg-white px-3 py-2 text-base sm:text-xs text-slate-900 focus:outline-none ${
                                                showError(`member_${memberNum}_email`)
                                                  ? 'border-red-500 focus:border-red-500'
                                                  : 'border-slate-300 focus:border-[#6B1FE0]'
                                              }`}
                                            />
                                            {showError(`member_${memberNum}_email`) && (
                                              <p className="mt-1 text-[11px] font-medium text-red-600">
                                                {formErrors[`member_${memberNum}_email`]}
                                              </p>
                                            )}
                                          </div>

                                          <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                              10-Digit Mobile *
                                            </label>
                                            <div className="relative">
                                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500">
                                                +91
                                              </span>
                                              <input
                                                type="tel"
                                                maxLength={10}
                                                value={member.mobile}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, [`member_${memberNum}_mobile`]: true }))}
                                                onChange={(e) => {
                                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                  handleMemberChange(idx, 'mobile', val);
                                                }}
                                                placeholder="9876543210"
                                                className={`w-full rounded-xl border bg-white pl-10 pr-2.5 py-2 text-base sm:text-xs font-mono text-slate-900 focus:outline-none ${
                                                  showError(`member_${memberNum}_mobile`)
                                                    ? 'border-red-500 focus:border-red-500'
                                                    : 'border-slate-300 focus:border-[#6B1FE0]'
                                                }`}
                                              />
                                            </div>
                                            {showError(`member_${memberNum}_mobile`) && (
                                              <p className="mt-1 text-[11px] font-medium text-red-600">
                                                {formErrors[`member_${memberNum}_mobile`]}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Step 2 Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
                              <button
                                type="button"
                                onClick={() => setFormStep(1)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Team Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleStep2Next}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#13354B] to-[#265673] px-6 py-2.5 text-xs font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition-all cursor-pointer"
                              >
                                <span>Next: Project Proposal</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ================= STEP 3: PROJECT PROPOSAL & ABSTRACT ================= */}
                        {formStep === 3 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor="project-title"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Proposed Project Title *
                                </label>
                                <input
                                  id="project-title"
                                  type="text"
                                  value={projectTitle}
                                  onBlur={() => setTouchedFields((prev) => ({ ...prev, projectTitle: true }))}
                                  onChange={(e) => {
                                    setProjectTitle(e.target.value);
                                    setFormErrors((prev) => ({ ...prev, projectTitle: '' }));
                                  }}
                                  placeholder="e.g. Real-Time Sign Language Avatar"
                                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:outline-none ${
                                    showError('projectTitle')
                                      ? 'border-red-500 focus:border-red-500'
                                      : 'border-slate-300 focus:border-[#6B1FE0]'
                                  }`}
                                />
                                {showError('projectTitle') && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {formErrors.projectTitle}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="ieee-id"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  IEEE Member Number (Optional)
                                </label>
                                <input
                                  id="ieee-id"
                                  type="text"
                                  value={ieeeMemberId}
                                  onChange={(e) => setIeeeMemberId(e.target.value)}
                                  placeholder="e.g. 98412045"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Optional Faculty Mentor & Inclusion Impact Fields */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor="mentor-name"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Faculty Mentor / Guide Name (Optional)
                                </label>
                                <input
                                  id="mentor-name"
                                  type="text"
                                  value={mentorName}
                                  onChange={(e) => setMentorName(e.target.value)}
                                  placeholder="e.g. Dr. S. K. Narayanan, Professor CSE"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="inclusion-impact"
                                  className="block text-xs font-bold text-[#172347] mb-1.5"
                                >
                                  Inclusion &amp; Accessibility Impact (Optional)
                                </label>
                                <input
                                  id="inclusion-impact"
                                  type="text"
                                  value={inclusionImpact}
                                  onChange={(e) => setInclusionImpact(e.target.value)}
                                  placeholder="e.g. Assistive tool for low-vision developers"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label
                                  htmlFor="project-abstract"
                                  className="block text-xs font-bold text-[#172347]"
                                >
                                  Technical Abstract &amp; Solution Architecture (Min 20 chars) *
                                </label>
                                <span className={`text-[11px] font-mono ${abstract.trim().length >= 20 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                  {abstract.trim().length}/20 chars min
                                </span>
                              </div>
                              <textarea
                                id="project-abstract"
                                rows={4}
                                value={abstract}
                                onBlur={() => setTouchedFields((prev) => ({ ...prev, abstract: true }))}
                                onChange={(e) => {
                                  setAbstract(e.target.value);
                                  setFormErrors((prev) => ({ ...prev, abstract: '' }));
                                }}
                                placeholder="Describe the problem, architecture, hardware/software stack, and how your prototype builds ideas beyond borders..."
                                className={`w-full rounded-xl border bg-white p-3.5 text-base sm:text-sm text-slate-900 focus:outline-none ${
                                  showError('abstract')
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-slate-300 focus:border-[#6B1FE0]'
                                }`}
                              />
                              {showError('abstract') && (
                                <p className="mt-1 text-xs font-medium text-red-600">
                                  {formErrors.abstract}
                                </p>
                              )}
                            </div>

                            {/* Step 3 Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
                              <button
                                type="button"
                                onClick={() => setFormStep(2)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Team Members</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleStep3Next}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#13354B] to-[#265673] px-6 py-2.5 text-xs font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition-all cursor-pointer"
                              >
                                <span>Next: Registration Payment (₹{calculateRegistrationFee(memberCount)})</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ================= STEP 4: REGISTRATION PAYMENT QR ================= */}
                        {formStep === 4 && (
                          <div className="space-y-5">
                            {/* Payment Summary Box */}
                            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[#6B1FE0] flex items-center gap-1.5 uppercase tracking-wider">
                                  <CreditCard className="h-4 w-4" />
                                  <span>Official Registration Fee</span>
                                </span>
                                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                                  Amount Due: ₹{calculateRegistrationFee(memberCount)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/90 p-3.5 rounded-xl border border-purple-100 text-xs">
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Team</p>
                                  <p className="font-extrabold text-[#172347] truncate">{teamName || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Track</p>
                                  <p className="font-bold text-[#6B1FE0] truncate">
                                    {HACKATHON_TRACKS.find((t) => t.id === formTrackId)?.title}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Team Size</p>
                                  <p className="font-semibold text-slate-800">
                                    {memberCount} {memberCount === 1 ? 'Member (Solo)' : 'Members'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Pricing Tier</p>
                                  <p className="font-bold text-emerald-700">
                                    {memberCount === 4 ? '₹500 (Discounted)' : `₹${calculateRegistrationFee(memberCount)}`}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Scan-to-Pay Official UPI QR Container */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4 shadow-xs">
                              <div>
                                <h3 className="text-base font-extrabold text-[#172347] flex items-center justify-center gap-2">
                                  <QrCode className="h-5 w-5 text-[#6B1FE0]" />
                                  <span>Scan QR Code with Any UPI App</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  Google Pay · PhonePe · Paytm · BHIM · Amazon Pay · Any Banking UPI
                                </p>
                              </div>

                              <div className="mx-auto flex flex-col items-center justify-center">
                                <div className="p-3 bg-white border-2 border-purple-200 rounded-2xl shadow-sm inline-block">
                                  <img
                                    src={activePaymentQr}
                                    alt="HARMONIA 2027 Official UPI Payment QR Code"
                                    className="h-56 w-56 sm:h-64 sm:w-64 object-contain rounded-xl"
                                  />
                                </div>
                                <div className="mt-2.5 flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    UPI ID: harmonia2027@upi
                                  </span>
                                </div>
                              </div>

                              {/* View & Download Actions */}
                              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsQrModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-[#6B1FE0] hover:bg-purple-100 transition-colors cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View Full QR Code</span>
                                </button>

                                <a
                                  href={activePaymentQr}
                                  download="HARMONIA_2027_Payment_QR.svg"
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download QR Code</span>
                                </a>
                              </div>

                              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-left text-xs text-amber-900 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                  <Sparkles className="h-4 w-4 text-amber-600" />
                                  <span>Payment Step-by-Step Instructions:</span>
                                </p>
                                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-amber-800">
                                  <li>Scan the QR code above or pay directly to the UPI ID.</li>
                                  <li>Ensure the exact amount paid is <strong>₹{calculateRegistrationFee(memberCount)}</strong>.</li>
                                  <li>After the payment succeeds, <strong>take a clear screenshot</strong> showing the UPI Reference / UTR Number.</li>
                                  <li>Click "I've Completed Payment" below to upload your screenshot in Step 5.</li>
                                </ol>
                              </div>
                            </div>

                            {/* Step 4 Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
                              <button
                                type="button"
                                onClick={() => setFormStep(3)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Proposal</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleStep4Next}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#13354B] to-[#265673] px-7 py-3 text-sm font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition-all cursor-pointer"
                              >
                                <span>I've Completed Payment: Upload Proof</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ================= STEP 5: PAYMENT PROOF UPLOAD & FINAL REVIEW ================= */}
                        {formStep === 5 && (
                          <div className="space-y-5">
                            {/* Payment Screenshot Upload Box */}
                            <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-6 text-center space-y-4">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-[#6B1FE0]">
                                <Upload className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-[#172347]">
                                  Upload Payment Screenshot Proof *
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Supported formats: JPG, JPEG, PNG, WEBP · Maximum size: 5MB
                                </p>
                              </div>

                              {paymentScreenshotUrl ? (
                                <div className="max-w-md mx-auto rounded-2xl border border-purple-200 bg-white p-4 space-y-3">
                                  <div className="relative group mx-auto w-48 h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                                    <img
                                      src={paymentScreenshotUrl}
                                      alt="Payment Screenshot Preview"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    <p className="font-bold text-[#172347] truncate">{paymentScreenshotName}</p>
                                    {paymentScreenshotSize && (
                                      <p className="text-slate-400 text-[10px]">
                                        {(paymentScreenshotSize / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                  <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                                    <Edit3 className="h-3.5 w-3.5 text-[#6B1FE0]" />
                                    <span>Change Screenshot</span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={handlePaymentScreenshotChange}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="max-w-sm mx-auto">
                                  <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B1FE0] px-6 py-3 text-xs font-bold text-white shadow hover:bg-[#8F28E8] transition cursor-pointer">
                                    <Upload className="h-4 w-4" />
                                    <span>Select Payment Screenshot</span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={handlePaymentScreenshotChange}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}

                              {formErrors.paymentScreenshot && (
                                <p className="text-xs font-bold text-red-600">
                                  {formErrors.paymentScreenshot}
                                </p>
                              )}
                            </div>

                            {/* Comprehensive Review Summary Box */}
                            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs font-extrabold text-[#6B1FE0]">
                                <span className="flex items-center gap-1.5">
                                  <FileText className="h-4 w-4" />
                                  <span>Review Registration &amp; Submission Summary</span>
                                </span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  Please double-check all details
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 p-3.5 rounded-xl border border-purple-100">
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Team Name</p>
                                  <p className="font-extrabold text-[#172347]">{teamName || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Selected Track</p>
                                  <p className="font-bold text-[#6B1FE0]">
                                    {HACKATHON_TRACKS.find((t) => t.id === formTrackId)?.title}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Institution</p>
                                  <p className="font-semibold text-slate-700">{institution || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Team Lead</p>
                                  <p className="font-semibold text-slate-700">{leaderName} (+91 {leaderMobile})</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Registration Fee</p>
                                  <p className="font-bold text-emerald-800">
                                    ₹{calculateRegistrationFee(memberCount)} ({memberCount} {memberCount === 1 ? 'member' : 'members'})
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Payment Status</p>
                                  <p className="font-semibold text-amber-700">🟡 Pending Verification upon submit</p>
                                </div>
                                <div className="sm:col-span-2 border-t border-slate-100 pt-2">
                                  <p className="text-slate-400 text-[10px] uppercase font-bold">Project Title</p>
                                  <p className="font-bold text-[#172347]">{projectTitle || '—'}</p>
                                </div>
                                {memberCount > 1 && (
                                  <div className="sm:col-span-2 border-t border-slate-100 pt-2">
                                    <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">
                                      Additional Team Members ({memberCount - 1})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {members.slice(0, memberCount - 1).map((m, i) => (
                                        <span
                                          key={i}
                                          className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]"
                                        >
                                          <Users className="h-3 w-3 text-purple-600" />
                                          <span className="font-medium">{m.name || `Member ${i + 2}`}</span>
                                          {m.mobile && <span className="font-mono text-slate-500">(+91 {m.mobile})</span>}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Global Uniqueness Policy Banner */}
                            <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-3 text-xs text-slate-600 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-[#6B1FE0] shrink-0" />
                              <span>
                                <strong>Strict Hackathon Policy:</strong> Each participant (email and mobile) can only be registered once across the entire hackathon. All registrations are verified against our secure database.
                              </span>
                            </div>

                            {/* Submission Error Banner */}
                            {submissionError && (
                              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-bold">Submission Notice</p>
                                  <p className="mt-0.5">{submissionError}</p>
                                  <button
                                    type="button"
                                    onClick={handleRegisterSubmit}
                                    disabled={isSubmittingTeam}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
                                  >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isSubmittingTeam ? 'animate-spin' : ''}`} />
                                    <span>Retry Submission</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Step 5 Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
                              <button
                                type="button"
                                onClick={() => setFormStep(4)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Payment Info</span>
                              </button>

                              <button
                                type="submit"
                                disabled={isSubmittingTeam || !paymentScreenshotUrl}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#133B53] to-[#1E5372] px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-[#6B1FE0] hover:to-[#8F28E8] cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSubmittingTeam ? (
                                  <>
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Submitting Registration &amp; Proof...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                    <span>Submit Official Registration &amp; Abstract</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                </div>

                {/* Registered Teams Roster Inside Dashboard Page */}
                <div className="border-t border-[#172347]/10 pt-10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#6B1FE0]">
                        Verified Submissions
                      </div>
                      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#172347] sm:text-2xl">
                        Registered Hackathon Teams ({visibleRegistrations.length})
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {visibleRegistrations.map((team) => {
                      const trackObj = HACKATHON_TRACKS.find((t) => t.id === team.trackId);
                      return (
                        <motion.article
                          key={team.id}
                          whileHover={{ y: -5 }}
                          className="flex flex-col justify-between rounded-2xl border border-white/90 bg-white/95 p-6 shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs text-[#3C4A6B]">
                              <span className="font-bold text-[#6B1FE0]">
                                {trackObj?.title || 'Linguaverse'}
                              </span>
                              <span className="font-mono font-semibold tabular-nums">
                                {team.memberCount} Members
                              </span>
                            </div>

                            <h3 className="mt-2 text-lg font-extrabold text-[#172347]">
                              {team.teamName}
                            </h3>
                            <p className="mt-1 text-xs font-bold text-[#13354B]">
                              {team.projectTitle}
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-[#25335A]">
                              {team.abstract}
                            </p>
                          </div>

                          <div className="mt-6 border-t border-slate-200 pt-3 text-xs text-[#3C4A6B] space-y-1">
                            <div className="font-bold text-[#172347]">
                              Lead: {team.leaderName}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="truncate">{team.institution}</span>
                              {team.ieeeMemberId && (
                                <span className="font-mono text-[#13354B] shrink-0">
                                  IEEE #{team.ieeeMemberId}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
      </main>

      {/* Deep Navy 4-Column Footer Matching Screenshot 2 */}
      <footer className="relative z-10 bg-[#191E4B] text-white pt-14 pb-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 pb-12 border-b border-white/10">
            {/* Column 1: HARMONIA Brand & Organizer Description */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xl font-extrabold tracking-wide text-white uppercase">
                HARMONIA
              </div>
              <div className="text-xs font-medium text-slate-300">
                2027 · Ideas Beyond Borders
              </div>
              <p className="text-xs leading-relaxed text-slate-300 max-w-sm">
                A 24-hour international hackathon bringing creative minds together to build solutions for a more inclusive and connected world.
              </p>
              <div className="pt-2 text-xs font-semibold text-slate-300">
                Organized by Rajalakshmi Institute of Technology (Department of CSE)
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <div className="rounded bg-white px-2 py-1">
                  <img
                    src={OFFICIAL_LOGOS.rit}
                    alt="RIT Logo"
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <div className="rounded bg-white px-2 py-1">
                  <img
                    src={OFFICIAL_LOGOS.harmonia}
                    alt="HARMONIA Logo"
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <div className="rounded bg-white px-2 py-1">
                  <img
                    src={OFFICIAL_LOGOS.ieee}
                    alt="IEEE Logo"
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <div className="rounded bg-white px-2 py-1">
                  <img
                    src={OFFICIAL_LOGOS.idatamind}
                    alt="iDataMind Logo"
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: QUICK LINKS */}
            <div className="lg:col-span-2 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Links
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('home')}
                    className="hover:text-white cursor-pointer"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('tracks')}
                    className="hover:text-white cursor-pointer"
                  >
                    Themes
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('timeline')}
                    className="hover:text-white cursor-pointer"
                  >
                    Timeline
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('prizes')}
                    className="hover:text-white cursor-pointer"
                  >
                    Prizes
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('faq')}
                    className="hover:text-white cursor-pointer"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('faq')}
                    className="hover:text-white cursor-pointer"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: THEMES */}
            <div className="lg:col-span-3 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Themes
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                {HACKATHON_TRACKS.map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrack(track.id);
                        navigateToPage('tracks');
                      }}
                      className="hover:text-white cursor-pointer"
                    >
                      {track.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: PARTICIPATE */}
            <div className="lg:col-span-2 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Participate
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('dashboard')}
                    className="hover:text-white cursor-pointer"
                  >
                    Register Now
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('dashboard')}
                    className="hover:text-white cursor-pointer"
                  >
                    My Dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('faq')}
                    className="hover:text-white cursor-pointer"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToPage('faq')}
                    className="hover:text-white cursor-pointer"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    Organizer Portal
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © 2027 HARMONIA · Rajalakshmi Institute of Technology. All rights reserved.
            </div>
            <div>In association with iDataMind &amp; IEEE</div>
          </div>
        </div>
      </footer>

      {/* Lazy-Loaded Modals Loaded Strictly On Demand */}
      <React.Suspense fallback={null}>
        {isAuthModalOpen && (
          <GoogleAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            user={user}
            onSignInSuccess={handleSignInSuccess}
            onSignOut={handleSignOut}
            registrations={registrations}
          />
        )}
        {isCoordinatorModalOpen && (
          <CoordinatorLoginModal
            isOpen={isCoordinatorModalOpen}
            onClose={() => setIsCoordinatorModalOpen(false)}
            onLoginSuccess={handleCoordinatorLogin}
          />
        )}
        {isProfileModalOpen && (
          <ParticipantProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            initialName={user?.displayName || ''}
            initialEmail={user?.email || ''}
            initialInstitution="Rajalakshmi Institute of Technology"
            onProfileComplete={handleProfileComplete}
          />
        )}
        {isSuccessModalOpen && successRegistration && (
          <RegistrationSuccessModal
            isOpen={isSuccessModalOpen}
            registration={successRegistration}
            onClose={() => setIsSuccessModalOpen(false)}
            onGoToDashboard={() => {
              setIsSuccessModalOpen(false);
              navigateToPage('dashboard');
            }}
            onSignOut={handleSignOut}
          />
        )}

        {/* View Full Payment QR Modal */}
        {isQrModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative w-full max-w-sm rounded-3xl border border-white/90 bg-white p-6 shadow-2xl text-center space-y-4">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="pt-2">
                <h3 className="text-base font-extrabold text-[#172347]">Official Payment QR Code</h3>
                <p className="text-xs text-slate-500 mt-0.5">Scan to pay via any UPI application</p>
              </div>

              <div className="p-3 bg-white border border-purple-200 rounded-2xl shadow-sm inline-block">
                <img
                  src={activePaymentQr}
                  alt="Full HARMONIA Payment QR Code"
                  className="h-64 w-64 object-contain rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-slate-700">UPI ID: harmonia2027@upi</p>
                <p className="text-[11px] text-slate-500">Rajalakshmi Institute of Technology · HARMONIA 2027</p>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href={activePaymentQr}
                  download="HARMONIA_Payment_QR.svg"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#13354B] to-[#265673] py-2.5 text-xs font-bold text-white shadow hover:from-[#6B1FE0] hover:to-[#8F28E8] transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download QR</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Re-upload Payment Proof Modal (for Rejected Payments) */}
        {reuploadTargetRegistration && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative w-full max-w-lg rounded-3xl border border-white/90 bg-white p-6 sm:p-8 shadow-2xl space-y-5">
              <button
                type="button"
                onClick={() => setReuploadTargetRegistration(null)}
                className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Payment Verification Remediation
                </span>
                <h3 className="text-lg font-black text-[#172347] mt-1">
                  Re-upload Payment Proof
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update payment screenshot for team: <strong>{reuploadTargetRegistration.teamName}</strong> (ID: {reuploadTargetRegistration.id})
                </p>
              </div>

              {reuploadTargetRegistration.paymentRejectionReason && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>Coordinator's Rejection Note:</span>
                  </p>
                  <p className="italic pl-5">"{reuploadTargetRegistration.paymentRejectionReason}"</p>
                </div>
              )}

              <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-5 text-center space-y-3">
                {reuploadScreenshotUrl ? (
                  <div className="space-y-2">
                    <img
                      src={reuploadScreenshotUrl}
                      alt="New Payment Screenshot"
                      className="mx-auto h-40 w-40 object-contain rounded-xl border border-slate-200 bg-white shadow-xs"
                    />
                    <p className="text-xs font-bold text-slate-800">{reuploadScreenshotName}</p>
                    <label className="inline-flex items-center gap-1 text-xs font-bold text-[#6B1FE0] hover:underline cursor-pointer">
                      <span>Choose Different Screenshot</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReuploadScreenshotChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B1FE0] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#8F28E8] transition cursor-pointer">
                      <Upload className="h-4 w-4" />
                      <span>Select Corrected Screenshot</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReuploadScreenshotChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-2">JPG, PNG, or WEBP up to 5MB</p>
                  </div>
                )}
              </div>

              {reuploadError && (
                <p className="text-xs font-bold text-red-600">{reuploadError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmitPaymentReupload}
                  disabled={!reuploadScreenshotUrl || isSubmittingReupload}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReupload ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Submit Corrected Payment Proof</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setReuploadTargetRegistration(null)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </React.Suspense>
    </div>
  );
}
