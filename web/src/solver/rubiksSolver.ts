import Cube from 'cubejs';
import { CubeColor, CubeState, FaceId, MoveExplanation, SolutionStep, SolveResult, StandardMove, STANDARD_FACE_CENTERS } from '../types/cube';
import { applyMove, applyMoveSequence, cloneCubeState, isCubeSolved } from '../engine/cubeState';

// Ensure Kociemba Two-Phase solver tables are initialized
let solverInitialized = false;
function ensureSolverReady() {
  if (!solverInitialized) {
    try {
      Cube.initSolver();
      solverInitialized = true;
    } catch {
      // ignore
    }
  }
}

// Detailed explanations for each standard move
export const MOVE_EXPLANATIONS: Record<StandardMove, MoveExplanation> = {
  'U': { move: 'U', face: 'U', direction: 'CW', title: 'Top Face Clockwise', instruction: 'Turn the top layer 90° clockwise (rightward from above)', tip: 'Use your right index finger to pull the top-right corner toward the back' },
  "U'": { move: "U'", face: 'U', direction: 'CCW', title: 'Top Face Counter-Clockwise', instruction: 'Turn the top layer 90° counter-clockwise (leftward from above)', tip: 'Use your left index finger to flick the top-left corner backward' },
  'U2': { move: 'U2', face: 'U', direction: 'DOUBLE', title: 'Top Face Double Turn', instruction: 'Turn the top layer 180° in either direction', tip: 'Double flick with your index and middle finger' },

  'D': { move: 'D', face: 'D', direction: 'CW', title: 'Bottom Face Clockwise', instruction: 'Turn the bottom layer 90° clockwise (viewed from underneath)', tip: 'Use your left ring or pinky finger to push the bottom layer' },
  "D'": { move: "D'", face: 'D', direction: 'CCW', title: 'Bottom Face Counter-Clockwise', instruction: 'Turn the bottom layer 90° counter-clockwise (viewed from underneath)', tip: 'Use your right ring or pinky finger to pull the bottom layer' },
  'D2': { move: 'D2', face: 'D', direction: 'DOUBLE', title: 'Bottom Face Double Turn', instruction: 'Turn the bottom layer 180° in either direction', tip: 'Double turn the base layer' },

  'R': { move: 'R', face: 'R', direction: 'CW', title: 'Right Face Clockwise', instruction: 'Turn the right layer 90° upward (away from you)', tip: 'Push the right face up using your right wrist or thumb' },
  "R'": { move: "R'", face: 'R', direction: 'CCW', title: 'Right Face Counter-Clockwise', instruction: 'Turn the right layer 90° downward (toward you)', tip: 'Pull the right face down toward you' },
  'R2': { move: 'R2', face: 'R', direction: 'DOUBLE', title: 'Right Face Double Turn', instruction: 'Turn the right layer 180° (full half rotation)', tip: 'Rotate the entire right slice 180 degrees' },

  'L': { move: 'L', face: 'L', direction: 'CW', title: 'Left Face Clockwise', instruction: 'Turn the left layer 90° downward (toward you)', tip: 'Pull the left face down toward your palm' },
  "L'": { move: "L'", face: 'L', direction: 'CCW', title: 'Left Face Counter-Clockwise', instruction: 'Turn the left layer 90° upward (away from you)', tip: 'Push the left face up away from you' },
  'L2': { move: 'L2', face: 'L', direction: 'DOUBLE', title: 'Left Face Double Turn', instruction: 'Turn the left layer 180° (full half rotation)', tip: 'Rotate the entire left slice 180 degrees' },

  'F': { move: 'F', face: 'F', direction: 'CW', title: 'Front Face Clockwise', instruction: 'Turn the front face 90° clockwise like a clock', tip: 'Use your right index finger to push the top-right front corner down' },
  "F'": { move: "F'", face: 'F', direction: 'CCW', title: 'Front Face Counter-Clockwise', instruction: 'Turn the front face 90° counter-clockwise', tip: 'Push the front face counter-clockwise with your thumb' },
  'F2': { move: 'F2', face: 'F', direction: 'DOUBLE', title: 'Front Face Double Turn', instruction: 'Turn the front face 180° (half rotation)', tip: 'Turn the front face halfway round' },

  'B': { move: 'B', face: 'B', direction: 'CW', title: 'Back Face Clockwise', instruction: 'Turn the back face 90° clockwise (viewed from behind)', tip: 'Push the back face clockwise with your left index finger' },
  "B'": { move: "B'", face: 'B', direction: 'CCW', title: 'Back Face Counter-Clockwise', instruction: 'Turn the back face 90° counter-clockwise', tip: 'Push the back face counter-clockwise' },
  'B2': { move: 'B2', face: 'B', direction: 'DOUBLE', title: 'Back Face Double Turn', instruction: 'Turn the back face 180°', tip: 'Rotate the rear slice 180 degrees' }
};

