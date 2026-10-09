'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, AlertTriangle, RotateCcw, Clock, Sparkles } from 'lucide-react';
import type { CommunityAuditLog } from '@/lib/governancePolicy';

interface CommunityAuditHistoryProps {
  communityId: string;
}

export function CommunityAuditHistory({ communityId }: CommunityAuditHistoryProps) {
  const [logs, setLogs] = useState<CommunityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/governance/audit?communityId=${encodeURIComponent(communityId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (mounted) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [communityId]);

  if (loading) {
    return (
      <div className="p-3 text-center text-slate-500 text-xs font-mono">
        Loading living history audit trail...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-3 text-center text-slate-500 text-xs font-mono bg-white/[0.02] border border-white/[0.06] rounded-xl">
        No formal governance inquiries recorded. Community classification is baseline intact.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
        <History className="w-3.5 h-3.5 text-emerald-400" />
        <span>Living Audit Trail & Quorum History</span>
      </div>

      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
        {logs.map((log) => {
          let badgeColor = 'bg-slate-700/50 text-slate-300 border-white/10';
          let icon = <History className="w-3 h-3" />;

          if (log.action === 'CREATED') {
            badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
            icon = <Sparkles className="w-3 h-3 text-emerald-400" />;
          } else if (log.action === 'CHALLENGED_DELIST') {
            badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
            icon = <AlertTriangle className="w-3 h-3 text-amber-400" />;
          } else if (log.action === 'DELISTED') {
            badgeColor = 'bg-red-500/10 text-red-300 border-red-500/30';
            icon = <Clock className="w-3 h-3 text-red-400" />;
          } else if (log.action === 'PETITION_REINSTATE' || log.action === 'REINSTATED') {
            badgeColor = 'bg-teal-500/10 text-teal-300 border-teal-500/30';
            icon = <RotateCcw className="w-3 h-3 text-teal-400" />;
          }

          return (
            <div key={log.id} className="relative group text-xs">
              {/* Dot */}
              <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-slate-500 group-hover:bg-emerald-400 transition-colors border border-black" />

              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${badgeColor}`}
                  >
                    {icon}
                    <span>{log.action.replace('_', ' ')}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(log.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">{log.summary}</p>

                {log.deviceId && (
                  <div className="text-[9px] font-mono text-slate-500 pt-0.5">
                    Participant: Device #{log.deviceId.slice(0, 10)}...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
