import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 路程地图页面 - 复古破旧墙壁风格
 * 图片通过"墙洞"效果展示，大尺寸可看清细节
 * 垂直滚动布局，每个层级是墙壁上的一个破洞/窗口
 */

interface LevelNode {
  id: number;
  key: string;
  name: string;
  subtitle: string;
  image: string;
}

const LEVELS: LevelNode[] = [
  {
    id: 5,
    key: 'door',
    name: '进门',
    subtitle: 'ENTRY POINT',
    image: '/manus-storage/lev1_indoor_5391e6c6.png',
  },
  {
    id: 4,
    key: 'elevator',
    name: '电梯',
    subtitle: 'ELEVATOR',
    image: '/manus-storage/lev4_elevator_089a80c3.webp',
  },
  {
    id: 3,
    key: 'checkin',
    name: '签到',
    subtitle: 'CHECK IN',
    image: '/manus-storage/lev3_checkin_25badea1.png',
  },
  {
    id: 2,
    key: 'graffiti',
    name: '涂鸦',
    subtitle: 'GRAFFITI',
    image: '/manus-storage/lev2_graffiti_new_6ee0a04f.png',
  },
  {
    id: 1,
    key: 'indoor',
    name: '室内开发',
    subtitle: 'DEV ROOM',
    image: '/manus-storage/lev5_door_3551cd73.png',
  },
  {
    id: 0,
    key: 'final',
    name: '最终挑战',
    subtitle: 'LEV0 CORE',
    image: '/manus-storage/bg_welcome_2345c7fc.png',
  },
];

