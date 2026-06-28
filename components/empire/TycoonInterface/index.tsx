'use client';

import React, { useState, useEffect } from 'react';
import { purchaseSanctuaryUpgrade, claimIdlePoints } from '@/lib/actions/gamification';

interface Sanctuary {
  id: string;
  name: string;
  level: number;
  point_multiplier: number;
  idle_points_rate: number;
  last_claimed_at?: string | null;
}

interface Upgrade {
  id: string;
  sanctuary_id?: string;
  upgrade_type: 'shelter_bed' | 'kibble_feeder' | 'first_aid' | 'play_area';
  level: number;
  cost_points: number;
}

interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number; text?: string;
}

interface TycoonInterfaceProps {
  initialSanctuary: Sanctuary;
  initialUpgrades: Upgrade[];
  initialUserPoints: number;
  initialAccumulatedPoints: number;
}
export default function TycoonInterface({ initialSanctuary, initialUpgrades, initialUserPoints, initialAccumulatedPoints }: TycoonInterfaceProps) {
  const [sanctuary, setSanctuary] = useState<Sanctuary>(initialSanctuary);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);
  const [userPoints, setUserPoints] = useState(initialUserPoints);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accumulatedPoints, setAccumulatedPoints] = useState(initialAccumulatedPoints);
  const [accumulatedFloat, setAccumulatedFloat] = useState(initialAccumulatedPoints);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [isNight, setIsNight] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [smokeOff, setSmokeOff] = useState(0);
  const [tick, setTick] = useState(0);

  const getLevel = (t: string) => upgrades.filter(u => u.upgrade_type === t).length;

  const hasShelter = getLevel('shelter_bed') > 0;
  const hasFeeder = getLevel('kibble_feeder') > 0;
  const hasCastle = getLevel('play_area') > 0;
  const hasFirstAid = getLevel('first_aid') > 0;
  const built = [hasShelter, hasFeeder, hasCastle, hasFirstAid].filter(Boolean).length;

  // Isometric Projection Helper
  const iso = (gx: number, gy: number) => ({
    x: 200 + (gx - gy) * 32,
    y: 80 + (gx + gy) * 16 + 16
  });

  const cottagePos = { gx: 1.2, gy: 1.2 };
  const feederPos = { gx: 0.8, gy: 2.8 };
  const castlePos = { gx: 2.8, gy: 0.8 };
  const firstAidPos = { gx: 3.5, gy: 3.5 };
  const catSleepPos = { gx: 2.1, gy: 1.9 };
  const catPlayPos = { gx: 1.3, gy: 2.0 };

  const sA = iso(cottagePos.gx, cottagePos.gy);
  const fA = iso(feederPos.gx, feederPos.gy);
  const cA = iso(castlePos.gx, castlePos.gy);
  const faA = iso(firstAidPos.gx, firstAidPos.gy);
  const { x: csX, y: csY } = iso(catSleepPos.gx, catSleepPos.gy);
  const { x: cpX, y: cpY } = iso(catPlayPos.gx, catPlayPos.gy);

  const bs = 1 + Math.sin(tick * 0.15) * 0.04;
  const wb = Math.sin(tick * 0.2) * 5;
  const walkBob = Math.abs(Math.sin(tick * 0.35)) * -2.5;
  const walkRot = Math.sin(tick * 0.35) * 4.5;
  const faBob = Math.sin(tick * 0.12) * 3;

  // Sync points when initialUserPoints changes (e.g. on server path revalidation or external load)
  useEffect(() => {
    setUserPoints(initialUserPoints);
  }, [initialUserPoints]);

  useEffect(() => {
    const h = new Date().getHours();
    setIsNight(h < 6 || h > 18);
  }, []);

  useEffect(() => {
    const pps = (sanctuary.idle_points_rate * Number(sanctuary.point_multiplier)) / 3600;
    const t = setInterval(() => {
      setAccumulatedFloat(p => {
        const nv = p + pps;
        setAccumulatedPoints(Math.floor(nv));
        return nv;
      });
      setTick(t => {
        const nextTick = t + 1;

        // Spawn chimney smoke from cottage if built (every 2 seconds)
        if (hasShelter && nextTick % 2 === 0) {
          setParticles(old => [
            ...old,
            {
              id: Math.random() + nextTick,
              x: sA.x + 10,
              y: sA.y - 45,
              vx: -0.3 - Math.random() * 0.3, // drift left (wind)
              vy: -0.6 - Math.random() * 0.3, // float up
              life: 50,
              maxLife: 50,
              color: '#d1d5db', // smoke gray
              size: 4 + Math.random() * 5
            }
          ]);
        }

        // Spawn snoring particles from sleeping cat (every 3 seconds)
        if (nextTick % 3 === 0) {
          setParticles(old => [
            ...old,
            {
              id: Math.random() + nextTick,
              x: csX - 8,
              y: csY - 12,
              vx: -0.2 - Math.random() * 0.2,
              vy: -0.5 - Math.random() * 0.3,
              life: 45,
              maxLife: 45,
              color: '#94a3b8',
              size: 8 + Math.random() * 4,
              text: Math.random() > 0.5 ? 'z' : 'Z'
            }
          ]);
        }

        // Spawn medical cross particles from firstaid kit if built (every 4 seconds)
        if (hasFirstAid && nextTick % 4 === 0) {
          setParticles(old => [
            ...old,
            {
              id: Math.random() + nextTick,
              x: faA.x + (Math.random() - 0.5) * 16,
              y: faA.y - 12,
              vx: (Math.random() - 0.5) * 0.2,
              vy: -0.4 - Math.random() * 0.3,
              life: 40,
              maxLife: 40,
              color: '#ef4444', // red medical plus
              size: 9,
              text: '+'
            }
          ]);
        }

        return nextTick;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sanctuary.idle_points_rate, sanctuary.point_multiplier, hasShelter, hasFirstAid, sA.x, sA.y, csX, csY, faA.x, faA.y]);

  useEffect(() => {
    const t = setInterval(() => setSmokeOff(p => (p + 0.5) % 20), 50);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!particles.length) return;
    const f = requestAnimationFrame(() =>
      setParticles(p => p.map(x => {
        // Floating particles (smoke, snoring z's, medical crosses) rise instead of falling with gravity
        const isFloat = x.text === 'z' || x.text === 'Z' || x.text === '+' || x.color === '#d1d5db';
        const nextVy = isFloat ? x.vy : x.vy - 0.15; // standard gravity pull only on non-floaters
        return {
          ...x,
          x: x.x + x.vx,
          y: x.y + x.vy,
          vy: nextVy,
          life: x.life - 1
        };
      }).filter(x => x.life > 0))
    );
    return () => cancelAnimationFrame(f);
  }, [particles]);

  const spawnBurst = (cx: number, cy: number, amt: number) => {
    const cols = ['#fbbf24','#10b981','#a78bfa','#f472b6','#34d399'];
    const b: Particle[] = Array.from({ length: 28 }, (_, i) => ({
      id: Date.now() + i, x: cx + (Math.random() - 0.5) * 60, y: cy + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 3, vy: -(3 + Math.random() * 3),
      life: 50 + Math.random() * 30, maxLife: 80, color: cols[i % 5], size: 4 + Math.random() * 5,
    }));
    b.push({ id: Date.now() + 99, x: cx - 25, y: cy - 10, vx: 0, vy: -2, life: 70, maxLife: 70, color: '#fbbf24', size: 8, text: `+${amt} XP` });
  };

  const UPGRADES = [
    { type: 'shelter_bed', name: 'Insulated Straw Bed', baseCost: 20, icon: 'bed', desc: 'Warm shelter for outdoor strays.' },
    { type: 'kibble_feeder', name: 'Auto Kibble Feeder', baseCost: 35, icon: 'restaurant', desc: 'Reliable meals, always fresh.' },
    { type: 'first_aid', name: 'Vet First-Aid Kit', baseCost: 50, icon: 'medical_services', desc: 'Emergency care for injured cats.' },
    { type: 'play_area', name: 'Cat Play Castle', baseCost: 75, icon: 'castle', desc: 'Keeps cats active and happy.' },
  ];

  const handleUpgrade = async (type: 'shelter_bed'|'kibble_feeder'|'first_aid'|'play_area', cost: number) => {
    if (userPoints < cost) { setError('Insufficient points.'); return; }
    setIsUpgrading(type); setError(null);
    try {
      const r = await purchaseSanctuaryUpgrade(type, cost);
      if (r.success) {
        setUserPoints(p => p - cost);
        setUpgrades(p => [...p, { id: Math.random().toString(), sanctuary_id: sanctuary.id, upgrade_type: type, level: getLevel(type) + 1, cost_points: cost }]);
        setSanctuary(p => ({
          ...p,
          idle_points_rate: p.idle_points_rate + 2,
          point_multiplier: Number((p.point_multiplier + 0.1).toFixed(2)),
          level: Math.floor((upgrades.length + 1) / 2) + 1
        }));
      } else setError(r.error || 'Failed to purchase upgrade.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleClaim = async () => {
    if (accumulatedPoints <= 0) return;
    setIsClaiming(true); setError(null); setClaimSuccess(null);
    try {
      const r = await claimIdlePoints() as any;
      if (r.success && r.pointsClaimed) {
        setUserPoints(p => p + r.pointsClaimed);
        setClaimSuccess(`+${r.pointsClaimed} XP Claimed!`);
        spawnBurst(200, 150, r.pointsClaimed);
        setAccumulatedFloat(0); setAccumulatedPoints(0);
        setTimeout(() => setClaimSuccess(null), 3000);
      } else setError(r.error || 'Failed to claim points.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsClaiming(false);
    }
  };

  // All configuration variables and isometric projection details are declared at function top scope to avoid initialization ordering errors.

  // Let's gather all renderable elements in a unified list and sort them by gy + gx (y depth)
  const renderObjects: { key: string; depth: number; render: () => React.JSX.Element }[] = [];

  // Add paths/cobble tiles at depth = gx + gy - 0.5 (rendered under everything else at that tile)
  const pathTiles = [
    { gx: 2.0, gy: 2.0 }, // center plaza
    { gx: 1.6, gy: 2.0 }, { gx: 1.2, gy: 2.0 }, // path to feeder
    { gx: 2.0, gy: 1.6 }, { gx: 2.0, gy: 1.2 }, // path to castle
    { gx: 2.4, gy: 2.0 }, { gx: 2.8, gy: 2.0 }, // path to first aid
    { gx: 2.0, gy: 2.4 }, { gx: 2.0, gy: 2.8 }, // path to cottage
  ];

  pathTiles.forEach((tile, i) => {
    const { x, y } = iso(tile.gx, tile.gy);
    renderObjects.push({
      key: `path-${i}`,
      depth: tile.gx + tile.gy - 0.4,
      render: () => (
        <polygon
          points={`${x},${y} ${x+16},${y+8} ${x},${y+16} ${x-16},${y+8}`}
          fill="url(#gPath)"
          opacity={0.8}
        />
      )
    });
  });

  // Add trees (excluding the bottom-most tree at 3.8, 3.8 to keep the sleeping cat visible)
  const treeTiles = [
    { gx: 0.2, gy: 0.2, v: 0 },
    { gx: 0.8, gy: 0.2, v: 1 },
    { gx: 0.2, gy: 0.8, v: 2 },
    { gx: 3.8, gy: 0.2, v: 0 },
    { gx: 0.2, gy: 3.8, v: 1 },
    { gx: 2.0, gy: 0.4, v: 0 },
  ];

  treeTiles.forEach((t, i) => {
    const { x: tx, y: ty } = iso(t.gx, t.gy);
    const dk = ['#2d6a4f', '#1b4332', '#40916c'];
    const mk = ['#52b788', '#40916c', '#74c69d'];
    const lk = ['#95d5b2', '#74c69d', '#b7e4c7'];
    const tr = ['#6b4226', '#7b5034', '#5d3a1a'];
    renderObjects.push({
      key: `tree-${i}`,
      depth: t.gx + t.gy,
      render: () => (
        <g>
          <ellipse cx={tx} cy={ty + 4} rx={14} ry={5} fill="rgba(0,0,0,0.18)" />
          <rect x={tx - 4} y={ty - 22} width={8} height={24} fill={tr[t.v % 3]} rx={2} />
          <ellipse cx={tx} cy={ty - 24} rx={19} ry={12} fill={dk[t.v % 3]} />
          <ellipse cx={tx - 5} cy={ty - 32} rx={14} ry={9} fill={mk[t.v % 3]} />
          <ellipse cx={tx + 5} cy={ty - 38} rx={13} ry={8} fill={mk[t.v % 3]} />
          <ellipse cx={tx} cy={ty - 44} rx={11} ry={7} fill={lk[t.v % 3]} />
          <ellipse cx={tx} cy={ty - 51} rx={7} ry={5} fill={lk[t.v % 3]} />
          <ellipse cx={tx - 4} cy={ty - 46} rx={2.5} ry={1.5} fill="rgba(255,255,255,0.28)" />
        </g>
      )
    });
  });

  // Add Cottage (Shelter Bed)
  if (hasShelter) {
    const { x, y } = sA;
    renderObjects.push({
      key: 'structure-cottage',
      depth: cottagePos.gx + cottagePos.gy,
      render: () => (
        <g>
          {/* Transparent-blended generated 3d asset */}
          <image
            href="/images/tycoon/cottage.png?v=4"
            x={x - 45}
            y={y - 65}
            width={90}
            height={90}
          />

          {/* Label Badge */}
          <g transform={`translate(${x + 14}, ${y - 45})`}>
            <rect x={-14} y={-8} width={28} height={12} rx={4} fill="#059669" />
            <text x={0} y={0} fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">Lvl {getLevel('shelter_bed')}</text>
          </g>
        </g>
      )
    });
  }
  // Add Feeder
  if (hasFeeder) {
    const { x, y } = fA;
    renderObjects.push({
      key: 'structure-feeder',
      depth: feederPos.gx + feederPos.gy,
      render: () => (
        <g>
          {/* Transparent-blended generated 3d asset */}
          <image
            href="/images/tycoon/feeder.png?v=4"
            x={x - 30}
            y={y - 45}
            width={60}
            height={60}
          />
        </g>
      )
    });
  }

  // Add Castle (Play Area)
  if (hasCastle) {
    const { x, y } = cA;
    renderObjects.push({
      key: 'structure-castle',
      depth: castlePos.gx + castlePos.gy,
      render: () => (
        <g>
          {/* Transparent-blended generated 3d asset */}
          <image
            href="/images/tycoon/castle.png?v=4"
            x={x - 45}
            y={y - 75}
            width={90}
            height={90}
          />

          {/* Label Badge */}
          <g transform={`translate(${x}, ${y - 65})`}>
            <rect x={-32} y={-8} width={64} height={12} rx={4} fill="#7c3aed" />
            <text x={0} y={0} fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">Castle Lv {getLevel('play_area')}</text>
          </g>
        </g>
      )
    });
  }

  // Add First Aid Box
  if (hasFirstAid) {
    const { x, y } = faA;
    renderObjects.push({
      key: 'structure-firstaid',
      depth: firstAidPos.gx + firstAidPos.gy,
      render: () => (
        <g>
          {/* Red pulse ring under the floating medical kit */}
          <ellipse
            cx={x}
            cy={y + 6}
            rx={14 + Math.sin(tick * 0.12) * 2}
            ry={5.5 + Math.sin(tick * 0.12) * 0.8}
            fill="rgba(239, 68, 68, 0.22)"
          />

          {/* Floating Vet Kit Image */}
          <image
            href="/images/tycoon/firstaid.png?v=4"
            x={x - 25}
            y={y - 35 + faBob}
            width={50}
            height={50}
          />
        </g>
      )
    });
  }
  // Add sleeping cat at plaza center (2.1, 1.9)
  renderObjects.push({
    key: 'cat-sleeping',
    depth: catSleepPos.gx + catSleepPos.gy,
    render: () => (
      <g style={{ transform: `scale(${bs})`, transformOrigin: `${csX}px ${csY}px` }}>
        {/* Animated sleeping cat image */}
        <image
          href="/images/tycoon/cat_black.png?v=4"
          x={csX - 22}
          y={csY - 22}
          width={44}
          height={44}
        />
      </g>
    )
  });

  // Add playful orange cat walking on path (left branch, safely away from the castle and properly grounded)
  renderObjects.push({
    key: 'cat-playful',
    depth: catPlayPos.gx + catPlayPos.gy,
    render: () => (
      <g style={{ transform: `translate(${wb}px, ${walkBob}px) rotate(${walkRot}deg)`, transformOrigin: `${cpX}px ${cpY}px` }}>
        {/* Animated orange cat image */}
        <image
          href="/images/tycoon/cat_orange.png?v=4"
          x={cpX - 20}
          y={cpY - 22}
          width={40}
          height={40}
        />
      </g>
    )
  });

  // Sort objects by depth ascending
  renderObjects.sort((a, b) => a.depth - b.depth);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* SCENE PANEL */}
      <div className="lg:col-span-6 bg-white rounded-2xl overflow-hidden border border-[var(--bg-border)] flex flex-col" style={{boxShadow:'0 8px 40px rgba(0,0,0,0.12)'}}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-amber-50 border-b border-[var(--bg-border)]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white text-lg" style={{fontVariationSettings:"'FILL' 1"}}>castle</span>
            </div>
            <div>
              <div className="font-display text-sm font-black leading-none" style={{color:'var(--empire-cream)'}}>{sanctuary.name}</div>
              <div className="text-[9px] font-bold mt-0.5 uppercase tracking-wider opacity-50" style={{color:'var(--empire-cream)'}}>{built} structure{built!==1?'s':''} built</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isNight?<span className="material-symbols-outlined text-indigo-400 animate-pulse">dark_mode</span>:<span className="material-symbols-outlined text-amber-400 animate-spin" style={{animationDuration:'20s'}}>light_mode</span>}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">Lvl {sanctuary.level}</span>
          </div>
        </div>

        {claimSuccess && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>{claimSuccess}
          </div>
        )}

        {/* ISOMETRIC SCENE */}
        <div className="relative overflow-hidden" style={{background:isNight?'linear-gradient(180deg,#0f172a 0%,#1e3a2f 100%)':'linear-gradient(180deg,#87ceeb 0%,#c8e6c9 40%,#5a9e6e 100%)',minHeight:340}}>
          <svg viewBox="0 0 400 320" className="w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gGrass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isNight?'#5a8a6a':'#7ec99c'}/>
                <stop offset="100%" stopColor={isNight?'#3d6349':'#5daa7c'}/>
              </linearGradient>
              <linearGradient id="gPath"><stop offset="0%" stopColor="#e8d5b8"/><stop offset="100%" stopColor="#d4bc98"/></linearGradient>
              <linearGradient id="gSideL" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5c3e2b"/><stop offset="100%" stopColor="#3d2915"/></linearGradient>
              <linearGradient id="gSideR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a3121"/><stop offset="100%" stopColor="#2d1c0a"/></linearGradient>
              <filter id="gGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            {/* Stars */}
            {isNight&&[[50,20],[120,10],[250,15],[320,25],[380,8],[80,40],[200,5],[340,45],[160,30],[300,12]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r={i%3===0?1.5:1} fill="white" opacity={0.6+(i%4)*0.1}/>
            ))}
            {/* Sun/Moon */}
            {isNight?<circle cx={340} cy={30} r={18} fill="#fef3c7" filter="url(#gGlow)" opacity={0.9}/>:<circle cx={340} cy={28} r={20} fill="#fde68a" filter="url(#gGlow)" opacity={0.95}/>}
            {/* Clouds */}
            {!isNight&&<g opacity={0.85}><ellipse cx={80} cy={35} rx={30} ry={10} fill="white"/><ellipse cx={65} cy={32} rx={18} ry={12} fill="white"/><ellipse cx={95} cy={33} rx={20} ry={11} fill="white"/><ellipse cx={280} cy={25} rx={25} ry={9} fill="white"/><ellipse cx={268} cy={22} rx={15} ry={10} fill="white"/></g>}
            
            {/* Island base */}
            <polygon points="200,260 40,170 40,181 200,271" fill="url(#gSideL)"/>
            <polygon points="200,260 360,170 360,181 200,271" fill="url(#gSideR)"/>
            <polygon points="40,181 200,271 360,181 360,182 200,272 40,182" fill="#2d1c0a"/>
            <polygon points="200,80 360,170 200,260 40,170" fill="url(#gGrass)" stroke="#4a9068" strokeWidth="1.5"/>

            {/* Render Sorted Elements */}
            {renderObjects.map(obj => (
              <React.Fragment key={obj.key}>
                {obj.render()}
              </React.Fragment>
            ))}

            {isNight&&<polygon points="200,80 360,170 200,260 40,170" fill="rgba(15,23,42,0.12)" style={{pointerEvents:'none'}}/>}

            {/* PARTICLES */}
            {particles.map(p=>{
              const a=p.life/p.maxLife;
              
              // Text particles (snoring Z's, plus signs, XP points)
              if (p.text) {
                return (
                  <text
                    key={p.id}
                    x={p.x}
                    y={p.y}
                    fill={p.color}
                    fontSize={p.size}
                    fontWeight="black"
                    opacity={a}
                    style={{ fontFamily: 'sans-serif', userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {p.text}
                  </text>
                );
              }
              
              // Chimney smoke particles (gray circles that expand as they rise)
              if (p.color === '#d1d5db') {
                return (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={p.size * (1 + (1 - a) * 0.6)}
                    fill={p.color}
                    opacity={a * 0.4}
                    style={{ pointerEvents: 'none' }}
                  />
                );
              }
              
              // Standard XP sparkle/burst particles
              return (
                <rect
                  key={p.id}
                  x={p.x}
                  y={p.y}
                  width={p.size}
                  height={p.size}
                  fill={p.color}
                  opacity={a}
                  rx={1}
                  transform={`rotate(${p.life*8},${p.x+p.size/2},${p.y+p.size/2})`}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
          </svg>

          {/* Claim FAB */}
          <button onClick={handleClaim} disabled={accumulatedPoints<=0} className="absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer border-2 border-white/30 disabled:opacity-50 disabled:pointer-events-none z-20" style={{background:'linear-gradient(135deg,#92400e,#b45309)'}}>
            <span className="material-symbols-outlined text-white text-2xl">add</span>
          </button>
          {/* HUDs */}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/10 z-20">
            <span className="material-symbols-outlined text-amber-400 text-sm animate-spin" style={{animationDuration:'6s'}}>hourglass_empty</span>
            <span className="text-xs font-black tabular-nums text-amber-300">{accumulatedFloat.toFixed(2)} XP</span>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 z-20">
            <span className="material-symbols-outlined text-pink-400 text-sm" style={{fontVariationSettings:"'FILL' 1"}}>favorite</span>
            <span className="text-[10px] font-bold text-pink-300">Happiness {Math.min(60+built*8,100)}%</span>
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 z-20">
            <span className="material-symbols-outlined text-cyan-400 text-sm" style={{fontVariationSettings:"'FILL' 1"}}>self_improvement</span>
            <span className="text-[10px] font-bold text-cyan-300">Karma {userPoints.toLocaleString()}</span>
          </div>
        </div>

        {/* Stats + Claim */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 bg-[var(--bg-surface)] border-t border-[var(--bg-border)]/30">
          <div className="grid grid-cols-3 gap-3">
            {[['Multiplier',`x${sanctuary.point_multiplier}`,'var(--life-teal)'],['XP/hr',`+${sanctuary.idle_points_rate}`,'var(--empire-gold)'],['Built',`${built}/4`,'#a855f7']].map(([l,v,c])=>(
              <div key={l as string} className="bg-[var(--bg-elevated)] rounded-xl p-3 flex flex-col items-center gap-0.5 border border-[var(--bg-border)]/20">
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-40" style={{color:'var(--empire-cream)'}}>{l}</span>
                <span className="font-display text-base font-black" style={{color:c as string}}>{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-amber-50 rounded-xl p-4 border border-[var(--bg-border)]/30 flex sm:flex-row flex-col items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{color:'var(--empire-cream)'}}>Stray Blessings Accumulating</div>
              <div className="font-display text-2xl font-black tabular-nums" style={{color:'var(--empire-gold)'}}>{accumulatedFloat.toFixed(3)} XP</div>
              <div className="text-[9px] opacity-40 font-medium" style={{color:'var(--empire-cream)'}}>Capped at 24 hours offline</div>
            </div>
            <button onClick={handleClaim} disabled={isClaiming||accumulatedPoints<=0} className="flex-shrink-0 px-5 py-3 rounded-xl font-display text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white" style={{background:accumulatedPoints>0?'linear-gradient(135deg,#059669,#10b981)':'#94a3b8'}}>
              <span className="material-symbols-outlined text-sm">volunteer_activism</span>
              {isClaiming?'Claiming...':`Claim ${accumulatedPoints} XP`}
            </button>
          </div>
          {error&&<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"><span className="material-symbols-outlined text-sm">info</span>{error}</div>}
        </div>
      </div>
      {/* STORE PANEL */}
      <div className="lg:col-span-6 bg-white rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] flex flex-col gap-6" style={{boxShadow:'0 8px 40px rgba(0,0,0,0.12)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{background:'linear-gradient(135deg,var(--life-teal),#059669)'}}>
              <span className="material-symbols-outlined text-white text-lg" style={{fontVariationSettings:"'FILL' 1"}}>store</span>
            </div>
            <div>
              <h3 className="font-display text-sm font-black" style={{color:'var(--empire-cream)'}}>Sanctuary Store</h3>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-40" style={{color:'var(--empire-cream)'}}>Unlock &amp; Upgrade</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{borderColor:'rgba(217,119,6,0.2)'}}>
            <span className="material-symbols-outlined text-sm" style={{color:'var(--empire-gold)',fontVariationSettings:"'FILL' 1"}}>stars</span>
            <span className="font-display text-sm font-black" style={{color:'var(--empire-gold)'}}>{userPoints.toLocaleString()} pts</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {UPGRADES.map(cfg=>{
            const lv=getLevel(cfg.type), cost=cfg.baseCost*(lv+1), busy=isUpgrading===cfg.type, afford=userPoints>=cost, unlocked=lv>0;
            return (
              <div key={cfg.type} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md ${unlocked?'border-emerald-200/60 bg-gradient-to-r from-emerald-50/50 to-transparent':'border-[var(--bg-border)]/40 bg-[var(--bg-elevated)]'}`}>
                <div className="flex gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-inner ${unlocked?'text-white border-emerald-200/40':'text-emerald-600 bg-[var(--bg-elevated)] border-[var(--bg-border)]/30'}`} style={unlocked?{background:'linear-gradient(135deg,var(--life-teal),#059669)'}:{}}>
                    <span className="material-symbols-outlined text-lg" style={{fontVariationSettings:"'FILL' 1"}}>{cfg.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-body text-xs font-bold truncate" style={{color:'var(--empire-cream)'}}>{cfg.name}</h4>
                      {unlocked?<span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">Lvl {lv}</span>:<span className="bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200">Locked</span>}
                    </div>
                    <p className="font-body text-[10px] mt-0.5 leading-relaxed opacity-50" style={{color:'var(--empire-cream)'}}>{cfg.desc}</p>
                    {unlocked&&<div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden w-24"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all" style={{width:`${Math.min(lv*20,100)}%`}}/></div>}
                  </div>
                </div>
                <button disabled={busy||!afford} onClick={()=>handleUpgrade(cfg.type as any,cost)} className={`px-4 py-2.5 rounded-xl font-display text-[10px] font-extrabold tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 hover:scale-105 active:scale-95 disabled:scale-100 disabled:pointer-events-none ${afford?'text-white shadow-md hover:shadow-lg':'bg-slate-100 text-slate-400 border border-slate-200 opacity-60'}`} style={afford?{background:'linear-gradient(135deg,var(--empire-gold),#f97316)'}:{}}>
                  <span className="material-symbols-outlined text-xs">shopping_cart</span>
                  {busy?'Buying...':unlocked?`Upgrade (${cost})`:`Unlock (${cost})`}
                </button>
              </div>
            );
          })}
        </div>
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl p-4 border border-[var(--bg-border)]/30 flex flex-col gap-2.5">
          <div className="text-[10px] font-black uppercase tracking-wider opacity-50 flex items-center gap-1.5" style={{color:'var(--empire-cream)'}}>
            <span className="material-symbols-outlined text-xs" style={{color:'var(--empire-gold)'}}>trending_up</span>Income Breakdown
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              {c:'bg-emerald-400',l:'Base Rate',v:`+${Math.max(1,sanctuary.idle_points_rate-built*2)} XP/hr`},
              {c:'bg-amber-400',l:'Structures',v:`+${built*2} XP/hr`},
              {c:'bg-purple-400',l:'Multiplier',v:`x${sanctuary.point_multiplier}`},
              {c:'bg-pink-400',l:'24h Max',v:`${(sanctuary.idle_points_rate*Number(sanctuary.point_multiplier)*24).toFixed(0)} XP`},
            ].map(({c,l,v})=>(
              <div key={l} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${c}`}/>
                <span className="text-[10px] opacity-60 font-medium" style={{color:'var(--empire-cream)'}}>{l}</span>
                <span className="ml-auto text-[10px] font-bold" style={{color:'var(--empire-cream)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
