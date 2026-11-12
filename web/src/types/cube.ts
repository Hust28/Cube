export type FaceId = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

export type CubeColor = 'W' | 'Y' | 'G' | 'B' | 'R' | 'O';

export interface ColorInfo {
  code: CubeColor;
  name: string;
  hex: string;
  glow: string;
  text: string;
}

export const CUBE_COLORS: Record<CubeColor, ColorInfo> = {
  W: { code: 'W', name: 'White', hex: '#FFFFFF', glow: '#FFFFFF', text: '#000000' },
  Y: { code: 'Y', name: 'Yellow', hex: '#FFDD00', glow: '#FFEE55', text: '#000000' },
  G: { code: 'G', name: 'Green', hex: '#00D060', glow: '#33FF88', text: '#000000' },
  B: { code: 'B', name: 'Blue', hex: '#0066FF', glow: '#3388FF', text: '#FFFFFF' },
  R: { code: 'R', name: 'Red', hex: '#EE1133', glow: '#FF3355', text: '#FFFFFF' },
  O: { code: 'O', name: 'Orange', hex: '#FF6600', glow: '#FF8833', text: '#000000' }
};

export const FACE_NAMES: Record<FaceId, string> = {
  U: 'Top (Up)',
  D: 'Bottom (Down)',
  F: 'Front',
  B: 'Back',
  L: 'Left',
  R: 'Right'
};

export const FACE_ORDER: FaceId[] = ['U', 'L', 'F', 'R', 'B', 'D'];

export const STANDARD_FACE_CENTERS: Record<FaceId, CubeColor> = {
  U: 'W',
  L: 'O',
  F: 'G',
  R: 'R',
  B: 'B',
  D: 'Y'
};

// 54 stickers: 6 faces x 9 stickers
// Index 0..8 for each face (4 is center)
export type CubeState = Record<FaceId, CubeColor[]>;

export type StandardMove =
  | 'U' | "U'" | 'U2'
  | 'D' | "D'" | 'D2'
  | 'R' | "R'" | 'R2'
  | 'L' | "L'" | 'L2'
  | 'F' | "F'" | 'F2'
  | 'B' | "B'" | 'B2';

export interface MoveExplanation {
  move: StandardMove;
  face: FaceId;
  direction: 'CW' | 'CCW' | 'DOUBLE';
  title: string;
  instruction: string;
  tip?: string;
}

export interface SolutionStep {
  stepIndex: number;
  phase: string;
  phaseTitle: string;
  move: StandardMove;
  explanation: MoveExplanation;
}

export interface SolveResult {
  isValid: boolean;
  solutionMoves: StandardMove[];
  steps: SolutionStep[];
  moveCount: number;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  phases: { name: string; moveCount: number }[];
  error?: string;
}

export interface SolveRecord {
  id: string;
  timeMs: number;
  scramble: string;
  timestamp: number;
  penalty: 'none' | 'plusTwo' | 'dnf';
  notes?: string;
}

export interface UserStats {
  totalSolves: number;
  bestSingleMs: number | null;
  currentAo5Ms: number | null;
  bestAo5Ms: number | null;
  currentAo12Ms: number | null;
  bestAo12Ms: number | null;
  streakDays: number;
  lastActiveDate: string;
  xp: number;
  level: number;
  levelTitle: string;
  completedLessonIds: string[];
  unlockedAchievementIds: string[];
}

export interface CustomizationSettings {
  theme: 'cyberpunk' | 'midnight' | 'sunset' | 'matrix' | 'emerald';
  skin: 'classic' | 'cyberGlow' | 'pastel' | 'carbon';
  background: 'gridSpace' | 'neonArena' | 'void' | 'studio';
  soundEnabled: boolean;
  soundVolume: number;
  hapticsEnabled: boolean;
  animationSpeed: number; // 0.5 to 2.5
  inspectionSeconds: number; // 0, 3, 5, 15
}
