const test = require('ava');

console.table(require('./rk86_hex.cjs'));

const { hex8, hex16 } = require('./rk86_hex.cjs');

test('hex8', t => {
  t.is(0x00, hex8(0));
});

test('hex16', t => {
  t.is(0x00, hex8(0));
});
