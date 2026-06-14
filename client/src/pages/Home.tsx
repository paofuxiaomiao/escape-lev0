import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 欢迎页面 - 伪装成Cloudflare Turnstile真人验证界面
 * 设计哲学：数字阈限 - 后室阈限美学 × 网络安全验证UI
 * 从看似正常的验证界面逐步过渡到后室的诡异空间
 */

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663760209689/WgMtkexYr4g2QwJyHJRwUN/lev0_logo-guPYvbB8GHrQsakkZZxeR9.webp';

type VerifyPhase = 'loading' | 'checkbox' | 'verifying' | 'success' | 'glitch' | 'revealed';

export default function Home() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<VerifyPhase>('loading');
  const [checked, setChecked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [flickerOpacity, setFlickerOpacity] = useState(1);
  const flickerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // 荧光灯闪烁效果
  useEffect(() => {
    flickerRef.current = setInterval(() => {
      if (Math.random() > 0.92) {
        setFlickerOpacity(0.7 + Math.random() * 0.3);
        setTimeout(() => setFlickerOpacity(1), 50 + Math.random() * 100);
      }
    }, 200);
    return () => clearInterval(flickerRef.current);
  }, []);

  // 初始加载
  useEffect(() => {
    const timer = setTimeout(() => setPhase('checkbox'), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 验证进度
  useEffect(() => {
    if (phase !== 'verifying') return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('success'), 300);
          return 100;
        }
        if (prev >= 68 && prev < 73) return prev + 0.3;
        return prev + Math.random() * 4 + 1;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [phase]);

  // 成功后短暂停留再glitch
  useEffect(() => {
    if (phase !== 'success') return;
    const timer = setTimeout(() => {
      setGlitchActive(true);
      setPhase('glitch');
    }, 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  // Glitch到揭示
  useEffect(() => {
    if (phase !== 'glitch') return;
    const timer = setTimeout(() => {
      setGlitchActive(false);
      setPhase('revealed');
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleCheckbox = useCallback(() => {
    setChecked(true);
    setTimeout(() => setPhase('verifying'), 500);
  }, []);

  const handleEnterGame = useCallback(() => {
    navigate('/game');
  }, [navigate]);

  return (
    <div 
      className="min-h-screen w-full bg-black relative overflow-hidden"
      style={{ opacity: flickerOpacity, transition: 'opacity 0.05s' }}
    >
      {/* 后室走廊背景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(/manus-storage/bg_welcome_2345c7fc.png)`,
          opacity: phase === 'revealed' ? 0.25 : 0.12,
          transform: 'scale(1.05)',
          animation: 'breathe 12s ease-in-out infinite',
        }}
      />
      
      {/* 暗角 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.8)_80%)]" />

      {/* 扫描线 - 仅在glitch后显示 */}
      {(phase === 'glitch' || phase === 'revealed') && (
        <div className="fixed inset-0 pointer-events-none z-[60]" style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 3px)',
        }} />
      )}

      {/* Glitch闪烁层 */}
      <AnimatePresence>
        {glitchActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0, 0.5, 0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <div className="absolute inset-0 bg-red-900/10" />
            <div className="absolute top-[30%] left-0 right-0 h-[2px] bg-[#E53935]/60" />
            <div className="absolute top-[65%] left-0 right-0 h-[1px] bg-cyan-500/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[#E53935] text-xs animate-pulse">
                [ERR_REALITY_CHECK_FAILED]
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* Cloudflare验证卡片 */}
          {(phase === 'loading' || phase === 'checkbox' || phase === 'verifying' || phase === 'success') && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                scale: 0.9,
                filter: 'blur(4px)',
                transition: { duration: 0.3 }
              }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-[320px]"
            >
              {/* URL */}
              <div className="mb-2 text-[13px] text-gray-400 font-mono">
                lev0.cn
              </div>

              {/* 卡片主体 */}
              <div className="bg-[#fafafa] rounded border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Checkbox区域 */}
                      {phase === 'loading' && (
                        <div className="w-[22px] h-[22px] border-[1.5px] border-gray-300 rounded-[3px] flex items-center justify-center bg-white">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-3.5 h-3.5 border-[1.5px] border-gray-300 border-t-gray-500 rounded-full"
                          />
                        </div>
                      )}
                      {phase === 'checkbox' && (
                        <motion.button
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ borderColor: '#999' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleCheckbox}
                          className="w-[22px] h-[22px] border-[1.5px] border-gray-300 rounded-[3px] bg-white transition-colors"
                        />
                      )}
                      {(phase === 'verifying' || phase === 'success') && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="w-[22px] h-[22px] bg-[#2ECC40] rounded-[3px] flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}

                      <span className="text-[14px] text-gray-700 select-none">
                        {phase === 'success' ? '成功！' : '确认您是人类'}
                      </span>
                    </div>

                    {/* Cloudflare品牌 */}
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1">
                        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                          <path d="M28.5 20.5c0-0.5-0.1-1-0.3-1.4l-0.5-1.1 0.1-1.2c0.1-1.5-0.5-3-1.6-4-1.1-1-2.6-1.5-4.1-1.3l-1 0.1-0.8-0.6c-1.5-1.2-3.5-1.6-5.4-1.1-1.9 0.5-3.4 1.9-4.1 3.7l-0.4 1-1 0.3c-1.8 0.5-3 2.2-3 4.1 0 2.3 1.9 4.2 4.2 4.2h14.2c2 0 3.7-1.6 3.7-3.7z" fill="#F38020"/>
                          <path d="M24.8 23.2h-13c-0.2 0-0.3-0.1-0.3-0.3 0-0.1 0-0.2 0.1-0.2l1.5-2.2c0.3-0.4 0.7-0.7 1.2-0.7h10.5c0.2 0 0.4 0.2 0.4 0.4l-0.1 2.6c0 0.2-0.2 0.4-0.3 0.4z" fill="#FAAD3F"/>
                        </svg>
                        <span className="text-[10px] font-bold text-gray-600 tracking-wide">CLOUDFLARE</span>
                      </div>
                      <div className="flex gap-1.5 text-[9px] text-gray-400">
                        <span>隐私</span>
                        <span>·</span>
                        <span className="text-[#0051C3]">帮助</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                {phase === 'verifying' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 pb-3"
                  >
                    <div className="w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2ECC40] rounded-full transition-all duration-100"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 继续按钮 */}
              <AnimatePresence>
                {phase === 'success' && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-full mt-3 py-3 bg-[#111] text-white text-[14px] font-medium rounded border border-gray-800
                      hover:bg-[#222] active:scale-[0.98] transition-all duration-150"
                    onClick={() => {
                      setGlitchActive(true);
                      setPhase('glitch');
                    }}
                  >
                    继续
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 揭示阶段 - LEV0真实界面 */}
          {phase === 'revealed' && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-md text-center px-6"
            >
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.1, duration: 1 }}
                className="mb-6 flex justify-center"
              >
                <img 
                  src={LOGO_URL} 
                  alt="LEV0" 
                  className="w-16 h-16 md:w-20 md:h-20 opacity-80"
                />
              </motion.div>

              {/* LEV0 标题 */}
              <motion.div
                initial={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                className="mb-8"
              >
                <h1 className="font-mono font-bold text-5xl md:text-7xl tracking-[-0.05em] text-white leading-none">
                  LEV<span className="text-[#E53935]">0</span>
                </h1>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.8, duration: 1.2 }}
                  className="h-[1px] mt-3 bg-gradient-to-r from-transparent via-[#E53935]/50 to-transparent"
                />
              </motion.div>

              {/* 文案 */}
              <div className="space-y-2 mb-10">
                {[
                  { text: 'LEV0是一道临时打开的入口', delay: 0.6 },
                  { text: '给那些还没有头衔许可', delay: 0.8 },
                  { text: '没有标准答案的人', delay: 1.0, highlight: '没有标准答案' },
                  { text: '允许未被定义的人', delay: 1.2 },
                  { text: '创造未被定义的未来', delay: 1.4 },
                ].map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: line.delay, duration: 0.5 }}
                    className="font-mono text-[13px] text-gray-400 leading-relaxed"
                  >
                    {line.highlight ? (
                      <>
                        <span className="text-[#E53935] font-medium">{line.highlight}</span>
                        <span>{line.text.replace(line.highlight, '')}</span>
                      </>
                    ) : line.text}
                  </motion.p>
                ))}
              </div>

              {/* 进入游戏按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.6 }}
              >
                <p className="font-mono text-[11px] text-gray-600 mb-4">
                  入场前请<span className="text-[#E53935]">跨过警戒线</span>
                </p>
                <button
                  onClick={handleEnterGame}
                  className="group relative inline-flex items-center gap-2 px-8 py-3.5 
                    border border-[#E53935]/40 text-[#E53935] font-mono text-sm tracking-wide
                    hover:bg-[#E53935]/8 hover:border-[#E53935]/80 hover:shadow-[0_0_20px_rgba(229,57,53,0.15)]
                    active:scale-[0.97] transition-all duration-300"
                >
                  <span className="inline-block w-1.5 h-1.5 bg-[#E53935] rounded-full animate-pulse" />
                  <span>进入后室</span>
                </button>
              </motion.div>

              {/* 底部信息 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 1 }}
                className="mt-14 space-y-1.5"
              >
                <div className="flex items-center justify-center gap-3 text-[9px] font-mono text-gray-700">
                  <span>ACCESS_TOKEN: LEV0</span>
                  <span className="text-gray-800">|</span>
                  <span>MODE: ANOMALY_DETECT</span>
                  <span className="text-gray-800">|</span>
                  <span>STATUS: <span className="text-green-600">ACTIVE</span></span>
                </div>
                <p className="text-[9px] font-mono text-gray-800">
                  temporary civilization for young builders · cross boundaries · build anyway
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 角落装饰 */}
      <div className="fixed top-4 left-4 z-20 font-mono text-[9px] text-gray-700/50">
        <p>SYS.BACKROOMS.v0.1</p>
        <p className="mt-0.5">PROTOCOL: LIMINAL_SPACE</p>
      </div>
      <div className="fixed bottom-4 right-4 z-20 font-mono text-[9px] text-gray-700/50 text-right">
        <p>{new Date().toISOString().replace('T', ' ').split('.')[0]}</p>
        <p className="mt-0.5">lev0.cn</p>
      </div>
      <div className="fixed top-4 right-4 z-20 font-mono text-[9px] text-gray-700/50">
        <p>CONN: <span className="text-green-700/60">ESTABLISHED</span></p>
      </div>
    </div>
  );
}
