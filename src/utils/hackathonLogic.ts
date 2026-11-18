export type TrackId =
  | 'all'
  | 'linguaverse'
  | 'abilityx'
  | 'roots'
  | 'flowforge'
  | 'iotverse';

export type PageId =
  | 'home'
  | 'tracks'
  | 'timeline'
  | 'prizes'
  | 'faq'
  | 'dashboard';

export const PAGE_ORDER: PageId[] = [
  'home',
  'tracks',
  'timeline',
  'prizes',
  'faq',
  'dashboard',
];

export const PAGE_LABELS: Record<PageId, string> = {
  home: 'Home',
  tracks: 'Tracks',
  timeline: 'Timeline',
  prizes: 'Prizes',
  faq: 'FAQ & Contact',
  dashboard: 'Team Dashboard',
};

export interface HackathonTrack {
  id: Exclude<TrackId, 'all'>;
  number: string;
  title: string;
  tagline: string;
  organization: string;
  prizeStatus: string;
  colorTheme: 'blue' | 'green' | 'terracotta' | 'plum' | 'slate';
  summary: string;
  deliverableRequirement: string;
  registeredCount: number;
}

export interface Coordinator {
  name: string;
  role: string;
  department: string;
  phone: string;
  formattedPhone: string;
  email: string;
  category: 'faculty' | 'student';
}

export interface TeamRegistration {
  id: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  institution: string;
  ieeeMemberId?: string;
  trackId: Exclude<TrackId, 'all'>;
  projectTitle: string;
  abstract: string;
  memberCount: number;
  createdAt: string;
}

export interface RegistrationValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const OFFICIAL_LOGOS = {
  harmonia: '/assets/aistudio/WhatsApp_Image_2026-11-05_at_9.55.36_PM_6702fc40.jpeg',
  rit: '/assets/aistudio/RIT_Logo_copy.jpg_df27acb0.jpeg',
  ieee: '/assets/aistudio/d9390228dd804b94b88b8e40fd379e17_11206b80.jpg',
  idatamind: '/assets/aistudio/WhatsApp_Image_2026-11-05_at_6.38.06_PM_0bcd0555.jpeg',
  poster: '/assets/aistudio/WhatsApp_Image_2026-11-05_at_9.51.19_PM_10200bbf.jpeg',
  coastalHero: '/assets/images/harmonia_coastal_sunset_hero_1793899947684.jpg',
} as const;

export const EVENT_DETAILS = {
  organizerInstitution: 'Rajalakshmi Institute of Technology',
  presentingDepartment: 'Department of Computer Science & Engineering',
  eventDate: 'February 3 & 4, 2027',
  venue: 'Rajalakshmi Institute of Technology (RIT), Chennai, Tamil Nadu, India',
  shortVenue: 'RIT Campus, Chennai',
  teamSizeLabel: '1–4 Members',
  minTeamSize: 1,
  maxTeamSize: 4,
  prizeAnnouncementText: 'Will be announced shortly',
  supportHours: 'Monday – Friday · 9:00 AM – 5:00 PM IST',
} as const;

export const FACULTY_COORDINATORS: Coordinator[] = [
  {
    name: 'Ms. B. Harshana',
    role: 'Event & Faculty Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '9952113855',
    formattedPhone: '+91 99521 13855',
    email: 'harshana.b@ritchennai.edu.in',
    category: 'faculty',
  },
  {
    name: 'Mr. P. Murugan',
    role: 'Event & Faculty Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '9095324739',
    formattedPhone: '+91 90953 24739',
    email: 'murugan.p@ritchennai.edu.in',
    category: 'faculty',
  },
  {
    name: 'Mrs. T. Kavitha',
    role: 'Event & Faculty Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '8754112325',
    formattedPhone: '+91 87541 12325',
    email: 'kavitha.t@ritchennai.edu.in',
    category: 'faculty',
  },
  {
    name: 'Mr. Sabari Bala Sundar. S',
    role: 'Event & Faculty Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '8124932077',
    formattedPhone: '+91 81249 32077',
    email: 'sabaribalasundar.s@ritchennai.edu.in',
    category: 'faculty',
  },
];

