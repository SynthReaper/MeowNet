'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface SoundChannel {
  id: string;
  name: string;
  icon: string;
  url: string;
  volume: number;
  muted: boolean;
}

export default function MeowFiPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'rainy_loft' | 'fireplace' | 'night_forest'>('rainy_loft');
  
  // Audio channels state
  const [channels, setChannels] = useState<SoundChannel[]>([
    {
      id: 'lofi',
      name: 'Lo-Fi Chill Beats',
      icon: 'library_music',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      volume: 0.4,
      muted: false
    },
    {
      id: 'purr',
      name: 'Purr Ambience',
      icon: 'pets',
      url: 'https://actions.google.com/sounds/v1/animals/cat_purr.ogg',
      volume: 0.6,
      muted: false
    },
    {
      id: 'rain',
      name: 'Window Raindrops',
      icon: 'rainy',
      url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
      volume: 0.3,
      muted: false
    },
    {
      id: 'fire',
      name: 'Fireplace Crackle',
      icon: 'fireplace',
      url: 'https://actions.google.com/sounds/v1/ambiences/fire_crackle.ogg',
      volume: 0.2,
      muted: false
    }
  ]);

  // Audio refs map
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Synchronize audio play/pause and volumes
  useEffect(() => {
    channels.forEach(ch => {
      const audio = audioRefs.current[ch.id];
      if (audio) {
        audio.volume = ch.muted ? 0 : ch.volume;
        audio.loop = true;
        if (isPlaying) {
          audio.play().catch(e => console.log('Audio playback paused until user interact', e));
        } else {
          audio.pause();
        }
      }
    });
  }, [isPlaying, channels]);

  const handleVolumeChange = (id: string, vol: number) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, volume: vol } : c));
  };

  const handleToggleMute = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, muted: !c.muted } : c));
  };

  const handleMasterToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const themeConfig = {
    rainy_loft: {
      bg: 'from-slate-900 via-indigo-950 to-slate-900',
      watermark: 'water',
      visual: '🌧️ Rain against the glass'
    },
    fireplace: {
      bg: 'from-[#2b160e] via-[#4d2417] to-[#1f0e0a]',
      watermark: 'mode_fan',
      visual: '🔥 Embers crackling softly'
    },
    night_forest: {
      bg: 'from-emerald-950 via-teal-950 to-slate-950',
      watermark: 'forest',
      visual: '🌲 Mountain rescue base camp'
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeConfig[activeTheme].bg} text-[var(--empire-cream)] py-10 px-4 md:px-12 transition-all duration-1000 flex flex-col justify-between`}>
      
      {/* Background Audio Elements */}
      {channels.map(ch => (
        <audio
          key={ch.id}
          ref={el => { audioRefs.current[ch.id] = el; }}
          src={ch.url}
          preload="auto"
        />
      ))}

      {/* Header */}
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center z-10 print:hidden">
        <div className="flex flex-col gap-1.5">
          <Link 
            href="/empire" 
            className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider no-underline transition-colors"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            <span>Empire Hub</span>
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">radio</span>
            <span>Meow-Fi Rescuer Focus Room</span>
          </h1>
        </div>

        {/* Theme select slider */}
        <div className="flex gap-1.5 bg-black/30 backdrop-blur-md p-1.5 border border-white/5 rounded-xl">
          {(['rainy_loft', 'fireplace', 'night_forest'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => setActiveTheme(theme)}
              className={`px-3 py-1.5 rounded-lg font-display text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTheme === theme 
                  ? 'bg-[var(--empire-gold)] text-white shadow'
                  : 'text-[var(--empire-cream)]/40 hover:text-[var(--empire-cream)]/75 bg-transparent'
              }`}
            >
              {theme === 'rainy_loft' && '🌧️ Loft'}
              {theme === 'fireplace' && '🔥 Fire'}
              {theme === 'night_forest' && '🌲 Forest'}
            </button>
          ))}
        </div>
      </div>

      {/* Center Layout: Sleeping Breathing Cat and Controls */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center justify-center my-10 z-10 flex-grow">
        
        {/* Left Side: SVG Breathing Cat Visualizer (7 columns) */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative">
          
          {/* Holographic Glowing Circle */}
          <div className={`absolute w-72 h-72 rounded-full blur-3xl opacity-10 transition-all duration-1000 ${
            isPlaying ? 'bg-[var(--empire-gold)] animate-pulse scale-105' : 'bg-slate-500 scale-95'
          }`} />

          {/* Sleeping Cat SVG */}
          <svg
            className={`w-64 h-64 relative z-10 drop-shadow-2xl transition-all duration-700 ${isPlaying ? 'scale-100' : 'scale-95 opacity-80'}`}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Curled cat body */}
            <path
              d="M 140 100 A 50 45 0 1 1 50 120"
              fill="none"
              stroke="var(--empire-gold)"
              strokeWidth="14"
              strokeLinecap="round"
              className={`transition-all duration-500 origin-center ${isPlaying ? 'animate-breathe' : ''}`}
              style={{
                animation: isPlaying ? 'breatheCat 4s ease-in-out infinite' : 'none'
              }}
            />
            {/* Tail */}
            <path
              d="M 140 100 C 160 120, 160 150, 130 155"
              fill="none"
              stroke="var(--empire-gold)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Cat Head */}
            <circle cx="65" cy="115" r="24" fill="#1e1b18" stroke="var(--empire-gold)" strokeWidth="6" />
            
            {/* Ears */}
            <path d="M 50 96 L 45 75 L 62 93 Z" fill="var(--empire-gold)" />
            <path d="M 80 96 L 85 75 L 68 93 Z" fill="var(--empire-gold)" />

            {/* Sleeping eyes */}
            <path d="M 53 115 Q 58 119 63 115" fill="none" stroke="var(--empire-gold)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 67 115 Q 72 119 77 115" fill="none" stroke="var(--empire-gold)" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Cute nose */}
            <polygon points="63,121 67,121 65,124" fill="var(--empire-gold)" />
          </svg>

          {/* Styled status indicators */}
          <div className="text-center mt-6 z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--empire-gold)] block">
              {isPlaying ? 'Focus Room Active' : 'Room Paused'}
            </span>
            <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1 italic">
              {themeConfig[activeTheme].visual}
            </p>
          </div>
        </div>

        {/* Right Side: Audio Channel Mixers (5 columns) */}
        <div className="md:col-span-6 bg-black/25 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-lg flex flex-col gap-6 shadow-2xl relative z-10">
          <div>
            <h3 className="font-display text-base font-bold text-[var(--empire-cream)]">Ambience Mixer</h3>
            <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5 leading-normal">
              Adjust individual volume levels to customize your perfect background soundscape.
            </p>
          </div>

          {/* Master Controller */}
          <button
            onClick={handleMasterToggle}
            className={`w-full py-4 rounded-2xl font-display text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border shadow-lg ${
              isPlaying 
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-rose-950/20' 
                : 'bg-[var(--life-teal)] hover:opacity-90 text-white border-[var(--life-teal)] shadow-emerald-950/20'
            }`}
          >
            <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
            <span>{isPlaying ? 'Pause Focus Session' : 'Start Focus Session'}</span>
          </button>

          <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
            {channels.map(ch => (
              <div key={ch.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--empire-cream)]/85">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">{ch.icon}</span>
                    <span>{ch.name}</span>
                  </span>
                  <button 
                    onClick={() => handleToggleMute(ch.id)}
                    className="text-[10px] text-[var(--empire-cream)]/45 hover:text-[var(--empire-cream)] bg-transparent cursor-pointer font-bold uppercase tracking-wider"
                  >
                    {ch.muted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={ch.volume}
                    onChange={(e) => handleVolumeChange(ch.id, parseFloat(e.target.value))}
                    className="flex-grow accent-[var(--empire-gold)] h-1.5 bg-white/10 rounded-lg cursor-pointer outline-none"
                    disabled={ch.muted}
                  />
                  <span className="font-data text-[10px] text-[var(--empire-cream)]/40 w-8 text-right">
                    {ch.muted ? '0%' : `${Math.round(ch.volume * 100)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer credits and quotes */}
      <div className="max-w-5xl mx-auto w-full text-center text-[10px] text-[var(--empire-cream)]/30 font-semibold uppercase tracking-wider mt-6 print:hidden relative z-10 border-t border-white/5 pt-4">
        <span>Curated with purrs by SynthReaper · </span>
        <a href="https://github.com/SynthReaper" target="_blank" rel="noreferrer" className="text-[var(--empire-cream)]/45 hover:underline">
          GitHub Repo
        </a>
      </div>

      {/* Breathing animation styles */}
      <style jsx global>{`
        @keyframes breatheCat {
          0%, 100% {
            d: path("M 140 100 A 50 45 0 1 1 50 120");
            transform: scale(1);
          }
          50% {
            d: path("M 140 100 A 52 47 0 1 1 48 118");
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
