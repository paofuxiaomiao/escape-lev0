import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 路程地图页面 - 参考"关系映射视图"风格
 * 暗色底 + 黄/绿色网格线 + 虚线路径 + 实景缩略图
 * 显示5个层级的路线图，玩家当前进度高亮
 */

interface LevelNode {
  id: number;
  key: string;
  name: string;
  subtitle: string;
  image: string;
  x: number; // percentage position
  y: number;
}

const LEVELS: LevelNode[] = [
  {
    id: 5,
    key: 'door',
    name: '进门',
    subtitle: 'ENTRY POINT',
    image: '/manus-storage/lev1_indoor_5391e6c6.png',
    x: 12,
    y: 50,
  },
  {
    id: 4,
    key: 'elevator',
    name: '电梯',
    subtitle: 'ELEVATOR',
    image: '/manus-storage/lev4_elevator_089a80c3.webp',
    x: 30,
    y: 30,
  },
  {
    id: 3,
    key: 'checkin',
    name: '签到',
    subtitle: 'CHECK IN',
    image: '/manus-storage/lev3_checkin_25badea1.png',
    x: 50,
    y: 60,
  },
  {
    id: 2,
    key: 'graffiti',
    name: '涂鸦',
    subtitle: 'GRAFFITI',
    image: '/manus-storage/lev2_graffiti_137ac728.webp',
    x: 70,
    y: 35,
  },
  {
    id: 1,
    key: 'indoor',
    name: '室内开发',
    subtitle: 'DEV ROOM',
    image: '/manus-storage/lev5_door_3551cd73.png',
    x: 88,
    y: 55,
  },
];