export const STUDENT_COORDINATORS: Coordinator[] = [
  {
    name: 'Sathish MS',
    role: 'Student Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '9384579988',
    formattedPhone: '+91 93845 79988',
    email: 'sathish.ms@ritchennai.edu.in',
    category: 'student',
  },
  {
    name: 'Mohamed Jamel S',
    role: 'Student Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '8825455681',
    formattedPhone: '+91 88254 55681',
    email: 'mohamedjamel.s@ritchennai.edu.in',
    category: 'student',
  },
  {
    name: 'Siva Visveshwar VJ',
    role: 'Student Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '8610645763',
    formattedPhone: '+91 86106 45763',
    email: 'sivavisveshwar.vj@ritchennai.edu.in',
    category: 'student',
  },
  {
    name: 'Nithyasree Satish',
    role: 'Student Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '9840747080',
    formattedPhone: '+91 98407 47080',
    email: 'nithyasree.satish@ritchennai.edu.in',
    category: 'student',
  },
  {
    name: 'Harshini A',
    role: 'Student Coordinator',
    department: 'Department of Computer Science & Engineering · RIT',
    phone: '7305024560',
    formattedPhone: '+91 73050 24560',
    email: 'harshini.a@ritchennai.edu.in',
    category: 'student',
  },
];

export const HACKATHON_TRACKS: HackathonTrack[] = [
  {
    id: 'linguaverse',
    number: '01',
    title: 'Linguaverse',
    tagline: 'AI for Every Language',
    organization: 'iDataMind & RIT CSE NLP Lab',
    prizeStatus: 'Will be announced shortly',
    colorTheme: 'blue',
    summary:
      'Break cross-border communication barriers with real-time vernacular speech-to-speech translation, low-resource dialect preservation, and inclusive multilingual civic assistants.',
    deliverableRequirement: 'Live multilingual demo + benchmark latency report',
    registeredCount: 280,
  },
  {
    id: 'abilityx',
    number: '02',
    title: 'AbilityX',
    tagline: 'Technology Without Barriers',
    organization: 'IEEE Sight & Assistive Engineering',
    prizeStatus: 'Will be announced shortly',
    colorTheme: 'green',
    summary:
      'Build next-generation assistive interfaces, ultrasonic spatial navigation wearables, sign-language avatars, and neurodiverse-friendly educational companions.',
    deliverableRequirement: 'Working accessibility prototype + WCAG AAA validation',
    registeredCount: 310,
  },
  {
    id: 'roots',
    number: '03',
    title: 'Roots to Futures',
    tagline: 'Innovating for Communities',
    organization: 'HARMONIA Global Inclusion Initiative',
    prizeStatus: 'Will be announced shortly',
    colorTheme: 'terracotta',
    summary:
      'Empower rural and coastal communities with decentralized clean-energy microgrids, precision smallholder agriculture, and offline-first maternal telehealth.',
    deliverableRequirement: 'Community impact blueprint + working field prototype',
    registeredCount: 245,
  },
  {
    id: 'flowforge',
    number: '04',
    title: 'FlowForge',
    tagline: 'Intelligent Logistics and Supply Chains',
    organization: 'iDataMind Intelligence Track',
    prizeStatus: 'Will be announced shortly',
    colorTheme: 'plum',
    summary:
      'Optimize humanitarian relief routing, cold-chain vaccine distribution, and low-carbon port logistics with predictive simulation and autonomous workflow orchestration.',
    deliverableRequirement: 'Optimization engine + interactive route telemetry',
    registeredCount: 195,
  },
  {
    id: 'iotverse',
    number: '05',
    title: 'IoTVerse',
    tagline: 'Connecting the Intelligent World',
    organization: 'RIT Sensor Networks & IEEE',
    prizeStatus: 'Will be announced shortly',
    colorTheme: 'slate',
    summary:
      'Design ultra-low-power LoRaWAN mesh networks, coastal flood early-warning buoys, and smart campus environmental monitors that operate reliably off-grid.',
    deliverableRequirement: 'Hardware/simulation node + real-time telemetry stream',
    registeredCount: 220,
  },
];

