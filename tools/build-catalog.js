const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const swig = require('swig');
const { sprintf: format } = require('printj');

function initialize_catalog() {
  // Dir.glob("../files/*").each do | x |
  //   name = x.split("/")[-1]
  //   begin
  //     Dir.mkdir(name)
  //   rescue
  //   end
  //   info = "%s/info.md" % name
  //   File.open(info, "r+") {|f| f.write("") }
  // end
  console.error('We need to implement the catalog initialization.')
}

rk86_check_sum = function (v) {
  let sum = 0;
  let j = 0;
  while (j < v.length - 1) {
    const c = v[j];
    sum = (sum + c + (c << 8)) & 0xffff;
    j += 1;
  }
  const sum_h = sum & 0xff00;
  const sum_l = sum & 0xff;
  sum = sum_h | ((sum_l + v[j]) & 0xff);
  return sum;
}

function process_file(name) {
  const file = { name, screenshots: [] };

  const readme = path.join('src/catalog', file.name, 'info.md');
  const info = fs.readFileSync(readme).toString().split('\n');

  file.title = info[0].trim();
  assert(file.title, `ERROR: file ${readme} has no title in the first line.`);

  file.description = info.slice(1).filter(v => v).map(v => v.trim()).join(' ');

  const image = fs.readFileSync(path.join('src/files', file.name));

  if (name.endsWith('.bin')) {
    file.size = image.length;
    file.start = 0;
    file.entry = 0;
    if (file.name.startsWith('mon_')) {
      file.start = 0x10000 - file.size;
      file.entry = 0xf800;
    }
    file.end = file.start + file.size - 1;
    file.real_check_sum = rk86_check_sum(image);
    file.check_sum = file.real_check_sum
  } else {
    const w = i => ((image[i] & 0xff) << 8) | (image[i + 1] & 0xff);
    let i = 0;

    if (image[i] == 0xe6) i += 1;
    file.start = w(i);
    file.end = w(i + 2);
    file.size = file.end - file.start + 1;
    i += 4;

    file.real_check_sum = rk86_check_sum(image.slice(i, i + file.size));
    i += file.size;

    while (image[i] != 0xe6) i += 1;
    file.check_sum = w(i + 1);

    if (file.check_sum !== file.real_check_sum && file.name !== 'I8080TST.GAM') {
      console.error(
        file.name,
        `real checksum`, format('%04X', file.real_check_sum),
        '!=', format('%04X', file.check_sum),
      );
      process.exit(-1);
    }

    file.entry = file.start;
    if (file.name === 'PVO.GAM') file.entry = 0x3400;
    if (file.name === 'RAMDOS.PKI') file.entry = 0x3600;
  }

  for (const screenshot of fs.readdirSync(path.join('src/catalog', file.name))) {
    if (screenshot.endsWith('.png')) {
      file.screenshots.push(screenshot);
    }
  }

  return file;
}

function build_catalog() {
  const template = path.join(__dirname, 'catalog.template');

  const files = [];
  for (const file of fs.readdirSync('src/files').sort()) {
    files.push(process_file(file));
  }

  swig.setFilter('hex', value => format('%04X', value));

  console.log(swig.renderFile(template, { files }));
}
function main() {
  if (process.argv[2] === 'initialize') return initialize_catalog();
  build_catalog();
}

main()
