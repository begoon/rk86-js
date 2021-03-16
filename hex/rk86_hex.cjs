const fs = require('fs');

eval(fs.readFileSync('./rk86_hex.js', 'utf-8'));

exports = { hex8, hex16 };
