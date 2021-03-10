const test = require('ava');

const rk86_check_sum = require('./rk86_check_sum.cjs');

test('extract_rk86_word', t => {
  t.is(0xF9F1, rk86_check_sum([0xC3, 0x36, 0xF8]));
});
