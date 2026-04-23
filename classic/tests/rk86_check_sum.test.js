import { test, expect } from 'bun:test';
import fs from 'node:fs';

(0, eval)(fs.readFileSync('./src/rk86_check_sum.js', 'utf-8'));

test('extract_rk86_word', () => {
  expect(rk86_check_sum([0xC3, 0x36, 0xF8])).toBe(0xF9F1);
});
