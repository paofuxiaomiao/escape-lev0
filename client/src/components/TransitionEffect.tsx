import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleSystem from './ParticleSystem';

interface TransitionEffectProps {
  /** Whether the transition is active */
  active: boolean;
  /** The level number being transitioned to */
  levelNumber?: number;
  /** Level name */
  levelName?: string;
  /** Type of transition */
  type?: 'levelUp' | 'correct' | 'wrong' | 'gameStart' | 'gameEnd';
  /** Callback when transition completes */
  onComplete?: () => void;
}

export function TransitionEffect({
  active,
  levelNumber,
  levelName,
  type = 'levelUp',
  onComplete,
}: TransitionEffectProps) {
  const [phase, setPhase] = useState<'idle' | 'flash' | 'particles' | 'text' | 'fadeout'>('idle');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }

    // Sequence: flash → particles → text → fadeout
    setPhase('flash');
    const t1 = setTimeout(() => setPhase('particles'), 150);
    const t2 = setTimeout(() => setPhase('text'), 600);
    const t3 = setTimeout(() => setPhase('fadeout'), 2200);
    const t4 = setTimeout(() => {
      setPhase('idle');
      onComplete?.();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [active]);

  if (!active && phase === 'idle') return null;

  const getColors = () => {
    switch (type) {
      case 'correct': return ['#00FF41', '#00E5FF', '#fff', '#90EE90'];
      case 'wrong': return ['#E53935', '#FF6F61', '#FF0000', '#800000'];
      case 'gameEnd': return ['#FFD600', '#FF6F61', '#E53935', '#00FF41', '#00E5FF', '#fff'];
      default: return ['#E53935', '#00E5FF', '#fff', '#FFD600'];
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'correct': return '判断正确';
      case 'wrong': return '判断错误';
      case 'gameStart': return '进入后室';
      case 'gameEnd': return '成功逃离';
      default: return levelName || `LEVEL ${levelNumber}`;
    }
  };

  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
        >
          {/* Black overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fadeout' ? 0 : 0.92 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black"
          />

          {/* Flash */}
          {phase === 'flash' && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
              style={{
                background: type === 'wrong' 
                  ? 'radial-gradient(circle, rgba(229,57,53,0.8) 0%, transparent 70%)'
                  : type === 'correct'
                  ? 'radial-gradient(circle, rgba(0,255,65,0.6) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 60%)',
              }}
            />
          )}

          {/* Screen tear - 画面撕裂效果 */}
          {(phase === 'flash' || phase === 'particles') && (type === 'wrong' || type === 'levelUp') && (
            <div className="absolute inset-0 pointer-events-none screen-tear">
              <div className="absolute inset-0" style={{
                background: type === 'wrong'
                  ? 'linear-gradient(0deg, transparent 30%, rgba(229,57,53,0.15) 31%, transparent 32%, transparent 65%, rgba(229,57,53,0.1) 66%, transparent 67%)'
                  : 'linear-gradient(0deg, transparent 25%, rgba(0,229,255,0.1) 26%, transparent 27%, transparent 55%, rgba(255,255,255,0.08) 56%, transparent 57%)',
              }} />
            </div>
          )}

          {/* 扫描线加速 - 快速扫描效果 */}
          {(phase === 'particles' || phase === 'text') && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 0.6, repeat: 3, ease: 'linear' }}
                className="absolute left-0 right-0 h-[3px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${type === 'wrong' ? 'rgba(229,57,53,0.5)' : 'rgba(0,229,255,0.4)'}, transparent)`,
                  boxShadow: `0 0 10px ${type === 'wrong' ? 'rgba(229,57,53,0.3)' : 'rgba(0,229,255,0.2)'}`,
                }}
              />
              <motion.div
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 0.45, repeat: 4, ease: 'linear', delay: 0.15 }}
                className="absolute left-0 right-0 h-[1px] opacity-50"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                }}
              />
            </div>
          )}

          {/* Data streams - vertical energy lines */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="data-stream"
                style={{
                  left: `${8 + i * 9}%`,
                  animationDuration: `${0.5 + Math.random() * 0.8}s`,
                  animationDelay: `${Math.random() * 0.3}s`,
                  opacity: 0.12 + Math.random() * 0.25,
                  width: `${1 + Math.random() * 2}px`,
                  background: `linear-gradient(to bottom, transparent, ${getColors()[i % getColors().length]}, transparent)`,
                }}
              />
            ))}
          </div>

          {/* Horizontal glitch bars */}
          {(phase === 'flash' || phase === 'particles') && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0, opacity: 0.8 }}
                  animate={{ scaleX: [0, 1, 0], x: ['-100%', '0%', '100%'] }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute h-[2px] w-full"
                  style={{
                    top: `${20 + i * 15}%`,
                    background: `linear-gradient(90deg, transparent, ${getColors()[i % getColors().length]}, transparent)`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Particles */}
          <ParticleSystem
            active={phase === 'particles' || phase === 'text'}
            mode={type === 'wrong' ? 'rain' : 'burst'}
            count={type === 'gameEnd' ? 100 : 50}
            colors={getColors()}
            duration={1500}
          />

          {/* Center text */}
          {(phase === 'text' || phase === 'fadeout') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'fadeout' ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 text-center"
            >
              {/* Level number - big impact */}
              {levelNumber !== undefined && type === 'levelUp' && (
                <motion.div
                  initial={{ scale: 5, opacity: 0, filter: 'blur(20px)' }}
                  animate={{ scale: 1, opacity: 0.15, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="font-impact text-[200px] md:text-[300px] text-white leading-none select-none">
                    {levelNumber}
                  </span>
                </motion.div>
              )}

              {/* Main text */}
              <motion.h1
                initial={{ scale: 3, opacity: 0, filter: 'blur(15px)', rotate: -3 }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                className="font-display font-black text-3xl md:text-5xl tracking-wider chromatic-text"
                style={{
                  color: type === 'wrong' ? '#E53935' : type === 'correct' ? '#00FF41' : '#fff',
                }}
              >
                {getMessage()}
              </motion.h1>

              {/* Subtitle */}
              {type === 'levelUp' && levelName && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="font-mono text-sm text-gray-400 mt-4 tracking-widest uppercase"
                >
                  {levelName}
                </motion.p>
              )}

              {/* Status indicator */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '200px' }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-[1px] mx-auto mt-6"
                style={{
                  background: `linear-gradient(90deg, transparent, ${type === 'wrong' ? '#E53935' : type === 'correct' ? '#00FF41' : '#00E5FF'}, transparent)`,
                }}
              />
            </motion.div>
          )}

          {/* Corner decorations */}
          <div className="absolute top-6 left-6 font-mono text-[9px] text-gray-600 z-10">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              TRANSITION.PROTOCOL
            </motion.p>
          </div>
          <div className="absolute bottom-6 right-6 font-mono text-[9px] text-gray-600 z-10">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              LEVEL_{levelNumber || 0}_INIT
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TransitionEffect;
