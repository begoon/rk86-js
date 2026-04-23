const fs = require('fs');
const crypto = require('crypto');
const child_processs = require('child_process');

const glob = require('glob-all');
const ora = require('ora');

const targets = [
  'src/**',
  'tests/**',
  'tools/**',
  'Makefile',
];

function checksum(files) {
  let hash = files.length;
  for (const file of files) {
    let content = file;
    if (fs.lstatSync(file).isFile()) content += fs.readFileSync(file);
    content += hash;
    hash = crypto.createHash('md5').update(content).digest("hex");
  };
  return hash;
}

function watch(files, last) {
  const current = checksum(files);
  if (current !== last) {
    last = current;
    spinner.succeed('Rebuild');
    child_processs.execSync('make', { stdio: 'inherit', stderr: 'inherit' });;
  }
  setTimeout(() => { watch(files, current); }, 5000);
}

function main() {
  watch(glob.sync(targets));
}


const spinner = ora({ text: targets.join(', '), spinner: 'arrow' }).start();

main();