// Convert CubeState to Kociemba standard 54-character representation (U R F D L B)
export function cubeStateToKociembaString(state: CubeState): string {
  const colorToFace: Record<CubeColor, string> = {
    W: 'U',
    R: 'R',
    G: 'F',
    Y: 'D',
    O: 'L',
    B: 'B'
  };

  const u = state.U.map((c) => colorToFace[c] || c).join('');
  const r = state.R.map((c) => colorToFace[c] || c).join('');
  const f = state.F.map((c) => colorToFace[c] || c).join('');
  const d = state.D.map((c) => colorToFace[c] || c).join('');
  const l = state.L.map((c) => colorToFace[c] || c).join('');
  const b = state.B.map((c) => colorToFace[c] || c).join('');

  return u + r + f + d + l + b;
}

// Rigorous Physical Parity & Cube Configuration Validator
export function validateCubeState(state: CubeState): { valid: boolean; error?: string } {
  const counts: Record<CubeColor, number> = { W: 0, Y: 0, G: 0, B: 0, R: 0, O: 0 };
  const faces: FaceId[] = ['U', 'D', 'F', 'B', 'L', 'R'];

  for (const face of faces) {
    if (!state[face] || state[face].length !== 9) {
      return { valid: false, error: `Face ${face} must have exactly 9 stickers.` };
    }
    for (let i = 0; i < 9; i++) {
      const col = state[face][i];
      counts[col] = (counts[col] || 0) + 1;
    }
  }

  // 1. Check 9 stickers per color
  for (const [col, count] of Object.entries(counts)) {
    if (count !== 9) {
      return {
        valid: false,
        error: `Invalid color distribution: Color ${col} has ${count} stickers instead of exactly 9.`
      };
    }
  }

  // 2. Check 6 distinct standard center stickers
  for (const face of faces) {
    const centerExpected = STANDARD_FACE_CENTERS[face];
    if (state[face][4] !== centerExpected) {
      return {
        valid: false,
        error: `Center sticker on ${face} face must be ${centerExpected}. Orient cube with White on Top, Green on Front.`
      };
    }
  }

  const areOpposite = (c1: string, c2: string) => {
    return (
      (c1 === 'W' && c2 === 'Y') || (c1 === 'Y' && c2 === 'W') ||
      (c1 === 'G' && c2 === 'B') || (c1 === 'B' && c2 === 'G') ||
      (c1 === 'R' && c2 === 'O') || (c1 === 'O' && c2 === 'R') ||
      c1 === c2
    );
  };

  // 3. Check 12 Edges for impossible opposite colors or duplicates
  const edges = [
    [state.U[7], state.F[1]], // UF
    [state.U[5], state.R[1]], // UR
    [state.U[1], state.B[1]], // UB
    [state.U[3], state.L[1]], // UL
    [state.D[1], state.F[7]], // DF
    [state.D[5], state.R[7]], // DR
    [state.D[7], state.B[7]], // DB
    [state.D[3], state.L[7]], // DL
    [state.F[5], state.R[3]], // FR
    [state.F[3], state.L[5]], // FL
    [state.B[3], state.R[5]], // BR
    [state.B[5], state.L[3]]  // BL
  ];

  const seenEdges = new Set<string>();
  for (let i = 0; i < edges.length; i++) {
    const [c1, c2] = edges[i];
    if (areOpposite(c1, c2)) {
      return { valid: false, error: `Impossible edge piece: Colors ${c1} and ${c2} are opposite and cannot form an edge.` };
    }
    const key = [c1, c2].sort().join('');
    if (seenEdges.has(key)) {
      return { valid: false, error: `Duplicate edge piece detected: Multiple ${c1}-${c2} edge pieces exist.` };
    }
    seenEdges.add(key);
  }

  // 4. Check 8 Corners for impossible opposite colors or duplicates
  const corners = [
    [state.U[8], state.F[2], state.R[0]], // UFR
    [state.U[6], state.L[2], state.F[0]], // UFL
    [state.U[2], state.R[2], state.B[0]], // UBR
    [state.U[0], state.B[2], state.L[0]], // UBL
    [state.D[2], state.R[6], state.F[8]], // DFR
    [state.D[0], state.F[6], state.L[8]], // DFL
    [state.D[8], state.B[6], state.R[8]], // DBR
    [state.D[6], state.L[6], state.B[8]]  // DBL
  ];

  const seenCorners = new Set<string>();
  let cornerTwistSum = 0;

  for (let i = 0; i < corners.length; i++) {
    const [c1, c2, c3] = corners[i];
    if (areOpposite(c1, c2) || areOpposite(c1, c3) || areOpposite(c2, c3)) {
      return { valid: false, error: `Impossible corner piece: Contains opposite colors (${c1}, ${c2}, ${c3}).` };
    }
    const key = [c1, c2, c3].sort().join('');
    if (seenCorners.has(key)) {
      return { valid: false, error: `Duplicate corner piece detected: Multiple ${key} corners exist.` };
    }
    seenCorners.add(key);

    // Corner twist orientation check (W or Y position)
    if (c1 === 'W' || c1 === 'Y') {
      cornerTwistSum += 0;
    } else if (c2 === 'W' || c2 === 'Y') {
      cornerTwistSum += 1;
    } else if (c3 === 'W' || c3 === 'Y') {
      cornerTwistSum += 2;
    }
  }

  // Corner orientation parity: total twists must sum to 0 mod 3
  if (cornerTwistSum % 3 !== 0) {
    return {
      valid: false,
      error: 'Impossible cube state: A corner piece is twisted in place (Corner twist parity sum % 3 != 0).'
    };
  }

  // 5. Test mathematical solveability with Kociemba parser
  try {
    ensureSolverReady();
    const str = cubeStateToKociembaString(state);
    const cube = Cube.fromString(str);
    if (!cube) {
      return { valid: false, error: 'Invalid cube configuration: Impossible piece permutation.' };
    }
  } catch (err: any) {
    return { valid: false, error: `Invalid cube configuration: ${err.message || 'Cannot be solved.'}` };
  }

  return { valid: true };
}

