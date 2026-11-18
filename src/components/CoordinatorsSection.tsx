import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FACULTY_COORDINATORS,
  STUDENT_COORDINATORS,
  EVENT_DETAILS,
  OFFICIAL_LOGOS,
} from '../utils/hackathonLogic';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

export const CoordinatorsSection: React.FC = () => {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = (phone: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`+91 ${phone}`);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 1800);
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-6 py-10 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#6B1FE0] shadow-2xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{EVENT_DETAILS.organizerInstitution} · {EVENT_DETAILS.presentingDepartment}</span>
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172347]">
          Event Faculty &amp; Student Coordinators
        </h2>
        <p className="mt-2 text-sm text-[#3C4A6B]">
          Reach out directly to our official faculty and student organizing committee at Rajalakshmi Institute of Technology (RIT) for registration, track, or venue support.
        </p>
      </div>

      {/* Two-Column Grid Matching Reference Design (Faculty Left, Student Right) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column: Event / Faculty Coordinators (4 Cards) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#172347]/10 pb-2.5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#172347]">
              Event &amp; Faculty Coordinators
            </h3>
            <span className="text-xs font-bold text-[#6B1FE0]">
              Department of CSE · RIT
            </span>
          </div>

          {FACULTY_COORDINATORS.map((coord, idx) => (
            <motion.div
              key={coord.phone}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: idx * 0.07 }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-5 shadow-[0_8px_24px_rgba(23,35,71,0.05)] transition-all hover:border-purple-300 hover:shadow-[0_14px_34px_rgba(107,31,224,0.12)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] text-[#6B1FE0] shadow-inner transition-transform group-hover:scale-110">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#172347] group-hover:text-[#6B1FE0] transition-colors">
                      {coord.name}
                    </h4>
                    <p className="text-xs font-medium text-slate-500">
                      {coord.role} – {coord.department}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyPhone(coord.phone)}
                  aria-label={`Copy phone number for ${coord.name}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-[#6B1FE0] transition-colors cursor-pointer shrink-0"
                >
                  {copiedPhone === coord.phone ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${coord.email}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F5F0FF] px-3.5 py-2 text-xs font-semibold text-[#6B1FE0] transition-colors hover:bg-[#EBE0FF]"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{coord.email}</span>
                </a>

                <a
                  href={`tel:+91${coord.phone}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-3.5 py-2 font-mono text-xs font-bold text-[#059669] tabular-nums transition-colors hover:bg-[#D1FAE5]"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{coord.formattedPhone}</span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right Column: Student Coordinators (5 Cards) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#172347]/10 pb-2.5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#172347]">
              Student Coordinators
            </h3>
            <span className="text-xs font-bold text-[#C2410C]">
              HARMONIA Student Committee
            </span>
          </div>

          {STUDENT_COORDINATORS.map((coord, idx) => (
            <motion.div
              key={coord.phone}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: idx * 0.07 }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-5 shadow-[0_8px_24px_rgba(23,35,71,0.05)] transition-all hover:border-purple-300 hover:shadow-[0_14px_34px_rgba(107,31,224,0.12)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] text-[#6B1FE0] shadow-inner transition-transform group-hover:scale-110">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#172347] group-hover:text-[#6B1FE0] transition-colors">
                      {coord.name}
                    </h4>
                    <p className="text-xs font-medium text-slate-500">
                      {coord.role} – {coord.department}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyPhone(coord.phone)}
                  aria-label={`Copy phone number for ${coord.name}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-[#6B1FE0] transition-colors cursor-pointer shrink-0"
                >
                  {copiedPhone === coord.phone ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${coord.email}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F5F0FF] px-3.5 py-2 text-xs font-semibold text-[#6B1FE0] transition-colors hover:bg-[#EBE0FF]"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{coord.email}</span>
                </a>

                <a
                  href={`tel:+91${coord.phone}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-3.5 py-2 font-mono text-xs font-bold text-[#059669] tabular-nums transition-colors hover:bg-[#D1FAE5]"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{coord.formattedPhone}</span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Wide Bottom Venue / Connect / Support Hours Card Matching Screenshot 2 */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-10 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_10px_30px_rgba(23,35,71,0.06)]"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Venue */}
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#6B1FE0]">
              <MapPin className="h-4 w-4 text-rose-600" />
              <span>Venue</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#172347]">
              Rajalakshmi Institute of Technology
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Chennai, Tamil Nadu, India · Date: February 3 &amp; 4
            </p>
          </div>

          {/* Connect */}
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#6B1FE0]">
              <Globe className="h-4 w-4 text-sky-600" />
              <span>Connect</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Social media links and official channels will be announced ahead of the event.
            </p>
          </div>

          {/* Support Hours */}
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#6B1FE0]">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Support Hours</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#172347]">
              Monday – Friday
            </p>
            <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
              9:00 AM – 5:00 PM IST
            </p>
          </div>
        </div>
      </motion.div>

      {/* Official Poster Preview Card */}
      <motion.div
        whileHover={{ y: -3 }}
        className="mt-8 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs"
      >
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C2410C]">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Official Event Poster Reference</span>
          </div>
          <h3 className="text-lg font-extrabold text-[#172347]">
            HARMONIA — Presented by Department of CSE, Rajalakshmi Institute of Technology
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Co-organized with Institution&apos;s Innovation Council (IIC), IEEE, and iDataMind. Scheduled for February 3 &amp; 4 at RIT Campus for teams of 1–4 members.
          </p>
        </div>
        <img
          src={OFFICIAL_LOGOS.poster}
          alt="Official HARMONIA Hackathon Poster"
          referrerPolicy="no-referrer"
          className="h-44 w-auto rounded-xl border border-slate-200 object-contain shadow-sm transition-transform hover:scale-105"
        />
      </motion.div>
    </div>
  );
};
