'use client';
// components/forms/ConsentGate/index.tsx — GDPR Article 6(1)(a) consent

import { AI_CONSENT_TEXT } from '@/lib/privacy/consent-text';

interface ConsentGateProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentGate({ onAccept, onDecline }: ConsentGateProps) {
  return (
    <div style={{
      marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-sm)',
      background: 'rgba(0,229,204,.05)', border: '1px solid rgba(0,229,204,.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', flexShrink: 0, color: 'var(--life-teal)' }}>smart_toy</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--life-teal)', marginBottom: '0.5rem' }}>
            Use AI for breed & health estimation?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.875rem' }}>
            {AI_CONSENT_TEXT}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={onAccept} className="btn btn-teal" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span>
              <span>Yes, use AI</span>
            </button>
            <button type="button" onClick={onDecline} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              No, enter manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
