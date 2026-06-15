import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import TransitionEffect from '@/components/TransitionEffect';
import ParticleSystem from '@/components/ParticleSystem';
import { trpc } from '@/lib/trpc';
import { apiUrl, storageUrl, withBasePath } from '@/lib/basePath';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663760209689/WgMtkexYr4g2QwJyHJRwUN/lev0_logo-guPYvbB8GHrQsakkZZxeR9.webp';
const ENDING_VIDEO_URL =
  withBasePath(
    import.meta.env.VITE_ENDING_VIDEO_URL ||
      '/manus-storage/ending/LEV0_backrooms_bilingual_61410_source_subs_bright.mp4',
  );

/**
 * 游戏主界面
 * 核心玩法：每轮随机展示一个视频（正常或异常），玩家判断后推进
 */

interface LevelConfig {
  id: number;
  name: string;
  description: string;
  bgImage: string;
  systemMsg: string;
}

interface RoundVideo {
  id: number;
  videoUrl: string;
  title: string;
  isNormal: boolean;
  anomalyDescription: string | null;
}

const LEVELS: LevelConfig[] = [
  { 
    id: 5, name: '进门', 
    description: '检测到入口协议...', 
    bgImage: storageUrl('/manus-storage/bg_welcome_2345c7fc.png'),
    systemMsg: '正在扫描入口区域...'
  },
  { 
    id: 4, name: '电梯', 
    description: '垂直传输通道激活...', 
    bgImage: storageUrl('/manus-storage/bg_elevator_371b48ce.png'),
    systemMsg: '电梯系统接入中...'
  },
  { 
    id: 3, name: '进场签到', 
    description: '身份注册系统启动...', 
    bgImage: storageUrl('/manus-storage/bg_reception_c9b3d319.png'),
    systemMsg: '签到终端连接中...'
  },
  { 
    id: 2, name: '涂鸦', 
    description: '墙面信息解码中...', 
    bgImage: storageUrl('/manus-storage/bg_graffiti_356c1a20.png'),
    systemMsg: '解析墙面数据...'
  },
  { 
    id: 1, name: '室内开发', 
    description: '核心区域已解锁...', 
    bgImage: storageUrl('/manus-storage/bg_office_26395507.png'),
    systemMsg: '进入核心工作区...'
  },
  { 
    id: 0, name: '最终挑战', 
    description: 'LEV0核心区域...最终审判...', 
    bgImage: storageUrl('/manus-storage/bg_welcome_2345c7fc.png'),
    systemMsg: '正在接入LEV0核心...'
  },
];

type GamePhase = 'intro' | 'loading' | 'playing' | 'choosing' | 'correct' | 'wrong' | 'transitioning' | 'complete';

function getGameSessionId() {
  const key = 'escape_lev0_session';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(key, id);
  return id;
}

