import React, { useState } from 'react';
import { User, Trophy, Award, Palette, Settings, Volume2, Smartphone, RotateCcw, Share2, Sparkles, Flame, Check, Shield } from 'lucide-react';
import { CustomizationSettings, UserStats } from '../types/cube';
import { StorageService, Achievement } from '../utils/storage';
import { SoundEngine } from '../utils/audio';

interface ProfileScreenProps {
  userStats: UserStats;
  settings: CustomizationSettings;
  onStatsUpdated: (stats: UserStats) => void;
  onSettingsUpdated: (settings: CustomizationSettings) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userStats,
  settings,
  onStatsUpdated,
  onSettingsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'custom' | 'settings'>('stats');
  const [achievements, setAchievements] = useState<Achievement[]>(() => StorageService.getAchievements());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const solves = StorageService.getSolves();

  const formatTime = (ms: number | null) => {
    if (!ms) return '--.--';
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = (totalSec % 60).toFixed(2);
    if (minutes > 0) return `${minutes}:${seconds.padStart(5, '0')}`;
    return `${seconds}s`;
  };

  const handleToggleSound = () => {
    const next = !settings.soundEnabled;
    SoundEngine.soundEnabled = next;
    const updated = { ...settings, soundEnabled: next };
    onSettingsUpdated(updated);
    StorageService.saveSettings(updated);
  };

  const handleToggleHaptics = () => {
    const next = !settings.hapticsEnabled;
    SoundEngine.hapticsEnabled = next;
    const updated = { ...settings, hapticsEnabled: next };
    onSettingsUpdated(updated);
    StorageService.saveSettings(updated);
    if (next) SoundEngine.hapticTick();
  };

  const handleSkinChange = (skin: CustomizationSettings['skin']) => {
    SoundEngine.playClickSound();
    const updated = { ...settings, skin };
    onSettingsUpdated(updated);
    StorageService.saveSettings(updated);
  };

  const handleShareStats = () => {
    SoundEngine.playClickSound();
    const shareText = `⚡ CubeRush 3D Stats ⚡\n🏆 Level: ${userStats.level} (${userStats.levelTitle})\n🔥 Streak: ${userStats.streakDays} Days\n⏱️ Best Single: ${formatTime(userStats.bestSingleMs)}\n🎯 Best Ao5: ${formatTime(userStats.bestAo5Ms)}\n🧩 Total Solves: ${userStats.totalSolves}\nTwist. Learn. Solve. Dominate!`;
    navigator.clipboard.writeText(shareText).catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  };