export default function LevelMap() {
  const [, navigate] = useLocation();
  const [currentLevel, setCurrentLevel] = useState(5);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  useEffect(() => {
    // Read progress from localStorage
    const saved = localStorage.getItem('escape_lev0_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      // Support both old format {currentLevel} and new format {level}
      const level = progress.level ?? progress.currentLevel ?? 5;
      setCurrentLevel(level);
    }
    // Animate map entrance
    setTimeout(() => setShowMap(true), 300);
  }, []);

  const handleLevelClick = useCallback((levelId: number) => {
    if (levelId < currentLevel) return; // Can't access locked levels (IDs decrease as you progress)
    setSelectedLevel(levelId);
    // Store selected level and navigate to game
    localStorage.setItem('escape_lev0_selected', JSON.stringify({ level: levelId }));
    setTimeout(() => {
      navigate('/game');
    }, 800);
  }, [currentLevel, navigate]);

  const getLevelStatus = (levelId: number) => {
    // Level IDs go from 5 (first) to 1 (last)
    // currentLevel starts at 5 and decreases as player progresses
    if (levelId < currentLevel) return 'locked';
    if (levelId === currentLevel) return 'current';
    return 'completed';
  };

  return (
    <div className="fixed inset-0 bg-[#0a0f0a] overflow-hidden">
      {/* Grid background - 黄绿色网格 */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(180, 180, 50, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(180, 180, 50, 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Larger grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(180, 180, 50, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(180, 180, 50, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '200px 200px',
      }} />

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="absolute top-0 left-0 right-0 z-20 p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-tech text-[10px] text-yellow-600/70 tracking-[0.3em] uppercase">Level 0 Model</p>
            <h1 className="font-cn-title text-3xl md:text-4xl text-yellow-100/90 mt-1">
              路程映射视图
            </h1>
          </div>
          <div className="text-right">
            <p className="font-tech text-[10px] text-[#E53935] tracking-wider">
              T+00:{String(Math.floor(Date.now() / 1000) % 60).padStart(2, '0')}
            </p>
            <p className="font-tech text-[9px] text-yellow-600/50 mt-1">
              sample stream
            </p>
          </div>
        </div>
      </motion.div>

      {/* Distance indicator */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute top-20 right-6 z-20 bg-[#1a1f1a]/80 border border-yellow-900/30 px-4 py-2 rounded"
      >
        <p className="font-tech text-[9px] text-yellow-600/60">距出口</p>
        <p className="font-impact text-2xl text-yellow-100/90">
          {((currentLevel - 1) * 22.8 + 0.6).toFixed(1)} m
        </p>
      </motion.div>

      {/* SVG Path connections */}
      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {showMap && LEVELS.slice(0, -1).map((level, i) => {
          const next = LEVELS[i + 1];
          const status = getLevelStatus(level.id);
          const nextStatus = getLevelStatus(next.id);
          const isActive = status === 'completed' || status === 'current';
          
          // Calculate control points for curved path
          const x1 = level.x;
          const y1 = level.y;
          const x2 = next.x;
          const y2 = next.y;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2 - 8;

          return (
            <motion.path
              key={`path-${i}`}
              d={`M ${x1}% ${y1}% Q ${cx}% ${cy}% ${x2}% ${y2}%`}
              fill="none"
              stroke={isActive ? 'rgba(180, 220, 80, 0.6)' : 'rgba(180, 180, 50, 0.2)'}
              strokeWidth={isActive ? 2.5 : 1.5}
              strokeDasharray={isActive ? "none" : "8 6"}
              filter={isActive ? "url(#glow)" : undefined}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5 + i * 0.3, duration: 1, ease: "easeInOut" }}
            />
          );
        })}
      </svg>

      {/* Level nodes */}
      <div className="absolute inset-0 z-20">
        <AnimatePresence>
          {showMap && LEVELS.map((level, i) => {
            const status = getLevelStatus(level.id);
            const isHovered = hoveredLevel === level.id;
            const isSelected = selectedLevel === level.id;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  scale: isSelected ? 1.3 : isHovered ? 1.1 : 1,
                }}
                transition={{ delay: 0.3 + i * 0.2, duration: 0.5, type: 'spring' }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${level.x}%`, top: `${level.y}%` }}
                onMouseEnter={() => setHoveredLevel(level.id)}
                onMouseLeave={() => setHoveredLevel(null)}
                onClick={() => handleLevelClick(level.id)}
              >
                {/* Node container */}
                <div className={`
                  relative cursor-pointer transition-all duration-300
                  ${status === 'locked' ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                  ${status === 'current' ? 'ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-[#0a0f0a]' : ''}
                `}>
                  {/* Image thumbnail */}
                  <div className={`
                    w-28 h-20 md:w-36 md:h-24 rounded overflow-hidden border-2 transition-all duration-300
                    ${status === 'current' ? 'border-yellow-400/70' : status === 'completed' ? 'border-green-500/50' : 'border-yellow-900/30'}
                    ${isHovered && status !== 'locked' ? 'border-yellow-300/80 shadow-[0_0_20px_rgba(180,220,80,0.3)]' : ''}
                  `}>
                    <img 
                      src={level.image} 
                      alt={level.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay */}
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                      status === 'current' ? 'bg-yellow-900/20' : 
                      status === 'completed' ? 'bg-green-900/30' : 'bg-black/50'
                    }`} />
                  </div>

                  {/* Level indicator circle */}
                  {status === 'current' && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.4, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full border-2 border-yellow-400"
                    />
                  )}

                  {/* Completed checkmark */}
                  {status === 'completed' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Label */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                    <p className={`font-cn-title text-base md:text-lg ${
                      status === 'current' ? 'text-yellow-300' : 
                      status === 'completed' ? 'text-green-400/80' : 'text-yellow-900/50'
                    }`}>
                      {level.name}
                    </p>
                    <p className="font-tech text-[8px] text-yellow-700/40 mt-0.5 tracking-wider">
                      LEV{level.id} · {level.subtitle}
                    </p>
                  </div>

                  {/* Level number badge */}
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-tech ${
                    status === 'current' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                    status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    'bg-yellow-900/20 text-yellow-900/50 border border-yellow-900/20'
                  }`}>
                    L{level.id}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Player position indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute z-30 pointer-events-none"
        style={{ 
          left: `${LEVELS.find(l => l.id === currentLevel)?.x || 12}%`, 
          top: `${(LEVELS.find(l => l.id === currentLevel)?.y || 50) + 18}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="flex items-center gap-2 bg-[#1a1f1a]/90 border border-yellow-500/40 px-3 py-1.5 rounded">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span className="font-tech text-[10px] text-yellow-300">探索者 A</span>
        </div>
      </motion.div>

      {/* Bottom status bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-6"
      >
        <div className="flex items-end justify-between">
          <div className="bg-[#1a1f1a]/80 border border-yellow-900/30 px-4 py-2 rounded">
            <p className="font-tech text-[9px] text-yellow-600/60">探索者所在区域</p>
            <p className="font-cn-title text-lg text-yellow-200">
              {LEVELS.find(l => l.id === currentLevel)?.name || '未知'}
            </p>
          </div>
          
          <button
            onClick={() => handleLevelClick(currentLevel)}
            className="group flex items-center gap-3 bg-[#1a1f1a]/80 border border-yellow-500/40 
              hover:border-yellow-400/80 hover:bg-yellow-500/10 px-6 py-3 rounded
              transition-all duration-300 active:scale-[0.97]"
          >
            <span className="font-cn-title text-base text-yellow-300 group-hover:text-yellow-200">
              进入当前区域
            </span>
            <svg className="w-4 h-4 text-yellow-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Transition overlay when selecting a level */}
      <AnimatePresence>
        {selectedLevel !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-center"
            >
              <p className="font-tech text-[10px] text-yellow-600/60 tracking-[0.5em] uppercase mb-2">
                Entering Zone
              </p>
              <h2 className="font-cn-title text-4xl md:text-6xl text-yellow-300">
                {LEVELS.find(l => l.id === selectedLevel)?.name}
              </h2>
              <p className="font-impact text-6xl md:text-8xl text-yellow-500/20 mt-2">
                LEV{selectedLevel}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner decorations */}
      <div className="fixed top-4 left-4 z-10 font-tech text-[8px] text-yellow-800/30">
        <p>SYS.BACKROOMS.v0.1</p>
        <p className="mt-0.5">PROTOCOL: LIMINAL_SPACE</p>
      </div>
      <div className="fixed bottom-4 right-4 z-10 font-tech text-[8px] text-yellow-800/30 text-right">
        <p>ESCAPE_LEV0</p>
        <p className="mt-0.5">lev0.cn</p>
      </div>
    </div>
  );
}
