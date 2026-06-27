'use client';
// components/ui/ShareCard/index.tsx — Dynamic Canvas Impact Card for social sharing

import { useRef, useEffect, useCallback } from 'react';

interface Props {
  displayName: string;
  points: number;
  catLogsCount: number;
  tnrCount: number;
}

export default function ShareCard({ displayName, points, catLogsCount, tnrCount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear & Background Gradient
    const width = 800;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#141210'); // Deep Espresso
    grad.addColorStop(1, '#25221e'); // Dark Slate container
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Decorative Border
    ctx.strokeStyle = '#f28c38'; // Terracotta Orange / Amber
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = '#944a00'; // Deep Terracotta
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    // 3. Draw Watermark Paw Icon or Grid Pattern (Faux paws)
    ctx.fillStyle = 'rgba(242, 140, 56, 0.03)';
    for (let x = 60; x < width; x += 120) {
      for (let y = 60; y < height; y += 120) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 16, y - 16, 6, 0, Math.PI * 2);
        ctx.arc(x, y - 22, 6, 0, Math.PI * 2);
        ctx.arc(x + 16, y - 16, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Header text
    ctx.fillStyle = '#f28c38';
    ctx.font = 'bold 24px Quicksand, system-ui, sans-serif';
    ctx.fillText('MEOWNET COMMUNITY IMPACT 🐾', 50, 75);

    // 5. Divider
    ctx.fillStyle = 'rgba(219, 194, 178, 0.15)';
    ctx.fillRect(50, 95, width - 100, 2);

    // 6. Volunteer Name
    ctx.fillStyle = '#fdf9f3'; // Warm Cream
    ctx.font = 'bold 36px Quicksand, system-ui, sans-serif';
    ctx.fillText(displayName, 50, 155);

    ctx.fillStyle = 'rgba(253, 249, 243, 0.6)';
    ctx.font = '16px Plus Jakarta Sans, system-ui, sans-serif';
    ctx.fillText('Registered Community Cat Guardian', 50, 185);

    // 7. Stats Bento Layout (3 columns)
    const statsY = 240;
    const colWidth = 220;

    // Stat 1: Empire Points
    ctx.fillStyle = 'rgba(37, 34, 30, 0.6)';
    ctx.fillRect(50, statsY, colWidth, 120);
    ctx.strokeStyle = 'rgba(242, 140, 56, 0.2)';
    ctx.strokeRect(50, statsY, colWidth, 120);
    
    ctx.fillStyle = '#ffd54f'; // Bright Gold
    ctx.font = 'bold 32px DM Mono, monospace';
    ctx.fillText(points.toLocaleString(), 70, statsY + 55);
    ctx.fillStyle = 'rgba(253, 249, 243, 0.5)';
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillText('EMPIRE POINTS 👑', 70, statsY + 88);

    // Stat 2: Cats Logged
    ctx.fillStyle = 'rgba(37, 34, 30, 0.6)';
    ctx.fillRect(50 + colWidth + 20, statsY, colWidth, 120);
    ctx.strokeRect(50 + colWidth + 20, statsY, colWidth, 120);

    ctx.fillStyle = '#4dd0e1'; // Mint Teal
    ctx.font = 'bold 32px DM Mono, monospace';
    ctx.fillText(catLogsCount.toString(), 70 + colWidth + 20, statsY + 55);
    ctx.fillStyle = 'rgba(253, 249, 243, 0.5)';
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillText('CATS SIGHTED 🐈', 70 + colWidth + 20, statsY + 88);

    // Stat 3: TNR Operations
    ctx.fillStyle = 'rgba(37, 34, 30, 0.6)';
    ctx.fillRect(50 + (colWidth + 20) * 2, statsY, colWidth, 120);
    ctx.strokeRect(50 + (colWidth + 20) * 2, statsY, colWidth, 120);

    ctx.fillStyle = '#f28c38'; // Amber
    ctx.font = 'bold 32px DM Mono, monospace';
    ctx.fillText(tnrCount.toString(), 70 + (colWidth + 20) * 2, statsY + 55);
    ctx.fillStyle = 'rgba(253, 249, 243, 0.5)';
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillText('TNR CAMPAIGNS ✂️', 70 + (colWidth + 20) * 2, statsY + 88);

    // 8. Footer credits
    ctx.fillStyle = 'rgba(253, 249, 243, 0.3)';
    ctx.font = '12px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Join the empire at github.com/SynthReaper/MeoNet', 50, 405);
    ctx.fillText('TNR · SIGHTINGS · COLONY SUPPORT', width - 290, 405);
  }, [displayName, points, catLogsCount, tnrCount]);

  useEffect(() => {
    drawCard();
  }, [drawCard]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${displayName.replace(/\s+/g, '-').toLowerCase()}-meownet-impact.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center gap-4 bg-white border border-[var(--bg-border)] p-6 rounded-2xl shadow-ambient w-full max-w-3xl mx-auto">
      <div className="overflow-x-auto w-full border border-[var(--bg-border)]/20 rounded-xl bg-[#141210]">
        <canvas
          ref={canvasRef}
          className="block mx-auto max-w-full aspect-[16/9] w-[800px] h-[450px]"
          style={{ width: '100%', height: 'auto', minWidth: '400px' }}
        />
      </div>
      <button
        onClick={handleDownload}
        className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-5 py-3 rounded-xl text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">download</span>
        <span>Download Share Card</span>
      </button>
    </div>
  );
}
