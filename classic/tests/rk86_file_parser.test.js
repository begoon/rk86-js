import { test, expect, beforeEach } from 'bun:test';
import fs from 'node:fs';

(0, eval)(fs.readFileSync('src/rk86_file_parser.js', 'utf-8'));

let parser;
beforeEach(() => {
  parser = new FileParser();
});

test('extract_rk86_word', () => {
  expect(parser.extract_rk86_word([0x11, 0x22, 0x33], 1)).toBe(0x2233);
});

const toArray = (s) => s.split('').map(c => c.charCodeAt(0));

const testIsHexFile = (title, input) => {
  test(title, () => {
    expect(parser.is_hex_file(toArray(input))).toBe(true);
  });
};

testIsHexFile('recognize the signature', '#!rk86');
testIsHexFile('recognize the signature followed by newline', '#!rk86\n');

test('is_json file', () => {
  expect(parser.is_json(null)).toBe(false);
  expect(parser.is_json(undefined)).toBe(false);
  expect(parser.is_json([1])).toBe(false);
  expect(parser.is_json(toArray('{}'))).toEqual({});
  expect(parser.is_json(toArray('{"id": "rk86"}'))).toEqual({ id: 'rk86' });
});

const testConvertHexToBinary = (title, input, expected) => {
  test(title, () => {
    expect(parser.convert_hex_to_binary(input)).toEqual(expected);
  });
};

testConvertHexToBinary(
  'convert multiline line with signature',
  '\n' +
  '#!rk86\n' +
  '0000 01 02 03 04 05 06 07 08\n' +
  '0000 09 0A 1B 1C 0D 0E FF 00\n' +
  '0000 a0 b0 c0 d0 e0 FF\n' +
  '\n' +
  '0000 AA\n' +
  '\n',
  [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x1b, 0x1c, 0x0d, 0x0e, 0xff, 0x00,
    0xa0, 0xb0, 0xc0, 0xd0, 0xe0, 0xff,
    0xaa,
  ],
);

const testExtractMetadata = (title, input, expected) => {
  test(title, () => {
    expect(parser.extact_metadata(input)).toEqual(expected);
  });
};

testExtractMetadata('extract name=name', '!name=name', { name: 'name' });
testExtractMetadata('extract empty name', '!name', {});
testExtractMetadata(
  'extract name=name after signature',
  '#!rk86\n!name=name\n',
  { name: 'name' },
);
testExtractMetadata(
  'extract name=name after signature on the same line',
  '#!rk86 !name=name\n',
  { name: 'name' },
);
testExtractMetadata(
  'extract tags from multiple lines',
  '#!name=name\n!start=100 !end=200 !entry=300',
  { name: 'name', start: '100', end: '200', entry: '300' },
);

const testFileExt = (title, input, expected) => {
  test(title, () => {
    expect(parser.file_ext(input)).toBe(expected);
  });
};

testFileExt('name and ext', 'name.ext', 'ext');
testFileExt('name without ext', 'name', '');
testFileExt('name only with dot', 'name.', '');
testFileExt('empty name', '', '');
testFileExt('empty name as dot', '.', '');
testFileExt('empty name, ext only', '.ext', 'ext');

const testParseRk86Binary = (title, input, expected) => {
  test(title, () => {
    expect(parser.parse_rk86_binary(...input)).toEqual(expected);
  });
};

testParseRk86Binary('name only',
  ['name.rk', [0xe6, 0x11, 0x22, 0x33, 0x44, 0xaa]],
  {
    name: 'name.rk',
    start: 0x1122,
    end: 0x3344,
    entry: 0x1122,
    size: 0x3344 - 0x1122 + 1,
    image: [0xaa],
  },
);

testParseRk86Binary('name with folder',
  ['folder/name.rk', [0xe6, 0x22, 0x11, 0x44, 0x33, 0x66]],
  {
    name: 'name.rk',
    start: 0x2211,
    end: 0x4433,
    entry: 0x2211,
    size: 0x4433 - 0x2211 + 1,
    image: [0x66],
  },
);

testParseRk86Binary('name with URL',
  ['https://domain.com/path/name.rk', [0xe6, 0x11, 0x22, 0x33, 0x44, 0xaa]],
  {
    name: 'name.rk',
    start: 0x1122,
    end: 0x3344,
    entry: 0x1122,
    size: 0x3344 - 0x1122 + 1,
    image: [0xaa],
  },
);

