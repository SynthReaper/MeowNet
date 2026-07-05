'use client';
// components/emergency/EmergencyContactCard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

interface Contact {
  readonly id: string;
  readonly contact_type: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly relationship: string | null;
  readonly is_primary: boolean;
}

interface Props {
  readonly contact: Contact;
  readonly onDelete?: (id: string) => void;
}

export default function EmergencyContactCard({ contact, onDelete }: Props) {
  const icons = {
    emergency: 'emergency_home',
    vet: 'medical_services',
    rescue: 'pets',
  };

  return (
    <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg">
            {icons[contact.contact_type as keyof typeof icons] || 'person'}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[var(--empire-cream)] truncate">{contact.name}</h4>
            {contact.is_primary && (
              <span className="text-[9px] bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]/30 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                Primary
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
            {contact.phone} {contact.relationship ? `(${contact.relationship})` : ''}
          </p>
        </div>
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(contact.id)}
          className="text-gray-500 hover:text-red-400 transition-all cursor-pointer"
          aria-label="Delete contact"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      )}
    </div>
  );
}
export type { Contact as EmergencyContactDetail };
