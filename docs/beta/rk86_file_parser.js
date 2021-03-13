function FileParser() {
  this.extract_rk86_word = function (v, i) {
    return ((v[i] & 0xff) << 8) | (v[i + 1] & 0xff);
  };

  this.to_text = (binary) => binary.reduce((a, x) => a + String.fromCharCode(x), "");

  this.is_hex_file = (image) => this.to_text(image.slice(0, 6)) === "#!rk86";

  this.extact_metadata = function (text) {
    return [...text.matchAll("!([^ =\t\n\r]+?)=([^ \t\r\n]+)")]
      .map(group => group.slice(1))
      .reduce((acc, [key, value]) => (acc[key] = value, acc), {})
  }

  this.convert_hex_to_binary = function (text) {
    const lines = text
      .split("\n")
      .filter((line) => line.trim().length)
      .filter((line) => !line.startsWith(";") && !line.startsWith("#"));

    let image = [];
    for (const line of lines) {
      const hex_line = line.slice(5).trim();
      const binary_line = hex_line.split(" ").map((v) => parseInt(v, 16));
      image.push(...binary_line);
    }
    return image;
  };

  this.file_ext = (filename) => {
    const groups = filename.match(".*\\.(.*)$");
    return groups ? groups[1] : '';
  }

  this.parse_rk86_binary = function (name, image) {
    let file = {};
    file.name = name.split("/").slice(-1)[0];

    if (this.is_hex_file(image)) {
      const text = this.to_text(image);
      image = this.convert_hex_to_binary(text);
      file = { ...file, ...this.extact_metadata(text) };
      if (file.start != null) file.start = parseInt(file.start, 16);
      if (file.entry != null) file.entry = parseInt(file.entry, 16);
    }

    if (image.length > 0x10000) {
      throw new Error(`ERROR! Loaded file "${file.name}" length ${image.length} is more than 65556.`);
    }

    const ext = this.file_ext(file.name);

    if (ext === 'bin' || ext === '') {
      file.size = image.length;
      if (file.start == null) {
        file.start = file.name.match(/^mon/) ? 0x10000 - file.size : 0;
      }
      file.end = file.start + file.size - 1;
      file.image = image;
      if (file.entry == null) {
        file.entry = file.start;
      }
    } else {
      let i = 0;
      if ((image[i] & 0xff) == 0xe6) ++i;
      file.start = this.extract_rk86_word(image, i);
      file.end = this.extract_rk86_word(image, i + 2);
      i += 4;
      file.size = file.end - file.start + 1;
      file.image = image.slice(i, i + file.size);
      file.entry = file.entry != null ? file.entry : file.start;
      if (file.name == 'PVO.GAM') file.entry = 0x3400;
    }
    return file;
  };
}
