function toHex8(value) {
  return ('00' + (value & 0xff).toString(16).toUpperCase()).slice(-2);
}

function toHex16(value) {
  return toHex8(value >> 8) + toHex8(value);
}

function arrayToHexLine(array) {
  return array.map(c => toHex8(c)).join(' ');
}

function arrayToHexMap(binary, width = 16) {
  const lines = {};
  for (let i = 0; i < binary.length; i += width) {
    lines[':' + toHex16(i).toString()] = arrayToHexLine(binary.slice(i, i + width));
  }
  return lines;
}

function hexMapToArray(hex) {
  const array = [];
  for (let [label, line] of Object.entries(hex)) {
    const address = parseInt(label.slice(1), 16);
    const line_values = line.split(' ').map((value) => parseInt(value, 16));
    for (let j = 0; j < line_values.length; j++) {
      array[address + j] = line_values[j];
    }
  }
  return array;
}

function fromHex(v) {
  if (typeof v === 'string') {
    return v.startsWith('0x') ? parseInt(v, 16) : parseInt(v);
  }
  return v;
}
