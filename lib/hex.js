function hex8(value) {
  return ('00' + (value & 0xff).toString(16).toUpperCase()).slice(-2);
}

function hex16(value) {
  return hex8(value >> 8) + hex8(value);
}

function hexArray(array) {
  return array.map(c => hex8(c)).join(' ');
}

function hexMapArray(binary, width = 16) {
  let lines = {};
  for (let i = 0; i < binary.length; i += width) {
    lines[':' + hex16(i).toString()] = hexArray(binary.slice(i, i + width));
  }
  return lines;
}
