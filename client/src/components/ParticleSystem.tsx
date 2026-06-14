import { useEffect, useState, useCallback, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  tx?: number;
  ty?: number;
  duration: number;
  delay: number;
  drift?: number;
  type: 'burst' | 'float' | 'spark';
}

interface ParticleSystemProps {
  /** Whether the particle system is active */
  active: boolean;
  /** Type of particle effect */
  mode: 'burst' | 'float' | 'rain' | 'shockwave';
  /** Number of particles */
  count?: number;
  /** Color palette for particles */
  colors?: string[];
  /** Center position for burst (percentage) */
  origin?: { x: number; y: number };
  /** Duration of the entire effect in ms */
  duration?: number;
  /** Callback when effect completes */
  onComplete?: () => void;
}

const DEFAULT_COLORS = ['#E53935', '#FF6F61', '#00FF41', '#00E5FF', '#FFD600', '#fff'];

export function ParticleSystem({
  active,
  mode,
  count = 60,
  colors = DEFAULT_COLORS,
  origin = { x: 50, y: 50 },
  duration = 1200,
  onComplete,
}: ParticleSystemProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shockwaves, setShockwaves] = useState<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const generateBurstParticles = useCallback((): Particle[] => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const distance = 100 + Math.random() * 400;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      newParticles.push({
        id: i,
        x: origin.x,
        y: origin.y,
        size: 2 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx,
        ty,
        duration: 0.5 + Math.random() * 0.6,
        delay: Math.random() * 0.15,
        type: Math.random() > 0.7 ? 'spark' : 'burst',
      });
    }
    return newParticles;
  }, [count, colors, origin]);

  const generateFloatParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: 100 + Math.random() * 20,
        size: 1 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 2,
        drift: (Math.random() - 0.5) * 60,
        type: 'float',
      });
    }
    return newParticles;
  }, [count, colors]);

  const generateRainParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx: (Math.random() - 0.5) * 30,
        ty: 120 + Math.random() * 30,
        duration: 0.8 + Math.random() * 1.2,
        delay: Math.random() * 1.5,
        type: 'burst',
      });
    }
    return newParticles;
  }, [count, colors]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      setShockwaves([]);
      return;
    }

    switch (mode) {
      case 'burst':
        setParticles(generateBurstParticles());
        setShockwaves([1, 2, 3]);
        break;
      case 'float':
        setParticles(generateFloatParticles());
        break;
      case 'rain':
        setParticles(generateRainParticles());
        break;
      case 'shockwave':
        setShockwaves([1, 2, 3, 4]);
        setParticles(generateBurstParticles().slice(0, Math.floor(count / 3)));
        break;
    }

    timeoutRef.current = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active, mode]);

  if (!active && particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {/* Shockwave rings */}
      {shockwaves.map((wave, i) => (
        <div
          key={`wave-${wave}`}
          className="shockwave"
          style={{
            left: `${origin.x}%`,
            top: `${origin.y}%`,
            width: '100px',
            height: '100px',
            marginLeft: '-50px',
            marginTop: '-50px',
            animationDelay: `${i * 0.12}s`,
            borderColor: i % 2 === 0 ? 'var(--lev0-red)' : 'var(--lev0-cyan)',
          }}
        />
      ))}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`particle ${p.type === 'float' ? 'particle-float' : 'particle-burst'}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: p.type === 'spark' ? `${p.size * 3}px` : `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.type === 'spark' ? '1px' : '50%',
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            '--tx': `${p.tx || 0}px`,
            '--ty': `${p.ty || 0}px`,
            '--duration': `${p.duration}s`,
            '--delay': `${p.delay}s`,
            '--drift': `${p.drift || 0}px`,
            transform: p.type === 'spark' 
              ? `rotate(${Math.atan2(p.ty || 0, p.tx || 0)}rad)` 
              : undefined,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default ParticleSystem;
