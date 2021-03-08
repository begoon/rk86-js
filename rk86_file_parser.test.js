const test = require('ava');

const FileParser = require('./rk86_file_parser.cjs');

test.beforeEach(t => {
  t.context = new FileParser();
});

test('extract_rk86_word', t => {
  t.is(0x2233, t.context.extract_rk86_word([0x11, 0x22, 0x33], 1));
});

const toArray = (s) => s.split('').map(c => c.charCodeAt(0));

function is_hex_file(t, input, expected) {
  t.true(t.context.is_hex_file(toArray(input)));
}

test('recognize the signature', is_hex_file, '#!rk86');
test('recognize the signature followed by newline', is_hex_file, '#!rk86\n');

function convert_hex_to_binary(t, input, expected) {
  t.deepEqual(expected, t.context.convert_hex_to_binary(input));
}

test('convert multiline line with signature', convert_hex_to_binary,
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
  ]
);

function extract_metadata(t, input, expected) {
  t.deepEqual(expected, t.context.extact_metadata(input));
}

test('extract name=name', extract_metadata, '!name=name', { name: 'name' });

test('extract empty name', extract_metadata, '!name', {});

test('extract name=name after signature', extract_metadata,
  '#!rk86\n!name=name\n', { name: 'name' },
);

test('extract name=name after signature on the same line', extract_metadata,
  '#!rk86 !name=name\n', { name: 'name' }
);

test('extract tags from multiple lines', extract_metadata,
  '#!name=name\n!start=100 !end=200 !entry=300',
  {
    name: 'name',
    start: '100',
    end: '200',
    entry: '300',
  }
);

function file_ext(t, input, expected) {
  t.is(expected, t.context.file_ext(input));
}

test('name and ext', file_ext, 'name.ext', 'ext');
test('name without ext', file_ext, 'name', '');
test('name only with dot', file_ext, 'name.', '');
test('empty name', file_ext, '', '');
test('empty name as dot', file_ext, '.', '');
test('empty name, ext only', file_ext, '.ext', 'ext');

function parse_rk86_binary(t, input, expected) {
  t.deepEqual(expected, t.context.parse_rk86_binary(...input));
}

test('name only', parse_rk86_binary,
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

test('name with folder', parse_rk86_binary,
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

test('name with URL', parse_rk86_binary,
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

test('name PVO.GAM with hardcoded entry', parse_rk86_binary,
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

test('monitor binary with extension .bin', parse_rk86_binary,
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

test('monitor binary without extension', parse_rk86_binary,
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

test('binary with extension .bin', parse_rk86_binary,
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

test('regular binary with empty extension', parse_rk86_binary,
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

test('parse, throws when file is too long', t => {
  const error = t.throws(() => {
    t.context.parse_rk86_binary('long.pki', new Array(0x10001));
  }, { instanceOf: Error });
  t.is(error.message, 'ERROR! Loaded file "long.pki" length 65537 is more than 65556.');
});

test('parse_rk86_binary, name should stay as given, start/entry=0', t => {
  const image = [...toArray('#!rk86\n0000 11\n')];
  const expected = {
    name: 'random',
    start: 0,
    end: 0,
    entry: 0,
    size: 1,
    image: [0x11],
  };
  t.deepEqual(expected, t.context.parse_rk86_binary('random', image));
});

test('parse_rk86_binary, name should be taken from tags', t => {
  const image = [...toArray('#!rk86 !name=image.bin \n0000 11\n')];
  const expected = {
    name: 'image.bin',
    start: 0,
    end: 0,
    entry: 0,
    size: 1,
    image: [0x11],
  };
  t.deepEqual(expected, t.context.parse_rk86_binary('random', image));
});

test('parse_rk86_binary, start should be taken from tags in binary file', t => {
  const image = [...toArray('#!rk86 !name=image.bin !start=0100 \n0000 11\n')];
  const expected = {
    name: 'image.bin',
    start: 0x0100,
    end: 0x0100,
    entry: 0x0100,
    size: 1,
    image: [0x11],
  };
  t.deepEqual(expected, t.context.parse_rk86_binary('random', image));
});

test('parse_rk86_binary, entry should be taken from tags in binary file', t => {
  const image = [
    ...toArray('#!rk86 !name=image.bin !start=0100 !entry=0200 \n0000 11\n')
  ];
  const expected = {
    name: 'image.bin',
    start: 0x0100,
    end: 0x0100,
    entry: 0x0200,
    size: 1,
    image: [0x11],
  };
  t.deepEqual(expected, t.context.parse_rk86_binary('random', image));
});

test('parse_rk86_binary, start should not be taken from tags in RK file', t => {
  const image = [...toArray('#!rk86 !start=0100\n0000 E6 11 22 11 23 AA BB\n')];
  const expected = {
    name: 'image.rk',
    start: 0x1122,
    end: 0x1123,
    entry: 0x1122,
    size: 2,
    image: [0xAA, 0xBB],
  };
  t.deepEqual(expected, t.context.parse_rk86_binary('image.rk', image));
});

test('parse_rk86_binary, entry should be taken from tags in RK file', t => {
  const image = [
    ...toArray(
      '#!rk86 !name=image.rk !start=0100 !entry=0200\n' +
      '0000 E6 11 22 11 23 AA BB\n')
  ];
  const expected = {
    name: 'image.rk',
    start: 0x1122,
    end: 0x1123,
    entry: 0x0200,
    size: 2,
    image: [0xAA, 0xBB],
  };
  t.deepEqual(expected, t.context.parse_rk86_binary('random', image));
});

function parse_rk86_hex(t, input, expected) {
  const [name, image] = input;
  t.deepEqual(expected, t.context.parse_rk86_binary(name, toArray(image)));
}

test('entry should be taken from tags in RK file', parse_rk86_hex,
  [
    'random',
    '#!rk86 !name=image.rk !start=0100 !entry=0200\n' +
    '0000 E6 11 22 11 23 AA BB\n'
  ],
  {
    name: 'image.rk',
    start: 0x1122,
    end: 0x1123,
    entry: 0x0200,
    size: 2,
    image: [0xAA, 0xBB],
  }
);