function shuffleVideos(videos: RoundVideo[]) {
  const shuffled = [...videos];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function fetchLevelVideos(levelNumber: number): Promise<RoundVideo[]> {
  const input = encodeURIComponent(JSON.stringify({ json: { levelNumber } }));
  const response = await fetch(apiUrl(`/api/trpc/game.getLevelVideos?input=${input}`));
  const result = await response.json();
  const data = result?.result?.data?.json as { videos?: RoundVideo[] } | undefined;
  return data?.videos ?? [];
}

export default function Game() {
  const [, navigate] = useLocation();
  const recordAttemptMutation = trpc.game.recordAttempt.useMutation();
  
  // Read selected level from localStorage (set by LevelMap)
  const getInitialLevelIndex = (): number => {
    try {
      const stored = localStorage.getItem('escape_lev0_selected');
      if (stored) {
        const { level } = JSON.parse(stored);
        const idx = LEVELS.findIndex(l => l.id === level);
        if (idx !== -1) return idx;
      }
    } catch {}
    return 0; // Default to first level (LEV5)
  };
  
  const [currentLevelIndex, setCurrentLevelIndex] = useState(getInitialLevelIndex);
  const [gamePhase, setGamePhase] = useState<GamePhase>('intro');
  const [sessionId] = useState(getGameSessionId);
  const [videoQueue, setVideoQueue] = useState<RoundVideo[]>([]);
  const [videoQueueIndex, setVideoQueueIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<RoundVideo | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [endingVideoComplete, setEndingVideoComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [showGlitch, setShowGlitch] = useState(false);
  const [flickerOpacity, setFlickerOpacity] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState<'levelUp' | 'correct' | 'wrong' | 'gameStart' | 'gameEnd'>('levelUp');
  const [ambientParticles, setAmbientParticles] = useState(true);
  const flickerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
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

  // 入场动画 - 带粒子转场
  useEffect(() => {
    setTransitionType('gameStart');
    setShowTransition(true);
    const timer = setTimeout(() => {
      setShowTransition(false);
      setGamePhase('loading');
      loadNewRound();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const setActiveVideo = useCallback((video: RoundVideo | null) => {
    setCurrentVideo(video);
    setCurrentVideoUrl(video ? withBasePath(video.videoUrl) : null);
  }, []);

  // 每关读取全部启用视频，随机洗牌后逐个展示
  const loadLevelQueue = useCallback(async (level: LevelConfig) => {
    try {
      const videos = shuffleVideos(await fetchLevelVideos(level.id));
      setVideoQueue(videos);
      setVideoQueueIndex(0);
      setActiveVideo(videos[0] ?? null);

      setTimeout(() => {
        setGamePhase('playing');
      }, 1500);
    } catch (err) {
      setVideoQueue([]);
      setVideoQueueIndex(0);
      setActiveVideo(null);
      setTimeout(() => {
        setGamePhase('playing');
      }, 1500);
    }
  }, [setActiveVideo]);

  const loadNewRound = useCallback(async () => {
    await loadLevelQueue(currentLevel);
  }, [currentLevel, loadLevelQueue]);

  const handleVideoEnded = useCallback(() => {
    setGamePhase('choosing');
  }, []);

  const handleSkipToChoose = useCallback(() => {
    if (gamePhase === 'playing') {
      setGamePhase('choosing');
    }
  }, [gamePhase]);

  const advanceLevel = useCallback(() => {
    const nextIndex = currentLevelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      // Update progress - all levels completed
      localStorage.setItem('escape_lev0_progress', JSON.stringify({ level: -1 }));
      setTransitionType('gameEnd');
      setShowTransition(true);
      setEndingVideoComplete(false);
      setTimeout(() => {
        setShowTransition(false);
        setGamePhase('complete');
      }, 3000);
      return;
    }
    
    // Update progress to next level
    const nextLevel = LEVELS[nextIndex];
    localStorage.setItem('escape_lev0_progress', JSON.stringify({ level: nextLevel.id }));
    
    // 层级转场
    setTransitionType('levelUp');
    setShowTransition(true);
    setGamePhase('transitioning');
    
    setTimeout(() => {
      setShowTransition(false);
      setCurrentLevelIndex(nextIndex);
      setGamePhase('loading');
      loadLevelQueue(nextLevel);
    }, 2800);
  }, [currentLevelIndex, loadLevelQueue]);

  // 玩家选择后记录分数，并继续展示本关剩余视频
  const handleChoice = useCallback((playerSaysAnomaly: boolean) => {
    const correct = currentVideo
      ? playerSaysAnomaly === !currentVideo.isNormal
      : playerSaysAnomaly;
    const nextScore = score + (correct ? 1 : 0);
    const nextTotalAttempts = totalAttempts + 1;
    const hasMoreVideosInLevel = currentVideo ? videoQueueIndex < videoQueue.length - 1 : false;
    const completed = !hasMoreVideosInLevel && currentLevelIndex + 1 >= LEVELS.length;

    setTotalAttempts(nextTotalAttempts);
    if (correct) {
      setScore(nextScore);
    }

    recordAttemptMutation.mutate({
      levelNumber: currentLevel.id,
      videoId: currentVideo?.id,
      playerSaysAnomaly,
      correct,
      sessionId,
      score: nextScore,
      totalAttempts: nextTotalAttempts,
      completed,
    });

    setTransitionType(correct ? 'correct' : 'wrong');
    setShowTransition(true);
    setShowGlitch(!correct);
    setGamePhase(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setShowGlitch(false);
      setShowTransition(false);

      if (hasMoreVideosInLevel) {
        const nextVideoIndex = videoQueueIndex + 1;
        setVideoQueueIndex(nextVideoIndex);
        setActiveVideo(videoQueue[nextVideoIndex] ?? null);
        setGamePhase('loading');
        setTimeout(() => setGamePhase('playing'), 900);
        return;
      }

      advanceLevel();
    }, 2500);
  }, [
    advanceLevel,
    currentLevel.id,
    currentLevelIndex,
    currentVideo,
    recordAttemptMutation,
    score,
    sessionId,
    setActiveVideo,
    totalAttempts,
    videoQueue,
    videoQueueIndex,
  ]);

  return (
    <div 
      className="min-h-screen w-full bg-black relative overflow-hidden select-none"
      style={{ opacity: flickerOpacity, transition: 'opacity 0.04s' }}
    >
      {/* 转场效果 */}
      <TransitionEffect
        active={showTransition}
        type={transitionType}
        levelNumber={transitionType === 'levelUp' ? LEVELS[currentLevelIndex + 1]?.id : currentLevel.id}
        levelName={transitionType === 'levelUp' ? LEVELS[currentLevelIndex + 1]?.name : currentLevel.name}
      />

      {/* 环境粒子 - 持续浮动 */}
      <ParticleSystem
        active={ambientParticles && !showTransition}
        mode="float"
        count={15}
        colors={['rgba(229,57,53,0.3)', 'rgba(0,229,255,0.2)', 'rgba(255,255,255,0.1)']}
        duration={99999}
      />

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

      {/* 返回地图按钮 */}
      {gamePhase !== 'complete' && gamePhase !== 'intro' && (
        <button
          onClick={() => navigate('/map')}
          className="fixed top-3 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-gray-700/50 rounded
            hover:border-yellow-500/50 hover:bg-black/70 transition-all duration-300 active:scale-[0.97] group"
        >
          <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-yellow-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="font-tech text-[9px] text-gray-400 group-hover:text-yellow-300 transition-colors tracking-wider">MAP</span>
        </button>
      )}

      {/* 顶部HUD - 升级字体 */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 ml-20">
          <div className="flex items-center gap-1.5">
            <span className="font-tech text-[10px] text-gray-500 uppercase tracking-[0.2em]">Level</span>
            <span className="font-impact text-3xl text-white leading-none">{currentLevel.id}</span>
          </div>
          <div className="w-px h-5 bg-gray-700/50 mx-2" />
          <span className="font-tech text-[10px] text-gray-500 tracking-wider">{currentLevel.name}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-tech text-[10px] text-gray-600">
            <span className="text-green-500 font-bold text-glow-green">{score}</span>
            <span className="text-gray-700"> / </span>
            <span>{totalAttempts}</span>
            {videoQueue.length > 0 && (
              <>
                <span className="text-gray-800 mx-2">|</span>
                <span className="text-gray-500">
                  VIDEO {videoQueueIndex + 1}/{videoQueue.length}
                </span>
              </>
            )}
          </div>
          {/* 层级进度条 */}
          <div className="flex items-center gap-1">
            {LEVELS.map((_, idx) => (
              <div
                key={idx}
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  idx < currentLevelIndex ? 'w-6 bg-green-500' :
                  idx === currentLevelIndex ? 'w-8 bg-[#E53935] pulse-glow' :
                  'w-4 bg-gray-800'
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
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              className="text-center"
            >
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="font-tech text-[11px] text-gray-500 mb-6 tracking-[0.3em]">
                  正在连接后室网络...
                </p>
              </motion.div>
              <h2 className="font-display text-5xl md:text-7xl text-white mb-3 tracking-wider level-slam text-glow-red">
                LEVEL <span className="text-[#E53935] chromatic-text">{currentLevel.id}</span>
              </h2>
              <p className="font-tech text-sm text-[#E53935]/80 tracking-wide">
                {currentLevel.description}
              </p>
              <div className="mt-8 flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-2 border-gray-700 border-t-[#E53935] rounded-full"
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
                  <p className="font-tech text-[11px] text-gray-500 tracking-wider">
                    {currentLevel.systemMsg}
                  </p>
                </div>
                {/* 数据流装饰 */}
                <div className="absolute inset-0 overflow-hidden opacity-30">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="data-stream"
                      style={{
                        left: `${15 + i * 18}%`,
                        animationDuration: `${1.5 + Math.random()}s`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-tech text-[9px] text-red-500/70">REC</span>
                </div>
                <div className="absolute bottom-2.5 left-3 font-tech text-[9px] text-gray-600">
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
                  <>
                    <video
                      ref={videoRef}
                      src={currentVideoUrl}
                      className="absolute inset-0 w-full h-full object-cover hole-chromatic hole-breath"
                      autoPlay
                      playsInline
                      onEnded={handleVideoEnded}
                    />
                    {/* 扫描线叠加层 */}
                    <div className="hole-scanlines z-[5]" />
                  </>
                ) : (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-40"
                      style={{ backgroundImage: `url(${currentLevel.bgImage})` }}
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="font-display text-[12px] text-gray-300 mb-1 tracking-wider">
                          [ 演示模式 ]
                        </p>
                        <p className="font-tech text-[10px] text-gray-500">
                          请在管理后台上传视频素材
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* 帧装饰 - 顶部 */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/70 to-transparent z-10" />
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-20">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${gamePhase === 'playing' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className={`font-tech text-[9px] ${gamePhase === 'playing' ? 'text-red-500/70' : 'text-gray-500'}`}>
                    {gamePhase === 'playing' ? 'REC' : 'PAUSED'}
                  </span>
                </div>
                <div className="absolute top-2.5 right-3 font-tech text-[9px] text-gray-600 z-20">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </div>

                <div className="absolute bottom-2.5 left-3 font-tech text-[9px] text-gray-500 z-20">
                  CAM-{currentLevel.id} | {currentLevel.name.toUpperCase()}
                </div>
                
                {gamePhase === 'playing' && (
                  <div className="absolute bottom-2.5 right-3 z-20">
                    <span className="font-tech text-[9px] text-gray-500">
                      点击跳过 →
                    </span>
                  </div>
                )}
                {gamePhase === 'choosing' && (
                  <div className="absolute bottom-2.5 right-3 z-20">
                    <span className="font-display text-[9px] text-[#E53935]/70 animate-pulse tracking-wider">
                      请做出判断 ▼
                    </span>
                  </div>
                )}
              </div>

              {/* 选择按钮组 */}
              {gamePhase === 'choosing' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="grid grid-cols-2 gap-3"
                >
                  <button
                    onClick={() => handleChoice(false)}
                    className="group relative py-5 px-4 border border-green-500/20 rounded-sm
                      hover:border-green-500/50 hover:bg-green-500/5 hover:shadow-[0_0_30px_rgba(0,255,65,0.1)]
                      active:scale-[0.97] transition-all duration-200"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6 text-green-500/70 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="font-display text-[11px] text-green-400/80 group-hover:text-green-300 tracking-wider">
                        未发现异常
                      </span>
                      <span className="font-tech text-[9px] text-gray-600">
                        继续前进
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleChoice(true)}
                    className="group relative py-5 px-4 border border-[#E53935]/20 rounded-sm
                      hover:border-[#E53935]/50 hover:bg-[#E53935]/5 hover:shadow-[0_0_30px_rgba(229,57,53,0.1)]
                      active:scale-[0.97] transition-all duration-200"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6 text-[#E53935]/70 group-hover:text-[#E53935] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="font-display text-[11px] text-[#E53935]/80 group-hover:text-[#E53935] tracking-wider">
                        发现异常
                      </span>
                      <span className="font-tech text-[9px] text-gray-600">
                        立即返回
                      </span>
                    </div>
                  </button>
                </motion.div>
              )}

              {/* 演示模式跳过按钮 */}
              {gamePhase === 'playing' && !currentVideoUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <button
                    onClick={handleSkipToChoose}
                    className="w-full py-3 border border-gray-800 rounded-sm font-display text-[11px] text-gray-500 tracking-wider
                      hover:border-gray-600 hover:text-gray-300 transition-all duration-200"
                  >
                    进入判断阶段 →
                  </button>
                </motion.div>
              )}

              {gamePhase === 'choosing' && (
                <p className="font-tech text-[9px] text-gray-700 text-center mt-4 tracking-wider">
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
                className="w-16 h-16 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: '0 0 30px rgba(0,255,65,0.2)' }}
              >
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <p className="font-display text-lg text-green-400 mb-1 tracking-wider">
                {currentVideo?.isNormal ? '确认无异常' : '异常已标记'}
              </p>
              <p className="font-tech text-[10px] text-gray-600">
                判断已记录，正在载入下一个片段...
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
              className="text-center glitch-intense"
            >
              <motion.div
                animate={{ x: [0, -6, 6, -3, 3, 0] }}
                transition={{ duration: 0.4 }}
                className="w-16 h-16 border-2 border-[#E53935]/50 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: '0 0 30px rgba(229,57,53,0.3)' }}
              >
                <svg className="w-7 h-7 text-[#E53935]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
              <p className="font-display text-lg text-[#E53935] mb-1 tracking-wider chromatic-text">
                {currentVideo?.isNormal ? '误报异常' : '未发现异常'}
              </p>
              <p className="font-tech text-[10px] text-gray-600">
                判断已记录，继续进入下一个片段...
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
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <p className="font-display text-[10px] text-gray-500 tracking-[0.4em] uppercase">
                  空间坐标偏移中
                </p>
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 bg-[#E53935] rounded-full"
                    />
                  ))}
                </div>
                <h2 className="font-impact text-[120px] md:text-[180px] text-white/10 leading-none absolute inset-0 flex items-center justify-center pointer-events-none">
                  {LEVELS[currentLevelIndex + 1]?.id ?? '0'}
                </h2>
                <h2                 className="font-display text-4xl md:text-6xl text-white tracking-wider text-glow-red">
                  LEVEL <span className="text-[#E53935] chromatic-text">{LEVELS[currentLevelIndex + 1]?.id ?? '0'}</span>
                </h2>
                <p className="font-tech text-xs text-[#E53935]/70 tracking-wide">
                  {LEVELS[currentLevelIndex + 1]?.description ?? ''}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* 通关 - 片尾视频后展示海报 */}
          {gamePhase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="fixed inset-0 flex items-center justify-center bg-black z-30"
            >
              {!endingVideoComplete && ENDING_VIDEO_URL ? (
                <motion.div
                  key="ending-video"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3, duration: 1 }}
                  className="relative w-full h-full flex items-center justify-center bg-black"
                >
                  <video
                    src={ENDING_VIDEO_URL}
                    className="w-full h-full object-contain"
                    autoPlay
                    playsInline
                    controls
                    onEnded={() => setEndingVideoComplete(true)}
                    onError={() => setEndingVideoComplete(true)}
                  />
                  <button
                    onClick={() => setEndingVideoComplete(true)}
                    className="absolute bottom-8 right-8 font-tech text-[10px] text-gray-400 border border-gray-700/70 px-4 py-2 rounded-sm tracking-wider
                      bg-black/50 hover:border-yellow-500/50 hover:text-yellow-300 transition-all duration-300"
                  >
                    跳过片尾
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* 海报图片 */}
                  <motion.div
                    key="ending-poster"
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ delay: 0.5, duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
                    className="relative w-full h-full flex items-center justify-center p-4"
                  >
                    <img
                      src={storageUrl('/manus-storage/ending_poster_d88e314f.png')}
                      alt="欢迎来到 LEVEL 0"
                      className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-[0_0_60px_rgba(180,150,50,0.15)]"
                    />
                  </motion.div>

                  {/* 得分信息 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.5, duration: 0.8 }}
                    className="absolute bottom-8 left-0 right-0 text-center z-40"
                  >
                    <p className="font-tech text-[11px] text-yellow-600/70 mb-3">
                      得分: {score}/{totalAttempts} | 通过层级: {LEVELS.length}
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => navigate('/map')}
                        className="font-tech text-[11px] text-gray-400 border border-gray-700 px-5 py-2 rounded-sm tracking-wider
                          hover:border-yellow-500/50 hover:text-yellow-300 hover:shadow-[0_0_15px_rgba(180,150,50,0.1)]
                          transition-all duration-300"
                      >
                        返回地图
                      </button>
                      <button
                        onClick={() => navigate('/')}
                        className="font-tech text-[11px] text-gray-400 border border-gray-700 px-5 py-2 rounded-sm tracking-wider
                          hover:border-[#E53935]/50 hover:text-[#E53935] hover:shadow-[0_0_15px_rgba(229,57,53,0.1)]
                          transition-all duration-300"
                      >
                        返回入口
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
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
              <span className={`font-display text-[8px] tracking-wider ${
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
      <div className="fixed bottom-4 left-4 z-30 font-tech text-[8px] text-gray-800">
        <p>BACKROOMS.PROTOCOL.v0.1</p>
      </div>
      <div className="fixed bottom-4 right-4 z-30 font-tech text-[8px] text-gray-800">
        <p>ANOMALY_DETECTION_ACTIVE</p>
      </div>
    </div>
  );
}
