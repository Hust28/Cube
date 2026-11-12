import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSolvedCube,
  cloneCubeState,
  applyMove,
  applyMoveSequence,
  isCubeSolved,
  invertMove,
  invertMoveSequence,
  generateWcaScramble
} from './cubeState.ts';
import { StandardMove } from '../types/cube.ts';

test('createSolvedCube generates valid solved state with 54 stickers', () => {
  const cube = createSolvedCube();
  assert.equal(isCubeSolved(cube), true);
  assert.equal(cube.U.length, 9);
  assert.equal(cube.D.length, 9);
  assert.equal(cube.F.length, 9);
  assert.equal(cube.B.length, 9);
  assert.equal(cube.L.length, 9);
  assert.equal(cube.R.length, 9);

  // Standard speedcube color scheme centers
  assert.equal(cube.U[4], 'W');
  assert.equal(cube.D[4], 'Y');
  assert.equal(cube.F[4], 'G');
  assert.equal(cube.B[4], 'B');
  assert.equal(cube.L[4], 'O');
  assert.equal(cube.R[4], 'R');
});

test('Applying any move results in an unsolved state', () => {
  const solved = createSolvedCube();
  const moves: StandardMove[] = ['R', "R'", 'R2', 'U', "U'", 'U2', 'F', "F'", 'F2', 'L', "L'", 'L2', 'D', "D'", 'D2', 'B', "B'", 'B2'];
  for (const move of moves) {
    const scrambled = applyMove(solved, move);
    assert.equal(isCubeSolved(scrambled), false, `Move ${move} should unsolve the cube`);
  }
});

test('4x single turn returns to solved (order 4)', () => {
  const solved = createSolvedCube();
  const faces: StandardMove[] = ['R', 'L', 'U', 'D', 'F', 'B'];
  for (const m of faces) {
    const after4 = applyMoveSequence(solved, [m, m, m, m]);
    assert.equal(isCubeSolved(after4), true, `4x ${m} should return to solved`);

    const prime = `${m}'` as StandardMove;
    const after4Prime = applyMoveSequence(solved, [prime, prime, prime, prime]);
    assert.equal(isCubeSolved(after4Prime), true, `4x ${prime} should return to solved`);
  }
});

test('2x double turn returns to solved (order 2)', () => {
  const solved = createSolvedCube();
  const doubleMoves: StandardMove[] = ['R2', 'L2', 'U2', 'D2', 'F2', 'B2'];
  for (const m of doubleMoves) {
    const after2 = applyMoveSequence(solved, [m, m]);
    assert.equal(isCubeSolved(after2), true, `2x ${m} should return to solved`);
  }
});

test('Move followed by its inverse returns to solved', () => {
  const solved = createSolvedCube();
  const moves: StandardMove[] = ['R', "R'", 'R2', 'U', "U'", 'U2', 'F', "F'", 'F2', 'L', "L'", 'L2', 'D', "D'", 'D2', 'B', "B'", 'B2'];
  for (const move of moves) {
    const inv = invertMove(move);
    const result = applyMoveSequence(solved, [move, inv]);
    assert.equal(isCubeSolved(result), true, `${move} + ${inv} must restore solved state`);
  }
});

test('Sexy Move (R U R\' U\') repeated 6 times restores solved state', () => {
  const solved = createSolvedCube();
  const sexyMove: StandardMove[] = ['R', 'U', "R'", "U'"];
  let current = cloneCubeState(solved);

  for (let rep = 1; rep <= 6; rep++) {
    current = applyMoveSequence(current, sexyMove);
    if (rep < 6) {
      assert.equal(isCubeSolved(current), false, `Repetition ${rep} of Sexy Move should not be solved`);
    } else {
      assert.equal(isCubeSolved(current), true, 'Repetition 6 of Sexy Move must be solved');
    }
  }
});

test('T-Permutation applied twice restores solved state', () => {
  const solved = createSolvedCube();
  const tPerm: StandardMove[] = [
    'R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"
  ];

  const after1 = applyMoveSequence(solved, tPerm);
  assert.equal(isCubeSolved(after1), false);

  const after2 = applyMoveSequence(after1, tPerm);
  assert.equal(isCubeSolved(after2), true, 'T-Permutation x 2 must restore solved cube');
});

test('Undo and Redo stack sequence integrity', () => {
  const initial = createSolvedCube();
  const moveList: StandardMove[] = ['R', 'U', "R'", 'F', 'D2', "B'", 'L'];

  // Apply moves and track history
  let current = cloneCubeState(initial);
  const undoStack: StandardMove[] = [];
  const stateHistory: string[] = [JSON.stringify(current)];

  for (const move of moveList) {
    current = applyMove(current, move);
    undoStack.push(move);
    stateHistory.push(JSON.stringify(current));
  }

  // Undo one by one
  const redoStack: StandardMove[] = [];
  while (undoStack.length > 0) {
    const lastMove = undoStack.pop()!;
    redoStack.push(lastMove);
    current = applyMove(current, invertMove(lastMove));
    const expectedPrevState = stateHistory[undoStack.length];
    assert.equal(JSON.stringify(current), expectedPrevState, 'Undo must match previous state');
  }

  assert.equal(isCubeSolved(current), true, 'Undoing all moves must return to solved');

  // Redo one by one
  while (redoStack.length > 0) {
    const nextMove = redoStack.pop()!;
    undoStack.push(nextMove);
    current = applyMove(current, nextMove);
    const expectedState = stateHistory[undoStack.length];
    assert.equal(JSON.stringify(current), expectedState, 'Redo must match expected state');
  }
});

test('WCA scramble generator produces valid legal sequences', () => {
  const scramble = generateWcaScramble(20);
  assert.equal(scramble.length, 20);

  // Check no consecutive same faces
  for (let i = 1; i < scramble.length; i++) {
    const f1 = scramble[i - 1][0];
    const f2 = scramble[i][0];
    assert.notEqual(f1, f2, `Consecutive moves on same face: ${scramble[i - 1]} and ${scramble[i]}`);
  }

  const solved = createSolvedCube();
  const scrambled = applyMoveSequence(solved, scramble);
  assert.equal(isCubeSolved(scrambled), false);
});
