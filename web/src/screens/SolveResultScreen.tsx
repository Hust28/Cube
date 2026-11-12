import React from 'react';
import { Play, Sparkles, CheckCircle2, ArrowLeft, Clock, Zap, Layers, RefreshCw } from 'lucide-react';
import { SolveResult, StandardMove } from '../types/cube';
import { SoundEngine } from '../utils/audio';

interface SolveResultScreenProps {
  result: SolveResult;
  onStartStepByStep: () => void;
  onBackToEdit: () => void;
}

export const SolveResultScreen: React.FC<SolveResultScreenProps> = ({
  result,
  onStartStepByStep,
  onBackToEdit
}) => {
  const estimatedSeconds = Math.round(result.moveCount * 2.5);
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = estimatedSeconds % 60;
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBackToEdit}
          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Solution Ready</h2>
        <div className="w-12" />
      </div>

      {/* Hero Victory Card */}
      <div className="bg-gradient-to-br from-cyber-card via-cyber-surface to-cyber-card border border-cyber-cyan/40 rounded-3xl p-5 mb-5 shadow-[0_0_30px_rgba(0,240,255,0.2)] text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyber-cyan/20 border border-cyber-cyan flex items-center justify-center text-cyber-cyan mb-3 shadow-[0_0_20px_rgba(0,240,255,0.5)]">
          <Sparkles size={28} />
        </div>

        <h1 className="text-xl font-black text-white tracking-tight mb-1">Cube Solved!</h1>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          Optimized solution computed using two-phase layer algorithms.
        </p>

        {/* Big Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-cyber-card/80 rounded-2xl p-3 border border-cyber-border">
            <div className="flex items-center justify-center text-cyber-cyan mb-1">
              <Zap size={14} />
            </div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Total Moves</span>
            <div className="text-xl font-black text-white mt-0.5">{result.moveCount}</div>
          </div>

          <div className="bg-cyber-card/80 rounded-2xl p-3 border border-cyber-border">
            <div className="flex items-center justify-center text-cyber-magenta mb-1">
              <Clock size={14} />
            </div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Est. Time</span>
            <div className="text-xl font-black text-white mt-0.5">{timeFormatted}</div>
          </div>

          <div className="bg-cyber-card/80 rounded-2xl p-3 border border-cyber-border">
            <div className="flex items-center justify-center text-cyber-yellow mb-1">
              <Layers size={14} />
            </div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Difficulty</span>
            <div className="text-sm font-black text-cyber-yellow mt-1">{result.difficulty}</div>
          </div>
        </div>
      </div>

      {/* Phase Breakdown */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-4 mb-5 shadow-lg">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
          Solving Phases
        </h3>
        <div className="space-y-2">
          {result.phases.map((phase, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-cyber-surface/50 border border-cyber-border/40 text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-cyber-green shrink-0" />
                <span className="font-semibold text-gray-200">{phase.name}</span>
              </div>
              <span className="text-gray-400 font-medium">{phase.moveCount} moves</span>
            </div>
          ))}
        </div>
      </div>

      {/* Move Sequence Preview */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Move Sequence ({result.solutionMoves.length})
          </h3>
          <span className="text-[10px] text-gray-500">WCA Notation</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
          {result.solutionMoves.map((m, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg bg-cyber-surface text-cyber-cyan border border-cyber-cyan/30 text-xs font-bold tracking-wider"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Launch Step-by-Step Guide Button */}
      <button
        onClick={() => {
          SoundEngine.playClickSound();
          onStartStepByStep();
        }}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-purple text-white font-black text-sm shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <Play size={18} className="fill-white" />
        Start 3D Step-by-Step Guide
      </button>
    </div>
  );
};
