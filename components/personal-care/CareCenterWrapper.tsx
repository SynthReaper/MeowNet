'use client';
// components/personal-care/CareCenterWrapper.tsx
// Front-end wrapper to manage unlocking state before showing the dashboard

import { useState } from 'react';
import VaultUnlock from './VaultUnlock';
import CareCenterDashboard from './CareCenterDashboard';

export default function CareCenterWrapper() {
  const [passphrase, setPassphrase] = useState<string | null>(null);

  if (!passphrase) {
    return (
      <div className="w-full flex justify-center py-10">
        <VaultUnlock onUnlock={setPassphrase} />
      </div>
    );
  }

  return <CareCenterDashboard passphrase={passphrase} />;
}