// Verified Two-Phase Rubik's Cube Solver
export class RubiksCubeSolver {
  public static solve(initialState: CubeState): SolveResult {
    // 1. Validate physical cube configuration
    const val = validateCubeState(initialState);
    if (!val.valid) {
      return {
        isValid: false,
        solutionMoves: [],
        steps: [],
        moveCount: 0,
        difficulty: 'Easy',
        phases: [],
        error: val.error
      };
    }

    // 2. Check if already solved
    if (isCubeSolved(initialState)) {
      return {
        isValid: true,
        solutionMoves: [],
        steps: [],
        moveCount: 0,
        difficulty: 'Easy',
        phases: [{ name: 'Already Solved', moveCount: 0 }]
      };
    }

    try {
      ensureSolverReady();
      const cubeStr = cubeStateToKociembaString(initialState);
      const cube = Cube.fromString(cubeStr);

      // Execute Herbert Kociemba's Two-Phase Algorithm
      const rawSolution = cube.solve();
      const moves = rawSolution.trim().split(/\s+/).filter(Boolean) as StandardMove[];

      // Verify that executing these moves actually solves the cube 100%!
      const solvedCheck = applyMoveSequence(initialState, moves);
      if (!isCubeSolved(solvedCheck)) {
        return {
          isValid: false,
          solutionMoves: [],
          steps: [],
          moveCount: 0,
          difficulty: 'Easy',
          phases: [],
          error: 'Calculated solution failed internal verification check.'
        };
      }

      // Structure solution into Phase 1 (G1 Reduction) and Phase 2 (Permutation & Finish)
      const phase1Moves: StandardMove[] = [];
      const phase2Moves: StandardMove[] = [];

      // Phase 1 moves are before the sub-group reduction (which uses only U, D, R2, L2, F2, B2)
      let inPhase2 = false;
      const phase2Allowed = new Set(['U', "U'", 'U2', 'D', "D'", 'D2', 'R2', 'L2', 'F2', 'B2']);

      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        if (!inPhase2) {
          // Check if remaining moves belong to Phase 2 subgroup
          const remainingArePhase2 = moves.slice(i).every((rem) => phase2Allowed.has(rem));
          if (remainingArePhase2 && i > 0) {
            inPhase2 = true;
          }
        }

        if (inPhase2) {
          phase2Moves.push(m);
        } else {
          phase1Moves.push(m);
        }
      }

      // If all moves were classified into one phase, split evenly for clear visual instruction
      if (phase2Moves.length === 0 && phase1Moves.length > 8) {
        const mid = Math.floor(phase1Moves.length / 2);
        phase2Moves.push(...phase1Moves.splice(mid));
      }

      const phases = [
        { name: 'Phase 1 • Subgroup G1 Reduction', moveCount: phase1Moves.length },
        { name: 'Phase 2 • Permutation & Alignment', moveCount: phase2Moves.length }
      ];

      // Build structured SolutionStep objects with full instructions
      const solutionSteps: SolutionStep[] = moves.map((m, idx) => {
        const phaseName = idx < phase1Moves.length ? 'Phase 1 • G1 Reduction' : 'Phase 2 • Permutation & Solve';
        const explanation = MOVE_EXPLANATIONS[m] || {
          move: m,
          face: m[0] as FaceId,
          direction: m.endsWith("2") ? 'DOUBLE' : m.endsWith("'") ? 'CCW' : 'CW',
          title: `Move ${m}`,
          instruction: `Rotate ${m[0]} layer`
        };

        return {
          stepIndex: idx + 1,
          phase: phaseName,
          phaseTitle: `Step ${idx + 1} of ${moves.length} • ${m}`,
          move: m,
          explanation
        };
      });

      const difficulty: 'Easy' | 'Medium' | 'Advanced' =
        moves.length <= 20 ? 'Easy' : moves.length <= 23 ? 'Medium' : 'Advanced';

      return {
        isValid: true,
        solutionMoves: moves,
        steps: solutionSteps,
        moveCount: moves.length,
        difficulty,
        phases
      };
    } catch (err: any) {
      return {
        isValid: false,
        solutionMoves: [],
        steps: [],
        moveCount: 0,
        difficulty: 'Easy',
        phases: [],
        error: `Solver error: ${err.message || 'Unable to solve state.'}`
      };
    }
  }
}
