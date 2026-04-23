import { test, expect, beforeEach } from 'bun:test';
import fs from 'node:fs';

globalThis.document = {};

(0, eval)(fs.readFileSync('src/js/hex.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/rk86_keyboard.js', 'utf-8'));

const testKeyboard = () => {
  const keyboard = new Keyboard();
  keyboard.modifiers = 0xE6;
  keyboard.state = [0x0F, 0x1E, 0x2D, 0x3C, 0x4B, 0x5A, 0x69, 0x78];
  return keyboard;
};

let keyboard;
beforeEach(() => {
  keyboard = testKeyboard();
});

test('keyboard export', () => {
  const exported = keyboard.export();
  expect(exported.modifiers).toBe('0xE6');
  expect(exported.state).toEqual(
    ['0x0F', '0x1E', '0x2D', '0x3C', '0x4B', '0x5A', '0x69', '0x78']
  );
});

test('keyboard import', () => {
  const imported = new Keyboard();
  imported.import(keyboard.export());

  expect(imported.state).toEqual(keyboard.state);
  expect(imported.modifiers).toBe(keyboard.modifiers);
});
