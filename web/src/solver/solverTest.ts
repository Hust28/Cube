import test from 'node:test';
import assert from 'node:assert/strict';
import { RubiksCubeSolver, validateCubeState } from './rubiksSolver.ts';
import { createSolvedCube, cloneCubeState, applyMove, applyMoveSequence, isCubeSolved, generateWcaScramble } from '../engine/cubeState.ts';
import { StandardMove } from '../types/cube.ts';

test('Solved cube validates and returns 0 moves', () => {
  const solved = createSolvedCube();
  const validation = validateCubeState(solved);
  assert.equal(validation.valid, true, 'Solved cube must be valid');

  const result = RubiksCubeSolver.solve(solved);
  assert.equal(result.isValid, true);
  assert.equal(result.moveCount, 0);
  assert.equal(result.solutionMoves.length, 0);
});

test('Rejects invalid color distribution', () => {
  const badCube = createSolvedCube();
  badCube.U[0] = 'Y'; // Now 8 White, 10 Yellow
  const validation = validateCubeState(badCube);
  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /color distribution/i);

  const result = RubiksCubeSolver.solve(badCube);
  assert.equal(result.isValid, false);
});

test('Rejects impossible edge with opposite colors (White-Yellow)', () => {
  const badCube = createSolvedCube();
  // Edge UF normally has U[7]=W and F[1]=G. Change F[1] to Y (White and Yellow on same edge)
  badCube.F[1] = 'Y';
  // Balance counts so colors equal 9
  badCube.D[1] = 'G';

  const validation = validateCubeState(badCube);
  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /opposite/i);
});

test('Rejects impossible corner with opposite colors (White-Yellow-Red)', () => {
  const badCube = createSolvedCube();
  // Corner UFR: U[8]=W, F[2]=G, R[0]=R. Change F[2] to Y
  badCube.F[2] = 'Y';
  badCube.D[2] = 'G'; // Balance count

  const validation = validateCubeState(badCube);
  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /opposite/i);
});

test('Rejects twisted corner parity (single corner twisted in place)', () => {
  const badCube = createSolvedCube();
  // Twist corner UFR (U[8], F[2], R[0]) in place: W G R -> R W G
  badCube.U[8] = 'R';
  badCube.F[2] = 'W';
  badCube.R[0] = 'G';
  // All color counts remain exactly 9, but corner twist sum % 3 != 0!

  const validation = validateCubeState(badCube);
  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /twist/i);
});

test('Solves 1-move scramble and verified execution restores solved cube', () => {
  const solved = createSolvedCube();
  const scrambled = applyMove(solved, 'R');

  const result = RubiksCubeSolver.solve(scrambled);
  assert.equal(result.isValid, true);
  assert.ok(result.moveCount > 0);
  assert.ok(result.solutionMoves.length > 0);

  // CRITICAL: Verify executing returned solution actually solves the cube!
  const finalState = applyMoveSequence(scrambled, result.solutionMoves);
  assert.equal(isCubeSolved(finalState), true, 'Executing solution must solve the cube');
});

test('Solves 4-move scramble and verified execution restores solved cube', () => {
  const solved = createSolvedCube();
  const moves: StandardMove[] = ['R', 'U', "R'", "U'"];
  const scrambled = applyMoveSequence(solved, moves);

  const result = RubiksCubeSolver.solve(scrambled);
  assert.equal(result.isValid, true);

  const finalState = applyMoveSequence(scrambled, result.solutionMoves);
  assert.equal(isCubeSolved(finalState), true, 'Executing solution must solve 4-move scramble');
});

test('Solves 10-move scramble and verified execution restores solved cube', () => {
  const solved = createSolvedCube();
  const scramble = generateWcaScramble(10);
  const scrambled = applyMoveSequence(solved, scramble);

  const result = RubiksCubeSolver.solve(scrambled);
  assert.equal(result.isValid, true);

  const finalState = applyMoveSequence(scrambled, result.solutionMoves);
  assert.equal(isCubeSolved(finalState), true, 'Executing solution must solve 10-move scramble');
});

test('Solves full 20-move legal WCA scramble and verified execution restores solved cube', () => {
  const solved = createSolvedCube();
  const scramble = generateWcaScramble(20);
  const scrambled = applyMoveSequence(solved, scramble);

  const result = RubiksCubeSolver.solve(scrambled);
  assert.equal(result.isValid, true, `Solver failed on WCA scramble: ${result.error}`);
  assert.ok(result.solutionMoves.length <= 25, `Solution should be efficient, got ${result.solutionMoves.length} moves`);

  const finalState = applyMoveSequence(scrambled, result.solutionMoves);
  assert.equal(isCubeSolved(finalState), true, 'Executing solution must solve 20-move WCA scramble');
});

test('Solves multiple randomly generated legal cube states and verifies all solutions', () => {
  for (let trial = 1; trial <= 3; trial++) {
    const solved = createSolvedCube();
    const length = 12 + trial * 2;
    const scramble = generateWcaScramble(length);
    const scrambled = applyMoveSequence(solved, scramble);

    const result = RubiksCubeSolver.solve(scrambled);
    assert.equal(result.isValid, true, `Trial ${trial} failed validation or solution`);
    assert.ok(result.solutionMoves.length > 0);

    const finalState = applyMoveSequence(scrambled, result.solutionMoves);
    assert.equal(isCubeSolved(finalState), true, `Trial ${trial} solution failed to restore solved cube`);
  }
});
