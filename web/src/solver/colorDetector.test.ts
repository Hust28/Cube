import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyColor, rgbToHsv } from '../utils/colorDetector.ts';

test('rgbToHsv correctly calculates hue and saturation', () => {
  // Pure Red: 0 deg
  const red = rgbToHsv(255, 0, 0);
  assert.equal(red.h, 0);
  assert.equal(red.s, 1);

  // Pure Green: 120 deg
  const green = rgbToHsv(0, 255, 0);
  assert.equal(green.h, 120);

  // Pure Blue: 240 deg
  const blue = rgbToHsv(0, 0, 255);
  assert.equal(blue.h, 240);

  // Pure Yellow: 60 deg
  const yellow = rgbToHsv(255, 255, 0);
  assert.equal(yellow.h, 60);

  // White: saturation 0
  const white = rgbToHsv(245, 245, 245);
  assert.equal(white.s < 0.05, true);
});

test('classifyColor accurately identifies standard speedcube colors', () => {
  // White
  assert.equal(classifyColor({ r: 240, g: 242, b: 245 }), 'W');
  assert.equal(classifyColor({ r: 215, g: 215, b: 220 }), 'W');

  // Yellow
  assert.equal(classifyColor({ r: 235, g: 220, b: 20 }), 'Y');
  assert.equal(classifyColor({ r: 210, g: 195, b: 15 }), 'Y');

  // Green
  assert.equal(classifyColor({ r: 15, g: 185, b: 60 }), 'G');
  assert.equal(classifyColor({ r: 30, g: 150, b: 50 }), 'G');

  // Blue
  assert.equal(classifyColor({ r: 20, g: 85, b: 220 }), 'B');
  assert.equal(classifyColor({ r: 10, g: 60, b: 190 }), 'B');

  // Red
  assert.equal(classifyColor({ r: 225, g: 25, b: 35 }), 'R');
  assert.equal(classifyColor({ r: 190, g: 20, b: 20 }), 'R');

  // Orange
  assert.equal(classifyColor({ r: 240, g: 110, b: 20 }), 'O');
  assert.equal(classifyColor({ r: 220, g: 95, b: 15 }), 'O');
});
