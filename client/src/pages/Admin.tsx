import { useState, useRef, useCallback } from 'react';
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { storageUrl, withBasePath } from "@/lib/basePath";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Tab = 'levels' | 'videos';

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('videos');

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-mono text-gray-500 text-sm animate-pulse">
          [AUTHENTICATING...]
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="font-mono text-gray-400 text-sm">需要管理员权限</p>
          <a
            href={getLoginUrl()}
            className="inline-block px-6 py-2.5 border border-[#E53935]/50 text-[#E53935] font-mono text-sm
              hover:bg-[#E53935]/10 transition-all duration-200"
          >
            登录
          </a>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="font-mono text-[#E53935] text-sm">[ACCESS_DENIED]</p>
          <p className="font-mono text-gray-500 text-xs">仅管理员可访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-200">
      {/* 顶部导航 */}
      <header className="border-b border-gray-800/50 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-sm font-bold tracking-wide">
              LEV<span className="text-[#E53935]">0</span>
              <span className="text-gray-600 ml-2 font-normal">/ ADMIN</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-gray-600">
              {user?.name || user?.email || 'Admin'}
            </span>
            <a href={withBasePath('/')} className="font-mono text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
              ← 返回游戏
            </a>
          </div>
        </div>
      </header>

      {/* Tab导航 */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-1 border-b border-gray-800/50 mb-6">
          {[
            { key: 'videos' as Tab, label: '视频管理' },
            { key: 'levels' as Tab, label: '层级配置' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 font-mono text-xs transition-all duration-200 border-b-2 -mb-[1px]
                ${activeTab === tab.key
                  ? 'text-[#E53935] border-[#E53935]'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <AnimatePresence mode="wait">
          {activeTab === 'videos' && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <VideoManager />
            </motion.div>
          )}
          {activeTab === 'levels' && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <LevelManager />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** 视频管理组件 */
function VideoManager() {
  const [selectedLevel, setSelectedLevel] = useState<number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: levelsList } = trpc.levels.list.useQuery();
  const { data: videosList, refetch: refetchVideos } = trpc.videos.list.useQuery(
    selectedLevel ? { levelId: selectedLevel } : undefined
  );
  const uploadMutation = trpc.videos.upload.useMutation();
  const createMutation = trpc.videos.create.useMutation();
  const deleteMutation = trpc.videos.delete.useMutation();
  const updateMutation = trpc.videos.update.useMutation();

  const [editingVideo, setEditingVideo] = useState<{
    id: number;
    title: string;
    levelId: number;
    isNormal: boolean;
    anomalyDescription: string;
    enabled: boolean;
  } | null>(null);

  const [uploadForm, setUploadForm] = useState({
    levelId: 0,
    title: '',
    isNormal: false,
    anomalyDescription: '',
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uploadForm.levelId) {
      toast.error('请先选择层级');
      return;
    }
    if (!uploadForm.title) {
      toast.error('请填写视频标题');
      return;
    }

    setUploading(true);
    try {
      // 转为base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // 去掉data:xxx;base64,前缀
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 上传文件到S3
      const { key, url } = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileBase64: base64,
        contentType: file.type,
      });

      // 创建视频记录
      await createMutation.mutateAsync({
        levelId: uploadForm.levelId,
        title: uploadForm.title,
        videoUrl: url,
        videoKey: key,
        isNormal: uploadForm.isNormal,
        anomalyDescription: uploadForm.anomalyDescription || undefined,
      });

      toast.success('视频上传成功');
      setShowUploadForm(false);
      setUploadForm({ levelId: 0, title: '', isNormal: false, anomalyDescription: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetchVideos();
    } catch (err: any) {
      toast.error(`上传失败: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [uploadForm, uploadMutation, createMutation, refetchVideos]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确定删除此视频？')) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('已删除');
      refetchVideos();
    } catch (err: any) {
      toast.error(`删除失败: ${err.message}`);
    }
  }, [deleteMutation, refetchVideos]);

  const handleToggleType = useCallback(async (id: number, currentIsNormal: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, isNormal: !currentIsNormal });
      toast.success(`已标记为${!currentIsNormal ? '正常' : '异常'}视频`);
      refetchVideos();
    } catch (err: any) {
      toast.error(`更新失败: ${err.message}`);
    }
  }, [updateMutation, refetchVideos]);

  const handleStartEdit = useCallback((video: any) => {
    setEditingVideo({
      id: video.id,
      title: video.title || '',
      levelId: video.levelId,
      isNormal: video.isNormal,
      anomalyDescription: video.anomalyDescription || '',
      enabled: video.enabled ?? true,
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingVideo) return;
    try {
      await updateMutation.mutateAsync({
        id: editingVideo.id,
        title: editingVideo.title,
        levelId: editingVideo.levelId,
        isNormal: editingVideo.isNormal,
        anomalyDescription: editingVideo.anomalyDescription || undefined,
        enabled: editingVideo.enabled,
      });
      toast.success('视频信息已更新');
      setEditingVideo(null);
      refetchVideos();
    } catch (err: any) {
      toast.error(`更新失败: ${err.message}`);
    }
  }, [editingVideo, updateMutation, refetchVideos]);

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 层级筛选 */}
        <select
          value={selectedLevel || ''}
          onChange={e => setSelectedLevel(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
            focus:border-[#E53935]/50 focus:outline-none"
        >
          <option value="">全部层级</option>
          {levelsList?.map(l => (
            <option key={l.id} value={l.id}>L{l.levelNumber} - {l.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-[#E53935]/10 border border-[#E53935]/30 text-[#E53935] font-mono text-xs
            hover:bg-[#E53935]/20 transition-all duration-200 rounded"
        >
          + 上传视频
        </button>
      </div>

      {/* 上传表单 */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-4">
              <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">上传新视频</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-gray-500 mb-1.5">层级 *</label>
                  <select
                    value={uploadForm.levelId}
                    onChange={e => setUploadForm(f => ({ ...f, levelId: Number(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
                      focus:border-[#E53935]/50 focus:outline-none"
                  >
                    <option value={0}>选择层级...</option>
                    {levelsList?.map(l => (
                      <option key={l.id} value={l.id}>L{l.levelNumber} - {l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-gray-500 mb-1.5">标题 *</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="视频标题/备注"
                    className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
                      focus:border-[#E53935]/50 focus:outline-none placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadForm.isNormal}
                    onChange={e => setUploadForm(f => ({ ...f, isNormal: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-[#E53935] 
                      focus:ring-[#E53935]/30 focus:ring-offset-0"
                  />
                  <span className="font-mono text-xs text-gray-400">
                    这是<span className="text-green-400">正常</span>视频（非AI编辑）
                  </span>
                </label>
              </div>

              {!uploadForm.isNormal && (
                <div>
                  <label className="block font-mono text-[10px] text-gray-500 mb-1.5">异常描述</label>
                  <input
                    type="text"
                    value={uploadForm.anomalyDescription}
                    onChange={e => setUploadForm(f => ({ ...f, anomalyDescription: e.target.value }))}
                    placeholder="描述AI编辑了什么异常..."
                    className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
                      focus:border-[#E53935]/50 focus:outline-none placeholder:text-gray-600"
                  />
                </div>
              )}

              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1.5">选择视频文件 *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="w-full text-xs text-gray-400 font-mono
                    file:mr-3 file:py-2 file:px-4 file:rounded file:border file:border-gray-700
                    file:text-xs file:font-mono file:bg-gray-800 file:text-gray-300
                    hover:file:bg-gray-700 file:transition-colors file:cursor-pointer"
                />
              </div>

              {uploading && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-[#E53935] border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-xs text-[#E53935]">上传中...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 视频列表 */}
      <div className="space-y-2">
        {videosList && videosList.length === 0 && (
          <div className="text-center py-12 border border-dashed border-gray-800 rounded-lg">
            <p className="font-mono text-xs text-gray-600">暂无视频</p>
            <p className="font-mono text-[10px] text-gray-700 mt-1">点击"上传视频"开始添加素材</p>
          </div>
        )}
        {videosList?.map(video => (
          <div
            key={video.id}
            className="flex items-center gap-4 p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg
              hover:border-gray-700/50 transition-colors group"
          >
            {/* 视频预览 */}
            <div className="w-24 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
              <video
                src={storageUrl(video.videoUrl)}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-300 truncate">{video.title}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold
                  ${video.isNormal 
                    ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
                    : 'bg-red-900/30 text-red-400 border border-red-800/50'
                  }`}
                >
                  {video.isNormal ? '正常' : '异常'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-[10px] text-gray-600">
                  L{levelsList?.find(l => l.id === video.levelId)?.levelNumber || '?'}
                </span>
                {video.anomalyDescription && (
                  <span className="font-mono text-[10px] text-gray-500 truncate">
                    异常: {video.anomalyDescription}
                  </span>
                )}
              </div>
            </div>

            {/* 操作 */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleStartEdit(video)}
                className="px-2 py-1 text-[10px] font-mono text-blue-400 border border-blue-900/50 rounded
                  hover:bg-blue-900/20 transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => handleToggleType(video.id, video.isNormal)}
                className="px-2 py-1 text-[10px] font-mono text-gray-400 border border-gray-700 rounded
                  hover:text-gray-200 hover:border-gray-500 transition-colors"
              >
                切换类型
              </button>
              <button
                onClick={() => handleDelete(video.id)}
                className="px-2 py-1 text-[10px] font-mono text-red-400 border border-red-900/50 rounded
                  hover:bg-red-900/20 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 编辑弹窗 */}
      <AnimatePresence>
        {editingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setEditingVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-mono text-sm text-gray-200 font-bold">编辑视频</h3>
              
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1.5">标题</label>
                <input
                  type="text"
                  value={editingVideo.title}
                  onChange={e => setEditingVideo(v => v ? { ...v, title: e.target.value } : v)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
                    focus:border-[#E53935]/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1.5">所属层级</label>
                <select
                  value={editingVideo.levelId}
                  onChange={e => setEditingVideo(v => v ? { ...v, levelId: Number(e.target.value) } : v)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
                    focus:border-[#E53935]/50 focus:outline-none"
                >
                  {levelsList?.map(l => (
                    <option key={l.id} value={l.id}>L{l.levelNumber} - {l.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingVideo.isNormal}
                    onChange={e => setEditingVideo(v => v ? { ...v, isNormal: e.target.checked } : v)}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800"
                  />
                  <span className="font-mono text-xs text-gray-400">正常视频</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingVideo.enabled}
                    onChange={e => setEditingVideo(v => v ? { ...v, enabled: e.target.checked } : v)}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800"
                  />
                  <span className="font-mono text-xs text-gray-400">启用</span>
                </label>
              </div>

              {!editingVideo.isNormal && (
                <div>
                  <label className="block font-mono text-[10px] text-gray-500 mb-1.5">异常描述</label>
                  <input
                    type="text"
                    value={editingVideo.anomalyDescription}
                    onChange={e => setEditingVideo(v => v ? { ...v, anomalyDescription: e.target.value } : v)}
                    placeholder="描述AI编辑了什么异常..."
                    className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono px-3 py-2 rounded
                      focus:border-[#E53935]/50 focus:outline-none placeholder:text-gray-600"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 bg-[#E53935]/20 border border-[#E53935]/50 text-[#E53935] font-mono text-xs rounded
                    hover:bg-[#E53935]/30 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingVideo(null)}
                  className="flex-1 py-2 bg-gray-800 border border-gray-700 text-gray-400 font-mono text-xs rounded
                    hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 层级管理组件 */
function LevelManager() {
  const { data: levelsList, refetch: refetchLevels } = trpc.levels.list.useQuery();
  const seedMutation = trpc.levels.seed.useMutation();
  const updateMutation = trpc.levels.update.useMutation();

  const handleSeed = useCallback(async () => {
    try {
      await seedMutation.mutateAsync();
      toast.success('默认层级已初始化');
      refetchLevels();
    } catch (err: any) {
      toast.error(`初始化失败: ${err.message}`);
    }
  }, [seedMutation, refetchLevels]);

  const handleToggleEnabled = useCallback(async (id: number, currentEnabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, enabled: !currentEnabled });
      toast.success(`已${!currentEnabled ? '启用' : '禁用'}`);
      refetchLevels();
    } catch (err: any) {
      toast.error(`更新失败: ${err.message}`);
    }
  }, [updateMutation, refetchLevels]);

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSeed}
          className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 font-mono text-xs
            hover:bg-gray-700 transition-all duration-200 rounded"
        >
          初始化默认层级
        </button>
        <span className="font-mono text-[10px] text-gray-600">
          (L5进门 → L4电梯 → L3签到 → L2涂鸦 → L1室内开发)
        </span>
      </div>

      {/* 层级列表 */}
      <div className="space-y-2">
        {levelsList && levelsList.length === 0 && (
          <div className="text-center py-12 border border-dashed border-gray-800 rounded-lg">
            <p className="font-mono text-xs text-gray-600">暂无层级配置</p>
            <p className="font-mono text-[10px] text-gray-700 mt-1">点击"初始化默认层级"快速创建</p>
          </div>
        )}
        {levelsList?.map(level => (
          <div
            key={level.id}
            className="flex items-center gap-4 p-4 bg-gray-900/30 border border-gray-800/50 rounded-lg
              hover:border-gray-700/50 transition-colors"
          >
            {/* 层级编号 */}
            <div className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-lg
              ${level.enabled ? 'bg-[#E53935]/10 text-[#E53935] border border-[#E53935]/30' : 'bg-gray-800 text-gray-600 border border-gray-700'}`}
            >
              {level.levelNumber}
            </div>

            {/* 信息 */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-200">{level.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono
                  ${level.enabled 
                    ? 'bg-green-900/20 text-green-400' 
                    : 'bg-gray-800 text-gray-600'
                  }`}
                >
                  {level.enabled ? '启用' : '禁用'}
                </span>
              </div>
              {level.description && (
                <p className="font-mono text-[10px] text-gray-500 mt-0.5">{level.description}</p>
              )}
            </div>

            {/* 操作 */}
            <button
              onClick={() => handleToggleEnabled(level.id, level.enabled)}
              className={`px-3 py-1.5 text-[10px] font-mono rounded border transition-colors
                ${level.enabled
                  ? 'text-gray-400 border-gray-700 hover:text-red-400 hover:border-red-900/50'
                  : 'text-green-400 border-green-900/50 hover:bg-green-900/20'
                }`}
            >
              {level.enabled ? '禁用' : '启用'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
