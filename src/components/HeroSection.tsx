import React from 'react';
import { motion } from 'motion/react';
import {
  OFFICIAL_LOGOS,
  HACKATHON_TRACKS,
  EVENT_DETAILS,
  HackathonTrack,
  TrackId,
} from '../utils/hackathonLogic';
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  Leaf,
  Share2,
  Trophy,
  Clock,
  Layers,
  Languages,
  Accessibility,
  Sprout,
  Box,
  Wifi,
  Sparkles,
  Calendar,
  MapPin,
} from 'lucide-react';

interface HeroSectionProps {
  totalTeams: number;
  totalParticipants: number;
  prizePoolLabel: string;
  selectedTrack: TrackId;
  onSelectTrack: (trackId: TrackId) => void;
  onGetStarted: () => void;
  onExploreTracks: () => void;
}

const getTrackIcon = (id: HackathonTrack['id']) => {
  switch (id) {
    case 'linguaverse':
      return <Languages className="h-8 w-8 text-white drop-shadow-xs" strokeWidth={2.2} />;
    case 'abilityx':
      return <Accessibility className="h-8 w-8 text-white drop-shadow-xs" strokeWidth={2.2} />;
    case 'roots':
      return <Sprout className="h-8 w-8 text-white drop-shadow-xs" strokeWidth={2.2} />;
    case 'flowforge':
      return <Box className="h-8 w-8 text-white drop-shadow-xs" strokeWidth={2.2} />;
    case 'iotverse':
      return <Wifi className="h-8 w-8 text-white drop-shadow-xs" strokeWidth={2.2} />;
  }
};

