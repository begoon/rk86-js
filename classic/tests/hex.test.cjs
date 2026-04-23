const test = require('ava');

const fs = require('fs');
const path = require('path');

eval(fs.readFileSync('src/js/hex.js', 'utf-8'));

test('toHex8', t => {
  t.is('00', toHex8(0));
  t.is('FF', toHex8(0xFF));
  t.is('FF', toHex8(0xFF));
  t.is('E6', toHex8(0xE6));
  t.is('BB', toHex8(0xAABB));
});

test('toHex16', t => {
  t.is('0000', toHex16(0));
  t.is('FFFF', toHex16(0xFFFF));
  t.is('C0DE', toHex16(0xC0DE));
  t.is('BEEF', toHex16(0xBEEFBEEF));
});

test('arrayToHexLine', t => {
  t.is('00', arrayToHexLine([0]));
  t.is('00 01 02 03', arrayToHexLine([0, 1, 2, 3]));
})

test('arrayToHexMap', t => {
  t.deepEqual({ ':0000': '00' }, arrayToHexMap([0]));
  t.deepEqual({ ':0000': '00 01 02 03' }, arrayToHexMap([0, 1, 2, 3]));
  t.deepEqual(
    { ':0000': '00 01 02 03', ':0004': '04 05 06 07' },
    arrayToHexMap([0, 1, 2, 3, 4, 5, 6, 7], 4),
  );
  t.deepEqual(
    { ':0000': '00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F', ':0010': '10' },
    arrayToHexMap([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  );
})

test('arrayToHexMap content', t => {
  const original = [];
  for (let i = 0; i < 0x10000; ++i) original[i] = (i * 3) & 0xff;
  const hex = arrayToHexMap(original);
  t.is(Object.keys(hex).length, 4096);

  const restored = [];
  let i = 0;
  for (let [label, line] of Object.entries(hex)) {
    // check the label prefix ':'
    t.true(label.startsWith(':'), `${label}: ${line}`);
    // cut the label
    const address = label.slice(1);
    // check the label length 4
    t.is(address.length, 4, `${label}: ${line}`);
    // parse the label to int
    const address_i = parseInt(address, 16);
    // check the label value 
    t.is(address_i, i, `${label}: ${line}`);
    // extract the values from the line
    const line_values = line.split(' ').map((value) => parseInt(value, 16));
    // check the line values length 16
    t.is(line_values.length, 16);
    // put the line to the array from the labelled address
    for (let j = 0; j < line_values.length; j++) {
      restored[address_i + j] = line_values[j];
    }
    i += 16;
  }

  t.is(restored.length, original.length);
  for (let i = 0; i < original.length; i += 1) {
    t.is(original[i], restored[i], `i: ${i}`);
  }
})

test('hexMapToArray', t => {
  const original = [];
  for (let i = 0; i < 0x10000; ++i) original[i] = i & 0xff;
  const hex = arrayToHexMap(original);
  const restored = hexMapToArray(hex);
  t.is(restored.length, original.length);
  for (let i = 0; i < original.length; i += 1) {
    t.is(original[i], restored[i], `i: ${i}`);
  }
})

test('fromHex', t => {
  t.is(0, fromHex(0));
  t.is(100, fromHex(100));
  t.is(0, fromHex('0'));
  t.is(10, fromHex('10'));
  t.is(0x00, fromHex('0x00'));
  t.is(0xFF, fromHex('0xFF'));
  t.is(0xE6, fromHex('0xE6'));
  t.is(0x0000, fromHex('0x0000'));
  t.is(0xFFFF, fromHex('0xFFFF'));
  t.is(0xC0DE, fromHex('0xC0DE'));
})