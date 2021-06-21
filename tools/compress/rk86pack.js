const fs = require('fs');
const path = require('path');

const base = path.basename;

const argv = process.argv;
const mode = argv[2]
const infile = argv[3];
const outfile = argv[4];

if (!infile || !outfile || !["pack", "unpack"].includes(mode)) {
  console.log(`usage: ${base(argv[0])} ${base(argv[1])} pack|unpack infile outfile`);
  process.exit(-1);
}

module.exports = undefined;

eval(fs.readFileSync(path.join(__dirname, 'base64.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'rawdeflate.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'rawinflate.js'), 'utf-8'));

const input = fs.readFileSync(infile).toString();

let output, binary;

if (mode == "pack") {
  binary = this.RawDeflate.deflate(this.Base64.utob(input));
  output = this.Base64.toBase64(binary);
} else {
  binary = this.Base64.fromBase64(input);
  output = this.Base64.btou(this.RawDeflate.inflate(binary));
}

fs.writeFileSync(outfile, output);

if (mode == 'pack') {
  const host = 'http://localhost:8000';
  fs.writeFileSync(outfile + '.url', `${host}/index.html?file=raw:${output}`);
}
