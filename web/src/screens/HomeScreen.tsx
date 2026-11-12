import React, { useState } from 'react';
import { Camera, Edit3, Timer, BookOpen, Flame, Award, ChevronRight, Zap, RefreshCw, Trophy } from 'lucide-react';
import { CubeState, StandardMove, UserStats } from '../types/cube';
import { ThreeCube } from '../engine/ThreeCube';
import { ScreenId } from '../components/Navbar';
import { DailyChallenge, StorageService } from '../utils/storage';
import { applyMove, createSolvedCube, generateWcaScramble } from '../engine/cubeState';
import { SoundEngine } from '../utils/audio';

interface HomeScreenProps {
  userStats: UserStats;
  dailyChallenges: DailyChallenge[];
  onNavigate: (screen: ScreenId) => void;
  onSetCubeState: (state: CubeState) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userStats,
  dailyChallenges,
  onNavigate,
  onSetCubeState
}) => {
  const [heroCube, setHeroCube] = useState<CubeState>(() => {
    // Start with a cool scrambled cube for the hero
    const scramble = generateWcaScramble(10);
    let s = createSolvedCube();
    for (const m of scramble) {
      s = applyMove(s, m);
    }
    return s;
  });

  const [activeMove, setActiveMove] = useState<StandardMove | null>(null);

  const handleHeroMove = (move: StandardMove) => {
    setHeroCube((prev) => applyMove(prev, move));
  };

  const handleQuickScramble = () => {
    SoundEngine.playClickSound();
    const scramble = generateWcaScramble(14);
    let s = createSolvedCube();
    for (const m of scramble) {
      s = applyMove(s, m);
    }
    setHeroCube(s);
  };

  const handleSolveHero = () => {
    SoundEngine.playClickSound();
    onSetCubeState(heroCube);
    onNavigate('manual');
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return '--.--';
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = (totalSec % 60).toFixed(2);
    if (minutes > 0) {
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="flex flex-col min-h-screen pb-28 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Profile Header */}
      <div className="flex items-center justify-between bg-cyber-card/70 border border-cyber-border rounded-2xl p-3 backdrop-blur-md mb-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyber-purple via-cyber-magenta to-cyber-cyan p-[2px] shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full bg-cyber-card rounded-[10px] flex items-center justify-center font-black text-cyber-cyan text-lg">
                CR
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-cyber-magenta text-[9px] font-bold px-1.5 py-0.2 rounded-full text-white shadow">
              Lv.{userStats.level}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-sm">Cube Master</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyber-cyan/15 text-cyber-cyan font-semibold border border-cyber-cyan/30">
                {userStats.levelTitle}
              </span>
            </div>
            {/* XP progress bar */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-cyber-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-magenta rounded-full"
                  style={{ width: `${Math.min(100, ((userStats.xp % 500) / 500) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{userStats.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Daily Streak */}
        <div className="flex items-center gap-1.5 bg-cyber-surface/80 border border-amber-500/30 px-3 py-1.5 rounded-xl shadow-inner">
          <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
          <div className="text-right">
            <div className="text-xs font-black text-amber-300">{userStats.streakDays} Day</div>
            <div className="text-[9px] text-amber-400/80 font-medium uppercase tracking-wider">Streak</div>
          </div>
        </div>
      </div>

      {/* Hero 3D Rubik's Cube Card */}
      <div className="relative rounded-3xl bg-gradient-to-b from-cyber-card/90 via-cyber-surface/60 to-cyber-card/90 border border-cyber-border overflow-hidden shadow-2xl mb-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-purple" />

        {/* Hero Header Controls */}
        <div className="pt-3 px-4 flex items-center justify-between z-10 relative">
          <div>
            <div className="flex items-center gap-1.5 text-cyber-cyan text-xs font-bold uppercase tracking-wider">
              <Zap size={14} className="fill-cyber-cyan" />
              <span>Interactive 3D Engine</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">CubeRush 3D</h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('sandbox')}
              title="Open 3D Sandbox with Undo/Redo"
              className="px-2.5 py-1.5 rounded-xl bg-cyber-surface/80 border border-cyber-border text-cyber-cyan font-bold text-xs hover:border-cyber-cyan transition-colors"
            >
              Sandbox
            </button>
            <button
              onClick={handleQuickScramble}
              title="Scramble 3D Cube"
              className="p-2 rounded-xl bg-cyber-surface/80 border border-cyber-border text-gray-300 hover:text-white hover:border-cyber-cyan transition-colors"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={handleSolveHero}
              title="Solve This Cube"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-600 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95 transition-all"
            >
              Solve It
            </button>
          </div>
        </div>

        {/* 3D Canvas Box */}
        <div className="w-full h-64 relative">
          <ThreeCube
            cubeState={heroCube}
            onMoveExecuted={handleHeroMove}
            activeMove={activeMove}
            interactive={true}
            autoRotate={false}
            skin="cyberGlow"
            showControls={true}
          />
        </div>

        {/* Interactive Layer Turn Buttons */}
        <div className="px-3 pb-3 pt-1 border-t border-cyber-border/40 bg-cyber-card/40 flex items-center justify-between text-xs">
          <span className="text-[11px] text-gray-400">Quick moves:</span>
          <div className="flex items-center gap-1.5">
            {(['R', "R'", 'U', "U'", 'F', "F'"] as StandardMove[]).map((move) => (
              <button
                key={move}
                onClick={() => {
                  SoundEngine.playTurnSound();
                  setActiveMove(move);
                }}
                className="w-8 h-7 rounded-lg bg-cyber-surface/80 border border-cyber-border text-cyber-cyan font-bold hover:bg-cyber-cyan hover:text-black transition-all active:scale-90"
              >
                {move}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Action Grid (4 Big Feature Cards) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Camera Scanner */}
        <button
          onClick={() => {
            SoundEngine.playClickSound();
            onNavigate('scanner');
          }}
          className="group relative flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-cyber-card to-cyber-surface border border-cyber-cyan/30 hover:border-cyber-cyan shadow-lg hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all active:scale-98 text-left overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan mb-3 group-hover:scale-110 transition-transform">
            <Camera size={22} />
          </div>
          <span className="text-xs font-bold text-cyber-cyan uppercase tracking-wider">AI Scanner</span>
          <span className="text-sm font-black text-white">Scan My Cube</span>
          <span className="text-[11px] text-gray-400 mt-0.5">Camera color detection</span>
        </button>

        {/* Manual Input */}
        <button
          onClick={() => {
            SoundEngine.playClickSound();
            onNavigate('manual');
          }}
          className="group relative flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-cyber-card to-cyber-surface border border-cyber-magenta/30 hover:border-cyber-magenta shadow-lg hover:shadow-[0_0_20px_rgba(255,0,127,0.25)] transition-all active:scale-98 text-left overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-cyber-magenta/15 border border-cyber-magenta/40 flex items-center justify-center text-cyber-magenta mb-3 group-hover:scale-110 transition-transform">
            <Edit3 size={22} />
          </div>
          <span className="text-xs font-bold text-cyber-magenta uppercase tracking-wider">Color Picker</span>
          <span className="text-sm font-black text-white">Solve My Cube</span>
          <span className="text-[11px] text-gray-400 mt-0.5">Custom face coloring</span>
        </button>

        {/* Speedcubing Timer */}
        <button
          onClick={() => {
            SoundEngine.playClickSound();
            onNavigate('timer');
          }}
          className="group relative flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-cyber-card to-cyber-surface border border-cyber-yellow/30 hover:border-cyber-yellow shadow-lg hover:shadow-[0_0_20px_rgba(255,221,0,0.25)] transition-all active:scale-98 text-left overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-cyber-yellow/15 border border-cyber-yellow/40 flex items-center justify-center text-cyber-yellow mb-3 group-hover:scale-110 transition-transform">
            <Timer size={22} />
          </div>
          <span className="text-xs font-bold text-cyber-yellow uppercase tracking-wider">Pro Timer</span>
          <span className="text-sm font-black text-white">Speedcubing</span>
          <span className="text-[11px] text-gray-400 mt-0.5">WCA scramble & Ao5</span>
        </button>

        {/* Learning Academy */}
        <button
          onClick={() => {
            SoundEngine.playClickSound();
            onNavigate('academy');
          }}
          className="group relative flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-cyber-card to-cyber-surface border border-cyber-purple/30 hover:border-cyber-purple shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all active:scale-98 text-left overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-cyber-purple/15 border border-cyber-purple/40 flex items-center justify-center text-cyber-purple mb-3 group-hover:scale-110 transition-transform">
            <BookOpen size={22} />
          </div>
          <span className="text-xs font-bold text-cyber-purple uppercase tracking-wider">9 Lessons</span>
          <span className="text-sm font-black text-white">Learn to Solve</span>
          <span className="text-[11px] text-gray-400 mt-0.5">From zero to hero</span>
        </button>
      </div>

      {/* Personal Stats Snapshot */}
      <div className="bg-cyber-card/70 border border-cyber-border rounded-2xl p-4 backdrop-blur-md mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cyber-yellow" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Personal Records</h3>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="text-[11px] text-cyber-cyan hover:underline flex items-center gap-1 font-semibold"
          >
            Full Stats <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-cyber-surface/60 rounded-xl p-2.5 border border-cyber-border/60 text-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Best Single</span>
            <div className="text-base font-black text-cyber-cyan mt-0.5">
              {formatTime(userStats.bestSingleMs)}
            </div>
          </div>
          <div className="bg-cyber-surface/60 rounded-xl p-2.5 border border-cyber-border/60 text-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Best Ao5</span>
            <div className="text-base font-black text-cyber-magenta mt-0.5">
              {formatTime(userStats.bestAo5Ms)}
            </div>
          </div>
          <div className="bg-cyber-surface/60 rounded-xl p-2.5 border border-cyber-border/60 text-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Solves</span>
            <div className="text-base font-black text-cyber-yellow mt-0.5">
              {userStats.totalSolves}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="bg-cyber-card/70 border border-cyber-border rounded-2xl p-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyber-magenta" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Daily Quests</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">Resets daily</span>
        </div>

        <div className="space-y-2.5">
          {dailyChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="flex items-center justify-between bg-cyber-surface/50 border border-cyber-border/50 rounded-xl p-2.5"
            >
              <div className="flex-1 mr-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-200">{challenge.title}</span>
                  <span className="text-[10px] text-cyber-yellow font-bold">+{challenge.xpReward} XP</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-1.5">{challenge.description}</p>
                <div className="w-full h-1.5 bg-cyber-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyber-magenta rounded-full"
                    style={{ width: `${Math.min(100, (challenge.current / challenge.target) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-xs font-bold text-gray-400 min-w-[36px] text-right">
                {challenge.current}/{challenge.target}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
