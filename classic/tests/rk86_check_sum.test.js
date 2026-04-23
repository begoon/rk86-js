const test = require('ava');

const fs = require('fs');

eval(fs.readFileSync('./src/rk86_check_sum.js', 'utf-8'));

test('extract_rk86_word', t => {
  t.is(0xF9F1, rk86_check_sum([0xC3, 0x36, 0xF8]));
});
