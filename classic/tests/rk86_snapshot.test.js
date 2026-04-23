import { test, expect, beforeEach } from 'bun:test';
import fs from 'node:fs';

globalThis.document = {};
globalThis.window = { setTimeout() { } };
globalThis.Image = function () { };
globalThis.version = '0.0.0';

const snapshot_standard = new URL('./snapshot.json', import.meta.url);

(0, eval)(fs.readFileSync('src/js/StringUtils.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/js/hex.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/rk86_memory.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/rk86_keyboard.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/rk86_screen.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/i8080.js', 'utf-8'));
(0, eval)(fs.readFileSync('src/rk86_snapshot.js', 'utf-8'));

const testCpu = (memory, io) => {
  const cpu = new I8080(memory, io);
  cpu.set_a(0xE6);
  cpu.sf = 1;
  cpu.zf = 0;
  cpu.hf = 1;
  cpu.pf = 0;
  cpu.cf = 1;
  cpu.set_b(0x11);
  cpu.set_c(0x22);
  cpu.set_d(0x33);
  cpu.set_e(0x44);
  cpu.set_h(0x55);
  cpu.set_l(0x66);
  cpu.sp = 0x7788;
  cpu.pc = 0x9999;
  cpu.iff = 1;
  return cpu;
};

const testKeyboard = () => {
  const keyboard = new Keyboard();
  keyboard.modifiers = 0xE6;
  keyboard.state = [0x0F, 0x1E, 0x2D, 0x3C, 0x4B, 0x5A, 0x69, 0x78];
  return keyboard;
};

const testMemory = (keyboard) => {
  const memory = new Memory(keyboard);
  memory.vg75_c001_00_cmd = 1;
  memory.video_screen_size_x_buf = 2;
  memory.video_screen_size_y_buf = 3;
  memory.vg75_c001_80_cmd = 4;
  memory.cursor_x_buf = 5;
  memory.cursor_y_buf = 6;
  memory.vg75_c001_60_cmd = 7;
  memory.ik57_e008_80_cmd = 8;
  memory.tape_8002_as_output = 1;
  memory.video_memory_base_buf = 0x1111;
  memory.video_memory_size_buf = 0x2222;
  memory.video_memory_base = 0x3333;
  memory.video_memory_size = 0x4444;
  memory.video_screen_size_x = 9;
  memory.video_screen_size_y = 10;
  memory.video_screen_cursor_x = 11;
  memory.video_screen_cursor_y = 12;
  memory.last_access_address = 0x5555;
  memory.last_access_operation = 'erase';
  memory.buf = [];
  for (let i = 0; i < 0x10000; ++i) memory.buf[i] = i & 0xff;
  return memory;
};

const testScreen = (ui) => {
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
};

function create_rk86() {
  const keyboard = testKeyboard();
  const memory = testMemory(keyboard);
  memory.keyboard = keyboard;
  const io = {};
  const cpu = testCpu(memory, io);
  const ui = {
    runner: { cpu },
    canvas: { getContext() { } },
  };
  const screen = testScreen(ui);
  screen.ctx = { fillRect: () => { } };
  return { ui, screen };
}

let ctx;
beforeEach(() => {
  ctx = create_rk86();
});

test('snapshot export', () => {
  const { ui, screen } = ctx;
  Date.prototype.toISOString = () => 'created';
  const snapshot = rk86_snapshot(ui, screen);
  const expected = fs.readFileSync(snapshot_standard).toString();
  const snapshot_lines = snapshot.split('\n');
  const expected_lines = expected.split('\n');
  for (let i = 0; i < expected_lines.length; i += 1) {
    expect(snapshot_lines[i]).toBe(expected_lines[i]);
  }
});

function snapshot_restore_check(snapshot) {
  const console_log = console.log;
  console.log = () => { };
  const { ui, screen } = ctx;
  let width_set;
  let height_set;
  ui.resize_canvas = (width, height) => {
    width_set = width;
    height_set = height;
  };
  expect(rk86_snapshot_restore(snapshot, ui, screen)).toBe(true);
  expect(width_set).toBe(18);
  expect(height_set).toBe(80);
  expect(screen.video_memory_base).toBe(0x1111);

  const cpu = ui.runner.cpu;
  expect(cpu.a()).toBe(0xE6);
  expect(cpu.sf).toBe(1);
  expect(cpu.zf).toBe(0);
  expect(cpu.hf).toBe(1);
  expect(cpu.pf).toBe(0);
  expect(cpu.cf).toBe(1);
  expect(cpu.bc()).toBe(0x1122);
  expect(cpu.de()).toBe(0x3344);
  expect(cpu.hl()).toBe(0x5566);
  expect(cpu.sp).toBe(0x7788);
  expect(cpu.pc).toBe(0x9999);
  expect(cpu.iff).toBe(1);

  const memory = cpu.memory;
  expect(memory.vg75_c001_00_cmd).toBe(1);
  expect(memory.video_screen_size_x_buf).toBe(2);
  expect(memory.video_screen_size_y_buf).toBe(3);
  expect(memory.vg75_c001_80_cmd).toBe(4);
  expect(memory.cursor_x_buf).toBe(5);
  expect(memory.cursor_y_buf).toBe(6);
  expect(memory.vg75_c001_60_cmd).toBe(7);
  expect(memory.ik57_e008_80_cmd).toBe(8);
  expect(memory.tape_8002_as_output).toBe(1);
  expect(memory.video_memory_base_buf).toBe(0x1111);
  expect(memory.video_memory_size_buf).toBe(0x2222);
  expect(memory.video_memory_base).toBe(0x3333);
  expect(memory.video_memory_size).toBe(0x4444);
  expect(memory.video_screen_size_x).toBe(9);
  expect(memory.video_screen_size_y).toBe(10);
  expect(memory.video_screen_cursor_x).toBe(11);
  expect(memory.video_screen_cursor_y).toBe(12);
  expect(memory.last_access_address).toBe(0x5555);
  expect(memory.last_access_operation).toBe('erase');

  const keyboard = memory.keyboard;
  expect(keyboard.state).toEqual([0x0F, 0x1E, 0x2D, 0x3C, 0x4B, 0x5A, 0x69, 0x78]);
  expect(keyboard.modifiers).toBe(0xE6);

  expect(screen.scale_x).toBe(1);
  expect(screen.scale_y).toBe(2);
  expect(screen.width).toBe(3);
  expect(screen.height).toBe(4);
  expect(screen.cursor_state).toBe(1);
  expect(screen.cursor_x).toBe(6);
  expect(screen.cursor_y).toBe(7);
  expect(screen.video_memory_base).toBe(0x1111);
  expect(screen.video_memory_size).toBe(12);
  expect(screen.light_pen_x).toBe(8);
  expect(screen.light_pen_y).toBe(9);
  expect(screen.light_pen_active).toBe(1);

  console.log = console_log;
}

test('snapshot restore from string', () => {
  snapshot_restore_check(fs.readFileSync(snapshot_standard).toString());
});

test('snapshot restore from object/json', () => {
  snapshot_restore_check(JSON.parse(fs.readFileSync(snapshot_standard).toString()));
});

test('snapshot import failure', () => {
  expect(rk86_snapshot_restore('{}')).toBe(false);
  expect(rk86_snapshot_restore('{"id": "x"}')).toBe(false);
  expect(rk86_snapshot_restore({})).toBe(false);
  expect(rk86_snapshot_restore({ id: 'x' })).toBe(false);
});
