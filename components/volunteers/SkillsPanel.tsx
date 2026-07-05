'use client';
// components/volunteers/SkillsPanel.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { claimSkill, verifySkill, SkillType } from '@/lib/actions/volunteers';

interface Props {
  readonly currentUserId: string;
  readonly targetUserId: string;
  readonly isOwnProfile: boolean;
  readonly userRole: string;
  readonly initialSkills?: { skill_type: SkillType; verified: boolean }[];
}

const AVAILABLE_SKILLS: { type: SkillType; label: string; desc: string; icon: string }[] = [
  { type: 'tnr_assistant', label: 'TNR Assistant', desc: 'Assist with trapping, mapping, and community outreach.', icon: 'diversity_1' },
  { type: 'vet_liaison', label: 'Vet Liaison', desc: 'Coordinate veterinary clinic appointments and recovery care.', icon: 'medical_services' },
  { type: 'transporter', label: 'Transporter', desc: 'Safely transport cats to and from clinics or release sites.', icon: 'local_shipping' },
  { type: 'photographer', label: 'Cat Photographer', desc: 'Take high quality adoptable photos and success stories.', icon: 'photo_camera' },
  { type: 'fundraiser', label: 'Fundraiser Specialist', desc: 'Assist with regional donation drives and partner events.', icon: 'payments' },
  { type: 'educator', label: 'Community Educator', desc: 'Lead workshops and teach safety/colony guides to volunteers.', icon: 'school' },
  { type: 'medical_assistant', label: 'Medical Assistant', desc: 'Certified care helper for post-op monitoring and recovery.', icon: 'vaccines' },
];

export default function SkillsPanel({ currentUserId, targetUserId, isOwnProfile, userRole, initialSkills = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [skills, setSkills] = useState<{ skill_type: SkillType; verified: boolean }[]>(initialSkills);
  const [message, setMessage] = useState<string | null>(null);

  const hasSkill = (type: SkillType) => skills.some((s) => s.skill_type === type);
  const isVerified = (type: SkillType) => skills.some((s) => s.skill_type === type && s.verified);

  const handleClaim = (type: SkillType) => {
    if (hasSkill(type)) return;
    startTransition(async () => {
      const res = await claimSkill(type);
      if (res.success) {
        setSkills([...skills, { skill_type: type, verified: false }]);
        setMessage('Skill claimed! Pending verification by staff.');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to claim skill');
      }
    });
  };

  const handleVerify = (type: SkillType) => {
    startTransition(async () => {
      const res = await verifySkill(targetUserId, type);
      if (res.success) {
        setSkills(skills.map((s) => s.skill_type === type ? { ...s, verified: true } : s));
        setMessage('Skill verified successfully!');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to verify skill');
      }
    });
  };

  const canVerify = (userRole === 'admin' || userRole === 'moderator') && !isOwnProfile;

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Volunteer Credentials</h3>
          <p className="text-xs text-gray-400 mt-1">Specialized credentials required for high priority field operations.</p>
        </div>
        {isPending && <span className="text-xs text-[var(--life-teal)] animate-pulse">Processing...</span>}
        {message && <span className="text-xs text-[var(--empire-gold)]">{message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_SKILLS.map((skill) => {
          const active = hasSkill(skill.type);
          const verified = isVerified(skill.type);

          return (
            <div
              key={skill.type}
              className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                verified
                  ? 'bg-[rgba(13,148,136,0.05)] border-[var(--life-teal)]/30'
                  : active
                  ? 'bg-[rgba(212,175,55,0.03)] border-[var(--empire-gold)]/20'
                  : 'bg-black/20 border-white/5'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  verified
                    ? 'bg-[var(--life-teal)]/20 text-[var(--life-teal)]'
                    : active
                    ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)]'
                    : 'bg-white/5 text-gray-400'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{skill.icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--empire-cream)] truncate">{skill.label}</h4>
                  {verified && (
                    <span className="text-[10px] bg-[var(--life-teal)]/20 text-[var(--life-teal)] border border-[var(--life-teal)]/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                      Verified
                    </span>
                  )}
                  {active && !verified && (
                    <span className="text-[10px] bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{skill.desc}</p>

                <div className="mt-3 flex gap-2">
                  {isOwnProfile && !active && (
                    <button
                      onClick={() => handleClaim(skill.type)}
                      disabled={isPending}
                      className="bg-white/10 hover:bg-white/15 text-[var(--empire-cream)] px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Claim Credential
                    </button>
                  )}
                  {canVerify && active && !verified && (
                    <button
                      onClick={() => handleVerify(skill.type)}
                      disabled={isPending}
                      className="bg-[var(--life-teal)] text-white hover:opacity-90 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Verify Volunteer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
