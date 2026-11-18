import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  filterTracks,
  filterRegistrations,
  validateTeamRegistration,
  calculateHackathonStats,
} from './utils/hackathonLogic';
import {
  auth,
  db,
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  onAuthStateChanged,
  firebaseSignOut,
  handleFirestoreError,
  OperationType,
  firebaseConfig,
  HackathonUser,
} from './lib/firebase';
import { HeroSection } from './components/HeroSection';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { CoordinatorsSection } from './components/CoordinatorsSection';
import { InteractiveBackground } from './components/InteractiveBackground';
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
} from 'lucide-react';

const STORAGE_KEY = 'harmonia_2027_registrations_v3';
const USER_STORAGE_KEY = 'harmonia_2027_user_v1';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Interactive Mouse Parallax State for Background Moving Objects
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Team Registration Form State (Team Size 1-4 per official poster)
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [institution, setInstitution] = useState('Rajalakshmi Institute of Technology');
  const [ieeeMemberId, setIeeeMemberId] = useState('');
  const [formTrackId, setFormTrackId] = useState<Exclude<TrackId, 'all'>>('linguaverse');
  const [projectTitle, setProjectTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [memberCount, setMemberCount] = useState<number>(4);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

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

  // Sync user's Firestore registrations when authenticated with real Firebase Auth
  useEffect(() => {
    if (!isAuthReady || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'registrations'), where('ownerId', '==', uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudTeams: TeamRegistration[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: data.id,
              teamName: data.teamName,
              leaderName: data.leaderName,
              leaderEmail: data.leaderEmail,
              institution: data.institution,
              ieeeMemberId: data.ieeeMemberId,
              trackId: data.trackId,
              projectTitle: data.projectTitle,
              abstract: data.abstract,
              memberCount: data.memberCount,
              createdAt: data.createdAt,
            };
          });
          setRegistrations((prev) => {
            const existingIds = new Set(cloudTeams.map((t) => t.id));
            return [...cloudTeams, ...prev.filter((p) => !existingIds.has(p.id))];
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'registrations');
      }
    );
    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Pre-fill leader name & email when user signs in
  useEffect(() => {
    if (user) {
      if (!leaderName) setLeaderName(user.displayName);
      if (!leaderEmail) setLeaderEmail(user.email);
    }
  }, [user, leaderName, leaderEmail]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    } catch {
      // ignore storage errors
    }
  }, [registrations]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined') return;
    const normX = (e.clientX / window.innerWidth - 0.5) * 2;
    const normY = (e.clientY / window.innerHeight - 0.5) * 2;
    setMousePos({ x: normX, y: normY });
  };

  const navigateToPage = (page: PageId) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  const handleSelectTrackForRegistration = (trackId: Exclude<TrackId, 'all'>) => {
    setFormTrackId(trackId);
    navigateToPage('dashboard');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionSuccess(null);

    const validation = validateTeamRegistration({
      teamName,
      leaderName,
      leaderEmail,
      institution,
      trackId: formTrackId,
      projectTitle,
      abstract,
      memberCount,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    const regId = `team-${Date.now()}`;
    const newTeam: TeamRegistration = {
      id: regId,
      teamName: teamName.trim().slice(0, 80),
      leaderName: leaderName.trim().slice(0, 80),
      leaderEmail: leaderEmail.trim().slice(0, 120),
      institution: institution.trim().slice(0, 120),
      ieeeMemberId: ieeeMemberId.trim() || undefined,
      trackId: formTrackId,
      projectTitle: projectTitle.trim().slice(0, 140),
      abstract: abstract.trim().slice(0, 1000),
      memberCount: Math.min(4, Math.max(1, Math.round(memberCount))),
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore if signed in with Firebase Auth
    if (auth.currentUser) {
      try {
        const firestorePayload: Record<string, unknown> = {
          id: newTeam.id,
          ownerId: auth.currentUser.uid,
          teamName: newTeam.teamName,
          leaderName: newTeam.leaderName,
          leaderEmail: newTeam.leaderEmail,
          institution: newTeam.institution,
          trackId: newTeam.trackId,
          projectTitle: newTeam.projectTitle,
          abstract: newTeam.abstract,
          memberCount: newTeam.memberCount,
          createdAt: newTeam.createdAt,
        };
        if (newTeam.ieeeMemberId) {
          firestorePayload.ieeeMemberId = newTeam.ieeeMemberId;
        }
        await setDoc(doc(db, 'registrations', newTeam.id), firestorePayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `registrations/${newTeam.id}`);
      }
    }

    setRegistrations((prev) => [newTeam, ...prev]);
    setSubmissionSuccess(
      `Team "${newTeam.teamName}" is officially registered under Track: ${
        HACKATHON_TRACKS.find((t) => t.id === newTeam.trackId)?.title
      }.`
    );
    setTeamName('');
    setProjectTitle('');
    setAbstract('');
  };

  const visibleTracks = filterTracks(HACKATHON_TRACKS, selectedTrack, searchQuery);
  const visibleRegistrations = filterRegistrations(
    registrations,
    selectedTrack,
    searchQuery
  );
  const stats = calculateHackathonStats(HACKATHON_TRACKS, registrations);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-gradient-to-b from-[#E5CBE0] via-[#F6DCBD] to-[#F3D1AE] text-[#172347] flex flex-col overflow-x-hidden"
    >
      {/* Live Interactive Moving Background Layer Across All Pages */}
      <InteractiveBackground
        mouseX={mousePos.x}
        mouseY={mousePos.y}
        variant={currentPage === 'faq' ? 'light' : 'sunset'}
      />

      {/* Top Navigation Bar — Matching Reference Image & Screenshot 2 */}
      <header className="sticky top-0 z-40 border-b border-white/50 bg-[#F4E6EC]/90 px-4 py-3 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Zone 1: Left Brand Lockup (RIT Logo | HARMONIA Logo) */}
          <button
            type="button"
            onClick={() => navigateToPage('home')}
            className="flex items-center gap-3 shrink-0 cursor-pointer"
          >
            <img
              src={OFFICIAL_LOGOS.rit}
              alt="Rajalakshmi Institute of Technology (RIT)"
              referrerPolicy="no-referrer"
              className="h-8 sm:h-9 w-auto object-contain rounded-md bg-white px-2 py-1 shadow-2xs"
            />
            <span className="h-6 w-[1.5px] bg-[#1B2845]/25 hidden sm:inline-block" aria-hidden="true" />
            <img
              src={OFFICIAL_LOGOS.harmonia}
              alt="HARMONIA Logo"
              referrerPolicy="no-referrer"
              className="h-8 sm:h-9 w-auto object-contain rounded-md bg-white px-2 py-1 shadow-2xs"
            />
          </button>

          {/* Zone 2: Center Dark Teal Navigation Capsule (Home | Tracks | Timeline | Prizes | FAQ) */}
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

          {/* Zone 3: Right "In association with iDataMind & IEEE" + "Dashboard" / "Register Now" Button */}
          <div className="flex items-center gap-2.5 shrink-0">
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
              <span>{user ? user.displayName : 'Google Sign In'}</span>
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
          </div>
        </div>

        {/* Mobile Page Switcher Strip */}
        <div className="mt-2.5 flex md:hidden items-center justify-between gap-1 overflow-x-auto rounded-full bg-[#13354B] p-1 text-xs font-semibold text-white">
          {PAGE_ORDER.map((pageId) => (
            <button
              key={pageId}
              type="button"
              onClick={() => navigateToPage(pageId)}
              className={`rounded-full px-3 py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === pageId ? 'bg-[#265673] text-white' : 'text-white/75'
              }`}
            >
              {PAGE_LABELS[pageId]}
            </button>
          ))}
        </div>
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

                {/* Detailed Track Cards Grid */}
                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleTracks.map((track, idx) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.06 }}
                      whileHover={{ y: -8, scale: 1.01 }}
                      className="group flex flex-col justify-between rounded-3xl border border-white/90 bg-white/92 backdrop-blur-md p-6 shadow-[0_12px_32px_rgba(27,40,69,0.08)] transition-all hover:border-purple-300 hover:shadow-[0_18px_40px_rgba(107,31,224,0.14)]"
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

                  {/* Right Column: Team Registration Form */}
                  <div className="lg:col-span-7">
                    <form
                      onSubmit={handleRegisterSubmit}
                      noValidate
                      className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_18px_45px_rgba(27,40,69,0.1)] space-y-5"
                    >
                      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[#172347]">
                          Team &amp; Proposal Submission Form
                        </h2>
                        <span className="text-xs font-semibold text-[#6B1FE0]">
                          Team Size: 1–4 Members
                        </span>
                      </div>

                      {submissionSuccess && (
                        <div
                          role="status"
                          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Registration Confirmed</p>
                            <p className="mt-0.5">{submissionSuccess}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="e.g. Neural Bridge Collective"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          />
                          {formErrors.teamName && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {formErrors.teamName}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="track-select"
                            className="block text-xs font-bold text-[#172347] mb-1.5"
                          >
                            Problem Track *
                          </label>
                          <select
                            id="track-select"
                            value={formTrackId}
                            onChange={(e) =>
                              setFormTrackId(e.target.value as Exclude<TrackId, 'all'>)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          >
                            {HACKATHON_TRACKS.map((t) => (
                              <option key={t.id} value={t.id}>
                                Track {t.number}: {t.title} — {t.tagline}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                            onChange={(e) => setLeaderName(e.target.value)}
                            placeholder="e.g. Alex Johnson"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          />
                          {formErrors.leaderName && (
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
                            onChange={(e) => setLeaderEmail(e.target.value)}
                            placeholder="leader@university.edu"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          />
                          {formErrors.leaderEmail && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {formErrors.leaderEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder="Rajalakshmi Institute of Technology"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          />
                          {formErrors.institution && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {formErrors.institution}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="member-count"
                            className="block text-xs font-bold text-[#172347] mb-1.5"
                          >
                            Team Size (1–4) *
                          </label>
                          <input
                            id="member-count"
                            type="number"
                            min={1}
                            max={4}
                            value={memberCount}
                            onChange={(e) => setMemberCount(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 tabular-nums focus:border-[#6B1FE0] focus:outline-none"
                          />
                          {formErrors.memberCount && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {formErrors.memberCount}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="e.g. Real-Time Sign Language Avatar"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          />
                          {formErrors.projectTitle && (
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
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="project-abstract"
                          className="block text-xs font-bold text-[#172347] mb-1.5"
                        >
                          Technical Abstract &amp; Inclusion Impact (Min 20 chars) *
                        </label>
                        <textarea
                          id="project-abstract"
                          rows={3}
                          value={abstract}
                          onChange={(e) => setAbstract(e.target.value)}
                          placeholder="Describe the problem, architecture, hardware/software stack, and how your prototype builds ideas beyond borders..."
                          className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-[#6B1FE0] focus:outline-none"
                        />
                        {formErrors.abstract && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {formErrors.abstract}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#133B53] to-[#1E5372] px-7 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-[#6B1FE0] hover:to-[#8F28E8] cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <PlusCircle className="h-4 w-4" aria-hidden="true" />
                          <span>Submit Team Registration</span>
                        </button>
                      </div>
                    </form>
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

      {/* Firebase Google Authentication & Cloud Sync Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onSignInSuccess={handleSignInSuccess}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
