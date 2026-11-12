import { CubeColor, CubeState, FaceId, StandardMove } from '../types/cube';

export function createSolvedCube(): CubeState {
  return {
    U: Array(9).fill('W'),
    L: Array(9).fill('O'),
    F: Array(9).fill('G'),
    R: Array(9).fill('R'),
    B: Array(9).fill('B'),
    D: Array(9).fill('Y')
  };
}

export function cloneCubeState(state: CubeState): CubeState {
  return {
    U: [...state.U],
    L: [...state.L],
    F: [...state.F],
    R: [...state.R],
    B: [...state.B],
    D: [...state.D]
  };
}

// Rotate a 3x3 face array 90 deg clockwise
// 0 1 2     6 3 0
// 3 4 5  -> 7 4 1
// 6 7 8     8 5 2
function rotateFaceCW(face: CubeColor[]): CubeColor[] {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2]
  ];
}

function rotateFaceCCW(face: CubeColor[]): CubeColor[] {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6]
  ];
}

function rotateFace180(face: CubeColor[]): CubeColor[] {
  return [
    face[8], face[7], face[6],
    face[5], face[4], face[3],
    face[2], face[1], face[0]
  ];
}

// Apply single basic move
export function applyMove(state: CubeState, move: StandardMove): CubeState {
  const next = cloneCubeState(state);

  switch (move) {
    case 'U': {
      next.U = rotateFaceCW(next.U);
      const temp = [next.F[0], next.F[1], next.F[2]];
      next.F[0] = next.R[0]; next.F[1] = next.R[1]; next.F[2] = next.R[2];
      next.R[0] = next.B[0]; next.R[1] = next.B[1]; next.R[2] = next.B[2];
      next.B[0] = next.L[0]; next.B[1] = next.L[1]; next.B[2] = next.L[2];
      next.L[0] = temp[0];   next.L[1] = temp[1];   next.L[2] = temp[2];
      break;
    }
    case "U'": {
      next.U = rotateFaceCCW(next.U);
      const temp = [next.F[0], next.F[1], next.F[2]];
      next.F[0] = next.L[0]; next.F[1] = next.L[1]; next.F[2] = next.L[2];
      next.L[0] = next.B[0]; next.L[1] = next.B[1]; next.L[2] = next.B[2];
      next.B[0] = next.R[0]; next.B[1] = next.R[1]; next.B[2] = next.R[2];
      next.R[0] = temp[0];   next.R[1] = temp[1];   next.R[2] = temp[2];
      break;
    }
    case 'U2': {
      return applyMove(applyMove(state, 'U'), 'U');
    }

    case 'D': {
      next.D = rotateFaceCW(next.D);
      const temp = [next.F[6], next.F[7], next.F[8]];
      next.F[6] = next.L[6]; next.F[7] = next.L[7]; next.F[8] = next.L[8];
      next.L[6] = next.B[6]; next.L[7] = next.B[7]; next.L[8] = next.B[8];
      next.B[6] = next.R[6]; next.B[7] = next.R[7]; next.B[8] = next.R[8];
      next.R[6] = temp[0];   next.R[7] = temp[1];   next.R[8] = temp[2];
      break;
    }
    case "D'": {
      next.D = rotateFaceCCW(next.D);
      const temp = [next.F[6], next.F[7], next.F[8]];
      next.F[6] = next.R[6]; next.F[7] = next.R[7]; next.F[8] = next.R[8];
      next.R[6] = next.B[6]; next.R[7] = next.B[7]; next.R[8] = next.B[8];
      next.B[6] = next.L[6]; next.B[7] = next.L[7]; next.B[8] = next.L[8];
      next.L[6] = temp[0];   next.L[7] = temp[1];   next.L[8] = temp[2];
      break;
    }
    case 'D2': {
      return applyMove(applyMove(state, 'D'), 'D');
    }

    case 'R': {
      next.R = rotateFaceCW(next.R);
      const temp = [next.U[2], next.U[5], next.U[8]];
      next.U[2] = next.F[2]; next.U[5] = next.F[5]; next.U[8] = next.F[8];
      next.F[2] = next.D[2]; next.F[5] = next.D[5]; next.F[8] = next.D[8];
      next.D[2] = next.B[6]; next.D[5] = next.B[3]; next.D[8] = next.B[0];
      next.B[6] = temp[0];   next.B[3] = temp[1];   next.B[0] = temp[2];
      break;
    }
    case "R'": {
      next.R = rotateFaceCCW(next.R);
      const temp = [next.U[2], next.U[5], next.U[8]];
      next.U[2] = next.B[6]; next.U[5] = next.B[3]; next.U[8] = next.B[0];
      next.B[6] = next.D[2]; next.B[3] = next.D[5]; next.B[0] = next.D[8];
      next.D[2] = next.F[2]; next.D[5] = next.F[5]; next.D[8] = next.F[8];
      next.F[2] = temp[0];   next.F[5] = temp[1];   next.F[8] = temp[2];
      break;
    }
    case 'R2': {
      return applyMove(applyMove(state, 'R'), 'R');
    }

    case 'L': {
      next.L = rotateFaceCW(next.L);
      const temp = [next.U[0], next.U[3], next.U[6]];
      next.U[0] = next.B[8]; next.U[3] = next.B[5]; next.U[6] = next.B[2];
      next.B[8] = next.D[0]; next.B[5] = next.D[3]; next.B[2] = next.D[6];
      next.D[0] = next.F[0]; next.D[3] = next.F[3]; next.D[6] = next.F[6];
      next.F[0] = temp[0];   next.F[3] = temp[1];   next.F[6] = temp[2];
      break;
    }
    case "L'": {
      next.L = rotateFaceCCW(next.L);
      const temp = [next.U[0], next.U[3], next.U[6]];
      next.U[0] = next.F[0]; next.U[3] = next.F[3]; next.U[6] = next.F[6];
      next.F[0] = next.D[0]; next.F[3] = next.D[3]; next.F[6] = next.D[6];
      next.D[0] = next.B[8]; next.D[3] = next.B[5]; next.D[6] = next.B[2];
      next.B[8] = temp[0];   next.B[5] = temp[1];   next.B[2] = temp[2];
      break;
    }
    case 'L2': {
      return applyMove(applyMove(state, 'L'), 'L');
    }

    case 'F': {
      next.F = rotateFaceCW(next.F);
      const temp = [next.U[6], next.U[7], next.U[8]];
      next.U[6] = next.L[8]; next.U[7] = next.L[5]; next.U[8] = next.L[2];
      next.L[2] = next.D[0]; next.L[5] = next.D[1]; next.L[8] = next.D[2];
      next.D[0] = next.R[6]; next.D[1] = next.R[3]; next.D[2] = next.R[0];
      next.R[0] = temp[0];   next.R[3] = temp[1];   next.R[6] = temp[2];
      break;
    }
    case "F'": {
      next.F = rotateFaceCCW(next.F);
      const temp = [next.U[6], next.U[7], next.U[8]];
      next.U[6] = next.R[0]; next.U[7] = next.R[3]; next.U[8] = next.R[6];
      next.R[0] = next.D[2]; next.R[3] = next.D[1]; next.R[6] = next.D[0];
      next.D[0] = next.L[2]; next.D[1] = next.L[5]; next.D[2] = next.L[8];
      next.L[2] = temp[2];   next.L[5] = temp[1];   next.L[8] = temp[0];
      break;
    }
    case 'F2': {
      return applyMove(applyMove(state, 'F'), 'F');
    }

    case 'B': {
      next.B = rotateFaceCW(next.B);
      const temp = [next.U[0], next.U[1], next.U[2]];
      next.U[0] = next.R[2]; next.U[1] = next.R[5]; next.U[2] = next.R[8];
      next.R[2] = next.D[8]; next.R[5] = next.D[7]; next.R[8] = next.D[6];
      next.D[6] = next.L[0]; next.D[7] = next.L[3]; next.D[8] = next.L[6];
      next.L[0] = temp[2];   next.L[3] = temp[1];   next.L[6] = temp[0];
      break;
    }
    case "B'": {
      next.B = rotateFaceCCW(next.B);
      const temp = [next.U[0], next.U[1], next.U[2]];
      next.U[0] = next.L[6]; next.U[1] = next.L[3]; next.U[2] = next.L[0];
      next.L[0] = next.D[6]; next.L[3] = next.D[7]; next.L[6] = next.D[8];
      next.D[6] = next.R[8]; next.D[7] = next.R[5]; next.D[8] = next.R[2];
      next.R[2] = temp[0];   next.R[5] = temp[1];   next.R[8] = temp[2];
      break;
    }
    case 'B2': {
      return applyMove(applyMove(state, 'B'), 'B');
    }
  }

  return next;
}

