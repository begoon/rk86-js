import { test, expect } from 'bun:test';
import fs from 'node:fs';

(0, eval)(fs.readFileSync('src/js/hex.js', 'utf-8'));

test('toHex8', () => {
  expect(toHex8(0)).toBe('00');
  expect(toHex8(0xFF)).toBe('FF');
  expect(toHex8(0xE6)).toBe('E6');
  expect(toHex8(0xAABB)).toBe('BB');
});

test('toHex16', () => {
  expect(toHex16(0)).toBe('0000');
  expect(toHex16(0xFFFF)).toBe('FFFF');
  expect(toHex16(0xC0DE)).toBe('C0DE');
  expect(toHex16(0xBEEFBEEF)).toBe('BEEF');
});

test('arrayToHexLine', () => {
  expect(arrayToHexLine([0])).toBe('00');
  expect(arrayToHexLine([0, 1, 2, 3])).toBe('00 01 02 03');
});

test('arrayToHexMap', () => {
  expect(arrayToHexMap([0])).toEqual({ ':0000': '00' });
  expect(arrayToHexMap([0, 1, 2, 3])).toEqual({ ':0000': '00 01 02 03' });
  expect(arrayToHexMap([0, 1, 2, 3, 4, 5, 6, 7], 4)).toEqual({
    ':0000': '00 01 02 03',
    ':0004': '04 05 06 07',
  });
  expect(
    arrayToHexMap([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  ).toEqual({
    ':0000': '00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F',
    ':0010': '10',
  });
});

test('arrayToHexMap content', () => {
  const original = [];
  for (let i = 0; i < 0x10000; ++i) original[i] = (i * 3) & 0xff;
  const hex = arrayToHexMap(original);
  expect(Object.keys(hex).length).toBe(4096);

  const restored = [];
  let i = 0;
  for (let [label, line] of Object.entries(hex)) {
    expect(label.startsWith(':')).toBe(true);
    const address = label.slice(1);
    expect(address.length).toBe(4);
    const address_i = parseInt(address, 16);
    expect(address_i).toBe(i);
    const line_values = line.split(' ').map((value) => parseInt(value, 16));
    expect(line_values.length).toBe(16);
    for (let j = 0; j < line_values.length; j++) {
      restored[address_i + j] = line_values[j];
    }
    i += 16;
  }

  expect(restored.length).toBe(original.length);
  for (let i = 0; i < original.length; i += 1) {
    expect(restored[i]).toBe(original[i]);
  }
});

test('hexMapToArray', () => {
  const original = [];
  for (let i = 0; i < 0x10000; ++i) original[i] = i & 0xff;
  const hex = arrayToHexMap(original);
  const restored = hexMapToArray(hex);
  expect(restored.length).toBe(original.length);
  for (let i = 0; i < original.length; i += 1) {
    expect(restored[i]).toBe(original[i]);
  }
});

test('fromHex', () => {
  expect(fromHex(0)).toBe(0);
  expect(fromHex(100)).toBe(100);
  expect(fromHex('0')).toBe(0);
  expect(fromHex('10')).toBe(10);
  expect(fromHex('0x00')).toBe(0x00);
  expect(fromHex('0xFF')).toBe(0xFF);
  expect(fromHex('0xE6')).toBe(0xE6);
  expect(fromHex('0x0000')).toBe(0x0000);
  expect(fromHex('0xFFFF')).toBe(0xFFFF);
  expect(fromHex('0xC0DE')).toBe(0xC0DE);
});
