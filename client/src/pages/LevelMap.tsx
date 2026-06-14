import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 路程地图页面 - 一面破旧墙壁，上面有几个洞
 * 每个洞透出对应层级的场景图片
 * 整个页面就是一面墙，不需要滚动
 */

interface LevelNode {
  id: number;
  key: string;
  name: string;
  subtitle: string;
  image: string;
  // 洞口在墙上的位置和大小 (百分比)
  hole: {
    left: number;
    top: number;
    width: number;
    height: number;
    rotate?: number;
    // SVG clip-path 用不规则多边形模拟碎裂洞口
    clipPath: string;
  };
}

// 不规则碎裂洞口的clip-path（模拟墙壁被砸出的洞）
const LEVELS: LevelNode[] = [
  {
    id: 5,
    key: 'door',
    name: '进门',
    subtitle: 'ENTRY',
    image: '/manus-storage/lev1_indoor_5391e6c6.png',
    hole: {
      left: 4,
      top: 12,
      width: 22,
      height: 34,
      rotate: -1,
      clipPath: 'polygon(12% 3%, 25% 0%, 42% 2%, 58% 0%, 72% 4%, 85% 1%, 95% 8%, 98% 18%, 100% 32%, 97% 48%, 100% 62%, 98% 78%, 95% 88%, 100% 95%, 92% 100%, 78% 97%, 62% 100%, 48% 98%, 32% 100%, 18% 97%, 8% 100%, 2% 92%, 0% 78%, 3% 62%, 0% 48%, 2% 32%, 0% 18%, 3% 8%)',
    },
  },
  {
    id: 4,
    key: 'elevator',
    name: '电梯',
    subtitle: 'ELEVATOR',
    image: '/manus-storage/lev4_elevator_089a80c3.webp',
    hole: {
      left: 28,
      top: 8,
      width: 18,
      height: 30,
      rotate: 1,
      clipPath: 'polygon(15% 0%, 30% 3%, 48% 0%, 65% 2%, 82% 0%, 95% 5%, 100% 15%, 97% 30%, 100% 45%, 98% 60%, 100% 75%, 97% 88%, 100% 96%, 88% 100%, 72% 97%, 55% 100%, 38% 98%, 22% 100%, 8% 97%, 0% 90%, 3% 75%, 0% 58%, 2% 42%, 0% 28%, 3% 12%)',
    },
  },
  {
    id: 3,
    key: 'checkin',
    name: '签到',
    subtitle: 'CHECK IN',
    image: '/manus-storage/lev3_checkin_25badea1.png',
    hole: {
      left: 48,
      top: 15,
      width: 20,
      height: 32,
      rotate: 0,
      clipPath: 'polygon(8% 2%, 22% 0%, 38% 4%, 55% 0%, 70% 3%, 88% 0%, 97% 7%, 100% 20%, 96% 35%, 100% 50%, 97% 65%, 100% 80%, 96% 92%, 100% 98%, 85% 100%, 68% 96%, 52% 100%, 35% 97%, 20% 100%, 5% 96%, 0% 88%, 4% 72%, 0% 55%, 3% 40%, 0% 25%, 4% 10%)',
    },
  },
  {
    id: 2,
    key: 'graffiti',
    name: '涂鸦',
    subtitle: 'GRAFFITI',
    image: '/manus-storage/lev2_graffiti_new_6ee0a04f.png',
    hole: {
      left: 10,
      top: 54,
      width: 26,
      height: 36,
      rotate: 1,
      clipPath: 'polygon(10% 0%, 28% 3%, 45% 0%, 62% 4%, 80% 0%, 93% 5%, 100% 12%, 96% 28%, 100% 42%, 97% 58%, 100% 72%, 96% 85%, 100% 95%, 90% 100%, 75% 96%, 58% 100%, 42% 97%, 25% 100%, 10% 96%, 0% 90%, 4% 75%, 0% 60%, 3% 45%, 0% 30%, 4% 15%)',
    },
  },
  {
    id: 1,
    key: 'indoor',
    name: '室内开发',
    subtitle: 'DEV ROOM',
    image: '/manus-storage/lev5_door_3551cd73.png',
    hole: {
      left: 40,
      top: 52,
      width: 20,
      height: 38,
      rotate: -1,
      clipPath: 'polygon(5% 4%, 20% 0%, 38% 3%, 55% 0%, 72% 4%, 90% 0%, 98% 8%, 100% 22%, 95% 38%, 100% 52%, 96% 68%, 100% 82%, 95% 92%, 100% 100%, 82% 96%, 65% 100%, 48% 96%, 30% 100%, 15% 96%, 0% 92%, 4% 78%, 0% 62%, 3% 45%, 0% 30%, 4% 15%)',
    },
  },
  {
    id: 0,
    key: 'final',
    name: '最终挑战',
    subtitle: 'LEV0',
    image: '/manus-storage/bg_welcome_2345c7fc.png',
    hole: {
      left: 66,
      top: 42,
      width: 28,
      height: 46,
      rotate: 0,
      clipPath: 'polygon(6% 2%, 18% 0%, 32% 5%, 48% 0%, 62% 3%, 78% 0%, 92% 4%, 100% 10%, 96% 25%, 100% 38%, 95% 52%, 100% 65%, 96% 78%, 100% 90%, 94% 100%, 78% 95%, 62% 100%, 45% 96%, 30% 100%, 15% 95%, 0% 92%, 5% 78%, 0% 62%, 4% 48%, 0% 32%, 5% 18%)',
    },
  },
];

