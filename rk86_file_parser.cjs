const fs = require('fs');

eval(fs.readFileSync('./rk86_file_parser.js', 'utf-8'));

module.exports = FileParser;
