const test = require('ava');

const fs = require('fs');
const path = require('path');

eval(fs.readFileSync('src/js/hex.js', 'utf-8'));
eval(fs.readFileSync('src/rk86_memory.js', 'utf-8'));

const testMemory = () => {
  const memory = new Memory(undefined);
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

test.beforeEach(t => {
  t.context = testMemory();
});

test('memory export', t => {
  const memory = t.context;
  const exported = memory.export();
  t.is(exported.vg75_c001_00_cmd, 1);
  t.is(exported.video_screen_size_x_buf, 2);
  t.is(exported.video_screen_size_y_buf, 3);
  t.is(exported.vg75_c001_80_cmd, 4);
  t.is(exported.cursor_x_buf, 5);
  t.is(exported.cursor_y_buf, 6);
  t.is(exported.vg75_c001_60_cmd, 7);
  t.is(exported.ik57_e008_80_cmd, 8);
  t.is(exported.tape_8002_as_output, 1);
  t.is(exported.video_memory_base_buf, '0x1111');
  t.is(exported.video_memory_size_buf, '0x2222');
  t.is(exported.video_memory_base, '0x3333');
  t.is(exported.video_memory_size, '0x4444');
  t.is(exported.video_screen_size_x, 9);
  t.is(exported.video_screen_size_y, 10);
  t.is(exported.video_screen_cursor_x, 11);
  t.is(exported.video_screen_cursor_y, 12);
  t.is(exported.last_access_address, '0x5555');
  t.is(exported.last_access_operation, 'erase');
  t.is(Object.keys(exported.memory).length, 4096);
  let i = 0;
  for (let [label, line] of Object.entries(exported.memory)) {
    t.is(label, ':' + toHex16(i));
    t.is(line, arrayToHexLine(memory.buf.slice(i, i + 16)));
    i += 16;
  }
});

test('memory import', t => {
  const memory = t.context;

  const imported = new Memory(undefined);
  imported.import(memory.export());

  t.is(imported.vg75_c001_00_cmd, memory.vg75_c001_00_cmd);
  t.is(imported.video_screen_size_x_buf, memory.video_screen_size_x_buf);
  t.is(imported.video_screen_size_y_buf, memory.video_screen_size_y_buf);
  t.is(imported.vg75_c001_80_cmd, memory.vg75_c001_80_cmd);
  t.is(imported.cursor_x_buf, memory.cursor_x_buf);
  t.is(imported.cursor_y_buf, memory.cursor_y_buf);
  t.is(imported.vg75_c001_60_cmd, memory.vg75_c001_60_cmd);
  t.is(imported.ik57_e008_80_cmd, memory.ik57_e008_80_cmd);
  t.is(imported.tape_8002_as_output, memory.tape_8002_as_output);
  t.is(imported.video_memory_base_buf, memory.video_memory_base_buf);
  t.is(imported.video_memory_size_buf, memory.video_memory_size_buf);
  t.is(imported.video_memory_base, memory.video_memory_base);
  t.is(imported.video_memory_size, memory.video_memory_size);
  t.is(imported.video_screen_size_x, memory.video_screen_size_x);
  t.is(imported.video_screen_size_y, memory.video_screen_size_y);
  t.is(imported.video_screen_cursor_x, memory.video_screen_cursor_x);
  t.is(imported.video_screen_cursor_y, memory.video_screen_cursor_y);
  t.is(imported.last_access_address, memory.last_access_address);
  t.is(imported.last_access_operation, memory.last_access_operation);
  t.is(imported.buf.length, 0x10000);
});