export default function LevelMap() {
  const [, navigate] = useLocation();
  const [currentLevel, setCurrentLevel] = useState(5);
  const [showMap, setShowMap] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

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
    <div className="fixed inset-0 bg-[#0a0a08] overflow-y-auto overflow-x-hidden">
      {/* 复古墙壁背景 */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-60"
        style={{ 
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663760209689/WgMtkexYr4g2QwJyHJRwUN/map_bg_wall-Rsi3uZyaoCXppKpntoe8s3.webp)`,
          backgroundSize: 'cover',
        }}
      />
      
      {/* 暗角叠加 */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.75)_100%)]" />
      
      {/* 扫描线效果 */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)',
      }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="sticky top-0 z-30 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      >
        <div className="flex items-start justify-between max-w-5xl mx-auto">
          <div>
            <p className="font-tech text-[10px] text-yellow-600/70 tracking-[0.3em] uppercase">Escape Route</p>
            <h1 className="font-cn-title text-2xl md:text-3xl text-yellow-100/90 mt-1">
              路程映射
            </h1>
          </div>
          <div className="text-right">
            <div className="bg-[#1a1f1a]/80 border border-yellow-900/30 px-3 py-1.5 rounded">
              <p className="font-tech text-[9px] text-yellow-600/60">距出口</p>
              <p className="font-impact text-xl text-yellow-100/90">
                {currentLevel === -1 ? '0.0' : ((currentLevel) * 22.8 + 0.6).toFixed(1)} m
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level nodes - 垂直排列，大图墙洞效果 */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 md:px-8 pb-32 pt-4">
        {/* 连接线 - 垂直虚线 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 z-0"
          style={{
            background: 'repeating-linear-gradient(to bottom, rgba(180,180,50,0.3) 0px, rgba(180,180,50,0.3) 8px, transparent 8px, transparent 16px)',
          }}
        />

        <AnimatePresence>
          {showMap && LEVELS.map((level, i) => {
            const status = getLevelStatus(level.id);
            const isSelected = selectedLevel === level.id;
            const isEven = i % 2 === 0;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: isSelected ? 0.95 : 1,
                }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.6, type: 'spring', stiffness: 100 }}
                className={`relative mb-8 md:mb-12 flex items-center ${isEven ? 'flex-row' : 'flex-row-reverse'}`}
                onClick={() => handleLevelClick(level.id)}
              >
                {/* 墙洞容器 */}
                <div className={`
                  relative w-full cursor-pointer group
                  ${status === 'locked' ? 'cursor-not-allowed' : ''}
                `}>
                  {/* 墙洞边框效果 */}
                  <div className={`
                    relative rounded-lg overflow-hidden transition-all duration-500
                    ${status === 'locked' ? 'opacity-40' : ''}
                    ${status === 'current' ? 'ring-2 ring-yellow-400/60 ring-offset-4 ring-offset-[#0a0a08]' : ''}
                  `}>
                    {/* 墙洞外框 - 模拟破碎的墙壁边缘 */}
                    <div className="absolute inset-0 z-10 pointer-events-none rounded-lg"
                      style={{
                        boxShadow: `
                          inset 0 0 30px rgba(0,0,0,0.8),
                          inset 0 0 60px rgba(0,0,0,0.4),
                          0 0 20px rgba(0,0,0,0.6)
                        `,
                        border: status === 'current' 
                          ? '3px solid rgba(180,180,50,0.4)' 
                          : status === 'completed'
                          ? '2px solid rgba(80,180,80,0.3)'
                          : '2px solid rgba(60,50,40,0.6)',
                      }}
                    />
                    
                    {/* 裂缝纹理叠加 */}
                    <div className="absolute inset-0 z-10 pointer-events-none opacity-30 rounded-lg"
                      style={{
                        background: `
                          radial-gradient(ellipse at 20% 30%, rgba(40,30,20,0.5) 0%, transparent 50%),
                          radial-gradient(ellipse at 80% 70%, rgba(40,30,20,0.4) 0%, transparent 40%)
                        `,
                      }}
                    />

                    {/* 图片 - 大尺寸 */}
                    <div className="aspect-[16/9] md:aspect-[2/1] w-full overflow-hidden">
                      <img 
                        src={level.image} 
                        alt={level.name}
                        className={`
                          w-full h-full object-cover transition-all duration-700
                          ${status === 'locked' ? 'grayscale blur-[1px]' : ''}
                          ${status !== 'locked' ? 'group-hover:scale-105' : ''}
                        `}
                      />
                    </div>

                    {/* 暗色叠加层 */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${
                      status === 'current' ? 'bg-gradient-to-t from-black/60 via-transparent to-black/20' : 
                      status === 'completed' ? 'bg-gradient-to-t from-black/50 via-transparent to-black/20' : 
                      'bg-black/60'
                    }`} />

                    {/* 层级信息覆盖 */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20">
                      <div className="flex items-end justify-between">
                        <div>
                          {/* 层级编号 */}
                          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded mb-2 ${
                            status === 'current' ? 'bg-yellow-500/20 border border-yellow-500/40' :
                            status === 'completed' ? 'bg-green-500/15 border border-green-500/30' :
                            'bg-white/5 border border-white/10'
                          }`}>
                            <span className={`font-tech text-xs tracking-wider ${
                              status === 'current' ? 'text-yellow-300' :
                              status === 'completed' ? 'text-green-400' :
                              'text-gray-500'
                            }`}>
                              LEV{level.id}
                            </span>
                            {status === 'completed' && (
                              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {status === 'current' && (
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                            )}
                            {status === 'locked' && (
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                          </div>

                          {/* 层级名称 */}
                          <h3 className={`font-cn-title text-2xl md:text-3xl ${
                            status === 'current' ? 'text-yellow-200' :
                            status === 'completed' ? 'text-green-200/80' :
                            'text-gray-400/50'
                          }`}>
                            {level.name}
                          </h3>
                          <p className={`font-tech text-[10px] tracking-[0.2em] mt-1 ${
                            status === 'current' ? 'text-yellow-600/70' :
                            status === 'completed' ? 'text-green-600/50' :
                            'text-gray-700/50'
                          }`}>
                            {level.subtitle}
                          </p>
                        </div>

                        {/* 进入按钮 */}
                        {status === 'current' && (
                          <motion.div
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/40 px-4 py-2 rounded"
                          >
                            <span className="font-tech text-xs text-yellow-300">ENTER</span>
                            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* 当前层级发光边缘 */}
                    {status === 'current' && (
                      <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{ boxShadow: '0 0 40px rgba(180,180,50,0.15), inset 0 0 40px rgba(180,180,50,0.05)' }}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="font-tech text-[11px] text-yellow-300/70">
              当前: {LEVELS.find(l => l.id === currentLevel)?.name || '全部完成'}
            </span>
          </div>
          
          <button
            onClick={() => handleLevelClick(currentLevel)}
            className="group flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/40 
              hover:border-yellow-400/80 hover:bg-yellow-500/20 px-5 py-2.5 rounded
              transition-all duration-300 active:scale-[0.97]"
          >
            <span className="font-cn-title text-sm text-yellow-300 group-hover:text-yellow-200">
              进入当前区域
            </span>
            <svg className="w-4 h-4 text-yellow-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

      {/* Corner decorations */}
      <div className="fixed top-20 left-4 z-10 font-tech text-[8px] text-yellow-800/30">
        <p>SYS.BACKROOMS.v0.1</p>
        <p className="mt-0.5">PROTOCOL: LIMINAL_SPACE</p>
      </div>
      <div className="fixed bottom-16 right-4 z-10 font-tech text-[8px] text-yellow-800/30 text-right">
        <p>ESCAPE_LEV0</p>
        <p className="mt-0.5">lev0.cn</p>
      </div>
    </div>
  );
}
