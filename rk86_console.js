// Part of Radio-86RK in JavaScript based on I8080/JS
//
// Copyright (C) 2012 Alexander Demin <alexander@demin.ws>
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.

function Console() {

  this.adjust_window = function() {
    var callback = function() {
      var term_div = document.getElementById("termDiv");
      InnerWindowResizer(term_div.clientWidth + 16, term_div.clientHeight);
    }
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1)
      window.setTimeout(function() { callback(); }, 200);
    else
      callback();
  }

  const from_rk86_table = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    " ",  "!",  "\"",  "#",  "$",  "%%",  "&",  "'",
    "(",  ")",  "*",  "+",  ",",  "-",  ".",  "/",
    "0",  "1",  "2",  "3",  "4",  "5",  "6",  "7",
    "8",  "9",  ":",  ";",  "<",  "=",  ">",  "?",
    "@",  "A",  "B",  "C",  "D",  "E",  "F",  "G",
    "H",  "I",  "J",  "K",  "L",  "M",  "N",  "O",
    "P",  "Q",  "R",  "S",  "T",  "U",  "V",  "W",
    "X",  "Y",  "Z",  "[",  "\\",  "]",  "^",  "_",
    "Ю",  "А",  "Б",  "Ц",  "Д",  "Е",  "Ф",  "Г",
    "Х",  "И",  "Й",  "К",  "Л",  "М",  "Н",  "О",
    "П",  "Я",  "Р",  "С",  "Т",  "У",  "Ж",  "В",
    "Ь",  "Ы",  "З",  "Ш",  "Э",  "Щ",  "Ч",  "~",
  ];

  this.last_dump_address = 0;
  this.last_dump_length = 256;

  function dump_cmd(self, term, argc, argv, cpu, mem) {
    var from = parseInt(argv[argc++]);
    if (isNaN(from)) from = self.last_dump_address;

    var sz = parseInt(argv[argc++]);
    if (isNaN(sz)) sz = self.last_dump_length;
    self.last_dump_length = sz;

    const width = 16;
    while (sz > 0) {
      var bytes = "";
      var chars = "";
      var chunk_sz = Math.min(width, sz);
      for (var i = 0; i < chunk_sz; ++i) {
        var ch = mem.read_raw(from + i);
        bytes += "%02X ".format(ch);
        chars += ch >=32 && ch < 127 ? from_rk86_table[ch] : ".";
      }
      if (sz < width) {
        bytes += " ".repeat((width - sz) * 3);
        chars += " ".repeat(width - sz);
      }
      term.write("%04X: %s | %s".format(from, bytes, chars));
      term.newLine();
      sz -= chunk_sz;
      from = (from + chunk_sz) & 0xffff;
    }
    self.last_dump_address = from;
  }

  this.disasm_print = function(self, term, mem, addr, nb_instr) {
    while (nb_instr-- > 0) {
      var binary = [];
      for (var i = 0; i < 3; ++i)
        binary[binary.length] = mem.read_raw(addr + i);
      var instr = i8080_disasm(binary);

      var bytes = "";
      var chars = ""
      for (var i = 0; i < instr.length; ++i) {
        var ch = binary[i];
        bytes += "%02X".format(ch);
        chars += ch >=32 && ch < 127 ? from_rk86_table[ch] : ".";
      }
      bytes += " ".repeat((binary.length - instr.length) * 2);
      chars += " ".repeat(binary.length - instr.length);

      term.write("%04X: %s %s %s".format(addr, bytes, chars, instr.instr));
      term.newLine();
      addr += instr.length;
    }
    return addr;
  }

  function cpu_cmd(self, term, argc, argv, cpu, mem) {
    term.write("PC=%04X A=%02X F=%s%s%s%s%s HL=%04X DE=%04X BC=%04X SP=%04X"
               .format(
                 cpu.pc, cpu.a(), 
                 (cpu.cf ? "C":"-"),
                 (cpu.pf ? "P":"-"),
                 (cpu.hf ? "H":"-"),
                 (cpu.zf ? "Z":"-"),
                 (cpu.sf ? "S":"-"),
                 cpu.hl(), cpu.de(), cpu.bc(), cpu.sp));
    term.newLine();

    self.disasm_print(self, term, mem, cpu.pc, 4);

    hex = function(addr, title) {
      var bytes = "";
      var chars = "";
      for (var i = 0; i < 16; ++i) {
        var ch = mem.read_raw(addr + i);
        bytes += "%02X ".format(ch);
        chars += ch >=32 && ch < 127 ? from_rk86_table[ch] : ".";
      }
      term.write("%s=%04X: %s | %s".format(title, addr, bytes, chars));
      term.newLine();
    }

    hex(cpu.pc, "PC");
    hex(cpu.sp, "SP");
    hex(cpu.hl(), "HL");
    hex(cpu.de(), "DE");
    hex(cpu.bc(), "BC");
  }

  this.last_disasm_address = 0;
  this.last_disasm_length = 16;

  function disasm_cmd(self, term, argc, argv) {
    if (window.opener == null) { 
      alert("ERROR: No parent window");
      return;
    }

    var cpu = window.opener.ui.runner.cpu;
    var mem = window.opener.ui.memory;

    var from = parseInt(argv[argc++]);
    if (isNaN(from)) from = self.last_disasm_address;

    var sz = parseInt(argv[argc++]);
    if (isNaN(sz)) sz = self.last_disasm_length;
    self.last_disasm_length = sz;

    self.last_disasm_address = self.disasm_print(self, term, mem, from, sz);
  }

  function write_cmd(self, term, argc, argv, cpu, mem) {
    var addr = parseInt(argv[argc++]);
    if (isNaN(addr)) addr = 0;

    while (1) {
      var ch = parseInt(argv[argc++]);
      if (isNaN(ch)) break;
      term.write("%04X: %02X -> %02X".format(addr, mem.read_raw(addr), ch));
      term.newLine();
      mem.write_raw(addr, ch);
      ++addr;
    }
  }

  function help_cmd(self, term, argc, argv, cpu, mem) {
    for (var cmd in self.commands) {
      term.write("%s - %s".format(cmd, self.commands[cmd][1]));
      term.newLine();
    }
  }
  
  this.commands = {
    "d": [ dump_cmd, 
           "[d]ump memory / d [start_address [, number_of_bytes]]" 
         ],
    "i": [ cpu_cmd, "CPU [i]formation / i" ],
    "z": [ disasm_cmd, 
           "Disassemble / z [start_address [, number_of_instructions]]" 
         ],
    "w": [ write_cmd,
           "Write / w start_address byte1, [byte2, [byte3]...]"
         ],
    "?": [ help_cmd, "This help / ?"]
  };

  this.terminal_handler = function(term) {
    var cpu = window.opener.ui.runner.cpu;
    var mem = window.opener.ui.memory;

    term.newLine();
    var line = this.lineBuffer;

    this.parser.parseLine(term);

    if (term.argv.length > 0) {
      var cmd = term.argv[term.argc++];
      cmd = cmd.toLowerCase();
      var fn = this.commands[cmd];
      if (fn) {
        fn = fn[0];
        fn(this, term, term.argc, term.argv, cpu, mem);
      }
      else term.write("?");
    }
    term.prompt();
  }

  this.init = function() {
    var init_this = this;
    this.term = new Terminal( {
      handler: function() { init_this.terminal_handler(this); },
      x: 0, y: 0,
      cols: 80, rows: 30,
      closeOnESC: false,
      ps: "]",
      greeting: "Консоль Радио-86РК",
    } );
    this.term.open();

    this.parser = new Parser();
    this.parser.quoteChars = { "\"": true, "'": true };
    this.parser.optionChars = { "-": true };
    this.parser.whiteSpace = { " ": true, "\t": true, ",": true };

    this.adjust_window();
  }

  this.init();
}

function main() {
  var console = new Console();
}
