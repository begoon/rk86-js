const fs = require('fs');
const path = require('path');

eval(fs.readFileSync(path.resolve(__dirname, '../lib/hex.js'), 'utf-8'));

module.exports = {
  toHex8,
  toHex16,
  arrayToHexLine,
  arrayToHexMap,
  hexMapToArray,
  fromHex,
};