export const INITIAL_REGISTRATIONS: TeamRegistration[] = [
  {
    id: 'team-101',
    teamName: 'BhashaBridge AI',
    leaderName: 'Ananya Sundaram',
    leaderEmail: 'ananya.s@ritchennai.edu.in',
    institution: 'Rajalakshmi Institute of Technology',
    ieeeMemberId: '98412045',
    trackId: 'linguaverse',
    projectTitle: 'Zero-Shot Acoustic Translation for Coastal Fishing Communities',
    abstract:
      'An offline-capable voice translator bridging 14 regional coastal dialects with emergency maritime weather broadcasts in real time.',
    memberCount: 4,
    createdAt: '2026-11-05T07:30:00Z',
  },
  {
    id: 'team-102',
    teamName: 'Auralis Tactile',
    leaderName: 'Karthikeya V.',
    leaderEmail: 'karthikeya.v@ieee.org',
    institution: 'IEEE Student Branch — Madras Section',
    ieeeMemberId: '97103912',
    trackId: 'abilityx',
    projectTitle: 'Ultrasonic Haptic Wayfinding Wearable for Public Transit Hubs',
    abstract:
      'Wearable spatial guidance band paired with a progressive web companion that translates crowded railway station layouts into directional tactile pulses.',
    memberCount: 4,
    createdAt: '2026-11-05T08:15:00Z',
  },
  {
    id: 'team-103',
    teamName: 'CoastalGrid Sentinels',
    leaderName: 'Dr. Meera Krishnan',
    leaderEmail: 'meera.k@idatamind.in',
    institution: 'iDataMind Research Fellows',
    trackId: 'iotverse',
    projectTitle: 'LoRaWAN Estuarine Flood Buoys & Microgrid Islanding',
    abstract:
      'Solar-powered coastal sensor nodes with automated substation relay scheduling to keep community clinics powered during monsoon surges.',
    memberCount: 4,
    createdAt: '2026-11-05T08:50:00Z',
  },
];

export const TIMELINE_MILESTONES = [
  {
    phase: 'Phase 01',
    title: 'Team Registration & Abstract Submission',
    date: 'Open Now – Jan 20, 2027',
    description:
      'Form teams of 1–4 members, select one of the 5 HARMONIA tracks (Linguaverse, AbilityX, Roots to Futures, FlowForge, or IoTVerse), and submit your abstract.',
    badge: 'Registration Open',
  },
  {
    phase: 'Phase 02',
    title: 'Shortlisting & Technical Mentorship (RIT · IEEE · iDataMind)',
    date: 'Jan 22 – Jan 30, 2027',
    description:
      'Shortlisted teams are paired with faculty mentors from the Department of Computer Science & Engineering at RIT, IEEE, and iDataMind.',
    badge: 'Mentorship',
  },
  {
    phase: 'Phase 03',
    title: 'Day 1 · HARMONIA Inauguration & 24-Hour Build Sprint Begins',
    date: 'February 3, 2027 · Venue: RIT Chennai',
    description:
      'Official inauguration by Department of CSE, Rajalakshmi Institute of Technology, followed by kick-off of the 24-hour international hackathon sprint.',
    badge: 'Feb 3 · RIT',
  },
  {
    phase: 'Phase 04',
    title: 'Day 2 · Final Jury Evaluation, Demo Day & Valedictory Ceremony',
    date: 'February 4, 2027 · Venue: RIT Chennai',
    description:
      'Live prototype demonstrations before the IEEE & iDataMind panel and valedictory award ceremony at RIT campus.',
    badge: 'Feb 4 · Finale',
  },
];

export const FAQ_ITEMS = [
  {
    question: 'When and where is HARMONIA taking place?',
    answer:
      'HARMONIA is presented by the Department of Computer Science & Engineering at Rajalakshmi Institute of Technology (RIT), Chennai on February 3 & 4. Both on-campus and international hybrid tracks are supported.',
  },
  {
    question: 'What is the allowed team size for HARMONIA?',
    answer:
      'As specified in the official HARMONIA poster, each team can have between 1 and 4 members (Team Size: 1–4 Members). Solo innovators and teams up to 4 students are welcome.',
  },
  {
    question: 'What is the prize pool and award structure?',
    answer:
      'The official award money and track-wise cash prizes will be announced shortly by the organizing committee from Rajalakshmi Institute of Technology, IEEE, and iDataMind. All finalists also receive official IEEE & RIT certificates and mentorship.',
  },
  {
    question: 'Who can I contact for queries regarding registration or venue?',
    answer:
      'You can reach our Event / Faculty Coordinators (Ms. B. Harshana, Mr. P. Murugan, Mrs. T. Kavitha, Mr. Sabari Bala Sundar. S) or our Student Coordinators (Sathish MS, Mohamed Jamel S, Siva Visveshwar VJ, Nithyasree Satish, Harshini A) directly via phone or email listed on the FAQ & Contact page.',
  },
];

