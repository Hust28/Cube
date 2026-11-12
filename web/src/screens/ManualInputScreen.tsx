import React, { useState } from 'react';
import { RefreshCw, Check, ArrowRight, ArrowLeft, AlertCircle, Sparkles, Wand2, RotateCcw } from 'lucide-react';
import { CubeColor, CubeState, CUBE_COLORS, FaceId, FACE_NAMES, FACE_ORDER, STANDARD_FACE_CENTERS } from '../types/cube';
import { ThreeCube } from '../engine/ThreeCube';
import { createSolvedCube, generateWcaScramble, applyMove } from '../engine/cubeState';
import { validateCubeState } from '../solver/rubiksSolver';
import { SoundEngine } from '../utils/audio';

interface ManualInputScreenProps {
  initialState: CubeState;
  onSolveRequested: (state: CubeState) => void;
  onCancel: () => void;
}

export const ManualInputScreen: React.FC<ManualInputScreenProps> = ({
  initialState,
  onSolveRequested,
  onCancel
}) => {
  const [cubeState, setCubeState] = useState<CubeState>(() => initialState || createSolvedCube());
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const currentFace = FACE_ORDER[currentFaceIndex];

  const [selectedColor, setSelectedColor] = useState<CubeColor>('W');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate sticker count for each color
  const getColorCounts = () => {
    const counts: Record<CubeColor, number> = { W: 0, Y: 0, G: 0, B: 0, R: 0, O: 0 };
    FACE_ORDER.forEach((face) => {
      cubeState[face].forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  };

  const counts = getColorCounts();

  // Tap sticker in grid
  const handleStickerClick = (index: number) => {
    // Keep centers fixed to avoid impossible center rotations
    if (index === 4) {
      SoundEngine.playErrorBuzz();
      return;
    }

    SoundEngine.playClickSound();
    const updatedFace = [...cubeState[currentFace]];
    updatedFace[index] = selectedColor;

    setCubeState((prev) => ({
      ...prev,
      [currentFace]: updatedFace
    }));
    setValidationError(null);
  };

  // Reset current face
  const handleResetFace = () => {
    SoundEngine.playClickSound();
    const solved = createSolvedCube();
    setCubeState((prev) => ({
      ...prev,
      [currentFace]: [...solved[currentFace]]
    }));
  };

  // Reset entire cube
  const handleResetAll = () => {
    SoundEngine.playClickSound();
    setCubeState(createSolvedCube());
    setValidationError(null);
  };

  // Presets
  const handlePreset = (type: 'solved' | 'scramble' | 'checkerboard') => {
    SoundEngine.playClickSound();
    if (type === 'solved') {
      setCubeState(createSolvedCube());
    } else if (type === 'scramble') {
      const scramble = generateWcaScramble(16);
      let s = createSolvedCube();
      for (const m of scramble) {
        s = applyMove(s, m);
      }
      setCubeState(s);
    } else if (type === 'checkerboard') {
      // M2 E2 S2
      let s = createSolvedCube();
      const moves = ['R2', 'L2', 'U2', 'D2', 'F2', 'B2'];
      for (const m of moves) {
        s = applyMove(s, m as any);
      }
      setCubeState(s);
    }
    setValidationError(null);
  };

  // Validate and submit to solver
  const handleSolve = () => {
    SoundEngine.playClickSound();
    const val = validateCubeState(cubeState);
    if (!val.valid) {
      SoundEngine.playErrorBuzz();
      setValidationError(val.error || 'Invalid cube configuration.');
      return;
    }

    SoundEngine.playSuccessFanfare();
    onSolveRequested(cubeState);
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-gray-400 hover:text-white px-2 py-1 rounded-lg"
        >
          Cancel
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Manual Color Input</h2>
          <span className="text-[10px] text-cyber-cyan font-bold">
            Face: {FACE_NAMES[currentFace]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePreset('scramble')}
            title="Random Scramble"
            className="text-[11px] font-bold text-cyber-yellow bg-cyber-yellow/15 border border-cyber-yellow/30 px-2 py-1 rounded-lg hover:bg-cyber-yellow hover:text-black transition-colors"
          >
            Scramble
          </button>
        </div>
      </div>

      {/* Face Tabs */}
      <div className="flex items-center justify-between gap-1 mb-4 bg-cyber-card/70 p-1 rounded-xl border border-cyber-border">
        {FACE_ORDER.map((face, idx) => (
          <button
            key={face}
            onClick={() => {
              SoundEngine.playClickSound();
              setCurrentFaceIndex(idx);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${
              idx === currentFaceIndex
                ? 'bg-cyber-cyan text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{face}</span>
            <span
              className="w-2 h-2 rounded-full mt-0.5 border border-black/30"
              style={{ backgroundColor: CUBE_COLORS[STANDARD_FACE_CENTERS[face]].hex }}
            />
          </button>
        ))}
      </div>

      {/* Live 3D Preview Card + Large 3x3 Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Large 3x3 Input Face Grid */}
        <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-4 shadow-xl flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3 text-xs text-gray-400">
            <span className="font-semibold text-white">Tap to paint:</span>
            <div className="flex gap-2">
              <button
                onClick={handleResetFace}
                className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset Face
              </button>
              <button
                onClick={handleResetAll}
                className="text-[11px] text-cyber-magenta hover:underline"
              >
                Reset All
              </button>
            </div>
          </div>

          <div className="w-56 h-56 grid grid-cols-3 grid-rows-3 gap-2 p-2.5 bg-cyber-surface/90 border border-cyber-border rounded-2xl shadow-inner">
            {cubeState[currentFace].map((colCode, idx) => {
              const isCenter = idx === 4;
              const colorInfo = CUBE_COLORS[colCode] || CUBE_COLORS.W;

              return (
                <button
                  key={idx}
                  onClick={() => handleStickerClick(idx)}
                  style={{ backgroundColor: colorInfo.hex }}
                  className={`rounded-xl border-2 flex items-center justify-center transition-all ${
                    isCenter
                      ? 'border-black ring-2 ring-cyber-yellow/60 cursor-not-allowed'
                      : 'border-black/50 hover:scale-105 active:scale-95 shadow-md'
                  }`}
                >
                  {isCenter ? (
                    <span className="text-xs font-black text-black">
                      {currentFace}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <span className="text-[10px] text-gray-400 mt-2">
            Center sticker is fixed to standard orientation.
          </span>
        </div>

        {/* Live 3D Interactive Cube Preview */}
        <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-2 shadow-xl flex flex-col items-center justify-center relative min-h-[200px]">
          <span className="absolute top-2 left-3 text-[10px] font-bold text-cyber-cyan uppercase tracking-wider z-10">
            Live 3D Cube Preview
          </span>
          <div className="w-full h-48">
            <ThreeCube
              cubeState={cubeState}
              interactive={true}
              autoRotate={false}
              skin="cyberGlow"
              showControls={false}
            />
          </div>
        </div>
      </div>

      {/* Color Selection Palette with Counts */}
      <div className="bg-cyber-card/90 border border-cyber-border rounded-2xl p-3 mb-4 shadow-xl">
        <span className="text-xs font-bold text-gray-300 block mb-2">
          Color Palette (Need 9 of each color):
        </span>
        <div className="grid grid-cols-6 gap-2">
          {(['W', 'Y', 'G', 'B', 'R', 'O'] as CubeColor[]).map((col) => {
            const isSelected = selectedColor === col;
            const count = counts[col] || 0;
            const isComplete = count === 9;

            return (
              <button
                key={col}
                onClick={() => {
                  SoundEngine.playClickSound();
                  setSelectedColor(col);
                }}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-cyber-cyan bg-cyber-surface scale-105 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'border-cyber-border/60 bg-cyber-surface/40 hover:border-gray-400'
                }`}
              >
                <div
                  style={{ backgroundColor: CUBE_COLORS[col].hex }}
                  className="w-8 h-8 rounded-lg border border-black/40 shadow mb-1"
                />
                <span
                  className={`text-[10px] font-bold ${
                    isComplete
                      ? 'text-cyber-green'
                      : count > 9
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }`}
                >
                  {count}/9
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {validationError && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (currentFaceIndex > 0) {
              SoundEngine.playClickSound();
              setCurrentFaceIndex(currentFaceIndex - 1);
            }
          }}
          disabled={currentFaceIndex === 0}
          className={`px-4 py-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
            currentFaceIndex === 0
              ? 'opacity-40 border-cyber-border text-gray-500'
              : 'border-cyber-border bg-cyber-card text-gray-200 hover:text-white'
          }`}
        >
          <ArrowLeft size={16} /> Prev
        </button>

        <button
          onClick={() => {
            if (currentFaceIndex < FACE_ORDER.length - 1) {
              SoundEngine.playClickSound();
              setCurrentFaceIndex(currentFaceIndex + 1);
            }
          }}
          className="flex-1 py-3 rounded-xl bg-cyber-surface border border-cyber-border text-gray-200 font-bold text-xs hover:border-cyber-cyan transition-colors flex items-center justify-center gap-1.5"
        >
          {currentFaceIndex < FACE_ORDER.length - 1 ? 'Next Face' : 'Back to Top (U)'}
          <ArrowRight size={16} />
        </button>

        <button
          onClick={handleSolve}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-purple text-white font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Sparkles size={16} className="text-yellow-300" />
          Solve Cube
        </button>
      </div>
    </div>
  );
};
