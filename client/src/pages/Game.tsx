import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663760209689/WgMtkexYr4g2QwJyHJRwUN/lev0_logo-guPYvbB8GHrQsakkZZxeR9.webp';

/**
 * 游戏主界面
 * 核心玩法：每轮随机展示一个视频（正常或异常），玩家判断后推进
 * 选对正常视频 -> 进入下一层级
 * 正确识别异常 -> 重新抽取本层级
 * 选错 -> 重新抽取本层级
 */

interface LevelConfig {
  id: number;
  name: string;
  description: string;
  bgImage: string;
  systemMsg: string;
}

const LEVELS: LevelConfig[] = [
  { 
    id: 5, name: '进门', 
    description: '检测到入口协议...', 
    bgImage: '/manus-storage/bg_welcome_2345c7fc.png',
    systemMsg: '正在扫描入口区域...'
  },
  { 
    id: 4, name: '电梯', 
    description: '垂直传输通道激活...', 
    bgImage: '/manus-storage/bg_elevator_371b48ce.png',
    systemMsg: '电梯系统接入中...'
  },
  { 
    id: 3, name: '进场签到', 
    description: '身份注册系统启动...', 
    bgImage: '/manus-storage/bg_reception_c9b3d319.png',
    systemMsg: '签到终端连接中...'
  },
  { 
    id: 2, name: '涂鸦', 
    description: '墙面信息解码中...', 
    bgImage: '/manus-storage/bg_graffiti_356c1a20.png',
    systemMsg: '解析墙面数据...'
  },
  { 
    id: 1, name: '室内开发', 
    description: '核心区域已解锁...', 
    bgImage: '/manus-storage/bg_office_26395507.png',
    systemMsg: '进入核心工作区...'
  },
];

type GamePhase = 'intro' | 'loading' | 'playing' | 'choosing' | 'correct' | 'wrong' | 'transitioning' | 'complete';

