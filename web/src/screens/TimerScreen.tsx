import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Copy, Trash2, Check, AlertTriangle, Trophy, BarChart2, Zap } from 'lucide-react';
import { SolveRecord, StandardMove, UserStats } from '../types/cube';
import { generateWcaScramble } from '../engine/cubeState';
import { SoundEngine } from '../utils/audio';
import { StorageService } from '../utils/storage';

interface TimerScreenProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
}

type TimerState = 'idle' | 'holding' | 'ready' | 'inspecting' | 'running' | 'stopped';

export const TimerScreen: React.FC<TimerScreenProps> = ({ userStats, onStatsUpdated }) => {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [inspectionSeconds, setInspectionSeconds] = useState(15);
  const [isInspectionEnabled, setIsInspectionEnabled] = useState(true);

  const [currentScramble, setCurrentScramble] = useState<StandardMove[]>(() => generateWcaScramble(20));
  const [solvesList, setSolvesList] = useState<SolveRecord[]>(() => StorageService.getSolves());
  const [copiedScramble, setCopiedScramble] = useState(false);
  const [latestSolve, setLatestSolve] = useState<SolveRecord | null>(null);

  const startTimeRef = useRef<number>(0);
  const holdTimeoutRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const inspectionIntervalRef = useRef<any>(null);

  const scrambleString = currentScramble.join(' ');

  // Format time (mm:ss.xx)
  const formatTime = (ms: number, penalty: 'none' | 'plusTwo' | 'dnf' = 'none') => {
    if (penalty === 'dnf') return 'DNF';
    const effectiveMs = penalty === 'plusTwo' ? ms + 2000 : ms;
    const totalSec = Math.floor(effectiveMs / 1000);
    const hundredths = Math.floor((effectiveMs % 1000) / 10);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;

    const secStr = seconds.toString().padStart(2, '0');
    const hundStr = hundredths.toString().padStart(2, '0');

    if (minutes > 0) {
      return `${minutes}:${secStr}.${hundStr}`;
    }
    return `${secStr}.${hundStr}`;
  };

  // Keyboard Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePointerDown();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePointerUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [timerState]);

  // Clean animation frame & timers
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
    };
  }, []);

  // Generate new scramble
  const generateNewScramble = () => {
    SoundEngine.playClickSound();
    setCurrentScramble(generateWcaScramble(20));
  };

  const copyScrambleText = () => {
    SoundEngine.playClickSound();
    navigator.clipboard.writeText(scrambleString).catch(() => {});
    setCopiedScramble(true);
    setTimeout(() => setCopiedScramble(false), 1500);
  };

  // Start Inspection countdown (15s WCA)
  const startInspection = () => {
    setTimerState('inspecting');
    setInspectionSeconds(15);

    if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);

    inspectionIntervalRef.current = setInterval(() => {
      setInspectionSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(inspectionIntervalRef.current!);
          // +2 or DNF if not started
          SoundEngine.playWarningBeep(true);
          return 0;
        }
        if (prev === 8 || prev === 4) {
          SoundEngine.playWarningBeep(prev === 4);
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Holding touch or space to prime the timer
  const handlePointerDown = () => {
    if (timerState === 'running') {
      // Stop timer!
      stopTimer();
      return;
    }

    if (timerState === 'inspecting') {
      // Readying during inspection
      setTimerState('holding');
      holdTimeoutRef.current = setTimeout(() => {
        SoundEngine.hapticTick();
        setTimerState('ready');
      }, 350);
      return;
    }

    if (timerState === 'idle' || timerState === 'stopped') {
      if (isInspectionEnabled) {
        startInspection();
      } else {
        setTimerState('holding');
        holdTimeoutRef.current = setTimeout(() => {
          SoundEngine.hapticTick();
          setTimerState('ready');
        }, 400);
      }
    }
  };

  // Releasing touch or space to start the timer
  const handlePointerUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    if (timerState === 'ready') {
      // Release to launch!
      if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
      startTimer();
    } else if (timerState === 'holding') {
      // Released too quickly
      setTimerState('idle');
    }
  };

  const startTimer = () => {
    SoundEngine.playTimerStartSound();
    setTimerState('running');
    startTimeRef.current = performance.now();

    const update = () => {
      setElapsedMs(Math.round(performance.now() - startTimeRef.current));
      animFrameRef.current = requestAnimationFrame(update);
    };
    animFrameRef.current = requestAnimationFrame(update);
  };

  const stopTimer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const finalTime = Math.round(performance.now() - startTimeRef.current);
    setElapsedMs(finalTime);
    setTimerState('stopped');
    SoundEngine.playTimerStopSound();

    // Record solve
    const record: SolveRecord = {
      id: Date.now().toString(),
      timeMs: finalTime,
      scramble: scrambleString,
      timestamp: Date.now(),
      penalty: 'none'
    };

    const { isNewPb, newStats } = StorageService.saveSolve(record);
    setLatestSolve(record);
    setSolvesList(StorageService.getSolves());
    onStatsUpdated(newStats);

    if (isNewPb) {
      SoundEngine.playSuccessFanfare();
    }

    // Prepare next scramble
    setCurrentScramble(generateWcaScramble(20));
  };

  // Penalties
  const handleTogglePenalty = (penalty: 'plusTwo' | 'dnf') => {
    if (!latestSolve) return;
    SoundEngine.playClickSound();

    const newPenalty: 'none' | 'plusTwo' | 'dnf' = latestSolve.penalty === penalty ? 'none' : penalty;
    const updated: SolveRecord = { ...latestSolve, penalty: newPenalty };
    setLatestSolve(updated);

    // Update in storage
    const list = StorageService.getSolves().map((s) => (s.id === updated.id ? updated : s));
    localStorage.setItem('cuberush_solves', JSON.stringify(list));
    setSolvesList(list);
  };

  const handleDeleteSolve = (id: string) => {
    SoundEngine.playClickSound();
    const list = StorageService.deleteSolve(id);
    setSolvesList(list);
    if (latestSolve?.id === id) setLatestSolve(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-28 pt-3 px-4 max-w-lg mx-auto select-none">
      {/* Scramble Header Card */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-3.5 mb-4 shadow-xl">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-bold text-cyber-cyan uppercase tracking-wider text-[11px]">
            WCA 3x3 Scramble
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyScrambleText}
              className="p-1 rounded-md text-gray-400 hover:text-white"
              title="Copy Scramble"
            >
              {copiedScramble ? <Check size={14} className="text-cyber-green" /> : <Copy size={14} />}
            </button>
            <button
              onClick={generateNewScramble}
              className="p-1 rounded-md text-gray-400 hover:text-white"
              title="New Scramble"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <p className="font-mono text-xs text-gray-200 tracking-wider leading-relaxed font-semibold">
          {scrambleString}
        </p>
      </div>

      {/* Main Touch Timer Pad Area */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`relative flex-1 flex flex-col items-center justify-center rounded-3xl border-2 transition-all cursor-pointer min-h-[300px] shadow-2xl p-6 ${
          timerState === 'ready'
            ? 'bg-cyber-green/10 border-cyber-green shadow-[0_0_35px_rgba(0,255,102,0.4)]'
            : timerState === 'holding'
            ? 'bg-cyber-magenta/10 border-cyber-magenta shadow-[0_0_25px_rgba(255,0,127,0.3)]'
            : timerState === 'inspecting'
            ? 'bg-cyber-yellow/10 border-cyber-yellow shadow-[0_0_25px_rgba(255,221,0,0.3)]'
            : timerState === 'running'
            ? 'bg-cyber-card/60 border-cyber-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
            : 'bg-cyber-card/80 border-cyber-border hover:border-gray-500'
        }`}
      >
        {/* Status prompt */}
        <div className="text-center mb-2">
          {timerState === 'inspecting' ? (
            <span className="text-sm font-black text-cyber-yellow uppercase tracking-widest animate-pulse">
              Inspection: {inspectionSeconds}s
            </span>
          ) : timerState === 'holding' ? (
            <span className="text-sm font-black text-cyber-magenta uppercase tracking-widest">
              Hold steady...
            </span>
          ) : timerState === 'ready' ? (
            <span className="text-base font-black text-cyber-green uppercase tracking-widest animate-bounce">
              Ready! Release to start
            </span>
          ) : timerState === 'running' ? (
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Tap anywhere to stop
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isInspectionEnabled ? 'Touch & Hold to inspect' : 'Touch & Hold to ready'}
            </span>
          )}
        </div>

        {/* Big Millisecond Digital Time */}
        <div
          className={`font-mono font-black tracking-tight select-none my-2 text-center transition-colors ${
            timerState === 'ready'
              ? 'text-cyber-green text-6xl'
              : timerState === 'holding'
              ? 'text-cyber-magenta text-6xl'
              : timerState === 'running'
              ? 'text-white text-6xl'
              : 'text-cyber-cyan text-6xl'
          }`}
        >
          {formatTime(elapsedMs, latestSolve?.penalty)}
        </div>

        {/* Penalties Bar (After solve) */}
        {timerState === 'stopped' && latestSolve && (
          <div className="flex items-center gap-2 mt-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleTogglePenalty('plusTwo')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                latestSolve.penalty === 'plusTwo'
                  ? 'bg-cyber-yellow text-black border-cyber-yellow'
                  : 'bg-cyber-surface border-cyber-border text-gray-300'
              }`}
            >
              +2s
            </button>
            <button
              onClick={() => handleTogglePenalty('dnf')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                latestSolve.penalty === 'dnf'
                  ? 'bg-cyber-magenta text-white border-cyber-magenta'
                  : 'bg-cyber-surface border-cyber-border text-gray-300'
              }`}
            >
              DNF
            </button>
            <button
              onClick={() => handleDeleteSolve(latestSolve.id)}
              className="p-2 rounded-xl bg-cyber-surface border border-cyber-border text-red-400 hover:text-red-300"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Session Statistics Bar */}
      <div className="grid grid-cols-4 gap-2 mt-4 mb-4">
        <div className="bg-cyber-card/80 border border-cyber-border rounded-xl p-2 text-center">
          <span className="text-[9px] text-gray-400 uppercase font-semibold">Best</span>
          <div className="text-xs font-black text-cyber-cyan mt-0.5">
            {formatTime(userStats.bestSingleMs || 0)}
          </div>
        </div>
        <div className="bg-cyber-card/80 border border-cyber-border rounded-xl p-2 text-center">
          <span className="text-[9px] text-gray-400 uppercase font-semibold">Ao5</span>
          <div className="text-xs font-black text-cyber-magenta mt-0.5">
            {formatTime(userStats.currentAo5Ms || 0)}
          </div>
        </div>
        <div className="bg-cyber-card/80 border border-cyber-border rounded-xl p-2 text-center">
          <span className="text-[9px] text-gray-400 uppercase font-semibold">Ao12</span>
          <div className="text-xs font-black text-cyber-yellow mt-0.5">
            {formatTime(userStats.currentAo12Ms || 0)}
          </div>
        </div>
        <div className="bg-cyber-card/80 border border-cyber-border rounded-xl p-2 text-center">
          <span className="text-[9px] text-gray-400 uppercase font-semibold">Solves</span>
          <div className="text-xs font-black text-white mt-0.5">
            {solvesList.length}
          </div>
        </div>
      </div>

      {/* Recent Solves History List */}
      <div className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Recent Solves
          </span>
          <button
            onClick={() => setIsInspectionEnabled(!isInspectionEnabled)}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${
              isInspectionEnabled
                ? 'bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/40'
                : 'bg-cyber-surface text-gray-500 border-cyber-border'
            }`}
          >
            {isInspectionEnabled ? '15s WCA Inspection ON' : 'Inspection OFF'}
          </button>
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {solvesList.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500">
              No solves recorded yet. Hold and release the timer to start!
            </div>
          ) : (
            solvesList.slice(0, 8).map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 rounded-xl bg-cyber-surface/40 text-xs border border-cyber-border/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-[10px] w-4 font-mono">{idx + 1}</span>
                  <span className="font-mono font-bold text-white">
                    {formatTime(s.timeMs, s.penalty)}
                  </span>
                  {s.penalty === 'plusTwo' && (
                    <span className="text-[10px] text-cyber-yellow font-bold">+2</span>
                  )}
                  {s.penalty === 'dnf' && (
                    <span className="text-[10px] text-cyber-magenta font-bold">DNF</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">
                    {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleDeleteSolve(s.id)}
                    className="text-gray-500 hover:text-red-400 p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