const getTrack3DClass = (theme: HackathonTrack['colorTheme']) => {
  switch (theme) {
    case 'blue':
      return 'track-3d-blue';
    case 'green':
      return 'track-3d-green';
    case 'terracotta':
      return 'track-3d-terracotta';
    case 'plum':
      return 'track-3d-plum';
    case 'slate':
      return 'track-3d-slate';
  }
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalParticipants,
  prizePoolLabel,
  selectedTrack,
  onSelectTrack,
  onGetStarted,
  onExploreTracks,
}) => {
  return (
    <section className="relative overflow-hidden bg-[#F5D6B4]">
      {/* Top Illustrated Coastal Sunset Panorama Wrapper */}
      <div className="relative w-full overflow-hidden">
        {/* Background Coastal Sunset Illustration with Rich Warm Gradient Scrims */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={OFFICIAL_LOGOS.coastalHero}
            alt="HARMONIA 2027 Coastal Sunset Campus & Lighthouse Panorama"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                OFFICIAL_LOGOS.coastalHeroFallback;
            }}
            className="h-full w-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(252, 224, 195, 0.82) 0%, rgba(248, 214, 185, 0.62) 36%, rgba(235, 195, 178, 0.20) 62%, rgba(30, 27, 56, 0.05) 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 top-0 h-24"
            style={{
              background:
                'linear-gradient(180deg, rgba(224, 199, 218, 0.6) 0%, rgba(245, 214, 180, 0) 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-32"
            style={{
              background:
                'linear-gradient(180deg, rgba(245, 214, 180, 0) 0%, #F5D6B4 92%)',
            }}
          />
        </div>

        {/* Floating Animated Sunbeams & Warm Particles */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-300/35 blur-3xl animate-pulse-glow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-1/4 top-8 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl animate-pulse-glow"
        />

        {/* Main Hero Content Container */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 sm:pt-6 sm:pb-12 lg:px-8 lg:pt-7 lg:pb-14">
          <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12">
            {/* Left Column: Department Presenter Header, HARMONIA 2027 Emblem, "Ideas Beyond Borders", Event Dates & CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left"
            >
              {/* Presenter Kicker from Official Poster */}
              <div className="mb-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#B45309]">
                {EVENT_DETAILS.organizerInstitution} · {EVENT_DETAILS.presentingDepartment} Presents
              </div>

              {/* Overline: — INTERNATIONAL HACKATHON — */}
              <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.26em] text-[#24325A] uppercase">
                <span className="h-[1.5px] w-6 sm:w-12 bg-[#24325A]/60" aria-hidden="true" />
                <span>International Hackathon</span>
                <span className="h-[1.5px] w-6 sm:w-12 bg-[#24325A]/60" aria-hidden="true" />
              </div>

              {/* Official HARMONIA Logo Lockup + 3D Purple 2027 Ribbon */}
              <div className="mt-2 relative flex flex-col items-center lg:items-start">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="relative rounded-2xl bg-white/92 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-white/85"
                >
                  <img
                    src={OFFICIAL_LOGOS.harmonia}
                    alt="HARMONIA — International Hackathon for a More Inclusive and Connected World"
                    referrerPolicy="no-referrer"
                    className="h-11 sm:h-16 md:h-20 w-auto object-contain"
                  />
                </motion.div>

                {/* Skewed Purple "2027" Ribbon with Golden Wings */}
                <div className="-mt-2 sm:-mt-2.5 flex items-center justify-center gap-1.5 sm:gap-2 z-10">
                  <span
                    className="h-1.5 w-6 sm:w-12 rounded-full bg-gradient-to-r from-transparent to-amber-400"
                    aria-hidden="true"
                  />
                  <div className="-skew-x-12 rounded-xl bg-gradient-to-r from-[#5816C8] via-[#7A22E8] to-[#9B3DF7] px-4 sm:px-6 py-0.5 sm:py-1 shadow-[0_6px_18px_rgba(98,24,214,0.45)] border border-purple-300/40">
                    <span className="block skew-x-12 font-extrabold text-lg sm:text-2xl tracking-wider text-white drop-shadow-xs tabular-nums">
                      2027
                    </span>
                  </div>
                  <span
                    className="h-1.5 w-6 sm:w-12 rounded-full bg-gradient-to-l from-transparent to-amber-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Main Headline: Ideas Beyond Borders */}
              <h1
                className="mt-2.5 font-extrabold tracking-tight text-[#172347]"
                style={{
                  fontSize: 'clamp(1.75rem, 5vw, 3.1rem)',
                  lineHeight: 1.15,
                  textWrap: 'balance',
                }}
              >
                Ideas{' '}
                <span className="relative inline-block italic font-serif bg-gradient-to-r from-[#6B1FE0] via-[#8F28E8] to-[#C22ED0] bg-clip-text text-transparent pr-1">
                  Beyond
                  <svg
                    viewBox="0 0 180 18"
                    fill="none"
                    className="absolute -bottom-1 left-0 w-full h-2.5 text-[#7A22E8]"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 13C45 4 125 2 177 11"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                Borders
              </h1>

              {/* Subtitle + Official Poster Event Strip (Date: Feb 3 & 4 · Venue: RIT · Team Size: 1-4 Members) */}
              <p className="mt-1.5 max-w-lg text-xs sm:text-base font-medium leading-snug text-[#25335A]">
                A 24-hour international hackathon for a more inclusive and connected world.
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold text-[#8B1E1E]">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#C2410C]" />
                  <span>DATE: FEBRUARY 3 &amp; 4</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#C2410C]" />
                  <span>VENUE: RIT</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-[#C2410C]" />
                  <span>TEAM SIZE: 1–4 MEMBERS</span>
                </span>
              </div>

              {/* 3 Value Pillars: Diverse People | One Planet | Shared Possibilities */}
              <div className="mt-3 grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-5 rounded-2xl bg-white/65 backdrop-blur-md px-3 sm:px-4 py-2 border border-white/75 shadow-2xs w-full sm:w-auto">
                <div className="flex items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-100 text-[#6D22D8] shrink-0">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="text-left text-[10px] sm:text-xs font-bold leading-tight text-[#1E2B4F]">
                    <div>Diverse</div>
                    <div>People</div>
                  </div>
                </div>

                <div className="hidden sm:block h-6 w-[1.5px] bg-[#24325A]/20" aria-hidden="true" />

                <div className="flex items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-100 text-[#2E7D32] shrink-0">
                    <Leaf className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="text-left text-[10px] sm:text-xs font-bold leading-tight text-[#1E2B4F]">
                    <div>One</div>
                    <div>Planet</div>
                  </div>
                </div>

                <div className="hidden sm:block h-6 w-[1.5px] bg-[#24325A]/20" aria-hidden="true" />

                <div className="flex items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-[#8E24AA] shrink-0">
                    <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="text-left text-[10px] sm:text-xs font-bold leading-tight text-[#1E2B4F]">
                    <div>Shared</div>
                    <div>Possibilities</div>
                  </div>
                </div>
              </div>

              {/* Dual CTA Buttons: Register Now ↗ & Explore Tracks */}
              <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onGetStarted}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#133B53] via-[#1B4D6B] to-[#133B53] px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-[0_10px_25px_rgba(19,59,83,0.4)] transition-all hover:shadow-[0_14px_30px_rgba(19,59,83,0.55)] cursor-pointer whitespace-nowrap shrink-0 w-full sm:w-auto"
                >
                  <span>Register Now</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onExploreTracks}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#1B3A52]/70 bg-[#F9E3C9]/85 backdrop-blur-xs px-6 py-3 text-xs sm:text-sm font-bold text-[#172844] shadow-2xs transition-colors hover:bg-white cursor-pointer whitespace-nowrap shrink-0 w-full sm:w-auto"
                >
                  <span>Explore Tracks</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Right Column: Floating Glass Partner Card Positioned High so Robot + Laptop Below Are Fully Clear */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.15 }}
              className="lg:col-span-5 flex flex-col items-center lg:items-end justify-start self-start pt-2"
            >
              <div className="animate-float-slow rounded-2xl border border-white/80 bg-white/85 backdrop-blur-md p-3.5 shadow-[0_14px_32px_rgba(27,40,69,0.2)] max-w-xs w-full">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#1B3A52]">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Official Partners</span>
                  </span>
                  <span className="font-mono text-[#6B1FE0]">RIT · IEEE · iDataMind</span>
                </div>

                <div className="mt-2.5 grid grid-cols-3 items-center gap-2">
                  <div className="flex items-center justify-center rounded-lg bg-white p-1.5 shadow-2xs border border-slate-200/80">
                    <img
                      src={OFFICIAL_LOGOS.rit}
                      alt="Rajalakshmi Institute of Technology (RIT)"
                      referrerPolicy="no-referrer"
                      className="h-6 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center rounded-lg bg-white p-1.5 shadow-2xs border border-slate-200/80">
                    <img
                      src={OFFICIAL_LOGOS.ieee}
                      alt="IEEE Official Logo"
                      referrerPolicy="no-referrer"
                      className="h-6 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center rounded-lg bg-white p-1.5 shadow-2xs border border-slate-200/80">
                    <img
                      src={OFFICIAL_LOGOS.idatamind}
                      alt="iDataMind Logo"
                      referrerPolicy="no-referrer"
                      className="h-6 w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Lower Hero Showcase: "The Hackathon Tracks" 5 Tilted 3D Cards + Frosted Glass Stats Bar */}
      <div className="relative z-20 -mt-8 mx-auto max-w-7xl px-6 pb-8 lg:px-8">
        {/* Section Header Row */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block h-6 w-2.5 -skew-x-12 rounded-xs bg-gradient-to-b from-[#7A22E8] to-[#C22ED0]"
              aria-hidden="true"
            />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#172347]">
              The Hackathon Tracks
            </h2>
          </div>

          <button
            type="button"
            onClick={onExploreTracks}
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#172347] hover:text-[#6B1FE0] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>View All Tracks</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Golden Orbital Glow Ring Behind the 5 Track Tiles */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-6 top-1/2 -translate-y-1/2 h-24 rounded-[100%] border-2 border-amber-400/75 shadow-[0_0_35px_rgba(251,191,36,0.55)] hidden lg:block"
          />

          {/* 5 Tilted 3D Perspective Track Cards Matching Reference Image */}
          <div className="relative z-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 px-2">
            {HACKATHON_TRACKS.map((track, idx) => {
              const isSelected = selectedTrack === track.id;
              return (
                <motion.button
                  key={track.id}
                  type="button"
                  initial={{ opacity: 0, y: 24, skewX: -6, rotateZ: -1.5 }}
                  animate={{ opacity: 1, y: 0, skewX: -6, rotateZ: -1.5 }}
                  transition={{ duration: 0.45, delay: idx * 0.07 }}
                  whileHover={{ y: -8, skewX: -3, rotateZ: 0, scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelectTrack(track.id);
                    onExploreTracks();
                  }}
                  className={`${getTrack3DClass(
                    track.colorTheme
                  )} group relative flex flex-col items-center justify-center rounded-[26px] px-4 py-5 text-center text-white transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'border-amber-300 ring-4 ring-amber-300/40'
                      : 'border-white/30 hover:border-white/70'
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-1.5 h-7 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent"
                  />

                  <div className="skew-x-3 flex flex-col items-center">
                    <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs shadow-inner transition-transform duration-300 group-hover:scale-110">
                      {getTrackIcon(track.id)}
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-xs">
                      {track.title}
                    </h3>

                    <p className="mt-1 text-xs font-medium leading-snug text-white/90 max-w-[165px]">
                      {track.tagline}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Frosted Warm Glass Pill Stats Bar (5K+ Participants | Prize Pool: Will be announced shortly | 24h Hackathon | 5 Tracks) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mt-8 mx-auto max-w-5xl rounded-3xl sm:rounded-full border border-white/85 bg-[#F9E7D2]/90 backdrop-blur-md px-6 py-3.5 shadow-[0_14px_34px_rgba(124,72,33,0.16)]"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-[#1B2845]/15">
            {/* Stat 1: 5K+ Participants */}
            <div className="flex items-center justify-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-[#7A22E8]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-lg sm:text-xl font-extrabold text-[#172347] tabular-nums leading-tight">
                  {totalParticipants >= 5000 ? '5K+' : totalParticipants}
                </div>
                <div className="text-xs font-semibold text-[#3C4A6B]">
                  Participants
                </div>
              </div>
            </div>

            {/* Stat 2: Award Money — Will be announced shortly */}
            <div className="flex items-center justify-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-[#D97706]">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#172347] leading-tight">
                  {prizePoolLabel}
                </div>
                <div className="text-[11px] font-semibold text-[#3C4A6B]">
                  Award Money
                </div>
              </div>
            </div>

            {/* Stat 3: 24h Hackathon */}
            <div className="flex items-center justify-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-[#C2410C]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-lg sm:text-xl font-extrabold text-[#172347] tabular-nums leading-tight">
                  24h
                </div>
                <div className="text-xs font-semibold text-[#3C4A6B]">
                  Feb 3 &amp; 4 · RIT
                </div>
              </div>
            </div>

            {/* Stat 4: 5 Tracks */}
            <div className="flex items-center justify-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-[#86198F]">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-lg sm:text-xl font-extrabold text-[#172347] tabular-nums leading-tight">
                  5
                </div>
                <div className="text-xs font-semibold text-[#3C4A6B]">
                  Tracks (1–4 / Team)
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
