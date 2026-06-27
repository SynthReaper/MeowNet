'use client';
// components/auth/PasswordStrength/index.tsx

interface PasswordStrengthProps {
  password: string;
}

function getStrength(pw: string): { score: number; label: string; color: string; checks: boolean[] } {
  const checks = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  const score = checks.filter(Boolean).length;
  const levels = [
    { label: '', color: 'var(--bg-border)' },
    { label: 'Very weak', color: '#ef4444' },
    { label: 'Weak', color: '#f97316' },
    { label: 'Fair', color: '#eab308' },
    { label: 'Good', color: '#22c55e' },
    { label: 'Strong', color: 'var(--life-teal)' },
  ];
  return { score, label: levels[score].label, color: levels[score].color, checks };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;
  const { score, label, color, checks } = getStrength(password);
  const TIPS = ['8+ characters', 'Uppercase letter', 'Lowercase letter', 'Number', 'Symbol (!@#...)'];

  return (
    <div className="flex flex-col gap-2 mt-1">
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? color : 'var(--bg-border)' }}
          />
        ))}
      </div>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <span className="font-body text-[10px] font-semibold" style={{ color }}>
            {label}
          </span>
          <div className="flex gap-1.5">
            {checks.map((ok, i) => (
              <span
                key={i}
                title={TIPS[i]}
                className="font-body text-[9px] transition-colors"
                style={{ color: ok ? 'var(--life-teal)' : 'var(--text-secondary)' }}
              >
                {ok ? '✓' : '·'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
