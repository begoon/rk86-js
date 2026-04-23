const test = require('ava');

const fs = require('fs');
const path = require('path');

const document = {};

eval(fs.readFileSync('src/js/hex.js', 'utf-8'));
eval(fs.readFileSync('src/rk86_keyboard.js', 'utf-8'));

const testKeyboard = () => {
  const keyboard = new Keyboard();
  keyboard.modifiers = 0xE6;
  keyboard.state = [0x0F, 0x1E, 0x2D, 0x3C, 0x4B, 0x5A, 0x69, 0x78];
  return keyboard;
}

test.beforeEach(t => {
  t.context = testKeyboard();
});

test('keyboard export', t => {
  const keyboard = t.context;

  const exported = keyboard.export();
  t.is(exported.modifiers, '0xE6');
  t.deepEqual(
    exported.state,
    ['0x0F', '0x1E', '0x2D', '0x3C', '0x4B', '0x5A', '0x69', '0x78']
  )
});

test('keyboard import', t => {
  const keyboard = t.context;

  const imported = new Keyboard();
  imported.import(keyboard.export());

  t.deepEqual(imported.state, keyboard.state);
  t.is(imported.modifiers, keyboard.modifiers);
});
