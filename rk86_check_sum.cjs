const fs = require('fs');

eval(fs.readFileSync('./rk86_check_sum.js', 'utf-8'));

module.exports = rk86_check_sum;
