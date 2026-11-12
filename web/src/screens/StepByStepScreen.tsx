import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ArrowLeft, Volume2, Sparkles, Check, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CubeState, SolutionStep, SolveResult, StandardMove, CUBE_COLORS } from '../types/cube';
import { ThreeCube } from '../engine/ThreeCube';
import { applyMove, cloneCubeState } from '../engine/cubeState';
import { SoundEngine } from '../utils/audio';

interface StepByStepScreenProps {
  initialCubeState: CubeState;
  solveResult: SolveResult;
  onExit: () => void;
  onFinished: () => void;
}

export const StepByStepScreen: React.FC<StepByStepScreenProps> = ({
  initialCubeState,
  solveResult,
  onExit,
  onFinished
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1.0);
  const [cubeState, setCubeState] = useState<CubeState>(() => cloneCubeState(initialCubeState));
  const [activeMove, setActiveMove] = useState<StandardMove | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isCompleted, setIsCompleted] = useState(false);

  const steps = solveResult.steps;
  const currentStep = steps[currentStepIndex] || steps[0];

  const timerRef = useRef<any>(null);

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle step advance
  const advanceStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      const move = steps[currentStepIndex].move;
      // Trigger move on 3D cube
      setActiveMove(move);
      setCubeState((prev) => applyMove(prev, move));
      setCurrentStepIndex(nextIdx);
    } else if (currentStepIndex === steps.length - 1) {
      // Final move
      const move = steps[currentStepIndex].move;
      setActiveMove(move);
      setCubeState((prev) => applyMove(prev, move));
      setIsPlaying(false);
      setIsCompleted(true);
      SoundEngine.playSuccessFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      onFinished();
    }
  };

  // Play / Pause auto playback
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1800 / playSpeed);
      timerRef.current = setInterval(() => {
        advanceStep();
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, playSpeed]);

  const handleNext = () => {
    SoundEngine.playClickSound();
    setIsPlaying(false);
    advanceStep();
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      SoundEngine.playClickSound();
      setIsPlaying(false);
      // Recompute cube state up to prev step
      let s = cloneCubeState(initialCubeState);
      for (let i = 0; i < currentStepIndex - 1; i++) {
        s = applyMove(s, steps[i].move);
      }
      setCubeState(s);
      setCurrentStepIndex(currentStepIndex - 1);
      setIsCompleted(false);
    }
  };

  const handleReset = () => {
    SoundEngine.playClickSound();
    setIsPlaying(false);
    setCubeState(cloneCubeState(initialCubeState));
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  const jumpToStep = (index: number) => {
    SoundEngine.playClickSound();
    setIsPlaying(false);
    let s = cloneCubeState(initialCubeState);
    for (let i = 0; i < index; i++) {
      s = applyMove(s, steps[i].move);
    }
    setCubeState(s);
    setCurrentStepIndex(index);
    setIsCompleted(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Exit Guide
        </button>

        <div className="flex items-center gap-1 bg-cyber-card p-1 rounded-xl border border-cyber-border text-xs">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              viewMode === '3d' ? 'bg-cyber-cyan text-black' : 'text-gray-400'
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              viewMode === '2d' ? 'bg-cyber-cyan text-black' : 'text-gray-400'
            }`}
          >
            2D Net
          </button>
        </div>

        <button
          onClick={handleReset}
          title="Restart Solution"
          className="p-1.5 rounded-lg bg-cyber-card border border-cyber-border text-gray-400 hover:text-white"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Progress Bar & Phase Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-cyber-cyan uppercase tracking-wider text-[11px]">
            {currentStep?.phase || 'Solving'}
          </span>
          <span className="font-bold text-gray-400">
            Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}
          </span>
        </div>
        <div className="w-full h-2 bg-cyber-card rounded-full overflow-hidden border border-cyber-border/40">
          <div
            className="h-full bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-purple transition-all duration-300"
            style={{ width: `${((currentStepIndex + (isCompleted ? 1 : 0)) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Interactive Cube Display */}
      <div className="relative rounded-3xl bg-cyber-card/90 border border-cyber-border overflow-hidden shadow-2xl mb-4 h-64 flex items-center justify-center">
        {viewMode === '3d' ? (
          <ThreeCube
            cubeState={cubeState}
            activeMove={activeMove}
            interactive={true}
            autoRotate={false}
            skin="cyberGlow"
            showControls={true}
          />
        ) : (
          /* 2D Flat Unfolded Net View */
          <div className="p-2 flex flex-col items-center justify-center scale-90">
            {/* Top (U) */}
            <div className="grid grid-cols-3 gap-0.5 mb-1">
              {cubeState.U.map((c, i) => (
                <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-4 h-4 rounded-sm border border-black/50" />
              ))}
            </div>
            {/* Middle row: L, F, R, B */}
            <div className="flex gap-1 mb-1">
              <div className="grid grid-cols-3 gap-0.5">
                {cubeState.L.map((c, i) => (
                  <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-4 h-4 rounded-sm border border-black/50" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {cubeState.F.map((c, i) => (
                  <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-4 h-4 rounded-sm border border-black/50" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {cubeState.R.map((c, i) => (
                  <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-4 h-4 rounded-sm border border-black/50" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {cubeState.B.map((c, i) => (
                  <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-4 h-4 rounded-sm border border-black/50" />
                ))}
              </div>
            </div>
            {/* Bottom (D) */}
            <div className="grid grid-cols-3 gap-0.5">
              {cubeState.D.map((c, i) => (
                <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-4 h-4 rounded-sm border border-black/50" />
              ))}
            </div>
          </div>
        )}

        {/* Move notation badge overlay */}
        <div className="absolute top-3 left-3 bg-cyber-card/90 backdrop-blur-md border border-cyber-cyan/50 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-lg">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Move</span>
          <span className="text-xl font-black text-cyber-cyan tracking-wider">
            {currentStep?.move}
          </span>
        </div>
      </div>

      {/* Step Explanation Card */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-4 mb-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              {currentStep?.explanation.title}
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed mb-2">
              {currentStep?.explanation.instruction}
            </p>
            {currentStep?.explanation.tip && (
              <div className="flex items-center gap-1.5 text-[11px] text-cyber-yellow bg-cyber-yellow/10 border border-cyber-yellow/20 px-2.5 py-1 rounded-xl">
                <Sparkles size={13} className="shrink-0" />
                <span>Tip: {currentStep.explanation.tip}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls & Speed Bar */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-3 shadow-xl mb-4 flex items-center justify-between">
        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-cyber-surface px-2 py-1 rounded-xl border border-cyber-border text-xs">
          {[0.5, 1.0, 2.0].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                SoundEngine.playClickSound();
                setPlaySpeed(spd);
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                playSpeed === spd ? 'bg-cyber-cyan text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Navigation Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-3 rounded-xl bg-cyber-surface border border-cyber-border text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={() => {
              SoundEngine.playClickSound();
              setIsPlaying(!isPlaying);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-cyber-cyan to-blue-600 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={20} className="fill-black" /> : <Play size={20} className="fill-black ml-0.5" />}
          </button>

          <button
            onClick={handleNext}
            disabled={isCompleted}
            className="p-3 rounded-xl bg-cyber-surface border border-cyber-border text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <button
          onClick={advanceStep}
          className="text-xs font-bold text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/30 px-3 py-2 rounded-xl hover:bg-cyber-cyan hover:text-black transition-colors"
        >
          Next Move
        </button>
      </div>

      {/* Horizontal Move Strip Checklist */}
      <div className="bg-cyber-card/70 border border-cyber-border rounded-2xl p-3 shadow-lg">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
          All Moves (Tap to jump):
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {steps.map((st, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={idx}
                onClick={() => jumpToStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                  isCurrent
                    ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-[0_0_12px_rgba(0,240,255,0.5)] scale-105'
                    : isDone
                    ? 'bg-cyber-surface text-gray-400 border-cyber-border/40 line-through opacity-70'
                    : 'bg-cyber-surface/60 text-gray-300 border-cyber-border hover:border-gray-400'
                }`}
              >
                {st.move}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