export default function LevelMap() {
  const [, navigate] = useLocation();
  const [currentLevel, setCurrentLevel] = useState(5);
  const [showMap, setShowMap] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('escape_lev0_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      const level = progress.level ?? progress.currentLevel ?? 5;
      setCurrentLevel(level);
    }
    setTimeout(() => setShowMap(true), 300);
  }, []);

  const handleLevelClick = useCallback((levelId: number) => {
    if (levelId < currentLevel) return;
    setSelectedLevel(levelId);
    localStorage.setItem('escape_lev0_selected', JSON.stringify({ level: levelId }));
    setTimeout(() => {
      navigate('/game');
    }, 800);
  }, [currentLevel, navigate]);

  const getLevelStatus = (levelId: number) => {
    if (currentLevel === -1) return 'completed';
    if (levelId < currentLevel) return 'locked';
    if (levelId === currentLevel) return 'current';
    return 'completed';
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a08] overflow-hidden">
      {/* 墙壁背景 - 铺满整个屏幕 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663760209689/WgMtkexYr4g2QwJyHJRwUN/map_bg_wall-Rsi3uZyaoCXppKpntoe8s3.webp)`,
        }}
      />
      
      {/* 墙壁纹理叠加 - 增加质感 */}
      <div className="absolute inset-0 opacity-30" style={{
        background: `
          radial-gradient(ellipse at 15% 25%, rgba(60,40,20,0.4) 0%, transparent 40%),
          radial-gradient(ellipse at 75% 60%, rgba(40,30,15,0.5) 0%, transparent 35%),
          radial-gradient(ellipse at 50% 80%, rgba(30,20,10,0.3) 0%, transparent 45%)
        `,
      }} />

      {/* 暗角 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />

      {/* 墙壁上的洞口 */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {showMap && LEVELS.map((level, i) => {
            const status = getLevelStatus(level.id);
            const isHovered = hoveredLevel === level.id;
            const isSelected = selectedLevel === level.id;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: isSelected ? 1.05 : 1,
                }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.5, type: 'spring', stiffness: 120 }}
                className="absolute"
                style={{
                  left: `${level.hole.left}%`,
                  top: `${level.hole.top}%`,
                  width: `${level.hole.width}%`,
                  height: `${level.hole.height}%`,
                  transform: `rotate(${level.hole.rotate || 0}deg)`,
                }}
                onMouseEnter={() => setHoveredLevel(level.id)}
                onMouseLeave={() => setHoveredLevel(null)}
                onClick={() => handleLevelClick(level.id)}
              >
                {/* 洞口 - 不规则碎裂形状裁切 */}
                <div 
                  className={`
                    relative w-full h-full overflow-hidden
                    ${status === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  style={{ clipPath: level.hole.clipPath }}
                >
                  {/* 图片 - hover加色差+脉冲拉伸，不改变尺寸避免露出底图 */}
                  <img 
                    src={level.image} 
                    alt={level.name}
                    className={`
                      w-full h-full object-cover transition-all duration-500
                      ${status === 'locked' ? 'grayscale brightness-50 blur-[1px]' : ''}
                      ${isHovered && status !== 'locked' ? 'brightness-125' : ''}
                      ${(isHovered || isSelected) && status !== 'locked' ? 'hole-chromatic hole-breath' : ''}
                    `}
                  />

                  {/* 扫描线叠加层 - hover/selected时显示 */}
                  {(isHovered || isSelected) && status !== 'locked' && (
                    <div className="hole-scanlines" />
                  )}

                  {/* 洞口内阴影 - 模拟墙壁厚度和深度 */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      boxShadow: 'inset 0 0 30px 15px rgba(0,0,0,0.8), inset 0 0 60px 8px rgba(0,0,0,0.5)',
                    }}
                  />

                  {/* 暗色叠加 */}
                  <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                    status === 'locked' ? 'bg-black/40' : 
                    isHovered ? 'bg-black/5' : 'bg-black/15'
                  }`} />

                  {/* 当前层级发光 */}
                  {status === 'current' && (
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 pointer-events-none"
                      style={{ 
                        boxShadow: 'inset 0 0 25px rgba(180,180,50,0.3)',
                      }}
                    />
                  )}

                  {/* 层级标签 - 在洞口底部 */}
                  <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none"
                    style={{ transform: `rotate(${-(level.hole.rotate || 0)}deg)` }}
                  >
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded backdrop-blur-sm ${
                      status === 'current' ? 'bg-yellow-900/60' :
                      status === 'completed' ? 'bg-green-900/60' :
                      'bg-black/60'
                    }`}>
                      {status === 'completed' && (
                        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {status === 'current' && (
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                      )}
                      {status === 'locked' && (
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                      <span className={`font-tech text-[10px] ${
                        status === 'current' ? 'text-yellow-300' :
                        status === 'completed' ? 'text-green-300' :
                        'text-gray-400'
                      }`}>
                        L{level.id} {level.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 洞口外边缘裂缝效果 - 用同样的clip-path但稍大一圈 */}
                {status === 'current' && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-[-4px] pointer-events-none"
                    style={{ 
                      clipPath: level.hole.clipPath,
                      boxShadow: '0 0 20px rgba(180,180,50,0.4), 0 0 40px rgba(180,180,50,0.2)',
                      border: '2px solid rgba(180,180,50,0.4)',
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Header - 简洁 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="absolute top-3 left-4 z-30"
      >
        <p className="font-tech text-[9px] text-yellow-600/50 tracking-[0.3em] uppercase">Escape Route</p>
        <h1 className="font-cn-title text-xl text-yellow-100/70 mt-0.5">路程映射</h1>
      </motion.div>

      {/* 距离指示器 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute top-3 right-4 z-30 bg-black/40 backdrop-blur-sm border border-yellow-900/30 px-3 py-1.5 rounded"
      >
        <p className="font-tech text-[8px] text-yellow-600/50">距出口</p>
        <p className="font-impact text-lg text-yellow-100/80">
          {currentLevel === -1 ? '0.0' : ((currentLevel) * 22.8 + 0.6).toFixed(1)} m
        </p>
      </motion.div>

      {/* 底部操作栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-3 left-0 right-0 z-30 px-4"
      >
        <div className="flex items-center justify-between max-w-lg mx-auto bg-black/50 backdrop-blur-sm border border-yellow-900/30 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="font-tech text-[10px] text-yellow-300/70">
              {LEVELS.find(l => l.id === currentLevel)?.name || '全部完成'}
            </span>
          </div>
          
          <button
            onClick={() => handleLevelClick(currentLevel)}
            className="group flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 
              hover:border-yellow-400/70 hover:bg-yellow-500/20 px-4 py-1.5 rounded
              transition-all duration-300 active:scale-[0.97]"
          >
            <span className="font-tech text-[11px] text-yellow-300 group-hover:text-yellow-200">
              进入
            </span>
            <svg className="w-3.5 h-3.5 text-yellow-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Transition overlay */}
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
    </div>
  );
}
