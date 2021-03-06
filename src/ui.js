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

function UI(tape_catalog, runner, memory, autoexec) {
  this.tape_catalog = tape_catalog;
  this.runner = runner;
  this.memory = memory;
  this.autoexec = autoexec;

  this.canvas = document.getElementById("canvas");
  this.canvas_panel = document.getElementById("canvas_panel");

  this.ruslat = document.getElementById("ruslat");
  this.ruslat_state = false;

  this.screenshot_name = "rk86-screen";
  this.screenshot_count = 1;

  this.memory_snapshot_name = "rk86-memory";
  this.memory_snapshot_count = 1;

  this.computer_snapshot_name = "rk86-snapshot";
  this.computer_snapshot_count = 1;

  this.file_parser = new FileParser();

  this.preloaded = null;

  if (!this.canvas.getContext) {
    alert("Tag <canvas> is not support is the browser");
    return;
  }

  if (navigator.userAgent.toLowerCase().indexOf("chrome") < 0) {
    document.getElementById("assembler_frame").style.width =
      window.innerWidth - 32 + "px";
    document.getElementById("assembler_frame").style.height =
      window.innerHeight - 50 + "px";
  }

  this.file_selector = document.getElementById("file_selector");

  for (var i in this.tape_catalog) {
    var name = this.tape_catalog[i];
    this.file_selector.add(new Option(name, name), null);
  }

  this.ips = document.getElementById("ips");
  this.tps = document.getElementById("tps");
  var update_perf_this = this;
  this.update_perf = function () {
    function update(element, value) {
      element.innerHTML = Math.floor(value * 1000).toLocaleString();
    }
    update(ips, update_perf_this.runner.instructions_per_millisecond);
    update(tps, update_perf_this.runner.ticks_per_millisecond);
  };
  setInterval(this.update_perf, 2000);

  this.sound_toggle = function (checkbox) {
    this.runner.init_sound(checkbox.checked);
  };

  this.resize_canvas = function (width, height) {
    this.canvas_panel.style.width = width + 'px';
    this.canvas_panel.style.height = height + 'px';
    this.canvas.width = width;
    this.canvas.height = height;
  };

  this.reset = function () {
    this.runner.cpu.memory.keyboard.reset();
    this.runner.cpu.jump(0xf800);
    console.log("Reset");
  };

  this.restart = function () {
    this.runner.cpu.memory.zero_ram();
    this.reset();
    restart_this = this;
    if (this.autorun_executed) return;
    window.setTimeout(function () {
      restart_this.autorun();
      restart_this.autorun_executed = true;
    }, 1000);
  };

  this.update_pause_button = function (paused) {
    var button = document.getElementById("pause_button");

    button.innerHTML = paused ? "Resume" : "Pause";
    button.style.background = paused ? "red" : "";
  };

  this.pause = function () {
    if (this.runner.paused) {
      this.runner.resume();
      console.log("Resumed");
      if (this.console_window) this.console_window.console.resume_ui_callback();
    } else {
      this.runner.pause();
      console.log("Paused at " + this.runner.cpu.pc.toString(16));
      if (this.console_window) this.console_window.console.pause_ui_callback();
    }
    this.update_pause_button(this.runner.paused);
  };

  this.tape_file_name = function (name) {
    if (name.startsWith("http")) {
      return name;
    }
    return "files/" + name;
  };

  this.fetch_binary_file = function (url, success, failed) {
    const check_status = function (response) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      return response;
    };
    fetch(url, { redirect: "follow" })
      .then(response => check_status(response))
      .then(response => response.arrayBuffer())
      .then(buffer => success(Array.from(new Uint8Array(buffer))))
      .catch(error => failed(error));
  };

  var load_tape_file_this = this;
  this.load_tape_file = function (name) {
    console.log(`Loading file ${name}`);
    const success = function (image) {
      console.log(`Loaded ${image.length} byte(s)`);
      load_tape_file_this.file_loaded(name, image);
    };
    const failed = function (error) {
      alert(`Error loading file "${name}"\n${error}`);
    }
    this.fetch_binary_file(this.tape_file_name(name), success, failed);
  };

  this.upload = function (event) {
    const files = event.target.files;
    if (files.length < 1) return this.clear_upload();
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = [...new Uint8Array(event.target.result)];
      this.preloaded = { name: file.name, image: image };
      this.set_preloaded_filename(file.name);
    }
    reader.readAsArrayBuffer(file);
  }

  this.clear_upload = function () {
    document.getElementById('upload_selector').value = '';
    this.set_preloaded_filename('');
    this.preloaded = null;
  }

  this.set_preloaded_filename = function (name) {
    document.querySelector('#preloaded').textContent = name;
  }

  this.selected_file_name = function () {
    return this.file_selector.options[this.file_selector.selectedIndex].value;
  };

  this.process_selected = function () {
    if (this.preloaded) {
      this.file_loaded(this.preloaded.name, this.preloaded.image);
    } else {
      this.load_tape_file(this.selected_file_name());
    }
  }

  this.run_selected = function () {
    this.load_mode = "run";
    this.process_selected();
  };

  this.load_selected = function () {
    this.load_mode = "load";
    this.process_selected();
  };

  this.disassembler_available = function () {
    return window.frames.disassembler_frame.loaded;
  };

  this.autorun = function () {
    if (this.autoexec.file) {
      this.load_mode = this.autoexec.loadonly ? "load" : "run";
      this.load_tape_file(this.autoexec.file);
    }
  };

  this.file_loaded = function (name, binary) {
    if (binary == null) {
      alert("Error loading a file '" + name + "'");
      return;
    }
    const json = this.file_parser.is_json(binary);
    if (json) {
      const snapshot = rk86_snapshot_restore(json, ui, screen, this.simulate_keyboard);
      console.log(`Snapshot '${name}' loaded`);
      return;
    }
    let file;
    try {
      file = this.file_parser.parse_rk86_binary(name, binary);
    } catch (e) {
      alert(e.message);
      return;
    }
    this.memory.load_file(file);

    if (this.disassembler_available())
      window.frames.disassembler_frame.i8080disasm.refresh(this.memory);

    if (/^mon.+\.bin$/.exec(file.name) && this.load_mode == "run") {
      console.log("Monitor ready");
      this.restart();
      this.runner.execute();
      return;
    }

    this.screenshot_name = file.name;
    this.screenshot_count = 1;

    if (this.load_mode == "load") {
      var sz = file.start + file.image.length - 1;
      alert(
        "Loaded: %s (%04X-%04X), Run by 'G%04X'".format(
          file.name,
          file.start,
          sz,
          file.entry
        )
      );
    } else {
      console.log("Started", file.name, "from", file.entry.toString(16));
      screen.init_cache();
      this.runner.cpu.jump(file.entry);
    }
  };

  this.switch_panel = function (name) {
    document.getElementById("emulator_panel").style.display =
      name == "emulator" ? "block" : "none";
    document.getElementById("assembler_panel").style.display =
      name == "assembler" ? "block" : "none";
    document.getElementById("keyboard_panel").style.display =
      name == "keyboard" ? "block" : "none";
    document.getElementById("emulator_button").disabled = name == "emulator";
    document.getElementById("assembler_button").disabled = name == "assembler";
    document.getElementById("keyboard_button").disabled = name == "keyboard";

    document.getElementById("main_panel").style.display = name == "assembler"
      ? "block" : "inline-block";

    if (name == "assembler" || name == "keyboard") {
      var frame_name = name + "_frame";
      var panel_name = name + "_panel";
      document.getElementById(frame_name).style.width = document.getElementById(
        panel_name
      ).offsetWidth;
      document.getElementById(
        frame_name
      ).style.height = document.getElementById(panel_name).offsetHeight;
    }
  };

  this.toggle_panel = function (name) {
    if (name == "disassembler" && !this.disassembler_available()) {
      alert("Disassembler is not available.");
      return;
    }
    var name = name + "_panel";
    document.getElementById(name).style.display =
      document.getElementById(name).style.display == "block" ? "none" : "block";
  };

  this.disassembler_available = function () {
    return window.frames.disassembler_frame.loaded;
  };

  this.save_screen = function () {
    var filename = this.screenshot_name + "-" + this.screenshot_count + ".png";
    this.screenshot_count += 1;
    this.canvas.toBlob(function (blob) {
      saveAs(blob, filename);
    });
  };

  this.save_memory = function () {
    var snapshot = new Uint8Array(this.memory.snapshot(0, 0x10000));
    var snapshot_blob = new Blob([snapshot], { type: "image/gif" });
    var filename = "%s-%d.bin".format(
      this.memory_snapshot_name,
      this.memory_snapshot_count
    );
    saveAs(snapshot_blob, filename);
    this.memory_snapshot_count += 1;
  };

  this.snapshot = () => {
    const filename = "%s-%d.json".format(
      this.computer_snapshot_name,
      this.computer_snapshot_count
    );
    const json = rk86_snapshot(ui, screen);
    const blob = new Blob([json], { type: "application/json" });
    saveAs(blob, filename);
    this.computer_snapshot_count += 1;
  };

  this.console = function () {
    this.console_window = window.open(
      "console.html",
      "_blank",
      "toolbar=yes, location=yes, status=no, menubar=yes, scrollbars=yes, " +
      "resizable=yes, width=700, height=600"
    );
  };

  this.update_ruslat = (value) => {
    if (value === this.ruslat_state) return;
    this.ruslat_state = value;
    this.ruslat.innerHTML = value ? 'РУС' : 'ЛАТ';
  }

  this.visualizer = function () {
    this.visualizer_window = window.open(
      "i8080_visualizer.html",
      "_blank",
      "toolbar=yes, location=yes, status=no, menubar=yes, scrollbars=yes, " +
      "resizable=yes, width=700, height=600"
    );
  };

  this.clear_selection = function () {
    if (window.getSelection) {
      if (window.getSelection().empty) {
        // Chrome
        window.getSelection().empty();
      } else if (window.getSelection().removeAllRanges) {
        // Firefox
        window.getSelection().removeAllRanges();
      }
    } else if (document.selection) {
      // IE?
      document.selection.empty();
    }
  };

  this.fullscreen_change = () => {
    const is_fullscreen = (document.fullscreenElement && document.fullscreenElement !== null) ||
      (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
      (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
      (document.msFullscreenElement && document.msFullscreenElement !== null);
    this.canvas.style.position = is_fullscreen ? 'absolute' : '';
  }

  document.addEventListener("fullscreenchange", this.fullscreen_change);
  document.addEventListener("mozfullscreenchange", this.fullscreen_change);
  document.addEventListener("webkitfullscreenchange", this.fullscreen_change);
  document.addEventListener("msfullscreenchange", this.fullscreen_change);

  this.fullscreen = () => {
    const element = canvas;
    if (element.webkitRequestFullScreen) {
      element.webkitRequestFullScreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.requestFullScreen) {
      element.requestFullScreen();
    } else {
      return alert("Full screen not supported in this browser.");
    }
  };

  this.execute_commands_loop = function (sequence, i) {
    const keyboard = this.runner.cpu.memory.keyboard;
    if (i >= sequence.length) return;
    const { keys, duration, action } = sequence[i];
    const call = action === 'down' ? keyboard.onkeydown : keyboard.onkeyup;
    if (action != 'pause') keys.forEach(key => call(key));
    setTimeout(() => this.execute_commands_loop(sequence, i + 1), +duration);
  }

  this.execute_commands = commands => this.execute_commands_loop(commands, 0);

  this.simulate_keyboard = commands => {
    const queue = convert_keyboard_sequence(commands);
    this.execute_commands(queue);
  }

  this.select_file = () => {
    document.querySelector('#upload_selector').click();
  }

  this.load_mode = "run";
  this.load_tape_file("mon32.bin");
}
