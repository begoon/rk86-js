const fs = require('fs');
const path = require('path');

eval(fs.readFileSync(path.resolve(__dirname, 'hex.js'), 'utf-8'));

module.exports = {
    hex8,
    hex16,
    hexArray,
    hexMapArray,
};
