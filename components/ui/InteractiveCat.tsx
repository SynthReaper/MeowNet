'use client';
// components/ui/InteractiveCat.tsx — Fully interactive vector cat with Laser mode, Petting, Weather accessories, and Sleep cycles

import { useEffect, useRef, useState } from 'react';

interface Heart {
  id: number;
  x: number;
  y: number;
  size: number;
  tx: number;
}

interface InteractiveCatProps {
  temperature?: number | null;
}

export default function InteractiveCat({ temperature = null }: InteractiveCatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  // Interactive Options
  const [isLaserMode, setIsLaserMode] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPetting, setIsPetting] = useState(false);
  
  // Core Cat states
  const [isSleeping, setIsSleeping] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  });
  const [isYawning, setIsYawning] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  
  const lastMoveRef = useRef<number>(0);
  const heartIdCounter = useRef<number>(0);
  const wakeLockRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize move timer on mount
  useEffect(() => {
    lastMoveRef.current = Date.now();
  }, []);

  // Track mouse coordinates & follow cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMoveRef.current = Date.now();
      
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Relative mouse coords inside container (for laser dot positioning)
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      setCursorPos({ x: relX, y: relY });

      if (isSleeping && !wakeLockRef.current) {
        setIsSleeping(false); // Wake up on cursor activity during active daytime
      }

      // Calculate center of the cat face in viewport coords
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const angle = Math.atan2(dy, dx);
      
      // Clamp pupil travel radius
      const maxOffset = isLaserMode ? 7.5 : 6;
      const scaleDivisor = isLaserMode ? 12 : 18; // More alert tracking in laser mode
      const dist = Math.min(maxOffset, Math.sqrt(dx * dx + dy * dy) / scaleDivisor);
      
      setPupilOffset({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isSleeping, isLaserMode]);

  // Sleep detection: Check if mouse is inactive for 6 seconds
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastMoveRef.current;
      // If we woke up manually via a click, wait 10 seconds before going back to sleep
      const threshold = wakeLockRef.current ? 10000 : 6000;
      
      if (idleTime > threshold && !isSleeping && !isHovered && !isPetting) {
        setIsSleeping(true);
        if (wakeLockRef.current) {
          clearTimeout(wakeLockRef.current);
          wakeLockRef.current = null;
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isSleeping, isHovered, isPetting]);

  // Random blink loop: blinks every 3 to 6 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const triggerBlink = () => {
      if (!isSleeping && !isYawning && !isPetting) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
      const nextDelay = 3000 + Math.random() * 3000;
      timer = setTimeout(triggerBlink, nextDelay);
    };
    timer = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(timer);
  }, [isSleeping, isYawning, isPetting]);

  // Random yawn loop: yawns every 14 to 22 seconds when awake
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const triggerYawn = () => {
      if (!isSleeping && !isPetting && !isLaserMode) {
        setIsYawning(true);
        setTimeout(() => setIsYawning(false), 2000);
      }
      const nextDelay = 14000 + Math.random() * 8000;
      timer = setTimeout(triggerYawn, nextDelay);
    };
    timer = setTimeout(triggerYawn, 12000);
    return () => clearTimeout(timer);
  }, [isSleeping, isPetting, isLaserMode]);

  // Generate hearts when hovered (purring/petting state)
  useEffect(() => {
    if (!isHovered && !isPetting) return;
    
    // Spawn faster if user is actively petting the cat
    const rate = isPetting ? 220 : 550;
    
    const interval = setInterval(() => {
      heartIdCounter.current++;
      const newHeart: Heart = {
        id: heartIdCounter.current,
        x: 90 + Math.random() * 120, // randomized horizontal width
        y: 160 + Math.random() * 40,
        size: isPetting ? 14 + Math.random() * 12 : 10 + Math.random() * 8,
        tx: (Math.random() - 0.5) * (isPetting ? 80 : 50) // drift width
      };
      setHearts(prev => [...prev.slice(-8), newHeart]); // Keep max 8 hearts
    }, rate);

    return () => clearInterval(interval);
  }, [isHovered, isPetting]);

  // Handle petting click & drags
  const handleCatMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSleeping) {
      // Wake up with a yawn if clicked at night
      setIsSleeping(false);
      setIsYawning(true);
      setTimeout(() => setIsYawning(false), 2200);
      
      // Lock awake state for 10 seconds
      if (wakeLockRef.current) clearTimeout(wakeLockRef.current);
      wakeLockRef.current = setTimeout(() => {
        wakeLockRef.current = null;
      }, 10000);
      
      lastMoveRef.current = Date.now();
      return;
    }

    setIsPetting(true);
  };

  // Bat/Swipe animation on click in Laser Mode
  const handleContainerClick = () => {
    if (isLaserMode && !isSwiping) {
      setIsSwiping(true);
      setTimeout(() => setIsSwiping(false), 400);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPetting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Determine active accessory based on weather temperature
  const isCold = temperature !== null && temperature < 45;

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => {
        setIsHovered(true);
        lastMoveRef.current = Date.now();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPetting(false);
        setHearts([]);
      }}
      onClick={handleContainerClick}
      className={`w-full h-full flex items-center justify-center relative bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-void)] select-none overflow-hidden ${
        isLaserMode ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* 1. Status Mood Pill Badge */}
      <div className="absolute top-4 left-4 bg-white/80 dark:bg-[#1c1a17]/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--bg-border)]/30 flex items-center gap-1.5 pointer-events-none select-none z-30 shadow-sm transition-all duration-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isSleeping ? 'bg-indigo-400' : isPetting ? 'bg-red-400' : isLaserMode ? 'bg-red-500' : 'bg-emerald-400'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
            isSleeping ? 'bg-indigo-500' : isPetting ? 'bg-red-500' : isLaserMode ? 'bg-red-600' : 'bg-emerald-500'
          }`}></span>
        </span>
        <span>
          {isSleeping 
            ? "Sleeping — Click head to wake up" 
            : isPetting 
              ? "Purring! (Keep petting)" 
              : isLaserMode 
                ? "Laser Toy Active: Click to bat!" 
                : isYawning 
                  ? "Stretching & Yawning..." 
                  : "Content — Hover or Pet"
          }
        </span>
      </div>

      {/* 2. Interactive Laser Mode Toggle Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsLaserMode(!isLaserMode);
          if (isSleeping) setIsSleeping(false);
        }}
        className={`absolute top-4 right-4 p-2.5 rounded-full shadow-md backdrop-blur-md border transition-all duration-300 z-30 ${
          isLaserMode 
            ? 'bg-red-600 text-white border-red-500 scale-110 shadow-red-500/20' 
            : 'bg-white/90 dark:bg-[#1c1a17]/90 text-[var(--empire-gold)] border-[var(--bg-border)]/40 hover:scale-105'
        }`}
        title={isLaserMode ? "Deactivate Laser Pointer" : "Activate Laser Pointer"}
      >
        <span className="material-symbols-outlined text-lg flex items-center justify-center">
          {isLaserMode ? 'track_changes' : 'blur_on'}
        </span>
      </button>

      {/* 3. Glowing Laser Dot */}
      {isLaserMode && !isSleeping && isHovered && (
        <div 
          className="absolute rounded-full w-3 h-3 bg-red-500 border border-white shadow-[0_0_12px_#ef4444,0_0_4px_#ffffff] pointer-events-none z-20"
          style={{
            left: `${cursorPos.x - 6}px`,
            top: `${cursorPos.y - 6}px`,
            transition: 'left 0.08s ease-out, top 0.08s ease-out'
          }}
        />
      )}

      {/* 4. Interactive Floating Hearts (Purring/Petting) */}
      {(isHovered || isPetting) && hearts.map(heart => (
        <svg
          key={heart.id}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`absolute opacity-0 pointer-events-none z-20 ${
            isPetting ? 'text-red-500' : 'text-red-400'
          }`}
          style={{
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            animation: 'heart-float-up 2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
            '--tx': `${heart.tx}px`
          } as React.CSSProperties}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ))}

      {/* 5. Floating Zzzs (Sleeping) */}
      {isSleeping && (
        <div className="absolute top-[28%] left-[62%] pointer-events-none select-none z-20">
          <span className="absolute animate-zzz text-[var(--empire-gold)] text-xl font-bold opacity-0" style={{ animationDelay: '0s' }}>Z</span>
          <span className="absolute animate-zzz text-[var(--empire-gold)] text-sm font-semibold opacity-0 ml-5 -mt-3" style={{ animationDelay: '1.2s' }}>z</span>
          <span className="absolute animate-zzz text-[var(--empire-gold)] text-xs font-medium opacity-0 ml-9 -mt-6" style={{ animationDelay: '2.4s' }}>z</span>
        </div>
      )}

      {/* 6. Main Cat SVG Illustration */}
      <svg
        viewBox="0 0 300 300"
        onMouseDown={handleCatMouseDown}
        className={`w-full h-full max-w-[340px] max-h-[340px] transform transition-transform duration-300 ${
          isPetting || (isHovered && !isSleeping) ? 'animate-purr scale-102 cursor-pointer' : ''
        }`}
      >
        {/* Cozy cushion / base pad */}
        <path
          d="M 30,240 Q 150,270 270,240 Q 290,265 250,275 Q 150,290 50,275 Q 10,265 30,240 Z"
          className="fill-[var(--bg-border)]/50 stroke-[var(--bg-border)]"
          strokeWidth="3"
        />
        
        {/* Cat body & tail */}
        <path
          d="M 80,245 C 80,180 220,180 220,245 Z"
          fill="var(--bg-border)"
        />
        {/* Tail curved cozy */}
        <path
          d="M 215,235 C 235,235 250,200 245,185 C 240,175 230,185 235,195 C 240,205 225,225 215,225 Z"
          fill="var(--bg-border)"
          className={`origin-[215px_225px] transition-transform duration-500 ${
            isSleeping ? 'rotate-2' : isHovered ? 'animate-pulse' : 'rotate-0'
          }`}
        />

        {/* Head Base (Listens to clicking/petting) */}
        <path
          d="M 70,140 Q 150,160 230,140 Q 248,190 230,225 Q 150,250 70,225 Q 52,190 70,140 Z"
          className="fill-[var(--bg-surface)] stroke-[var(--bg-border)]"
          strokeWidth="4"
        />

        {/* Ears */}
        {/* Left Ear */}
        <path
          d="M 75,145 L 45,75 Q 90,100 100,138 Z"
          className={`fill-[var(--bg-surface)] stroke-[var(--bg-border)] transition-transform duration-300 origin-[75px_145px] ${
            isSleeping ? 'rotate-[-6deg]' : isYawning ? 'rotate-[4deg]' : isPetting ? 'rotate-[-3deg]' : 'hover:rotate-[-10deg]'
          }`}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 80,140 L 55,87 Q 88,107 94,133 Z"
          fill="pink"
          opacity="0.35"
        />

        {/* Right Ear */}
        <path
          d="M 225,145 L 255,75 Q 210,100 200,138 Z"
          className={`fill-[var(--bg-surface)] stroke-[var(--bg-border)] transition-transform duration-300 origin-[225px_145px] ${
            isSleeping ? 'rotate-[6deg]' : isYawning ? 'rotate-[-4deg]' : isPetting ? 'rotate-[3deg]' : 'hover:rotate-[10deg]'
          }`}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 220,140 L 245,87 Q 212,107 206,133 Z"
          fill="pink"
          opacity="0.35"
        />

        {/* Eyes (Tracking / Blinking / Squinting / Sleeping / Petting / Laser Dilation) */}
        {isSleeping ? (
          <>
            {/* Sleeping Closed Arcs */}
            <path d="M 98,175 Q 112,185 126,175" fill="none" stroke="var(--empire-gold)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 174,175 Q 188,185 202,175" fill="none" stroke="var(--empire-gold)" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (isHovered && !isLaserMode) || isPetting ? (
          <>
            {/* Happy Curved Closed Eyes ^ ^ (Triggered on hover or petting) */}
            <path d="M 98,180 Q 112,165 126,180" fill="none" stroke="var(--empire-gold)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 174,180 Q 188,165 202,180" fill="none" stroke="var(--empire-gold)" strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : isYawning ? (
          <>
            {/* Squinting Eyes > < */}
            <path d="M 100,172 L 114,179 L 100,186" fill="none" stroke="var(--empire-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 200,172 L 186,179 L 200,186" fill="none" stroke="var(--empire-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : isBlinking ? (
          <>
            {/* Flat Blinking lines */}
            <line x1="98" y1="178" x2="126" y2="178" stroke="var(--empire-gold)" strokeWidth="3" strokeLinecap="round" />
            <line x1="174" y1="178" x2="202" y2="178" stroke="var(--empire-gold)" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Left Eye */}
            <ellipse cx="112" cy="178" rx="15" ry="15" className="fill-[var(--bg-elevated)] stroke-[var(--bg-border)]" strokeWidth="2" />
            {/* Pupil (Dilated in Laser Mode) */}
            <ellipse
              cx={112 + pupilOffset.x}
              cy={178 + pupilOffset.y}
              rx={isLaserMode ? 8.5 : 6.5}
              ry={isLaserMode ? 12 : 10}
              fill="var(--empire-cream)"
            />
            {/* Highlight */}
            <circle cx={110 + pupilOffset.x - (isLaserMode ? 3 : 2)} cy={178 + pupilOffset.y - (isLaserMode ? 4 : 3)} r={isLaserMode ? 3 : 2} fill="white" />
            
            {/* Right Eye */}
            <ellipse cx="188" cy="178" rx="15" ry="15" className="fill-[var(--bg-elevated)] stroke-[var(--bg-border)]" strokeWidth="2" />
            {/* Pupil (Dilated in Laser Mode) */}
            <ellipse
              cx={188 + pupilOffset.x}
              cy={178 + pupilOffset.y}
              rx={isLaserMode ? 8.5 : 6.5}
              ry={isLaserMode ? 12 : 10}
              fill="var(--empire-cream)"
            />
            {/* Highlight */}
            <circle cx={186 + pupilOffset.x - (isLaserMode ? 3 : 2)} cy={178 + pupilOffset.y - (isLaserMode ? 4 : 3)} r={isLaserMode ? 3 : 2} fill="white" />
          </>
        )}

        {/* Nose (small pink triangle) */}
        <polygon
          points="146,192 154,192 150,197"
          fill="pink"
          stroke="var(--bg-border)"
          strokeWidth="1.5"
        />

        {/* Mouth (Adapts to Yawn / Normal / Sleep / Petting) */}
        {isYawning ? (
          /* Big yawning oval */
          <>
            <ellipse cx="150" cy="214" rx="10" ry="16" fill="#ba1a1a" stroke="var(--bg-border)" strokeWidth="1.5" />
            {/* Cute pink tongue */}
            <path d="M 144,220 Q 150,212 156,220 Q 150,229 144,220 Z" fill="pink" />
          </>
        ) : isSleeping ? (
          /* Small sleepy mouth */
          <path d="M 147,202 Q 150,205 153,202" fill="none" stroke="var(--empire-gold)" strokeWidth="2" strokeLinecap="round" />
        ) : isPetting ? (
          /* Wide content smile during petting */
          <path
            d="M 140,200 Q 145,206 150,200 Q 155,206 160,200"
            fill="none"
            stroke="var(--empire-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          /* Normal content smile split */
          <path
            d="M 142,201 Q 146,205 150,201 Q 154,205 158,201"
            fill="none"
            stroke="var(--empire-gold)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Whiskers */}
        {/* Left Whiskers */}
        <g stroke="var(--bg-border)" strokeWidth="2" strokeLinecap="round" className={isYawning ? 'translate-y-[-1px]' : ''}>
          <line x1="72" y1="198" x2="38" y2="194" />
          <line x1="70" y1="204" x2="34" y2="204" />
          <line x1="72" y1="210" x2="38" y2="214" />
        </g>
        {/* Right Whiskers */}
        <g stroke="var(--bg-border)" strokeWidth="2" strokeLinecap="round" className={isYawning ? 'translate-y-[-1px]' : ''}>
          <line x1="228" y1="198" x2="262" y2="194" />
          <line x1="230" y1="204" x2="266" y2="204" />
          <line x1="228" y1="210" x2="262" y2="214" />
        </g>

        {/* 7. Cozy Weather Accessories */}
        {/* Cozy Striped Knitted Scarf (renders in cold conditions <45°F) */}
        {isCold && (
          <g className="transition-opacity duration-500">
            {/* Scarf Tail */}
            <path 
              d="M 98,232 L 84,272 L 106,274 L 114,233 Z" 
              fill="#b91c1c" 
              stroke="#7f1d1d" 
              strokeWidth="2" 
              strokeLinejoin="round"
            />
            {/* Gold Stripes on Scarf Tail */}
            <line x1="93" y1="243" x2="103" y2="244" stroke="#fbbf24" strokeWidth="4.5" />
            <line x1="89" y1="254" x2="99" y2="255" stroke="#fbbf24" strokeWidth="4.5" />
            <line x1="85" y1="265" x2="95" y2="266" stroke="#fbbf24" strokeWidth="4.5" />
            
            {/* Scarf Main Loop */}
            <path 
              d="M 95,212 Q 150,225 205,212 C 215,225 210,236 200,239 Q 150,250 100,239 C 90,236 85,225 95,212 Z" 
              fill="#b91c1c" 
              stroke="#7f1d1d" 
              strokeWidth="2.5" 
              strokeLinejoin="round"
            />
            {/* Gold Stripes on Main Loop */}
            <path d="M 115,218 L 110,240" stroke="#fbbf24" strokeWidth="6.5" />
            <path d="M 135,221 L 130,243" stroke="#fbbf24" strokeWidth="6.5" />
            <path d="M 155,222 L 152,244" stroke="#fbbf24" strokeWidth="6.5" />
            <path d="M 175,221 L 172,243" stroke="#fbbf24" strokeWidth="6.5" />
            <path d="M 195,217 L 190,239" stroke="#fbbf24" strokeWidth="6.5" />
          </g>
        )}


        {/* 8. Paws (Left Paw Swipes/Bats in Laser mode) */}
        {/* Left Paw */}
        <path
          d="M 85,232 C 90,215 110,215 115,232"
          fill="var(--bg-surface)"
          stroke="var(--bg-border)"
          strokeWidth="3"
          className={`transition-all duration-200 origin-[100px_232px] ${
            isSwiping ? 'translate-x-[-12px] translate-y-[-48px] rotate-[-25deg]' : ''
          }`}
        />
        {/* Right Paw */}
        <path
          d="M 185,232 C 190,215 210,215 215,232"
          fill="var(--bg-surface)"
          stroke="var(--bg-border)"
          strokeWidth="3"
        />
      </svg>

      {/* Styled Heart Float Inline Animation Rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heart-float-up {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          90% {
            opacity: 0.95;
          }
          100% {
            transform: translateY(-135px) translateX(var(--tx)) scale(1.3);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
}
