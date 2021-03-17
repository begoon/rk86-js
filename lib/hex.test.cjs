const test = require('ava');

const {
  hex8,
  hex16,
  hexArray,
  hexMapArray,
} = require('./hex.cjs');

test('hex8', t => {
  t.is('00', hex8(0));
  t.is('FF', hex8(0xFF));
  t.is('FF', hex8(0xFF));
  t.is('E6', hex8(0xE6));
  t.is('BB', hex8(0xAABB));
});

test('hex16', t => {
  t.is('0000', hex16(0));
  t.is('FFFF', hex16(0xFFFF));
  t.is('C0DE', hex16(0xC0DE));
  t.is('BEEF', hex16(0xBEEFBEEF));
});

test('hexArray', t => {
  t.is('00', hexArray([0]));
  t.is('00 01 02 03', hexArray([0, 1, 2, 3]));
})

test('hexMapArray', t => {
  t.deepEqual({ ':0000': '00' }, hexMapArray([0]));
  t.deepEqual({ ':0000': '00 01 02 03' }, hexMapArray([0, 1, 2, 3]));
  t.deepEqual(
    { ':0000': '00 01 02 03', ':0004': '04 05 06 07' },
    hexMapArray([0, 1, 2, 3, 4, 5, 6, 7], 4),
  );
  t.deepEqual(
    { ':0000': '00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F', ':0010': '10' },
    hexMapArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  );
})

test('hexMapArray content', t => {
  let original = [];
  for (let i = 0; i < 0x10000; ++i) original[i] = (i * 3) & 0xff;
  const hex = hexMapArray(original);

  let restored = []
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