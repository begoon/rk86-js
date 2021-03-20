const test = require('ava');

const fs = require('fs');
const path = require('path');

eval(fs.readFileSync(path.resolve(__dirname, '../js/hex.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../i8080.js'), 'utf-8'));
eval(fs.readFileSync(path.resolve(__dirname, '../rk86_memory.js'), 'utf-8'));

const testCpu = (memory) => {
  const cpu = new I8080(memory || new Memory(), undefined);
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

test.beforeEach(t => {
  t.context = testCpu();
});

test('cpu export', t => {
  const cpu = t.context;
  const exported = cpu.export();
  t.is(exported.a, '0xE6');
  t.is(exported.sf, 1);
  t.is(exported.zf, 0);
  t.is(exported.hf, 1);
  t.is(exported.pf, 0);
  t.is(exported.cf, 1);
  t.is(exported.bc, '0x1122');
  t.is(exported.de, '0x3344');
  t.is(exported.hl, '0x5566');
  t.is(exported.sp, '0x7788');
  t.is(exported.pc, '0x9999');
  t.is(exported.iff, 1);
});

test('cpu import', t => {
  const cpu = t.context;

  const imported = new I8080(new Memory(), undefined);
  imported.import(cpu.export());

  t.is(imported.a(), cpu.a());
  t.is(imported.sf, cpu.sf);
  t.is(imported.zf, cpu.zf);
  t.is(imported.hf, cpu.hf);
  t.is(imported.pf, cpu.pf);
  t.is(imported.cf, cpu.cf);
  t.is(imported.b(), cpu.b());
  t.is(imported.c(), cpu.c());
  t.is(imported.d(), cpu.d());
  t.is(imported.e(), cpu.e());
  t.is(imported.h(), cpu.h());
  t.is(imported.l(), cpu.l());
  t.is(imported.sp, cpu.sp);
  t.is(imported.pc, cpu.pc);
});
