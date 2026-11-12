import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Zap,
  RefreshCw,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Eye,
  Sliders,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import {
  CubeColor,
  CubeState,
  CUBE_COLORS,
  FaceId,
  FACE_NAMES,
  FACE_ORDER,
  STANDARD_FACE_CENTERS
} from '../types/cube';
import { SoundEngine } from '../utils/audio';
import { createSolvedCube, generateWcaScramble, applyMove } from '../engine/cubeState';
import { validateCubeState } from '../solver/rubiksSolver';
import { classifyColor, sampleRoiColor, RgbColor } from '../utils/colorDetector';

interface ScannerScreenProps {
  onCubeScanned: (state: CubeState) => void;
  onCancel: () => void;
}

// Visual face orientation instructions
const ORIENTATION_GUIDES: Record<FaceId, { title: string; subtitle: string; tip: string }> = {
  U: {
    title: 'Top Face (White Center)',
    subtitle: 'Hold cube: White on Top, Green facing Front',
    tip: 'Align White center in middle, Green side at the bottom of the viewfinder'
  },
  L: {
    title: 'Left Face (Orange Center)',
    subtitle: 'Rotate cube 90° right: Orange facing camera',
    tip: 'Keep White on the Top, Green side on the Right'
  },
  F: {
    title: 'Front Face (Green Center)',
    subtitle: 'Rotate cube 90° right: Green facing camera',
    tip: 'Keep White on the Top, Red side on the Right'
  },
  R: {
    title: 'Right Face (Red Center)',
    subtitle: 'Rotate cube 90° right: Red facing camera',
    tip: 'Keep White on the Top, Blue side on the Right'
  },
  B: {
    title: 'Back Face (Blue Center)',
    subtitle: 'Rotate cube 90° right: Blue facing camera',
    tip: 'Keep White on the Top, Orange side on the Right'
  },
  D: {
    title: 'Bottom Face (Yellow Center)',
    subtitle: 'Tilt cube up 90°: Yellow facing camera',
    tip: 'Keep Green on the Top, Red side on the Right'
  }
};

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ onCubeScanned, onCancel }) => {
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const currentFace = FACE_ORDER[currentFaceIndex];

  // Scanned full 6-face cube state
  const [scannedState, setScannedState] = useState<CubeState>(() => createSolvedCube());

  // Current active face stickers
  const [activeFaceStickers, setActiveFaceStickers] = useState<CubeColor[]>(() => [
    ...scannedState[FACE_ORDER[0]]
  ]);

  // Real-time live detected colors from camera stream
  const [liveDetectedColors, setLiveDetectedColors] = useState<CubeColor[]>(Array(9).fill('W'));

  // Scanned status of each face
  const [scannedFaces, setScannedFaces] = useState<Record<FaceId, boolean>>({
    U: false,
    L: false,
    F: false,
    R: false,
    B: false,
    D: false
  });

  const [selectedStickerIndex, setSelectedStickerIndex] = useState<number | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showOrientationGuide, setShowOrientationGuide] = useState(true);
  const [showFullNetPreview, setShowFullNetPreview] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        setCameraError(null);

        // Check if running on Android bridge with native camera permission interface
        if (typeof window !== 'undefined' && (window as any).AndroidBridge?.requestCameraPermission) {
          (window as any).AndroidBridge.requestCameraPermission();
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported on this device/browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setHasCameraPermission(true);
      } catch (err) {
        if (!isMounted) return;
        setHasCameraPermission(false);
        setCameraError((err as Error).message || 'Unable to access camera.');
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Sync activeFaceStickers with currentFace
  useEffect(() => {
    setActiveFaceStickers([...scannedState[currentFace]]);
    setSelectedStickerIndex(null);
    setValidationError(null);
  }, [currentFace, scannedState]);

  // Live real-time color detection pass from video feed
  const processLiveFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
      return;
    }

    // Sync offscreen canvas size to video aspect ratio
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compute central target box ROI
    const minDim = Math.min(canvas.width, canvas.height);
    const boxSize = minDim * 0.62;
    const startX = (canvas.width - boxSize) / 2;
    const startY = (canvas.height - boxSize) / 2;
    const cellSize = boxSize / 3;
    const sampleRadius = Math.max(3, Math.round(cellSize * 0.18));

    const liveColors: CubeColor[] = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;

        // The center sticker (index 4) is fixed by definition in standard orientation
        if (idx === 4) {
          liveColors.push(STANDARD_FACE_CENTERS[currentFace]);
          continue;
        }

        const centerX = startX + col * cellSize + cellSize / 2;
        const centerY = startY + row * cellSize + cellSize / 2;

        const rgb = sampleRoiColor(ctx, centerX, centerY, sampleRadius);
        liveColors.push(classifyColor(rgb));
      }
    }

    setLiveDetectedColors(liveColors);
    animationFrameRef.current = requestAnimationFrame(processLiveFrame);
  }, [currentFace]);

  // Start/stop live color detection loop
  useEffect(() => {
    if (hasCameraPermission) {
      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasCameraPermission, processLiveFrame]);

  // Sample and lock the 9 stickers for the current face
  const captureCurrentFace = () => {
    SoundEngine.playTurnSound(1.1);

    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const minDim = Math.min(canvas.width, canvas.height);
    const boxSize = minDim * 0.62;
    const startX = (canvas.width - boxSize) / 2;
    const startY = (canvas.height - boxSize) / 2;
    const cellSize = boxSize / 3;
    const sampleRadius = Math.max(4, Math.round(cellSize * 0.22));

    const captured: CubeColor[] = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        if (idx === 4) {
          captured.push(STANDARD_FACE_CENTERS[currentFace]);
          continue;
        }

        const centerX = startX + col * cellSize + cellSize / 2;
        const centerY = startY + row * cellSize + cellSize / 2;

        const rgb = sampleRoiColor(ctx, centerX, centerY, sampleRadius);
        captured.push(classifyColor(rgb));
      }
    }

    setActiveFaceStickers(captured);
    setScannedState((prev) => ({
      ...prev,
      [currentFace]: captured
    }));

    setScannedFaces((prev) => ({
      ...prev,
      [currentFace]: true
    }));

    setValidationError(null);
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
      if (capabilities.torch) {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any]
        });
        setIsTorchOn(nextState);
        SoundEngine.playClickSound();
      }
    } catch {
      // ignore
    }
  };

  // Manually update an individual sticker's color
  const handleColorSelect = (color: CubeColor) => {
    if (selectedStickerIndex === null || selectedStickerIndex === 4) return;
    SoundEngine.playClickSound();

    const updated = [...activeFaceStickers];
    updated[selectedStickerIndex] = color;
    setActiveFaceStickers(updated);

    setScannedState((prev) => ({
      ...prev,
      [currentFace]: updated
    }));

    setScannedFaces((prev) => ({
      ...prev,
      [currentFace]: true
    }));
  };

  // Advance to next face or finish full cube scan
  const handleNextFace = () => {
    SoundEngine.playClickSound();

    // Commit current face stickers
    const updatedState = {
      ...scannedState,
      [currentFace]: activeFaceStickers
    };

    setScannedState(updatedState);
    setScannedFaces((prev) => ({
      ...prev,
      [currentFace]: true
    }));

    if (currentFaceIndex < FACE_ORDER.length - 1) {
      setCurrentFaceIndex(currentFaceIndex + 1);
    } else {
      // Final 6th face reached: Run comprehensive parity & solver validation
      const validation = validateCubeState(updatedState);
      if (validation.valid) {
        SoundEngine.playSuccessFanfare();
        onCubeScanned(updatedState);
      } else {
        SoundEngine.playErrorBuzz();
        setValidationError(validation.error || 'Invalid cube configuration detected.');
      }
    }
  };

  const handlePrevFace = () => {
    if (currentFaceIndex > 0) {
      SoundEngine.playClickSound();
      setCurrentFaceIndex(currentFaceIndex - 1);
    }
  };

  // Tally total scanned colors across all faces
  const calculateColorCounts = () => {
    const counts: Record<CubeColor, number> = { W: 0, Y: 0, G: 0, B: 0, R: 0, O: 0 };
    FACE_ORDER.forEach((face) => {
      const stickers = face === currentFace ? activeFaceStickers : scannedState[face];
      stickers.forEach((col) => {
        counts[col] = (counts[col] || 0) + 1;
      });
    });
    return counts;
  };

  const colorCounts = calculateColorCounts();

  // Load a certified scramble for testing / fallback
  const handleLoadSampleScramble = () => {
    SoundEngine.playClickSound();
    const scramble = generateWcaScramble(18);
    let s = createSolvedCube();
    for (const m of scramble) {
      s = applyMove(s, m);
    }
    setScannedState(s);
    setActiveFaceStickers([...s[currentFace]]);
    setScannedFaces({
      U: true,
      L: true,
      F: true,
      R: true,
      B: true,
      D: true
    });
    setValidationError(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-24">
      {/* Hidden offscreen canvas for real-time video processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Navigation & Status Header */}
      <div className="pt-3 px-4 pb-2 flex items-center justify-between border-b border-cyber-border/40 bg-cyber-card/70 backdrop-blur-md">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-gray-400 hover:text-white px-2 py-1 rounded-lg"
        >
          Cancel
        </button>

        <div className="text-center">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            6-Face Optical Scanner
          </h2>
          <span className="text-[10px] text-cyber-cyan font-bold">
            Face {currentFaceIndex + 1} of 6 • {FACE_NAMES[currentFace]}
          </span>
        </div>

        <button
          onClick={handleLoadSampleScramble}
          title="Load Verified Scramble"
          className="text-[11px] font-bold text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/30 px-2.5 py-1 rounded-lg hover:bg-cyber-cyan hover:text-black transition-colors"
        >
          Sample
        </button>
      </div>

      {/* 6-Face Step Indicator Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-1.5 bg-cyber-surface/40 border-b border-cyber-border/30">
        {FACE_ORDER.map((face, idx) => {
          const isCurrent = idx === currentFaceIndex;
          const isDone = scannedFaces[face];
          return (
            <button
              key={face}
              onClick={() => {
                SoundEngine.playClickSound();
                setCurrentFaceIndex(idx);
              }}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold border flex items-center justify-center gap-0.5 transition-all ${
                isCurrent
                  ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : isDone
                  ? 'bg-cyber-surface text-cyber-green border-cyber-green/40'
                  : 'bg-cyber-card/60 text-gray-500 border-cyber-border/50'
              }`}
            >
              <span>{face}</span>
              {isDone && <Check size={10} className="stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* Face Orientation Direction Guide Banner */}
      <div className="px-4 py-2 bg-cyber-card/90 border-b border-cyber-border/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: CUBE_COLORS[STANDARD_FACE_CENTERS[currentFace]].hex }}
            className="w-4 h-4 rounded-full border border-black/60 shadow shrink-0"
          />
          <div className="leading-tight">
            <span className="font-bold text-white block">
              {ORIENTATION_GUIDES[currentFace].title}
            </span>
            <span className="text-[10px] text-gray-400">
              {ORIENTATION_GUIDES[currentFace].subtitle}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowOrientationGuide(!showOrientationGuide)}
          className="text-gray-400 hover:text-cyber-cyan p-1"
        >
          <HelpCircle size={15} />
        </button>
      </div>

      {showOrientationGuide && (
        <div className="px-4 py-1.5 bg-cyber-cyan/10 border-b border-cyber-cyan/20 text-[10px] text-cyber-cyan flex items-center gap-1.5">
          <Sparkles size={12} className="shrink-0" />
          <span>{ORIENTATION_GUIDES[currentFace].tip}</span>
        </div>
      )}

      {/* Main Viewfinder / Live Camera Viewport */}
      <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden bg-black border-y border-cyber-border">
        {hasCameraPermission === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-cyber-card">
            <Camera className="w-12 h-12 text-cyber-magenta mb-3 opacity-60" />
            <p className="text-xs text-gray-300 font-semibold mb-2">Camera Access Required</p>
            <p className="text-[11px] text-gray-500 mb-4 max-w-xs">
              {cameraError || 'Allow camera permission to scan your physical Rubik\'s Cube faces directly.'}
            </p>
            <button
              onClick={handleLoadSampleScramble}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-600 text-black font-bold text-xs shadow-lg"
            >
              Load Sample Scramble
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* 3x3 Live Target Grid Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[62%] h-[62%] grid grid-cols-3 grid-rows-3 gap-2 border-2 border-cyber-cyan rounded-2xl p-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] backdrop-brightness-105">
                {liveDetectedColors.map((detectedCol, i) => {
                  const isCenter = i === 4;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border-2 flex items-center justify-center transition-colors relative ${
                        isCenter
                          ? 'border-cyber-yellow bg-cyber-yellow/20'
                          : 'border-white/50 bg-black/20'
                      }`}
                    >
                      {/* Live color sampling indicator badge */}
                      <div
                        style={{ backgroundColor: CUBE_COLORS[detectedCol]?.hex || '#fff' }}
                        className="w-3.5 h-3.5 rounded-full border border-black/80 shadow"
                      />

                      {isCenter && (
                        <span className="absolute bottom-0.5 text-[9px] font-black text-cyber-yellow uppercase">
                          {currentFace}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flashlight Torch Toggle */}
            <button
              onClick={toggleTorch}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-cyber-card/80 backdrop-blur-md border border-cyber-border text-white hover:text-cyber-yellow shadow-lg z-10 active:scale-95 transition-transform"
            >
              <Zap size={18} className={isTorchOn ? 'fill-cyber-yellow text-cyber-yellow' : ''} />
            </button>

            {/* Live Camera Tag */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 text-[9px] text-cyber-cyan font-mono flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>LIVE CV SAMPLER</span>
            </div>
          </>
        )}
      </div>

      {/* Captured Face Grid & Color Correction Palette */}
      <div className="px-4 py-3 flex-1 flex flex-col justify-between max-w-sm mx-auto w-full">
        <div>
          {/* Header & Status Bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-300">
              Captured Face Stickers (Tap to correct):
            </span>
            <button
              onClick={captureCurrentFace}
              className="text-[11px] font-bold text-cyber-cyan flex items-center gap-1 hover:underline"
            >
              <RefreshCw size={12} /> Re-Scan
            </button>
          </div>

          {/* 3x3 Captured Face Grid */}
          <div className="w-48 h-48 mx-auto grid grid-cols-3 grid-rows-3 gap-1.5 p-2 bg-cyber-surface/85 border border-cyber-border rounded-2xl shadow-xl">
            {activeFaceStickers.map((colorCode, idx) => {
              const isSelected = selectedStickerIndex === idx;
              const isCenter = idx === 4;
              const colInfo = CUBE_COLORS[colorCode] || CUBE_COLORS.W;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isCenter) {
                      SoundEngine.playClickSound();
                      setSelectedStickerIndex(idx);
                    }
                  }}
                  style={{ backgroundColor: colInfo.hex }}
                  className={`rounded-xl border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-cyber-cyan scale-105 shadow-[0_0_12px_rgba(0,240,255,0.8)] z-10'
                      : isCenter
                      ? 'border-cyber-border/80 ring-2 ring-cyber-yellow/40'
                      : 'border-cyber-border/60 hover:border-white'
                  }`}
                >
                  {isCenter ? (
                    <span className="text-[11px] font-black text-black">
                      {currentFace}
                    </span>
                  ) : isSelected ? (
                    <Check size={14} className="text-black stroke-[3]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Manual Color Correction Palette */}
          {selectedStickerIndex !== null && selectedStickerIndex !== 4 && (
            <div className="mt-3 bg-cyber-card/95 border border-cyber-border rounded-xl p-2.5 flex items-center justify-around shadow-lg animate-fadeIn">
              {(['W', 'Y', 'G', 'B', 'R', 'O'] as CubeColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorSelect(c)}
                  style={{ backgroundColor: CUBE_COLORS[c].hex }}
                  className="w-8 h-8 rounded-lg border border-black/50 shadow hover:scale-110 active:scale-95 transition-transform"
                />
              ))}
            </div>
          )}

          {/* Color Count Tally Badges */}
          <div className="mt-3 flex items-center justify-between px-1 py-1 bg-cyber-surface/60 rounded-xl border border-cyber-border/40 text-[10px]">
            {(['W', 'Y', 'G', 'B', 'R', 'O'] as CubeColor[]).map((c) => {
              const count = colorCounts[c];
              const isTarget = count === 9;
              return (
                <div key={c} className="flex items-center gap-1 font-mono">
                  <div
                    style={{ backgroundColor: CUBE_COLORS[c].hex }}
                    className="w-2.5 h-2.5 rounded-full border border-black/50"
                  />
                  <span className={isTarget ? 'text-gray-300' : 'text-cyber-yellow font-bold'}>
                    {count}/9
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="my-2 p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 shadow-lg animate-fadeIn">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Bottom Actions Toolbar */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <button
            onClick={handlePrevFace}
            disabled={currentFaceIndex === 0}
            className={`px-4 py-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
              currentFaceIndex === 0
                ? 'opacity-40 border-cyber-border text-gray-500'
                : 'border-cyber-border bg-cyber-card text-gray-200 hover:text-white'
            }`}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <button
            onClick={captureCurrentFace}
            className="flex-1 py-3 rounded-xl bg-cyber-surface border border-cyber-cyan/40 text-cyber-cyan font-bold text-xs hover:bg-cyber-cyan/15 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow"
          >
            <Camera size={16} /> Capture Face
          </button>

          <button
            onClick={handleNextFace}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-600 text-black font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {currentFaceIndex === FACE_ORDER.length - 1 ? 'Solve Cube' : 'Next Face'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
