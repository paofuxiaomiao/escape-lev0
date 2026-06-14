import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// 游戏层级定义
export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  bgImage: string;
}

export const LEVELS: LevelConfig[] = [
  { id: 5, name: '进门', description: '检测到入口协议...', bgImage: '/manus-storage/bg_welcome_2345c7fc.png' },
  { id: 4, name: '电梯', description: '垂直传输通道激活...', bgImage: '/manus-storage/bg_elevator_371b48ce.png' },
  { id: 3, name: '进场签到', description: '身份注册系统启动...', bgImage: '/manus-storage/bg_reception_c9b3d319.png' },
  { id: 2, name: '涂鸦', description: '墙面信息解码中...', bgImage: '/manus-storage/bg_graffiti_356c1a20.png' },
  { id: 1, name: '室内开发', description: '核心区域已解锁...', bgImage: '/manus-storage/bg_office_26395507.png' },
];

// 视频数据结构（占位，等用户上传）
export interface VideoItem {
  id: string;
  url: string;
  isAnomaly: boolean;
  description?: string;
}

export interface GameState {
  currentLevelIndex: number;
  isPlaying: boolean;
  currentVideo: VideoItem | null;
  score: number;
  attempts: number;
  gamePhase: 'idle' | 'watching' | 'choosing' | 'result' | 'transitioning' | 'complete';
  resultType: 'correct' | 'wrong' | null;
}

interface GameContextType {
  state: GameState;
  currentLevel: LevelConfig;
  startGame: () => void;
  selectVideo: () => void;
  makeChoice: (isAnomaly: boolean) => void;
  resetLevel: () => void;
  nextLevel: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

// 演示用视频数据（占位）
const DEMO_VIDEOS: Record<number, VideoItem[]> = {
  5: [
    { id: 'v5_real', url: '', isAnomaly: false, description: '正常入口' },
    { id: 'v5_anom1', url: '', isAnomaly: true, description: '门牌号异常' },
    { id: 'v5_anom2', url: '', isAnomaly: true, description: '光影错位' },
  ],
  4: [
    { id: 'v4_real', url: '', isAnomaly: false, description: '正常电梯' },
    { id: 'v4_anom1', url: '', isAnomaly: true, description: '楼层显示异常' },
    { id: 'v4_anom2', url: '', isAnomaly: true, description: '镜像反转' },
  ],
  3: [
    { id: 'v3_real', url: '', isAnomaly: false, description: '正常签到' },
    { id: 'v3_anom1', url: '', isAnomaly: true, description: '签名簿异常' },
    { id: 'v3_anom2', url: '', isAnomaly: true, description: '时钟倒转' },
  ],
  2: [
    { id: 'v2_real', url: '', isAnomaly: false, description: '正常涂鸦' },
    { id: 'v2_anom1', url: '', isAnomaly: true, description: '涂鸦变化' },
    { id: 'v2_anom2', url: '', isAnomaly: true, description: '文字移动' },
  ],
  1: [
    { id: 'v1_real', url: '', isAnomaly: false, description: '正常办公区' },
    { id: 'v1_anom1', url: '', isAnomaly: true, description: '屏幕内容异常' },
    { id: 'v1_anom2', url: '', isAnomaly: true, description: '物品位移' },
  ],
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>({
    currentLevelIndex: 0,
    isPlaying: false,
    currentVideo: null,
    score: 0,
    attempts: 0,
    gamePhase: 'idle',
    resultType: null,
  });

  const currentLevel = LEVELS[state.currentLevelIndex];

  const startGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: true,
      gamePhase: 'watching',
      currentLevelIndex: 0,
      score: 0,
      attempts: 0,
    }));
  }, []);

  const selectVideo = useCallback(() => {
    const levelId = LEVELS[state.currentLevelIndex].id;
    const videos = DEMO_VIDEOS[levelId];
    const randomVideo = videos[Math.floor(Math.random() * videos.length)];
    setState(prev => ({
      ...prev,
      currentVideo: randomVideo,
      gamePhase: 'choosing',
    }));
  }, [state.currentLevelIndex]);

  const makeChoice = useCallback((playerSaysAnomaly: boolean) => {
    const video = state.currentVideo;
    if (!video) return;

    const isCorrect = playerSaysAnomaly === video.isAnomaly;
    
    setState(prev => ({
      ...prev,
      gamePhase: 'result',
      resultType: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? prev.score + 1 : prev.score,
      attempts: prev.attempts + 1,
    }));
  }, [state.currentVideo]);

  const resetLevel = useCallback(() => {
    setState(prev => ({
      ...prev,
      gamePhase: 'watching',
      currentVideo: null,
      resultType: null,
    }));
  }, []);

  const nextLevel = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentLevelIndex + 1;
      if (nextIndex >= LEVELS.length) {
        return { ...prev, gamePhase: 'complete' };
      }
      return {
        ...prev,
        currentLevelIndex: nextIndex,
        gamePhase: 'transitioning',
        currentVideo: null,
        resultType: null,
      };
    });
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      currentLevel,
      startGame,
      selectVideo,
      makeChoice,
      resetLevel,
      nextLevel,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
