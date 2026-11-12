import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Undo2, Redo2, RotateCcw, Shuffle, Sparkles, CheckCircle2, Eye, EyeOff, Palette, Keyboard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CubeState, CustomizationSettings, StandardMove, CUBE_COLORS } from '../types/cube';
import { ThreeCube } from '../engine/ThreeCube';
import { applyMove, createSolvedCube, generateWcaScramble, invertMove, isCubeSolved } from '../engine/cubeState';
import { SoundEngine } from '../utils/audio';

interface SandboxScreenProps {
  cubeState: CubeState;
  onCubeStateChange: (state: CubeState) => void;
  onSolveRequested: (state: CubeState) => void;
  settings: CustomizationSettings;
  onSkinChange: (skin: CustomizationSettings['skin']) => void;
}

export const SandboxScreen: React.FC<SandboxScreenProps> = ({
  cubeState,
  onCubeStateChange,
  onSolveRequested,
  settings,
  onSkinChange
}) => {
  const [undoStack, setUndoStack] = useState<StandardMove[]>([]);
  const [redoStack, setRedoStack] = useState<StandardMove[]>([]);
  const [activeMove, setActiveMove] = useState<StandardMove | null>(null);
  const [showNetInspector, setShowNetInspector] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isSolvedCelebrated, setIsSolvedCelebrated] = useState(false);

  // Distinguish between user forward moves and undo/redo executions
  const isUndoRedoActionRef = useRef<'undo' | 'redo' | null>(null);

  const solved = isCubeSolved(cubeState);

  // Trigger celebration on transition to solved
  useEffect(() => {
    if (solved && undoStack.length > 0 && !isSolvedCelebrated) {
      setIsSolvedCelebrated(true);
      SoundEngine.playSuccessFanfare();
      confetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.6 }
      });
    } else if (!solved) {
      setIsSolvedCelebrated(false);
    }
  }, [solved, undoStack.length, isSolvedCelebrated]);

  // Execute move from button, touch swipe, or keyboard
  const handleMoveExecuted = useCallback((move: StandardMove) => {
    // 1. Calculate & commit the new logical cube state
    const nextState = applyMove(cubeState, move);
    onCubeStateChange(nextState);

    // 2. Check if this move was triggered by Undo
    if (isUndoRedoActionRef.current === 'undo') {
      isUndoRedoActionRef.current = null;
      return;
    }

    // 3. Check if this move was triggered by Redo
    if (isUndoRedoActionRef.current === 'redo') {
      isUndoRedoActionRef.current = null;
      return;
    }

    // 4. Normal user forward move: push to undoStack, clear redoStack
    setUndoStack((prev) => [...prev, move]);
    setRedoStack([]);
  }, [cubeState, onCubeStateChange]);

  // Command a 3D animated move
  const trigger3DMove = useCallback((move: StandardMove) => {
    setActiveMove(move);
    // Reset activeMove on next frame so identical consecutive moves (e.g. U then U) trigger reliably
    setTimeout(() => setActiveMove(null), 30);
  }, []);

  // Undo last move
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    SoundEngine.playClickSound();

    const lastMove = undoStack[undoStack.length - 1];
    const inverse = invertMove(lastMove);

    isUndoRedoActionRef.current = 'undo';
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, lastMove]);

    trigger3DMove(inverse);
  }, [undoStack, trigger3DMove]);

  // Redo last undone move
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    SoundEngine.playClickSound();

    const nextMove = redoStack[redoStack.length - 1];

    isUndoRedoActionRef.current = 'redo';
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, nextMove]);

    trigger3DMove(nextMove);
  }, [redoStack, trigger3DMove]);

  // Scramble the cube
  const handleScramble = () => {
    SoundEngine.playClickSound();
    const scramble = generateWcaScramble(20);
    let s = createSolvedCube();
    for (const m of scramble) {
      s = applyMove(s, m);
    }
    onCubeStateChange(s);
    setUndoStack([]);
    setRedoStack([]);
    setIsSolvedCelebrated(false);
  };

  // Reset to solved state
  const handleReset = () => {
    SoundEngine.playClickSound();
    onCubeStateChange(createSolvedCube());
    setUndoStack([]);
    setRedoStack([]);
    setIsSolvedCelebrated(false);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Single Key Moves
      const key = e.key.toUpperCase();
      const validFaces = ['R', 'U', 'F', 'L', 'D', 'B'];

      if (validFaces.includes(key)) {
        e.preventDefault();
        const move: StandardMove = e.shiftKey ? (`${key}'` as StandardMove) : (key as StandardMove);
        trigger3DMove(move);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, trigger3DMove]);

  const primaryMoves: StandardMove[] = ['R', "R'", 'U', "U'", 'F', "F'"];
  const secondaryMoves: StandardMove[] = ['L', "L'", 'D', "D'", 'B', "B'"];
  const doubleMoves: StandardMove[] = ['R2', 'U2', 'F2', 'L2', 'D2', 'B2'];

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-28 pt-3 px-4 max-w-lg mx-auto select-none">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-cyber-card/85 border border-cyber-border rounded-2xl p-3 mb-3 shadow-lg backdrop-blur-md">
        <div>
          <span className="text-[10px] text-cyber-cyan font-bold uppercase tracking-wider">
            Real-Time 3D Engine
          </span>
          <h1 className="text-base font-black text-white">Interactive Sandbox</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo Move (Ctrl+Z)"
            className="p-2 rounded-xl bg-cyber-surface border border-cyber-border text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shadow"
          >
            <Undo2 size={16} />
          </button>

          {/* Redo Button */}
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo Move (Ctrl+Y)"
            className="p-2 rounded-xl bg-cyber-surface border border-cyber-border text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shadow"
          >
            <Redo2 size={16} />
          </button>

          {/* Reset Solved Button */}
          <button
            onClick={handleReset}
            title="Reset to Solved"
            className="p-2 rounded-xl bg-cyber-surface border border-cyber-border text-gray-300 hover:text-white active:scale-95 transition-all shadow"
          >
            <RotateCcw size={16} />
          </button>

          {/* Keyboard shortcut guide */}
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            title="Keyboard Shortcuts"
            className="p-2 rounded-xl bg-cyber-surface border border-cyber-border text-gray-400 hover:text-cyber-cyan active:scale-95 transition-all"
          >
            <Keyboard size={16} />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Overlay Banner */}
      {showKeyboardHelp && (
        <div className="bg-cyber-surface/90 border border-cyber-cyan/30 rounded-2xl p-3 mb-3 text-xs text-gray-300 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between mb-1.5 font-bold text-cyber-cyan">
            <span>Keyboard Shortcuts</span>
            <button onClick={() => setShowKeyboardHelp(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="font-mono bg-cyber-card px-1.5 py-0.5 rounded text-white border border-cyber-border">R U F L D B</span> : Turn Face Clockwise</div>
            <div><span className="font-mono bg-cyber-card px-1.5 py-0.5 rounded text-white border border-cyber-border">Shift + Key</span> : Counter-Clockwise (')</div>
            <div><span className="font-mono bg-cyber-card px-1.5 py-0.5 rounded text-white border border-cyber-border">Ctrl + Z</span> : Undo Move</div>
            <div><span className="font-mono bg-cyber-card px-1.5 py-0.5 rounded text-white border border-cyber-border">Ctrl + Y</span> : Redo Move</div>
          </div>
        </div>
      )}

      {/* Status & Move History Bar */}
      <div className="flex items-center justify-between px-2 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Moves:</span>
          <span className="font-mono font-black text-cyber-cyan">{undoStack.length}</span>
          {undoStack.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto max-w-[160px] py-0.5">
              {undoStack.slice(-4).map((m, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.2 rounded bg-cyber-surface border border-cyber-border font-mono text-[10px] text-cyber-cyan"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {solved ? (
          <div className="flex items-center gap-1 text-[11px] font-bold text-cyber-green bg-cyber-green/15 border border-cyber-green/30 px-2.5 py-0.5 rounded-full animate-pulse shadow">
            <CheckCircle2 size={13} />
            <span>Solved State</span>
          </div>
        ) : (
          <button
            onClick={() => onSolveRequested(cubeState)}
            className="text-[10px] font-bold text-cyber-yellow bg-cyber-yellow/15 border border-cyber-yellow/30 px-2.5 py-1 rounded-full hover:bg-cyber-yellow hover:text-black transition-colors flex items-center gap-1 shadow"
          >
            <Sparkles size={12} /> Solve This Cube
          </button>
        )}
      </div>

      {/* Main 3D Cube Canvas Frame */}
      <div className="relative rounded-3xl bg-cyber-card/90 border border-cyber-border overflow-hidden shadow-2xl h-72 flex items-center justify-center mb-3">
        <ThreeCube
          cubeState={cubeState}
          onMoveExecuted={handleMoveExecuted}
          activeMove={activeMove}
          interactive={true}
          enableFaceSwipe={true}
          autoRotate={false}
          skin={settings.skin}
          showControls={true}
        />

        {/* Touch gesture hint badge */}
        <div className="absolute top-2 left-3 bg-cyber-card/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-cyber-border/70 text-[10px] text-gray-300 pointer-events-none shadow">
          Swipe face to turn • Drag to orbit
        </div>
      </div>

      {/* Quick Action Buttons Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={handleScramble}
          className="flex-1 py-2 rounded-xl bg-cyber-surface border border-cyber-border hover:border-cyber-yellow text-gray-200 hover:text-cyber-yellow text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
        >
          <Shuffle size={14} /> Scramble (20)
        </button>

        <button
          onClick={() => setShowNetInspector(!showNetInspector)}
          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
            showNetInspector
              ? 'bg-cyber-cyan text-black border-cyber-cyan'
              : 'bg-cyber-surface border-cyber-border text-gray-300 hover:text-white'
          }`}
        >
          {showNetInspector ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{showNetInspector ? 'Hide Net' : '2D Net'}</span>
        </button>

        {/* Skin Selector */}
        <div className="flex items-center gap-1 bg-cyber-surface px-2 py-1 rounded-xl border border-cyber-border shadow">
          <Palette size={14} className="text-gray-400 mr-1" />
          {(['cyberGlow', 'classic', 'pastel', 'carbon'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                SoundEngine.playClickSound();
                onSkinChange(s);
              }}
              title={`Skin: ${s}`}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                settings.skin === s ? 'bg-cyber-magenta text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* Live 2D Unfolded Net State Inspector (Verifying actual cube state updates) */}
      {showNetInspector && (
        <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-3 mb-3 shadow-xl">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="font-bold text-gray-300">Live Logical Cube State (54 Stickers)</span>
            <span className="text-[10px] text-cyber-green font-semibold">100% Synced</span>
          </div>

          <div className="p-1 flex flex-col items-center justify-center scale-95">
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
        </div>
      )}

      {/* Manual Rotation Controls Panel */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-3 shadow-xl space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-semibold text-white">Manual Rotation Controls:</span>
          <span>Tap button, swipe face, or use keyboard</span>
        </div>

        {/* Row 1: R, R', U, U', F, F' */}
        <div className="grid grid-cols-6 gap-1.5">
          {primaryMoves.map((m) => (
            <button
              key={m}
              onClick={() => trigger3DMove(m)}
              className="py-2.5 rounded-xl bg-cyber-surface border border-cyber-border hover:border-cyber-cyan text-cyber-cyan font-black text-sm active:scale-90 hover:bg-cyber-cyan/10 transition-all shadow"
            >
              {m}
            </button>
          ))}
        </div>

        {/* Row 2: L, L', D, D', B, B' */}
        <div className="grid grid-cols-6 gap-1.5">
          {secondaryMoves.map((m) => (
            <button
              key={m}
              onClick={() => trigger3DMove(m)}
              className="py-2.5 rounded-xl bg-cyber-surface border border-cyber-border hover:border-cyber-magenta text-cyber-magenta font-black text-sm active:scale-90 hover:bg-cyber-magenta/10 transition-all shadow"
            >
              {m}
            </button>
          ))}
        </div>

        {/* Row 3: Double Turns */}
        <div className="grid grid-cols-6 gap-1.5 pt-1 border-t border-cyber-border/40">
          {doubleMoves.map((m) => (
            <button
              key={m}
              onClick={() => trigger3DMove(m)}
              className="py-1.5 rounded-lg bg-cyber-card border border-cyber-border text-gray-300 font-bold text-xs hover:border-cyber-yellow hover:text-cyber-yellow active:scale-90 transition-all"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
