const test = require('ava');

const fs = require('fs');
const path = require('path');

const window = { setTimeout() { } };
const ui = { canvas: { getContext() { } } };
const Image = function () { }

eval(fs.readFileSync(path.resolve(__dirname, '../js/hex.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_memory.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_screen.js'), 'utf-8'));

const testScreen = () => {
  const screen = new Screen(undefined, ui, new Memory());
  screen.scale_x = 1;
  screen.scale_y = 2;
  screen.width = 3;
  screen.height = 4;
  screen.cursor_state = 1;
  screen.cursor_x = 6;
  screen.cursor_y = 7;
  screen.video_memory_base = 0x1111;
  screen.video_memory_size = 0x2222;
  screen.light_pen_x = 8;
  screen.light_pen_y = 9;
  screen.light_pen_active = 1;
  return screen;
}

test.beforeEach(t => {
  t.context = testScreen();
});

test('screen export', t => {
  const screen = t.context;
  const exported = screen.export();

  t.is(exported.scale_x, 1);
  t.is(exported.scale_y, 2);
  t.is(exported.width, 3);
  t.is(exported.height, 4);
  t.is(exported.cursor_state, 1);
  t.is(exported.cursor_x, 6);
  t.is(exported.cursor_y, 7);
  t.is(exported.video_memory_base, '0x1111');
  t.is(exported.video_memory_size, '0x2222');
  t.is(exported.light_pen_x, 8);
  t.is(exported.light_pen_y, 9);
  t.is(exported.light_pen_active, 1);
});

test('screen import', t => {
  const screen = t.context;

  const imported = new Screen(undefined, ui, new Memory());
  imported.import(screen.export());

  t.is(imported.scale_x, screen.scale_x);
  t.is(imported.scale_y, screen.scale_y);
  t.is(imported.width, screen.width);
  t.is(imported.height, screen.height);
  t.is(imported.cursor_state, screen.cursor_state);
  t.is(imported.cursor_x, screen.cursor_x);
  t.is(imported.cursor_y, screen.cursor_y);
  t.is(imported.video_memory_base, screen.video_memory_base);
  t.is(imported.video_memory_size, screen.video_memory_size);
  t.is(imported.light_pen_x, screen.light_pen_x);
  t.is(imported.light_pen_y, screen.light_pen_y);
  t.is(imported.light_pen_active, screen.light_pen_active);
});

module.exports = testScreen;
