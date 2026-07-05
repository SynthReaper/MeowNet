'use client';
// components/volunteers/SkillsPanel.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition, useEffect } from 'react';
import {
  claimSkill,
  verifySkill,
  rejectSkill,
  raiseQueryOnSkill,
  respondToSkillQuery,
  getPendingSkills,
  SkillType,
  VolunteerSkill,
} from '@/lib/actions/volunteers';

interface Props {
  readonly currentUserId: string;
  readonly targetUserId: string;
  readonly isOwnProfile: boolean;
  readonly userRole: string;
  readonly initialSkills?: VolunteerSkill[];
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
  const [skills, setSkills] = useState<VolunteerSkill[]>(initialSkills);
  const [message, setMessage] = useState<string | null>(null);

  // Volunteer claim & respond state
  const [showClaimModal, setShowClaimModal] = useState<SkillType | null>(null);
  const [infoText, setInfoText] = useState('');
  const [proofText, setProofText] = useState('');

  const [showRespondModal, setShowRespondModal] = useState<SkillType | null>(null);
  const [responseText, setResponseText] = useState('');

  // Moderator queue state
  const [pendingSkills, setPendingSkills] = useState<any[]>([]);
  const [activeQueryInput, setActiveQueryInput] = useState<{ userId: string; skillType: SkillType } | null>(null);
  const [queryText, setQueryText] = useState('');

  const hasSkill = (type: SkillType) => skills.some((s) => s.skill_type === type);
  const isVerified = (type: SkillType) => skills.some((s) => s.skill_type === type && s.verified);
  const getSkillEntry = (type: SkillType) => skills.find((s) => s.skill_type === type);

  const loadPendingSkills = async () => {
    if (userRole === 'admin' || userRole === 'moderator') {
      const data = await getPendingSkills();
      setPendingSkills(data);
    }
  };

  useEffect(() => {
    loadPendingSkills();
  }, [userRole, skills]);

  const handleClaimSubmit = (type: SkillType) => {
    if (!infoText.trim() || !proofText.trim()) return;
    startTransition(async () => {
      const res = await claimSkill(type, infoText, proofText);
      if (res.success) {
        setSkills([...skills, {
          id: '',
          user_id: currentUserId,
          skill_type: type,
          verified: false,
          verified_by: null,
          verified_at: null,
          created_at: new Date().toISOString(),
          info: infoText,
          proof: proofText,
          status: 'pending',
        }]);
        setShowClaimModal(null);
        setInfoText('');
        setProofText('');
        setMessage('Skill claimed! Pending verification by staff.');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to claim skill');
      }
    });
  };

  const handleRespondSubmit = (type: SkillType) => {
    if (!responseText.trim()) return;
    startTransition(async () => {
      const res = await respondToSkillQuery(type, responseText);
      if (res.success) {
        setSkills(skills.map((s) => s.skill_type === type ? { ...s, status: 'pending', volunteer_response: responseText } : s));
        setShowRespondModal(null);
        setResponseText('');
        setMessage('Response submitted successfully to moderator queue.');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to submit response.');
      }
    });
  };

  const handleVerify = (type: SkillType) => {
    startTransition(async () => {
      const res = await verifySkill(targetUserId, type);
      if (res.success) {
        setSkills(skills.map((s) => s.skill_type === type ? { ...s, verified: true, status: 'verified' } : s));
        setMessage('Skill verified successfully!');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to verify skill');
      }
    });
  };

  const handleVerifyModerator = (userId: string, type: SkillType) => {
    startTransition(async () => {
      const res = await verifySkill(userId, type);
      if (res.success) {
        if (userId === currentUserId) {
          setSkills(skills.map((s) => s.skill_type === type ? { ...s, verified: true, status: 'verified' } : s));
        }
        await loadPendingSkills();
        setMessage('Skill approved and verified.');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to verify skill');
      }
    });
  };

  const handleRejectModerator = (userId: string, type: SkillType) => {
    startTransition(async () => {
      const res = await rejectSkill(userId, type);
      if (res.success) {
        if (userId === currentUserId) {
          setSkills(skills.map((s) => s.skill_type === type ? { ...s, status: 'rejected' } : s));
        }
        await loadPendingSkills();
        setMessage('Skill application rejected.');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to reject skill');
      }
    });
  };

