import React from 'react';
import { motion } from 'motion/react';
import {
  Code2,
  Cpu,
  Globe2,
  Sparkles,
  Wifi,
  Compass,
  Zap,
  Layers,
} from 'lucide-react';

interface InteractiveBackgroundProps {
  mouseX?: number;
  mouseY?: number;
  variant?: 'sunset' | 'light';
}

const FLOATING_BADGES = [
  {
    id: 'orb-code',
    Icon: Code2,
    label: '</> Live Sprint',
    positionClass: 'top-24 left-4',
    depth: 22,
    duration: 6.5,
    delay: 0,
    color: 'from-purple-500/20 to-indigo-500/15 text-[#6B1FE0] border-purple-300/60',
  },
  {
    id: 'orb-ai',
    Icon: Cpu,
    label: 'AI · Edge Mesh',
    positionClass: 'top-36 right-5',
    depth: -26,
    duration: 7.2,
    delay: 0.8,
    color: 'from-amber-400/25 to-orange-400/15 text-[#B45309] border-amber-300/70',
  },
  {
    id: 'orb-globe',
    Icon: Globe2,
    label: 'Global Inclusion',
    positionClass: 'top-[52%] left-4',
    depth: 18,
    duration: 8.1,
    delay: 1.4,
    color: 'from-emerald-400/20 to-teal-500/15 text-[#047857] border-emerald-300/60',
  },
  {
    id: 'orb-iot',
    Icon: Wifi,
    label: 'IoT Telemetry',
    positionClass: 'top-[58%] right-5',
    depth: -20,
    duration: 6.9,
    delay: 0.4,
    color: 'from-sky-400/20 to-blue-500/15 text-[#13354B] border-sky-300/60',
  },
  {
    id: 'orb-spark',
    Icon: Sparkles,
    label: 'Feb 3 & 4 · RIT',
    positionClass: 'bottom-28 right-6',
    depth: 16,
    duration: 5.8,
    delay: 1.1,
    color: 'from-fuchsia-400/20 to-purple-500/15 text-[#86198F] border-fuchsia-300/60',
  },
  {
    id: 'orb-compass',
    Icon: Compass,
    label: '5 Tracks',
    positionClass: 'bottom-24 left-6',
    depth: -16,
    duration: 7.5,
    delay: 0.6,
    color: 'from-orange-400/20 to-amber-500/15 text-[#C2410C] border-orange-300/60',
  },
];