export default function Game() {
  const [, navigate] = useLocation();
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('intro');
  const [currentVideoIsNormal, setCurrentVideoIsNormal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [showGlitch, setShowGlitch] = useState(false);
  const [flickerOpacity, setFlickerOpacity] = useState(1);
  const [hasVideos, setHasVideos] = useState(true);
  const flickerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentLevel = LEVELS[currentLevelIndex];

  // 荧光灯闪烁
  useEffect(() => {
    flickerRef.current = setInterval(() => {
      if (Math.random() > 0.93) {
        setFlickerOpacity(0.75 + Math.random() * 0.25);
        setTimeout(() => setFlickerOpacity(1), 40 + Math.random() * 80);
      }
    }, 150);
    return () => clearInterval(flickerRef.current);
  }, []);

  // 入场动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setGamePhase('loading');
      loadNewRound();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 从后端获取视频对并随机选一个
  const loadNewRound = useCallback(async () => {
    try {
      const response = await fetch(`/api/trpc/game.getVideoPair?input=${encodeURIComponent(JSON.stringify({ json: { levelNumber: currentLevel.id } }))}`);
      const result = await response.json();
      const data = result?.result?.data?.json;

      if (data && (data.normal || data.anomaly)) {
        // 随机决定展示正常还是异常视频
        const showNormal = data.normal && data.anomaly
          ? Math.random() > 0.4  // 40%概率展示正常视频
          : !!data.normal;

        if (showNormal && data.normal) {
          setCurrentVideoIsNormal(true);
          setCurrentVideoUrl(data.normal.videoUrl);
        } else if (data.anomaly) {
          setCurrentVideoIsNormal(false);
          setCurrentVideoUrl(data.anomaly.videoUrl);
        } else if (data.normal) {
          setCurrentVideoIsNormal(true);
          setCurrentVideoUrl(data.normal.videoUrl);
        }
        setHasVideos(true);
      } else {
        // 没有视频，使用演示模式
        setHasVideos(false);
        setCurrentVideoIsNormal(Math.random() > 0.4);
        setCurrentVideoUrl(null);
      }

      setTimeout(() => {
        setGamePhase('playing');
      }, 1500);
    } catch (err) {
      // 出错时使用演示模式
      setHasVideos(false);
      setCurrentVideoIsNormal(Math.random() > 0.4);
      setCurrentVideoUrl(null);
      setTimeout(() => {
        setGamePhase('playing');
      }, 1500);
    }
  }, [currentLevel]);

  // 视频播放结束后进入选择阶段
  const handleVideoEnded = useCallback(() => {
    setGamePhase('choosing');
  }, []);

  // 手动进入选择阶段（点击视频跳过）
  const handleSkipToChoose = useCallback(() => {
    if (gamePhase === 'playing') {
      setGamePhase('choosing');
    }
  }, [gamePhase]);

  // 玩家选择
  const handleChoice = useCallback((playerSaysAnomaly: boolean) => {
    const isAnomaly = !currentVideoIsNormal;
    const correct = playerSaysAnomaly === isAnomaly;
    setTotalAttempts(prev => prev + 1);

    if (correct) {
      setScore(prev => prev + 1);
      if (!isAnomaly) {
        // 选对正常视频 -> 进入下一层
        setGamePhase('correct');
        setTimeout(() => advanceLevel(), 2000);
      } else {
        // 正确识别异常 -> 重新抽取
        setGamePhase('correct');
        setTimeout(() => {
          setGamePhase('loading');
          loadNewRound();
        }, 1500);
      }
    } else {
      // 选错
      setShowGlitch(true);
      setGamePhase('wrong');
      setTimeout(() => {
        setShowGlitch(false);
        setGamePhase('loading');
        loadNewRound();
      }, 2200);
    }
  }, [currentVideoIsNormal, loadNewRound]);

  const advanceLevel = useCallback(() => {
    const nextIndex = currentLevelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      setGamePhase('complete');
      return;
    }
    setGamePhase('transitioning');
    setTimeout(() => {
      setCurrentLevelIndex(nextIndex);
      setGamePhase('loading');
      // 加载下一层级视频
      const nextLevel = LEVELS[nextIndex];
      fetch(`/api/trpc/game.getVideoPair?input=${encodeURIComponent(JSON.stringify({ json: { levelNumber: nextLevel.id } }))}`)
        .then(r => r.json())
        .then(result => {
          const data = result?.result?.data?.json;
          if (data && (data.normal || data.anomaly)) {
            const showNormal = data.normal && data.anomaly ? Math.random() > 0.4 : !!data.normal;
            if (showNormal && data.normal) {
              setCurrentVideoIsNormal(true);
              setCurrentVideoUrl(data.normal.videoUrl);
            } else if (data.anomaly) {
              setCurrentVideoIsNormal(false);
              setCurrentVideoUrl(data.anomaly.videoUrl);
            } else if (data.normal) {
              setCurrentVideoIsNormal(true);
              setCurrentVideoUrl(data.normal.videoUrl);
            }
            setHasVideos(true);
          } else {
            setHasVideos(false);
            setCurrentVideoIsNormal(Math.random() > 0.4);
            setCurrentVideoUrl(null);
          }
          setTimeout(() => setGamePhase('playing'), 1500);
        })
        .catch(() => {
          setHasVideos(false);
          setCurrentVideoIsNormal(Math.random() > 0.4);
          setCurrentVideoUrl(null);
          setTimeout(() => setGamePhase('playing'), 1500);
        });
    }, 2800);
  }, [currentLevelIndex]);

  return (
    <div 
      className="min-h-screen w-full bg-black relative overflow-hidden select-none"
      style={{ opacity: flickerOpacity, transition: 'opacity 0.04s' }}
    >
      {/* 背景层 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLevel.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.25, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${currentLevel.bgImage})`,
            animation: 'breathe 10s ease-in-out infinite',
          }}
        />
      </AnimatePresence>

      {/* 暗角遮罩 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.92)_100%)]" />

      {/* 扫描线 */}
      <div className="fixed inset-0 pointer-events-none z-[60]" style={{
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, transparent 1px, transparent 2.5px)',
      }} />

      {/* Glitch闪烁 */}
      <AnimatePresence>
        {showGlitch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 0.7, 0, 1, 0.3, 0] }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <div className="absolute inset-0 bg-red-900/20 mix-blend-overlay" />
            <div className="absolute top-[20%] left-0 right-0 h-[3px] bg-[#E53935]/50 blur-[1px]" />
            <div className="absolute top-[55%] left-0 right-0 h-[2px] bg-cyan-400/30" />
            <div className="absolute top-[80%] left-0 right-0 h-[1px] bg-[#E53935]/40" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部HUD */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-gray-600 uppercase tracking-wider">Level</span>
            <span className="font-mono text-xl text-white font-bold leading-none">{currentLevel.id}</span>
          </div>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <span className="font-mono text-[10px] text-gray-500">{currentLevel.name}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-[10px] text-gray-600">
            <span className="text-green-500">{score}</span>
            <span className="text-gray-700"> / </span>
            <span>{totalAttempts}</span>
          </div>
          {/* 层级进度条 */}
          <div className="flex items-center gap-1">
            {LEVELS.map((_, idx) => (
              <div
                key={idx}
                className={`w-5 h-[3px] rounded-full transition-all duration-500 ${
                  idx < currentLevelIndex ? 'bg-green-500' :
                  idx === currentLevelIndex ? 'bg-[#E53935]' :
                  'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {/* 入场 */}
          {gamePhase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="font-mono text-[11px] text-gray-500 mb-6 tracking-wider">
                  正在连接后室网络...
                </p>
              </motion.div>
              <h2 className="font-mono text-4xl md:text-5xl text-white font-bold mb-3 tracking-tight">
                LEVEL {currentLevel.id}
              </h2>
              <p className="font-mono text-sm text-[#E53935]">
                {currentLevel.description}
              </p>
              <div className="mt-6 flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border border-gray-600 border-t-[#E53935] rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* 加载视频 */}
          {gamePhase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl"
            >
              <div className="relative aspect-video bg-black/60 border border-gray-800/80 rounded-sm overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-[1.5px] border-gray-700 border-t-[#E53935] rounded-full"
                  />
                  <p className="font-mono text-[11px] text-gray-500">
                    {currentLevel.systemMsg}
                  </p>
                </div>
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono text-[9px] text-red-500/70">REC</span>
                </div>
                <div className="absolute bottom-2.5 left-3 font-mono text-[9px] text-gray-600">
                  CAM-{currentLevel.id} | {currentLevel.name.toUpperCase()}
                </div>
              </div>
            </motion.div>
          )}

          {/* 播放视频 / 选择阶段 */}
          {(gamePhase === 'playing' || gamePhase === 'choosing') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xl"
            >
              {/* 视频区域 */}
              <div 
                className="relative aspect-video bg-black/60 border border-gray-800/80 rounded-sm overflow-hidden backdrop-blur-sm mb-6 cursor-pointer"
                onClick={handleSkipToChoose}
              >
                {currentVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={currentVideoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnded}
                  />
                ) : (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-40"
                      style={{ backgroundImage: `url(${currentLevel.bgImage})` }}
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="font-mono text-[12px] text-gray-300 mb-1">
                          [ 演示模式 ]
                        </p>
                        <p className="font-mono text-[10px] text-gray-500">
                          请在管理后台上传视频素材
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* 帧装饰 */}
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${gamePhase === 'playing' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className={`font-mono text-[9px] ${gamePhase === 'playing' ? 'text-red-500/70' : 'text-gray-500'}`}>
                    {gamePhase === 'playing' ? 'REC' : 'PAUSED'}
                  </span>
                </div>
                <div className="absolute top-2.5 right-3 font-mono text-[9px] text-gray-600">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </div>
                <div className="absolute bottom-2.5 left-3 font-mono text-[9px] text-gray-600">
                  CAM-{currentLevel.id} | {currentLevel.name.toUpperCase()}
                </div>
                
                {/* 播放中提示 */}
                {gamePhase === 'playing' && (
                  <div className="absolute bottom-2.5 right-3">
                    <span className="font-mono text-[9px] text-gray-500">
                      点击跳过 →
                    </span>
                  </div>
                )}
                {gamePhase === 'choosing' && (
                  <div className="absolute bottom-2.5 right-3">
                    <span className="font-mono text-[9px] text-[#E53935]/70 animate-pulse">
                      请做出判断 ▼
                    </span>
                  </div>
                )}
              </div>

              {/* 选择按钮组 - 仅在choosing阶段显示 */}
              {gamePhase === 'choosing' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <button
                    onClick={() => handleChoice(false)}
                    className="group relative py-5 px-4 border border-green-500/20 rounded-sm
                      hover:border-green-500/50 hover:bg-green-500/5 
                      active:scale-[0.97] transition-all duration-200"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-5 h-5 text-green-500/70 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="font-mono text-[12px] text-green-400/80 group-hover:text-green-300">
                        未发现异常
                      </span>
                      <span className="font-mono text-[9px] text-gray-600">
                        继续前进
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleChoice(true)}
                    className="group relative py-5 px-4 border border-[#E53935]/20 rounded-sm
                      hover:border-[#E53935]/50 hover:bg-[#E53935]/5 
                      active:scale-[0.97] transition-all duration-200"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-5 h-5 text-[#E53935]/70 group-hover:text-[#E53935] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="font-mono text-[12px] text-[#E53935]/80 group-hover:text-[#E53935]">
                        发现异常
                      </span>
                      <span className="font-mono text-[9px] text-gray-600">
                        立即返回
                      </span>
                    </div>
                  </button>
                </motion.div>
              )}

              {/* 播放中的提示 */}
              {gamePhase === 'playing' && !currentVideoUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <button
                    onClick={handleSkipToChoose}
                    className="w-full py-3 border border-gray-800 rounded-sm font-mono text-[11px] text-gray-500
                      hover:border-gray-600 hover:text-gray-300 transition-all duration-200"
                  >
                    进入判断阶段 →
                  </button>
                </motion.div>
              )}

              {/* 提示 */}
              {gamePhase === 'choosing' && (
                <p className="font-mono text-[9px] text-gray-700 text-center mt-4">
                  仔细观察画面，判断是否存在异常
                </p>
              )}
            </motion.div>
          )}

          {/* 正确反馈 */}
          {gamePhase === 'correct' && (
            <motion.div
              key="correct"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                className="w-14 h-14 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <p className="font-mono text-sm text-green-400 mb-1">判断正确</p>
              <p className="font-mono text-[10px] text-gray-600">
                {currentVideoIsNormal ? '空间坐标已确认，正在推进...' : '异常已标记，重新扫描中...'}
              </p>
            </motion.div>
          )}

          {/* 错误反馈 */}
          {gamePhase === 'wrong' && (
            <motion.div
              key="wrong"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ x: [0, -4, 4, -2, 2, 0] }}
                transition={{ duration: 0.4 }}
                className="w-14 h-14 border border-[#E53935]/50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-6 h-6 text-[#E53935]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
              <p className="font-mono text-sm text-[#E53935] mb-1">判断错误</p>
              <p className="font-mono text-[10px] text-gray-600">
                空间坐标偏移，重新加载...
              </p>
            </motion.div>
          )}

          {/* 层级转场 */}
          {gamePhase === 'transitioning' && (
            <motion.div
              key="transitioning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0.3, 1, 0.3], y: 0 }}
                transition={{ opacity: { duration: 1.5, repeat: Infinity }, y: { duration: 0.5 } }}
                className="space-y-3"
              >
                <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
                  空间坐标偏移中
                </p>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                      className="w-1.5 h-1.5 bg-[#E53935] rounded-full"
                    />
                  ))}
                </div>
                <h2 className="font-mono text-4xl text-white font-bold tracking-tight">
                  LEVEL {LEVELS[currentLevelIndex + 1]?.id ?? '0'}
                </h2>
                <p className="font-mono text-xs text-[#E53935]">
                  {LEVELS[currentLevelIndex + 1]?.description ?? ''}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* 通关 */}
          {gamePhase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
              className="text-center px-4"
            >
              <motion.h1
                initial={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.3, duration: 1.2 }}
                className="font-mono text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight"
              >
                ESCAPED
              </motion.h1>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '6rem' }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-[1px] bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto mb-6"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="font-mono text-sm text-gray-400 mb-1"
              >
                你成功逃离了后室
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="font-mono text-[11px] text-gray-600"
              >
                得分: {score}/{totalAttempts} | 通过层级: {LEVELS.length}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                className="font-mono text-[10px] text-[#E53935]/70 mt-10"
              >
                ...还是说，这只是Level 0的幻觉？
              </motion.p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4.5 }}
                onClick={() => navigate('/')}
                className="mt-8 font-mono text-[11px] text-gray-500 border border-gray-800 px-4 py-2 rounded-sm
                  hover:border-gray-600 hover:text-gray-300 transition-all duration-200"
              >
                返回入口
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部层级指示器 */}
      {gamePhase !== 'complete' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
          {LEVELS.map((level, idx) => (
            <div
              key={level.id}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-all duration-500 ${
                idx === currentLevelIndex
                  ? 'border-[#E53935]/40 bg-[#E53935]/5'
                  : idx < currentLevelIndex
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-gray-800/50 bg-black/30'
              }`}
            >
              <span className={`font-mono text-[8px] ${
                idx === currentLevelIndex ? 'text-[#E53935]' :
                idx < currentLevelIndex ? 'text-green-500/70' : 'text-gray-700'
              }`}>
                L{level.id}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 系统信息角落 */}
      <div className="fixed bottom-4 left-4 z-30 font-mono text-[8px] text-gray-800">
        <p>BACKROOMS.PROTOCOL.v0.1</p>
      </div>
      <div className="fixed bottom-4 right-4 z-30 font-mono text-[8px] text-gray-800">
        <p>ANOMALY_DETECTION_ACTIVE</p>
      </div>
    </div>
  );
}
