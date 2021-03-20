const test = require('ava');

const [fs, path] = [require('fs'), require('path')];

const document = {};
const window = { setTimeout() { } };
const Image = function () { }

const version = "0.0.0";

const snapshot_standard = path.join(__dirname, './snapshot.json');

eval(fs.readFileSync(path.resolve(__dirname, '../js/StringUtils.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../js/hex.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_memory.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_keyboard.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_screen.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../i8080.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_snapshot.js'), 'utf-8'));

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
}

const testKeyboard = () => {
  const keyboard = new Keyboard();
  keyboard.modifiers = 0xE6;
  keyboard.state = [0x0F, 0x1E, 0x2D, 0x3C, 0x4B, 0x5A, 0x69, 0x78];
  return keyboard;
}

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
}

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
}

function create_rk86() {
  const keyboard = testKeyboard();

  const memory = testMemory(keyboard);
  memory.keyboard = keyboard;

  const io = {};
  const cpu = testCpu(memory, io);

  const ui = {
    runner: { cpu },
    canvas: { getContext() { } }
  }
  const screen = testScreen(ui);
  screen.ctx = { fillRect: () => { } };

  return { ui, screen };
}

test.beforeEach(t => {
  t.context = create_rk86();
});

test('snapshot export', t => {
  const { ui, screen } = t.context;
  Date.prototype.toISOString = () => 'created';
  const snapshot = rk86_snapshot(ui, screen);
  const expected = fs.readFileSync(snapshot_standard).toString();
  const snapshot_lines = snapshot.split('\n');
  const expected_lines = expected.split('\n');
  for (let i = 0; i < expected_lines.length; i += 1) {
    const context =
      'actual\n\n' +
      snapshot_lines.slice(i - 1, i + 2).map(v => `> ${v}`).join('\n') + '\n' +
      '\n' +
      'expected\n\n' +
      expected_lines.slice(i - 1, i + 2).join('\n') + '\n';

    t.is(snapshot_lines[i], expected_lines[i], context);
  }
});

test('snapshot restore from string', snapshot_restore,
  fs.readFileSync(snapshot_standard).toString()
);

test('snapshot restore from object/json', snapshot_restore,
  JSON.parse(fs.readFileSync(snapshot_standard).toString())
);

function snapshot_restore(t, snapshot) {
  const { ui, screen } = t.context;
  let width_set = undefined;
  let height_set = undefined;
  ui.resize_canvas = (width, height) => {
    width_set = width;
    height_set = height;
  }
  t.true(rk86_snapshot_restore(snapshot, ui, screen));
  t.is(width_set, 18);
  t.is(height_set, 80);
  t.is(screen.video_memory_base, 0x1111);

  // cpu
  const cpu = ui.runner.cpu;
  t.is(cpu.a(), 0xE6);
  t.is(cpu.sf, 1);
  t.is(cpu.zf, 0);
  t.is(cpu.hf, 1);
  t.is(cpu.pf, 0);
  t.is(cpu.cf, 1);
  t.is(cpu.bc(), 0x1122);
  t.is(cpu.de(), 0x3344);
  t.is(cpu.hl(), 0x5566);
  t.is(cpu.sp, 0x7788);
  t.is(cpu.pc, 0x9999);
  t.is(cpu.iff, 1);

  // memory
  const memory = cpu.memory;
  t.is(memory.vg75_c001_00_cmd, 1);
  t.is(memory.video_screen_size_x_buf, 2);
  t.is(memory.video_screen_size_y_buf, 3);
  t.is(memory.vg75_c001_80_cmd, 4);
  t.is(memory.cursor_x_buf, 5);
  t.is(memory.cursor_y_buf, 6);
  t.is(memory.vg75_c001_60_cmd, 7);
  t.is(memory.ik57_e008_80_cmd, 8);
  t.is(memory.tape_8002_as_output, 1);
  t.is(memory.video_memory_base_buf, 0x1111);
  t.is(memory.video_memory_size_buf, 0x2222);
  t.is(memory.video_memory_base, 0x3333);
  t.is(memory.video_memory_size, 0x4444);
  t.is(memory.video_screen_size_x, 9);
  t.is(memory.video_screen_size_y, 10);
  t.is(memory.video_screen_cursor_x, 11);
  t.is(memory.video_screen_cursor_y, 12);
  t.is(memory.last_access_address, 0x5555);
  t.is(memory.last_access_operation, 'erase');

  // keyboard
  const keyboard = memory.keyboard;
  t.deepEqual(keyboard.state, [0x0F, 0x1E, 0x2D, 0x3C, 0x4B, 0x5A, 0x69, 0x78]);
  t.is(keyboard.modifiers, 0xE6);

  // screen
  t.is(screen.scale_x, 1);
  t.is(screen.scale_y, 2);
  t.is(screen.width, 3);
  t.is(screen.height, 4);
  t.is(screen.cursor_state, 1);
  t.is(screen.cursor_x, 6);
  t.is(screen.cursor_y, 7);
  t.is(screen.video_memory_base, 0x1111);
  t.is(screen.video_memory_size, 12); // 3x4
  t.is(screen.light_pen_x, 8);
  t.is(screen.light_pen_y, 9);
  t.is(screen.light_pen_active, 1);
};

test('snapshot import failure', t => {
  t.false(rk86_snapshot_restore('{}'));
  t.false(rk86_snapshot_restore('{"id": "x"}'));
  t.false(rk86_snapshot_restore({}));
  t.false(rk86_snapshot_restore({ id: "x" }));
});