export function getNextPage(currentPage: PageId): PageId | null {
  const idx = PAGE_ORDER.indexOf(currentPage);
  if (idx === -1 || idx >= PAGE_ORDER.length - 1) return null;
  return PAGE_ORDER[idx + 1];
}

export function getPrevPage(currentPage: PageId): PageId | null {
  const idx = PAGE_ORDER.indexOf(currentPage);
  if (idx <= 0) return null;
  return PAGE_ORDER[idx - 1];
}

export function filterTracks(
  tracks: HackathonTrack[],
  selectedTrack: TrackId,
  searchQuery: string
): HackathonTrack[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return tracks.filter((track) => {
    const matchesTrack = selectedTrack === 'all' || track.id === selectedTrack;
    if (!matchesTrack) return false;
    if (!normalizedQuery) return true;
    return (
      track.title.toLowerCase().includes(normalizedQuery) ||
      track.tagline.toLowerCase().includes(normalizedQuery) ||
      track.summary.toLowerCase().includes(normalizedQuery) ||
      track.organization.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function filterRegistrations(
  registrations: TeamRegistration[],
  selectedTrack: TrackId,
  searchQuery: string
): TeamRegistration[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return registrations.filter((reg) => {
    const matchesTrack = selectedTrack === 'all' || reg.trackId === selectedTrack;
    if (!matchesTrack) return false;
    if (!normalizedQuery) return true;
    return (
      reg.teamName.toLowerCase().includes(normalizedQuery) ||
      reg.projectTitle.toLowerCase().includes(normalizedQuery) ||
      reg.institution.toLowerCase().includes(normalizedQuery) ||
      reg.leaderName.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function validateTeamRegistration(input: {
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  institution: string;
  trackId: string;
  projectTitle: string;
  abstract: string;
  memberCount: number;
}): RegistrationValidationResult {
  const errors: Record<string, string> = {};

  if (!input.teamName || input.teamName.trim().length < 3) {
    errors.teamName = 'Team name must be at least 3 characters.';
  }
  if (!input.leaderName || input.leaderName.trim().length < 2) {
    errors.leaderName = 'Team lead full name is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.leaderEmail || !emailRegex.test(input.leaderEmail.trim())) {
    errors.leaderEmail = 'Enter a valid academic or organizational email address.';
  }
  if (!input.institution || input.institution.trim().length < 3) {
    errors.institution = 'University, college, or organization name is required.';
  }
  if (
    !['linguaverse', 'abilityx', 'roots', 'flowforge', 'iotverse'].includes(
      input.trackId
    )
  ) {
    errors.trackId = 'Select a valid hackathon track.';
  }
  if (!input.projectTitle || input.projectTitle.trim().length < 6) {
    errors.projectTitle = 'Project title must be at least 6 characters.';
  }
  if (!input.abstract || input.abstract.trim().length < 20) {
    errors.abstract = 'Project abstract must be at least 20 characters.';
  }
  if (
    typeof input.memberCount !== 'number' ||
    Number.isNaN(input.memberCount) ||
    input.memberCount < 1 ||
    input.memberCount > 4
  ) {
    errors.memberCount = 'Team size must be between 1 and 4 members (per official rules).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function calculateHackathonStats(
  tracks: HackathonTrack[],
  registrations: TeamRegistration[]
): {
  totalTeams: number;
  totalParticipants: number;
  prizePoolLabel: string;
  totalTracks: number;
} {
  const baseTeams = tracks.reduce((sum, t) => sum + t.registeredCount, 0);
  const addedTeams = Math.max(0, registrations.length - INITIAL_REGISTRATIONS.length);
  const totalTeams = baseTeams + addedTeams;
  const totalParticipants = 5000 + addedTeams * 4;

  return {
    totalTeams,
    totalParticipants,
    prizePoolLabel: EVENT_DETAILS.prizeAnnouncementText,
    totalTracks: tracks.length,
  };
}