const FIREFLY_PARTICLES = [
  { posClass: 'top-[18%] left-[22%]', size: 'h-2.5 w-2.5', delay: 0.2, dur: 4.5 },
  { posClass: 'top-[32%] right-[24%]', size: 'h-3 w-3', delay: 1.1, dur: 5.2 },
  { posClass: 'top-[56%] left-[18%]', size: 'h-2 w-2', delay: 0.7, dur: 6.0 },
  { posClass: 'top-[72%] right-[20%]', size: 'h-2.5 w-2.5', delay: 1.5, dur: 4.8 },
  { posClass: 'top-[26%] left-[48%]', size: 'h-2 w-2', delay: 0.4, dur: 5.6 },
  { posClass: 'bottom-[16%] left-[38%]', size: 'h-3 w-3', delay: 0.9, dur: 6.4 },
];

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = React.memo(({
  mouseX: propMouseX,
  mouseY: propMouseY,
  variant = 'sunset',
}) => {
  const [internalMouse, setInternalMouse] = React.useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const motionHandler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', motionHandler);

    if (mediaQuery.matches) return () => mediaQuery.removeEventListener('change', motionHandler);

    // If parent passed explicit coordinates, use them; otherwise attach self-contained passive listener
    if (propMouseX !== undefined && propMouseY !== undefined) {
      return () => mediaQuery.removeEventListener('change', motionHandler);
    }

    let ticking = false;
    const handleMove = (e: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const normX = (e.clientX / window.innerWidth - 0.5) * 2;
          const normY = (e.clientY / window.innerHeight - 0.5) * 2;
          setInternalMouse({ x: normX, y: normY });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      mediaQuery.removeEventListener('change', motionHandler);
      window.removeEventListener('mousemove', handleMove);
    };
  }, [propMouseX, propMouseY]);

  const mouseX = propMouseX !== undefined ? propMouseX : (reducedMotion ? 0 : internalMouse.x);
  const mouseY = propMouseY !== undefined ? propMouseY : (reducedMotion ? 0 : internalMouse.y);
  return (
    <div
      aria-hidden="true"
      data-testid="interactive-background"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Dynamic Cursor-Following Spotlight Halo */}
      <motion.div
        animate={{
          x: mouseX * 90,
          y: mouseY * 70,
        }}
        transition={{ type: 'spring', stiffness: 45, damping: 25 }}
        className={`absolute left-1/3 top-1/4 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${variant === 'light'
            ? 'bg-gradient-to-tr from-purple-300/25 via-amber-200/25 to-pink-200/20'
            : 'bg-gradient-to-tr from-amber-300/35 via-purple-400/25 to-orange-300/30'
          }`}
      />

      {/* Counter-Moving Secondary Ambient Orb */}
      <motion.div
        animate={{
          x: -mouseX * 110,
          y: -mouseY * 85,
        }}
        transition={{ type: 'spring', stiffness: 35, damping: 28 }}
        className="absolute right-1/4 bottom-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-bl from-indigo-400/20 via-fuchsia-300/20 to-amber-200/25 blur-3xl"
      />

      {/* Animated SVG Orbital Rings Slowly Rotating in the Background */}
      <motion.svg
        animate={{
          rotate: 360,
          x: mouseX * -25,
          y: mouseY * -25,
        }}
        transition={{
          rotate: { duration: 65, repeat: Infinity, ease: 'linear' },
          x: { type: 'spring', stiffness: 50, damping: 20 },
          y: { type: 'spring', stiffness: 50, damping: 20 },
        }}
        viewBox="0 0 800 800"
        className="absolute -right-48 -top-48 h-[640px] w-[640px] opacity-25"
      >
        <circle
          cx="400"
          cy="400"
          r="280"
          fill="none"
          stroke="url(#gradOrbital1)"
          strokeWidth="1.5"
          strokeDasharray="12 18"
        />
        <circle
          cx="400"
          cy="400"
          r="350"
          fill="none"
          stroke="url(#gradOrbital1)"
          strokeWidth="1"
          strokeDasharray="6 14"
        />
        <defs>
          <linearGradient id="gradOrbital1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B1FE0" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#13354B" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Left-Bottom Counter-Rotating Geometric Ring */}
      <motion.svg
        animate={{
          rotate: -360,
          x: mouseX * 30,
          y: mouseY * 30,
        }}
        transition={{
          rotate: { duration: 80, repeat: Infinity, ease: 'linear' },
          x: { type: 'spring', stiffness: 50, damping: 20 },
          y: { type: 'spring', stiffness: 50, damping: 20 },
        }}
        viewBox="0 0 700 700"
        className="absolute -bottom-52 -left-48 h-[580px] w-[580px] opacity-20"
      >
        <circle
          cx="350"
          cy="350"
          r="240"
          fill="none"
          stroke="#6B1FE0"
          strokeWidth="1.5"
          strokeDasharray="10 16"
        />
        <circle
          cx="350"
          cy="350"
          r="310"
          fill="none"
          stroke="#C2410C"
          strokeWidth="1"
          strokeDasharray="4 12"
        />
      </motion.svg>

      {/* Floating Parallax Interactive Tech Micro-Capsules Along Viewport Margins */}
      {FLOATING_BADGES.map((item) => {
        const IconComponent = item.Icon;
        return (
          <motion.div
            key={item.id}
            animate={{
              x: mouseX * item.depth,
              y: [0, -12, 0],
              rotate: [0, item.depth > 0 ? 2 : -2, 0],
            }}
            transition={{
              x: { type: 'spring', stiffness: 60, damping: 20 },
              y: {
                duration: item.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: item.delay,
              },
              rotate: {
                duration: item.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: item.delay,
              },
            }}
            className={`absolute ${item.positionClass} hidden 2xl:inline-flex items-center gap-1.5 rounded-2xl border bg-gradient-to-br ${item.color} backdrop-blur-md px-3 py-1.5 shadow-2xs opacity-70`}
          >
            <IconComponent className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] font-extrabold tracking-wide whitespace-nowrap">
              {item.label}
            </span>
          </motion.div>
        );
      })}

      {/* Floating Glowing Fireflies / Particles Across the Viewport */}
      {FIREFLY_PARTICLES.map((dot, index) => (
        <motion.div
          key={index}
          animate={{
            y: [0, -22, 0],
            x: [0, index % 2 === 0 ? 14 : -14, 0],
            opacity: [0.25, 0.8, 0.25],
            scale: [0.9, 1.25, 0.9],
          }}
          transition={{
            duration: dot.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: dot.delay,
          }}
          className={`absolute ${dot.posClass} rounded-full bg-gradient-to-r from-amber-400 to-purple-500 blur-[1px] ${dot.size}`}
        />
      ))}

      {/* Subtle Floating Corner Icons */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 12, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-24 right-8 hidden lg:flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xs text-[#6B1FE0]/60 shadow-2xs"
      >
        <Zap className="h-5 w-5" />
      </motion.div>

      <motion.div
        animate={{
          y: [0, 10, 0],
          rotate: [0, -10, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-28 left-8 hidden lg:flex h-9 w-9 items-center justify-center rounded-2xl border border-white/60 bg-white/35 backdrop-blur-xs text-[#D97706]/60 shadow-2xs"
      >
        <Layers className="h-4 w-4" />
      </motion.div>
    </div>
  );
});