testParseRk86Binary('name PVO.GAM with hardcoded entry',
  ['PVO.GAM', [0xe6, 0x11, 0x22, 0x33, 0x44, 0xaa]],
  {
    name: 'PVO.GAM',
    start: 0x1122,
    end: 0x3344,
    entry: 0x3400,
    size: 0x3344 - 0x1122 + 1,
    image: [0xaa],
  },
);

testParseRk86Binary('monitor binary with extension .bin',
  ['mon32.bin', [0x11, 0x22]],
  {
    name: 'mon32.bin',
    start: 0xfffe,
    end: 0xffff,
    entry: 0xfffe,
    size: 2,
    image: [0x11, 0x22],
  },
);

testParseRk86Binary('monitor binary without extension',
  ['mon32', [0x11, 0x22]],
  {
    name: 'mon32',
    start: 0xfffe,
    end: 0xffff,
    entry: 0xfffe,
    size: 2,
    image: [0x11, 0x22],
  },
);

testParseRk86Binary('binary with extension .bin',
  ['binary.bin', [0x11, 0x22]],
  {
    name: 'binary.bin',
    start: 0,
    end: 1,
    entry: 0,
    size: 2,
    image: [0x11, 0x22],
  },
);

testParseRk86Binary('regular binary with empty extension',
  ['binary', [0x11, 0x22, 0x33]],
  {
    name: 'binary',
    start: 0,
    end: 2,
    entry: 0,
    size: 3,
    image: [0x11, 0x22, 0x33],
  },
);

test('parse, throws when file is too long', () => {
  expect(() => parser.parse_rk86_binary('long.pki', new Array(0x10001)))
    .toThrow('ERROR! Loaded file "long.pki" length 65537 is more than 65556.');
});

test('parse_rk86_binary, name should stay as given, start/entry=0', () => {
  const image = [...toArray('#!rk86\n0000 11\n')];
  expect(parser.parse_rk86_binary('random', image)).toEqual({
    name: 'random',
    start: 0,
    end: 0,
    entry: 0,
    size: 1,
    image: [0x11],
  });
});

test('parse_rk86_binary, name should be taken from tags', () => {
  const image = [...toArray('#!rk86 !name=image.bin \n0000 11\n')];
  expect(parser.parse_rk86_binary('random', image)).toEqual({
    name: 'image.bin',
    start: 0,
    end: 0,
    entry: 0,
    size: 1,
    image: [0x11],
  });
});

test('parse_rk86_binary, start should be taken from tags in binary file', () => {
  const image = [...toArray('#!rk86 !name=image.bin !start=0100 \n0000 11\n')];
  expect(parser.parse_rk86_binary('random', image)).toEqual({
    name: 'image.bin',
    start: 0x0100,
    end: 0x0100,
    entry: 0x0100,
    size: 1,
    image: [0x11],
  });
});

test('parse_rk86_binary, entry should be taken from tags in binary file', () => {
  const image = [
    ...toArray('#!rk86 !name=image.bin !start=0100 !entry=0200 \n0000 11\n'),
  ];
  expect(parser.parse_rk86_binary('random', image)).toEqual({
    name: 'image.bin',
    start: 0x0100,
    end: 0x0100,
    entry: 0x0200,
    size: 1,
    image: [0x11],
  });
});

test('parse_rk86_binary, start should not be taken from tags in RK file', () => {
  const image = [...toArray('#!rk86 !start=0100\n0000 E6 11 22 11 23 AA BB\n')];
  expect(parser.parse_rk86_binary('image.rk', image)).toEqual({
    name: 'image.rk',
    start: 0x1122,
    end: 0x1123,
    entry: 0x1122,
    size: 2,
    image: [0xAA, 0xBB],
  });
});

test('parse_rk86_binary, entry should be taken from tags in RK file', () => {
  const image = [
    ...toArray(
      '#!rk86 !name=image.rk !start=0100 !entry=0200\n' +
      '0000 E6 11 22 11 23 AA BB\n',
    ),
  ];
  expect(parser.parse_rk86_binary('random', image)).toEqual({
    name: 'image.rk',
    start: 0x1122,
    end: 0x1123,
    entry: 0x0200,
    size: 2,
    image: [0xAA, 0xBB],
  });
});

test('entry should be taken from tags in RK file', () => {
  const image =
    '#!rk86 !name=image.rk !start=0100 !entry=0200\n' +
    '0000 E6 11 22 11 23 AA BB\n';
  expect(parser.parse_rk86_binary('random', toArray(image))).toEqual({
    name: 'image.rk',
    start: 0x1122,
    end: 0x1123,
    entry: 0x0200,
    size: 2,
    image: [0xAA, 0xBB],
  });
});
