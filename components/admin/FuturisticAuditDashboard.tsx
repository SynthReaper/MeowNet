'use client';

// components/admin/FuturisticAuditDashboard.tsx — Sci-Fi Cybernetic System Audit Control Room
import { useState, useMemo, useEffect } from 'react';
import { raiseAuditLogDispute } from '@/lib/actions/admin';

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
  } | null;
}

interface Props {
  initialAuditLogs: AuditLogEntry[];
  currentUserRole: 'admin' | 'moderator';
}

export default function FuturisticAuditDashboard({ initialAuditLogs, currentUserRole }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'moderator' | 'volunteer'>('all');
  const [actionFilter, setActionFilter] = useState('all');
  
  // Selected log for cybernetic drawer details view
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Transparency Dispute states
  const [disputeText, setDisputeText] = useState('');
  const [disputePending, setDisputePending] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Reset dispute states when selected log changes
  useEffect(() => {
    setDisputeText('');
    setDisputeError(null);
    setDisputeSuccess(false);
  }, [selectedLog]);

  const handleRaiseDispute = async () => {
    if (!selectedLog) return;
    setDisputeError(null);
    setDisputePending(true);
    try {
      const res = await raiseAuditLogDispute(selectedLog.id, disputeText);
      if (res.success) {
        setDisputeSuccess(true);
        setDisputeText('');
      } else {
        setDisputeError(res.error || 'Failed to raise query.');
      }
    } catch {
      setDisputeError('Network error raising dispute.');
    } finally {
      setDisputePending(false);
    }
  };

  // Derive unique action types for filter dropdown
  const actionTypes = useMemo(() => {
    const types = new Set<string>();
    logs.forEach(l => {
      if (l.action) types.add(l.action);
    });
    return ['all', ...Array.from(types)];
  }, [logs]);

  // Compute cyber stats
  const stats = useMemo(() => {
    const visibleLogs = logs.filter(l => {
      if (currentUserRole === 'moderator' && l.actor_role === 'admin') {
        return false;
      }
      return true;
    });

    const total = visibleLogs.length;
    const adminActions = visibleLogs.filter(l => l.actor_role === 'admin').length;
    const modActions = visibleLogs.filter(l => l.actor_role === 'moderator').length;
    const volActions = visibleLogs.filter(l => l.actor_role !== 'admin' && l.actor_role !== 'moderator').length;
    const criticalAlerts = visibleLogs.filter(l => 
      l.action.includes('DELETE') || 
      l.action.includes('REJECT') || 
      l.action.includes('REMOVE')
    ).length;

    return { total, adminActions, modActions, volActions, criticalAlerts };
  }, [logs, currentUserRole]);

  // Filter logs based on role-redaction and search criteria
  const filteredLogs = useMemo(() => {
    const baseLogs = logs.filter(l => {
      // Moderators cannot view Admin actions under any circumstances
      if (currentUserRole === 'moderator' && l.actor_role === 'admin') {
        return false;
      }
      return true;
    });

    return baseLogs.map(l => {
      const isRedacted = currentUserRole === 'moderator' && l.actor_role === 'admin';
      return {
        ...l,
        details: isRedacted ? '🔐 ENCRYPTED SECURITY ENCLAVE — ROLE BOUNDARY POLICY RESTRICTED' : l.details,
        profiles: isRedacted ? { display_name: '🔐 Restructured Admin ID' } : l.profiles
      };
    }).filter(l => {
      // Apply search keyword filter (action, actor, details, target)
      const matchesSearch = 
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.profiles?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.target_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Apply role category filter
      const matchesRole = 
        roleFilter === 'all' || 
        (roleFilter === 'volunteer' && l.actor_role !== 'admin' && l.actor_role !== 'moderator') ||
        l.actor_role === roleFilter;

      // Apply action type filter
      const matchesAction = actionFilter === 'all' || l.action === actionFilter;

      return matchesSearch && matchesRole && matchesAction;
    });
  }, [logs, searchTerm, roleFilter, actionFilter, currentUserRole]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, actionFilter]);

  // Get paginated logs chunk for high-fidelity rendering
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * 10, currentPage * 10);
  }, [filteredLogs, currentPage]);

  // Action Badge styles map
  const getActionTheme = (action: string) => {
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('REMOVE')) {
      return { color: 'text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10 font-black text-[10px] uppercase tracking-wider', label: '🔥 CRITICAL DESTRUCT' };
    }
    if (action.includes('APPROVED') || action.includes('VACCINATE') || action.includes('MEDICAL')) {
      return { color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 font-black text-[10px] uppercase tracking-wider', label: '🩺 VET APPROVED' };
    }
    if (action.includes('TRIVIA') || action.includes('XP_EARNED') || action.includes('BINGO') || action.includes('points') || action.includes('earn_xp')) {
      return { color: 'text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/10 font-black text-[10px] uppercase tracking-wider', label: '✨ GAMIFIED XP' };
    }
    return { color: 'text-violet-600 dark:text-violet-400 border-violet-500/25 bg-violet-500/10 font-black text-[10px] uppercase tracking-wider', label: '📡 METRIC TELEMETRY' };
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `meownet_system_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 rounded-3xl p-6 md:p-8 shadow-2xl text-[var(--text-primary)] font-body flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
      
      {/* Visual cybernetic mesh background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(235,132,36,0.02)_0%,transparent_60%)] pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--empire-gold)] block">
            System Operations Centre
          </span>
          <h2 className="font-display text-xl md:text-2xl font-black text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--empire-gold)] animate-pulse">terminal</span>
            <span>MeowNet Master Audit Ledger</span>
          </h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-xl">
            Tracing database events, XP claims, moderation approvals, and volunteer registrations with cryptographic role boundary overrides.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-orange-950/20 border border-orange-800/40 text-[var(--empire-gold)] hover:bg-orange-950/40 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Cyber stats indicators (Bento panels) */}
      <div className={`grid grid-cols-2 ${currentUserRole === 'admin' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 relative z-10`}>
        <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
          <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider">Total Actions logged</span>
          <strong className="text-xl font-black font-data mt-2 text-[var(--text-primary)]">{stats.total}</strong>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
          <span className="text-[8px] font-black text-rose-500/80 dark:text-rose-400/80 uppercase tracking-wider">Critical Destructs</span>
          <strong className="text-xl font-black font-data mt-2 text-rose-600 dark:text-rose-400">{stats.criticalAlerts}</strong>
        </div>
        {currentUserRole === 'admin' && (
          <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
            <span className="text-[8px] font-black text-[var(--empire-gold)]/80 uppercase tracking-wider">Admin Operations</span>
            <strong className="text-xl font-black font-data mt-2 text-[var(--empire-gold)]">{stats.adminActions}</strong>
          </div>
        )}
        <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
          <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400/80 uppercase tracking-wider">Moderator Actions</span>
          <strong className="text-xl font-black font-data mt-2 text-cyan-600 dark:text-cyan-400">{stats.modActions}</strong>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 p-4 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1 shadow-inner">
          <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400/80 uppercase tracking-wider">Volunteer Submits</span>
          <strong className="text-xl font-black font-data mt-2 text-emerald-600 dark:text-emerald-400">{stats.volActions}</strong>
        </div>
      </div>

      {/* Search and Filters Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--bg-elevated)]/50 border border-[var(--bg-border)]/35 p-4 rounded-2xl relative z-10">
        
        {/* Term search input */}
        <div className="flex gap-2 items-center bg-[var(--bg-surface)] border border-[var(--bg-border)] hover:border-[var(--bg-border)]/80 focus-within:border-[var(--empire-gold)] px-3 py-2 rounded-xl transition-all">
          <span className="material-symbols-outlined text-sm text-[var(--text-muted)]">search</span>
          <input
            type="text"
            placeholder="Search keywords, details, actor UIDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </div>

        {/* Role classification selector */}
        <div className="flex gap-2 items-center bg-[var(--bg-surface)] border border-[var(--bg-border)] hover:border-[var(--bg-border)]/80 focus-within:border-[var(--empire-gold)] px-3 py-2 rounded-xl transition-all">
          <span className="material-symbols-outlined text-sm text-[var(--text-muted)]">policy</span>
          <select
            value={roleFilter}
            onChange={(e: any) => setRoleFilter(e.target.value)}
            className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">All Roles</option>
            {currentUserRole === 'admin' && (
              <option value="admin" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Admin Authority Only</option>
            )}
            <option value="moderator" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Moderators Only</option>
            <option value="volunteer" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Volunteers Only</option>
          </select>
        </div>

        {/* Action types selector */}
        <div className="flex gap-2 items-center bg-[var(--bg-surface)] border border-[var(--bg-border)] hover:border-[var(--bg-border)]/80 focus-within:border-[var(--empire-gold)] px-3 py-2 rounded-xl transition-all">
          <span className="material-symbols-outlined text-sm text-[var(--text-muted)]">category</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--text-primary)] cursor-pointer"
          >
            {actionTypes.map(act => (
              <option key={act} value={act} className="bg-[var(--bg-surface)] text-[var(--text-primary)] capitalize">
                {act === 'all' ? 'All Activities' : act.replace(/_/g, ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Interactive logs terminal feed */}
      <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)]/50 rounded-2xl overflow-hidden relative z-10 flex flex-col shadow-inner">
        
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-[var(--bg-elevated)] font-display text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--bg-border)]/35 select-none">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-2">Actor Identity</div>
          <div className="col-span-3">Activity Action</div>
          <div className="col-span-4">Operation Details</div>
        </div>

        {/* Rows wrapper */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--bg-border)]/20">
          {paginatedLogs.length === 0 ? (
            <div className="text-center py-12 text-xs font-body text-[var(--text-muted)] italic">
              No audit logs captured matching query vectors.
            </div>
          ) : (
            paginatedLogs.map(log => {
              const theme = getActionTheme(log.action);
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-[var(--bg-elevated)]/50 transition-all cursor-pointer items-center text-xs select-none group"
                >
                  {/* Timestamp */}
                  <div className="col-span-3 flex flex-col gap-0.5 select-none">
                    <span className="font-data text-[10px] text-[var(--text-muted)] font-bold">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    <span className="font-mono text-[8px] text-[var(--text-muted)] tracking-wider">
                      UUID: {log.id.substring(0, 8)}
                    </span>
                  </div>

                  {/* Actor */}
                  <div className="col-span-2 flex flex-col">
                    <strong className="font-bold text-[var(--text-primary)] truncate max-w-[120px]">
                      {log.profiles?.display_name || 'Anonymous User'}
                    </strong>
                    <span className={`text-[8px] font-black uppercase mt-0.5 ${
                      log.actor_role === 'admin' 
                        ? 'text-[var(--empire-gold)]' 
                        : log.actor_role === 'moderator' 
                        ? 'text-cyan-600 dark:text-cyan-400' 
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {log.actor_role}
                    </span>
                  </div>

                  {/* Activity Badge */}
                  <div className="col-span-3">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${theme.color}`}>
                      {log.action.substring(0, 20)}
                    </span>
                  </div>

                  {/* Operation Details */}
                  <div className="col-span-4 text-[11px] text-[var(--text-secondary)] truncate pr-4 font-body transition-colors">
                    {log.details || 'None'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center px-5 py-3 bg-[var(--bg-elevated)] border-t border-[var(--bg-border)]/35 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
          <div>
            Showing {filteredLogs.length > 0 ? (currentPage - 1) * 10 + 1 : 0} - {Math.min(currentPage * 10, filteredLogs.length)} of {filteredLogs.length} logs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-border)]/20 border border-[var(--bg-border)]/50 rounded-lg disabled:opacity-40 transition-all cursor-pointer text-[var(--text-primary)] font-bold text-[10px] uppercase"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredLogs.length / 10)))}
              disabled={currentPage >= Math.ceil(filteredLogs.length / 10)}
              className="px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-border)]/20 border border-[var(--bg-border)]/50 rounded-lg disabled:opacity-40 transition-all cursor-pointer text-[var(--text-primary)] font-bold text-[10px] uppercase"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Cybernetic Detail drawer overlay */}
      {selectedLog && (
        <div className="fixed inset-0 bg-[var(--bg-void)]/60 backdrop-blur-md z-50 flex items-center justify-end">
          <div className="w-full max-w-lg h-full bg-[var(--bg-surface)] border-l border-[var(--bg-border)]/55 p-6 md:p-8 flex flex-col gap-6 shadow-2xl justify-between animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--empire-gold)]">
                  Transaction Audit Inspector
                </span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/30 flex items-center justify-center cursor-pointer border-none text-[var(--text-primary)]"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <h3 className="font-display text-base font-black text-[var(--text-primary)]">
                Event Vector Details
              </h3>
            </div>

            {/* Content fields */}
            <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-5 text-xs font-body pt-4 border-t border-[var(--bg-border)]/35">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Unique ID</span>
                <span className="font-data text-xs text-[var(--text-primary)] select-all">{selectedLog.id}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Transaction Timestamp</span>
                <span className="text-xs text-[var(--text-primary)]">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Actor Role / ID</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase ${
                    selectedLog.actor_role === 'admin' 
                      ? 'bg-amber-500/10 text-[var(--empire-gold)] border border-[var(--empire-gold)]/20' 
                      : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {selectedLog.actor_role}
                  </span>
                  <span className="font-data text-[10px] text-[var(--text-muted)] select-all">{selectedLog.actor_id}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Activity Reference</span>
                <span className="text-xs font-bold text-[var(--empire-gold)]">{selectedLog.action}</span>
              </div>

              {selectedLog.target_id && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Target Reference ID</span>
                  <span className="font-data text-[10px] text-[var(--text-secondary)] select-all">{selectedLog.target_id}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--bg-border)]/35">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Metadata transaction log</span>
                <p className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/35 p-4 rounded-xl font-data text-xs text-[var(--text-primary)]/95 leading-relaxed whitespace-pre-line select-all">
                  {selectedLog.details || 'No extended transaction details recorded.'}
                </p>
              </div>

              {/* Transparency Dispute / Query Panel */}
              <div className="border-t border-[var(--bg-border)]/35 pt-4 flex flex-col gap-2">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">Transparency Action</span>
                {disputeSuccess ? (
                  <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                    ✓ Dispute query raised successfully! Linked to log ID.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/45">
                    <span className="text-[9px] text-[var(--text-secondary)] font-semibold leading-relaxed">
                      Notice something incorrect? Submit a dispute inquiry directly to Admin review.
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Dispute reason..."
                        value={disputeText}
                        onChange={(e) => setDisputeText(e.target.value)}
                        disabled={disputePending}
                        className="flex-grow bg-[var(--bg-surface)] border border-[var(--bg-border)] text-[10px] outline-none px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      />
                      <button
                        onClick={handleRaiseDispute}
                        disabled={disputePending || !disputeText.trim()}
                        className="px-3 py-1.5 bg-[var(--empire-gold)] hover:bg-[var(--empire-gold-dim)] text-[9px] font-black uppercase tracking-wider rounded-lg border-none text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                      >
                        {disputePending ? 'Raising...' : 'Raise Query'}
                      </button>
                    </div>
                    {disputeError && (
                      <span className="text-[8px] text-rose-500 font-semibold mt-1">⚠️ {disputeError}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--bg-border)]/35 pt-4 text-center">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 bg-orange-950/5 hover:bg-orange-950/15 border border-[var(--empire-gold)]/40 rounded-xl font-display text-xs font-black uppercase tracking-widest text-[var(--empire-gold)] transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