  const handleResetData = () => {
    SoundEngine.playErrorBuzz();
    StorageService.resetAllData();
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-28 pt-4 px-4 max-w-lg mx-auto">
      {/* User Header Profile Card */}
      <div className="bg-gradient-to-br from-cyber-card via-cyber-surface to-cyber-card border border-cyber-border rounded-3xl p-5 mb-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyber-cyan via-cyber-magenta to-cyber-purple p-[2px] shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full bg-cyber-card rounded-[14px] flex items-center justify-center">
                <span className="text-2xl font-black text-cyber-cyan">CR</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-cyber-magenta text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow">
              Lv.{userStats.level}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Speedcuber</h2>
              <button
                onClick={handleShareStats}
                className="p-1.5 rounded-xl bg-cyber-surface/80 border border-cyber-border text-cyber-cyan hover:text-white"
                title="Share Stats"
              >
                <Share2 size={16} />
              </button>
            </div>
            <div className="text-xs text-cyber-cyan font-bold mb-2">{userStats.levelTitle}</div>

            {/* XP Bar */}
            <div className="w-full h-2 bg-cyber-surface rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-magenta rounded-full"
                style={{ width: `${Math.min(100, ((userStats.xp % 500) / 500) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{userStats.xp} Total XP</span>
              <span className="flex items-center gap-1 text-amber-300 font-bold">
                <Flame size={12} className="fill-amber-400 text-amber-400" />
                {userStats.streakDays}d Streak
              </span>
            </div>
          </div>
        </div>

        {shareToast && (
          <div className="mt-3 py-1.5 px-3 rounded-xl bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan text-xs font-bold text-center">
            Stats copied to clipboard! Ready to share.
          </div>
        )}
      </div>

      {/* Subtabs Menu */}
      <div className="flex items-center justify-between gap-1 mb-4 bg-cyber-card/80 p-1 rounded-2xl border border-cyber-border text-xs">
        {[
          { id: 'stats', label: 'Stats', icon: Trophy },
          { id: 'achievements', label: 'Badges', icon: Award },
          { id: 'custom', label: 'Custom', icon: Palette },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                SoundEngine.playClickSound();
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                active
                  ? 'bg-cyber-cyan text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Main 4-grid stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Best Single</span>
              <div className="text-xl font-black text-cyber-cyan mt-1">
                {formatTime(userStats.bestSingleMs)}
              </div>
            </div>
            <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Best Ao5</span>
              <div className="text-xl font-black text-cyber-magenta mt-1">
                {formatTime(userStats.bestAo5Ms)}
              </div>
            </div>
            <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Current Ao12</span>
              <div className="text-xl font-black text-cyber-yellow mt-1">
                {formatTime(userStats.currentAo12Ms)}
              </div>
            </div>
            <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Solves</span>
              <div className="text-xl font-black text-white mt-1">
                {userStats.totalSolves}
              </div>
            </div>
          </div>

          {/* Time Progression Bar Chart */}
          <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 shadow-lg">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              Solving Time History
            </h3>
            {solves.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                Complete solves in the Timer to view your chart.
              </p>
            ) : (
              <div className="flex items-end gap-1.5 h-28 pt-4">
                {solves.slice(0, 16).reverse().map((s, idx) => {
                  const maxTime = Math.max(...solves.slice(0, 16).map((x) => x.timeMs), 60000);
                  const heightPercent = Math.min(100, Math.max(15, (s.timeMs / maxTime) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-cyber-cyan/50 to-cyber-cyan hover:to-cyber-magenta transition-all"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[8px] text-gray-500">{idx + 1}</span>

                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 hidden group-hover:block bg-black px-1.5 py-0.5 rounded text-[9px] font-mono text-cyber-cyan whitespace-nowrap z-20">
                        {formatTime(s.timeMs)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Achievements */}
      {activeTab === 'achievements' && (
        <div className="space-y-2.5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                ach.unlocked
                  ? 'bg-cyber-card border-cyber-cyan/40 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : 'bg-cyber-card/40 border-cyber-border/40 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl p-2 rounded-xl bg-cyber-surface border border-cyber-border">
                  {ach.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                    {ach.unlocked && (
                      <span className="text-[9px] bg-cyber-cyan/20 text-cyber-cyan px-1.5 py-0.2 rounded font-semibold border border-cyber-cyan/30">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{ach.description}</p>
                </div>
              </div>
              <span className="text-xs font-black text-cyber-yellow">+{ach.xpReward} XP</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Customization */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 shadow-lg">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              3D Cube Skins
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'cyberGlow', name: 'Cyber Glow', desc: 'Neon glowing stickers' },
                { id: 'classic', name: 'Classic Glossy', desc: 'Standard glossy cube' },
                { id: 'pastel', name: 'Matte Pastel', desc: 'Soft minimal aesthetic' },
                { id: 'carbon', name: 'Carbon Fiber', desc: 'Dark stealth borders' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSkinChange(s.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.skin === s.id
                      ? 'border-cyber-cyan bg-cyber-surface shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'border-cyber-border bg-cyber-card/50 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{s.name}</span>
                    {settings.skin === s.id && <Check size={14} className="text-cyber-cyan" />}
                  </div>
                  <span className="text-[10px] text-gray-400">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Audio & Haptics
            </h3>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-cyber-cyan" />
                <div>
                  <div className="text-xs font-bold text-white">Sound Effects</div>
                  <div className="text-[10px] text-gray-400">Cube turns, clicks & fanfare</div>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.soundEnabled ? 'bg-cyber-cyan' : 'bg-cyber-surface'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-black transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Haptic Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-cyber-magenta" />
                <div>
                  <div className="text-xs font-bold text-white">Vibration & Haptics</div>
                  <div className="text-[10px] text-gray-400">Android tactile feedback</div>
                </div>
              </div>
              <button
                onClick={handleToggleHaptics}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.hapticsEnabled ? 'bg-cyber-magenta' : 'bg-cyber-surface'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Reset progress */}
          <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 shadow-lg">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Data Management
            </h3>
            {showResetConfirm ? (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40">
                <p className="text-xs text-red-200 mb-3">
                  Are you sure? This will permanently delete all solves, XP, and streak records.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 rounded-lg bg-cyber-surface border border-cyber-border text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetData}
                    className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} /> Reset All Progress
              </button>
            )}
          </div>

          {/* About */}
          <div className="text-center py-4 text-xs text-gray-500">
            <p className="font-bold text-gray-400">CubeRush 3D v1.0.0</p>
            <p className="text-[10px] mt-0.5">Twist. Learn. Solve. Dominate.</p>
          </div>
        </div>
      )}
    </div>
  );
};