  const handleRaiseQuerySubmit = (userId: string, type: SkillType) => {
    if (!queryText.trim()) return;
    startTransition(async () => {
      const res = await raiseQueryOnSkill(userId, type, queryText);
      if (res.success) {
        if (userId === currentUserId) {
          setSkills(skills.map((s) => s.skill_type === type ? { ...s, status: 'query_raised', mod_query: queryText } : s));
        }
        setActiveQueryInput(null);
        setQueryText('');
        await loadPendingSkills();
        setMessage('Query raised and sent to volunteer.');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to raise query.');
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
        {isPending && <span className="text-xs text-[var(--life-teal)] animate-pulse font-semibold">Processing...</span>}
        {message && <span className="text-xs text-[var(--empire-gold)] font-semibold">{message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_SKILLS.map((skill) => {
          const skillEntry = getSkillEntry(skill.type);
          const active = !!skillEntry;
          const verified = skillEntry?.verified || skillEntry?.status === 'verified';
          const status = skillEntry?.status || 'pending';

          return (
            <div
              key={skill.type}
              className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                verified
                  ? 'bg-[rgba(13,148,136,0.05)] border-[var(--life-teal)]/30'
                  : active && status === 'query_raised'
                  ? 'bg-[rgba(239,68,68,0.03)] border-red-500/20'
                  : active
                  ? 'bg-[rgba(212,175,55,0.03)] border-[var(--empire-gold)]/20'
                  : 'bg-black/20 border-white/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    verified
                      ? 'bg-[var(--life-teal)]/20 text-[var(--life-teal)]'
                      : active && status === 'query_raised'
                      ? 'bg-red-500/20 text-red-400'
                      : active
                      ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)]'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{skill.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-[var(--empire-cream)] truncate">{skill.label}</h4>
                    {verified && (
                      <span className="text-[10px] bg-[var(--life-teal)]/20 text-[var(--life-teal)] border border-[var(--life-teal)]/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        Verified
                      </span>
                    )}
                    {active && !verified && status === 'pending' && (
                      <span className="text-[10px] bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                    {active && !verified && status === 'query_raised' && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        Action Required
                      </span>
                    )}
                    {active && !verified && status === 'rejected' && (
                      <span className="text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{skill.desc}</p>
                </div>
              </div>

              {active && !verified && status === 'query_raised' && skillEntry?.mod_query && (
                <div className="mt-2 p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-300">
                  <p className="font-semibold mb-0.5">Moderator Query:</p>
                  <p className="italic text-gray-300">"{skillEntry.mod_query}"</p>
                  {skillEntry.volunteer_response && (
                    <div className="mt-1.5 pt-1.5 border-t border-red-500/10 text-gray-400">
                      <span className="font-semibold text-gray-300">Your last response:</span> "{skillEntry.volunteer_response}"
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                {isOwnProfile && (!active || status === 'rejected') && (
                  <button
                    onClick={() => setShowClaimModal(skill.type)}
                    disabled={isPending}
                    className="bg-white/10 hover:bg-white/15 text-[var(--empire-cream)] px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Claim Credential
                  </button>
                )}
                {isOwnProfile && active && !verified && status === 'query_raised' && (
                  <button
                    onClick={() => {
                      setShowRespondModal(skill.type);
                      setResponseText(skillEntry?.volunteer_response || '');
                    }}
                    disabled={isPending}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Respond to Query
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
          );
        })}
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-[var(--text-primary)]">
            <h4 className="text-lg font-bold text-[var(--empire-cream)]">
              Claim Credential: {AVAILABLE_SKILLS.find((s) => s.type === showClaimModal)?.label}
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Provide context and references for staff verification.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-secondary)]">Experience / Info</label>
              <textarea
                value={infoText}
                onChange={(e) => setInfoText(e.target.value)}
                placeholder="Describe your qualifications, courses passed, or relevant background..."
                rows={3}
                className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--life-teal)] outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-secondary)]">Verification Proof / Reference Link</label>
              <input
                type="text"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="Link to certification, clinic reference, or details..."
                className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--life-teal)] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setShowClaimModal(null);
                  setInfoText('');
                  setProofText('');
                }}
                className="btn btn-ghost px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => handleClaimSubmit(showClaimModal)}
                disabled={isPending || !infoText.trim() || !proofText.trim()}
                className="btn btn-teal px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Submit Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showRespondModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-[var(--text-primary)]">
            <h4 className="text-lg font-bold text-[var(--empire-cream)]">
              Respond to Query: {AVAILABLE_SKILLS.find((s) => s.type === showRespondModal)?.label}
            </h4>
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-xs text-red-200">
              <span className="font-semibold block mb-0.5">Moderator Query:</span>
              "{getSkillEntry(showRespondModal)?.mod_query}"
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-secondary)]">Your Response</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter details requested by the moderator..."
                rows={4}
                className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--life-teal)] outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setShowRespondModal(null);
                  setResponseText('');
                }}
                className="btn btn-ghost px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespondSubmit(showRespondModal)}
                disabled={isPending || !responseText.trim()}
                className="btn btn-teal px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderator Review Queue */}
      {(userRole === 'admin' || userRole === 'moderator') && pendingSkills.length > 0 && (
        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col gap-6">
          <div>
            <h3 className="text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              <span>Moderator Verification Queue</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">Review pending volunteer credentials, request clarifications, or approve credentials.</p>
          </div>

          <div className="flex flex-col gap-4">
            {pendingSkills.map((app) => {
              const skillInfo = AVAILABLE_SKILLS.find((s) => s.type === app.skill_type);
              const isQueryActive = activeQueryInput?.userId === app.user_id && activeQueryInput?.skillType === app.skill_type;

              return (
                <div key={`${app.user_id}-${app.skill_type}`} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                        <span className="material-symbols-outlined text-lg">{skillInfo?.icon || 'badge'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--empire-cream)] block">
                          {app.profiles?.display_name || 'Anonymous Volunteer'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                          Claimed: {skillInfo?.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <span className="text-[9px] bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          Pending Review
                        </span>
                      )}
                      {app.status === 'query_raised' && (
                        <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          Query Outstanding
                        </span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="text-[9px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-black/10 p-3 rounded-lg border border-white/5">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Experience Context</span>
                      <p className="text-gray-300 leading-relaxed">{app.info || 'No experience details provided.'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Proof / References</span>
                      <p className="text-gray-300 font-mono break-all">{app.proof || 'No proof references provided.'}</p>
                    </div>
                  </div>

                  {app.status === 'query_raised' && app.mod_query && (
                    <div className="text-xs p-2.5 rounded-lg bg-red-950/10 border border-red-500/10 flex flex-col gap-1">
                      <div>
                        <span className="font-semibold text-red-300">Your Query:</span>
                        <p className="text-gray-300 italic">"{app.mod_query}"</p>
                      </div>
                      {app.volunteer_response && (
                        <div className="mt-1.5 pt-1.5 border-t border-red-500/5">
                          <span className="font-semibold text-gray-300">Volunteer Response:</span>
                          <p className="text-[var(--empire-cream)] font-medium">"{app.volunteer_response}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyModerator(app.user_id, app.skill_type)}
                        disabled={isPending}
                        className="bg-[var(--life-teal)] text-white hover:opacity-90 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectModerator(app.user_id, app.skill_type)}
                        disabled={isPending}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          if (isQueryActive) {
                            setActiveQueryInput(null);
                          } else {
                            setActiveQueryInput({ userId: app.user_id, skillType: app.skill_type });
                            setQueryText(app.mod_query || '');
                          }
                        }}
                        disabled={isPending}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {isQueryActive ? 'Cancel Query' : 'Raise Query'}
                      </button>
                    </div>
                  </div>

                  {isQueryActive && (
                    <div className="mt-2 flex flex-col gap-2 p-3 bg-[var(--bg-elevated)] rounded-lg border border-red-500/20">
                      <label className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Clarification Request</label>
                      <textarea
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="Write query to user (e.g., 'Please provide your clinic supervisor name')"
                        rows={2}
                        className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-red-500 outline-none resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleRaiseQuerySubmit(app.user_id, app.skill_type)}
                          disabled={isPending || !queryText.trim()}
                          className="bg-red-500 text-white hover:opacity-90 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Send Query
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
