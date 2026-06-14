import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BGM_URL = '/manus-storage/The_False_Wall_09c297b9.mp3';

/**
 * 全局BGM播放器 - 后室风格
 * 固定在页面左下角，提供静音/播放切换和音量控制
 * 自动循环播放，首次需要用户交互才能开始（浏览器策略）
 */
export default function BGMPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [showVolume, setShowVolume] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const hideVolumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 初始化音频
  useEffect(() => {
    const audio = new Audio(BGM_URL);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // 监听用户首次交互来自动播放
  useEffect(() => {
    if (hasInteracted) return;

    const handleFirstInteraction = () => {
      setHasInteracted(true);
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // 播放失败，保持静默
        });
      }
    };

    // 监听任何用户交互
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [hasInteracted]);

  // 音量变化
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setHasInteracted(true);
      }).catch(() => {});
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    // 触摸端：点击静音按钮时也展开音量面板
    setShowVolume(true);
    if (hideVolumeTimer.current) clearTimeout(hideVolumeTimer.current);
    hideVolumeTimer.current = setTimeout(() => setShowVolume(false), 3000);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const handleMouseEnter = useCallback(() => {
    if (hideVolumeTimer.current) {
      clearTimeout(hideVolumeTimer.current);
    }
    setShowVolume(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideVolumeTimer.current = setTimeout(() => {
      setShowVolume(false);
    }, 1500);
  }, []);

  // 触摸端：点击容器区域展开音量
  const handleTouchToggleVolume = useCallback(() => {
    setShowVolume(prev => !prev);
    if (hideVolumeTimer.current) clearTimeout(hideVolumeTimer.current);
    if (!showVolume) {
      hideVolumeTimer.current = setTimeout(() => setShowVolume(false), 4000);
    }
  }, [showVolume]);

  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 播放/暂停按钮 */}
      <button
        onClick={togglePlay}
        className="group relative w-8 h-8 flex items-center justify-center
          border border-gray-700/60 bg-black/60 backdrop-blur-sm rounded-sm
          hover:border-[#E53935]/50 hover:bg-black/80
          active:scale-[0.95] transition-all duration-200"
        title={isPlaying ? '暂停BGM' : '播放BGM'}
      >
        {isPlaying ? (
          <div className="flex items-center gap-[2px]">
            {/* 音频波形动画 */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ height: ['4px', '12px', '6px', '10px', '4px'] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
                className="w-[2px] bg-[#E53935]/80 rounded-full"
              />
            ))}
          </div>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#E53935]/80 transition-colors" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}

        {/* 脉冲指示器 */}
        {isPlaying && !isMuted && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 border border-[#E53935]/30 rounded-sm"
          />
        )}
      </button>

      {/* 静音按钮 */}
      <button
        onClick={toggleMute}
        className="w-8 h-8 flex items-center justify-center
          border border-gray-700/60 bg-black/60 backdrop-blur-sm rounded-sm
          hover:border-gray-600 hover:bg-black/80
          active:scale-[0.95] transition-all duration-200"
        title={isMuted ? '取消静音' : '静音'}
      >
        {isMuted ? (
          <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      {/* 音量滑块 */}
      <AnimatePresence>
        {showVolume && (
          <motion.div
            initial={{ opacity: 0, x: -10, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -10, width: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2 px-3 py-1.5 
              border border-gray-700/60 bg-black/60 backdrop-blur-sm rounded-sm overflow-hidden"
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-[2px] appearance-none bg-gray-700 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 
                [&::-webkit-slider-thumb]:bg-[#E53935] [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(229,57,53,0.5)]"
            />
            <span className="font-tech text-[9px] text-gray-600 w-6 text-right">
              {Math.round(volume * 100)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 未交互提示 */}
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-0 whitespace-nowrap"
          >
            <span className="font-tech text-[9px] text-gray-600 tracking-wider animate-pulse">
              点击任意处开始播放BGM
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