export function applyMoveSequence(state: CubeState, moves: StandardMove[]): CubeState {
  let current = cloneCubeState(state);
  for (const move of moves) {
    current = applyMove(current, move);
  }
  return current;
}

export function isCubeSolved(state: CubeState): boolean {
  for (const face of ['U', 'D', 'F', 'B', 'L', 'R'] as FaceId[]) {
    const centerColor = state[face][4];
    for (let i = 0; i < 9; i++) {
      if (state[face][i] !== centerColor) return false;
    }
  }
  return true;
}

// Generate official 20-move WCA-compliant scramble
export function generateWcaScramble(length: number = 20): StandardMove[] {
  const faces: FaceId[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  const modifiers = ['', "'", '2'];
  const opposites: Record<FaceId, FaceId> = {
    U: 'D', D: 'U',
    F: 'B', B: 'F',
    L: 'R', R: 'L'
  };

  const scramble: StandardMove[] = [];
  let lastFace: FaceId | null = null;
  let secondLastFace: FaceId | null = null;

  while (scramble.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];

    // Disallow same face consecutive or redundant parallel moves like R L R
    if (face === lastFace) continue;
    if (lastFace && opposites[face] === lastFace && secondLastFace === face) continue;

    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(`${face}${mod}` as StandardMove);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble;
}

export function invertMove(move: StandardMove): StandardMove {
  if (move.endsWith("'")) return move.slice(0, 1) as StandardMove;
  if (move.endsWith("2")) return move;
  return `${move}'` as StandardMove;
}

export function invertMoveSequence(moves: StandardMove[]): StandardMove[] {
  return [...moves].reverse().map(invertMove);
}
