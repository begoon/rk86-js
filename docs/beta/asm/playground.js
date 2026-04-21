// asm8.ts
var {readFileSync, writeFileSync, mkdirSync} = (() => ({}));

// node:path
function assertPath(path) {
  if (typeof path !== "string")
    throw TypeError("Path must be a string. Received " + JSON.stringify(path));
}
function normalizeStringPosix(path, allowAboveRoot) {
  var res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, code;
  for (var i = 0;i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47)
      break;
    else
      code = 47;
    if (code === 47) {
      if (lastSlash === i - 1 || dots === 1)
        ;
      else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1)
                res = "", lastSegmentLength = 0;
              else
                res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              lastSlash = i, dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = "", lastSegmentLength = 0, lastSlash = i, dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += "/..";
          else
            res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += "/" + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i, dots = 0;
    } else if (code === 46 && dots !== -1)
      ++dots;
    else
      dots = -1;
  }
  return res;
}
function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root, base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
  if (!dir)
    return base;
  if (dir === pathObject.root)
    return dir + base;
  return dir + sep + base;
}
function resolve() {
  var resolvedPath = "", resolvedAbsolute = false, cwd;
  for (var i = arguments.length - 1;i >= -1 && !resolvedAbsolute; i--) {
    var path;
    if (i >= 0)
      path = arguments[i];
    else {
      if (cwd === undefined)
        cwd = process.cwd();
      path = cwd;
    }
    if (assertPath(path), path.length === 0)
      continue;
    resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = path.charCodeAt(0) === 47;
  }
  if (resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute), resolvedAbsolute)
    if (resolvedPath.length > 0)
      return "/" + resolvedPath;
    else
      return "/";
  else if (resolvedPath.length > 0)
    return resolvedPath;
  else
    return ".";
}
function normalize(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var isAbsolute = path.charCodeAt(0) === 47, trailingSeparator = path.charCodeAt(path.length - 1) === 47;
  if (path = normalizeStringPosix(path, !isAbsolute), path.length === 0 && !isAbsolute)
    path = ".";
  if (path.length > 0 && trailingSeparator)
    path += "/";
  if (isAbsolute)
    return "/" + path;
  return path;
}
function isAbsolute(path) {
  return assertPath(path), path.length > 0 && path.charCodeAt(0) === 47;
}
function join() {
  if (arguments.length === 0)
    return ".";
  var joined;
  for (var i = 0;i < arguments.length; ++i) {
    var arg = arguments[i];
    if (assertPath(arg), arg.length > 0)
      if (joined === undefined)
        joined = arg;
      else
        joined += "/" + arg;
  }
  if (joined === undefined)
    return ".";
  return normalize(joined);
}
function relative(from, to) {
  if (assertPath(from), assertPath(to), from === to)
    return "";
  if (from = resolve(from), to = resolve(to), from === to)
    return "";
  var fromStart = 1;
  for (;fromStart < from.length; ++fromStart)
    if (from.charCodeAt(fromStart) !== 47)
      break;
  var fromEnd = from.length, fromLen = fromEnd - fromStart, toStart = 1;
  for (;toStart < to.length; ++toStart)
    if (to.charCodeAt(toStart) !== 47)
      break;
  var toEnd = to.length, toLen = toEnd - toStart, length = fromLen < toLen ? fromLen : toLen, lastCommonSep = -1, i = 0;
  for (;i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === 47)
          return to.slice(toStart + i + 1);
        else if (i === 0)
          return to.slice(toStart + i);
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === 47)
          lastCommonSep = i;
        else if (i === 0)
          lastCommonSep = 0;
      }
      break;
    }
    var fromCode = from.charCodeAt(fromStart + i), toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode)
      break;
    else if (fromCode === 47)
      lastCommonSep = i;
  }
  var out = "";
  for (i = fromStart + lastCommonSep + 1;i <= fromEnd; ++i)
    if (i === fromEnd || from.charCodeAt(i) === 47)
      if (out.length === 0)
        out += "..";
      else
        out += "/..";
  if (out.length > 0)
    return out + to.slice(toStart + lastCommonSep);
  else {
    if (toStart += lastCommonSep, to.charCodeAt(toStart) === 47)
      ++toStart;
    return to.slice(toStart);
  }
}
function _makeLong(path) {
  return path;
}
function dirname(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var code = path.charCodeAt(0), hasRoot = code === 47, end = -1, matchedSlash = true;
  for (var i = path.length - 1;i >= 1; --i)
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else
      matchedSlash = false;
  if (end === -1)
    return hasRoot ? "/" : ".";
  if (hasRoot && end === 1)
    return "//";
  return path.slice(0, end);
}
function basename(path, ext) {
  if (ext !== undefined && typeof ext !== "string")
    throw TypeError('"ext" argument must be a string');
  assertPath(path);
  var start = 0, end = -1, matchedSlash = true, i;
  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path)
      return "";
    var extIdx = ext.length - 1, firstNonSlashEnd = -1;
    for (i = path.length - 1;i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1)
          matchedSlash = false, firstNonSlashEnd = i + 1;
        if (extIdx >= 0)
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1)
              end = i;
          } else
            extIdx = -1, end = firstNonSlashEnd;
      }
    }
    if (start === end)
      end = firstNonSlashEnd;
    else if (end === -1)
      end = path.length;
    return path.slice(start, end);
  } else {
    for (i = path.length - 1;i >= 0; --i)
      if (path.charCodeAt(i) === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1)
        matchedSlash = false, end = i + 1;
    if (end === -1)
      return "";
    return path.slice(start, end);
  }
}
function extname(path) {
  assertPath(path);
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, preDotState = 0;
  for (var i = path.length - 1;i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    return "";
  return path.slice(startDot, end);
}
function format(pathObject) {
  if (pathObject === null || typeof pathObject !== "object")
    throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
  return _format("/", pathObject);
}
function parse(path) {
  assertPath(path);
  var ret = { root: "", dir: "", base: "", ext: "", name: "" };
  if (path.length === 0)
    return ret;
  var code = path.charCodeAt(0), isAbsolute2 = code === 47, start;
  if (isAbsolute2)
    ret.root = "/", start = 1;
  else
    start = 0;
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, i = path.length - 1, preDotState = 0;
  for (;i >= start; --i) {
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    if (end !== -1)
      if (startPart === 0 && isAbsolute2)
        ret.base = ret.name = path.slice(1, end);
      else
        ret.base = ret.name = path.slice(startPart, end);
  } else {
    if (startPart === 0 && isAbsolute2)
      ret.name = path.slice(1, startDot), ret.base = path.slice(1, end);
    else
      ret.name = path.slice(startPart, startDot), ret.base = path.slice(startPart, end);
    ret.ext = path.slice(startDot, end);
  }
  if (startPart > 0)
    ret.dir = path.slice(0, startPart - 1);
  else if (isAbsolute2)
    ret.dir = "/";
  return ret;
}
var sep = "/";
var delimiter = ":";
var posix = ((p) => (p.posix = p, p))({ resolve, normalize, isAbsolute, join, relative, _makeLong, dirname, basename, extname, format, parse, sep, delimiter, win32: null, posix: null });

// asm8.ts
class AsmError extends Error {
  line;
  column;
  source;
  constructor(message, line, source, column = 1) {
    super(message);
    this.name = "AsmError";
    this.line = line;
    this.source = source;
    this.column = column;
  }
}
function firstNonSpaceCol(s) {
  const m = s.match(/\S/);
  return m ? (m.index ?? 0) + 1 : 1;
}
var REG8 = {
  B: 0,
  C: 1,
  D: 2,
  E: 3,
  H: 4,
  L: 5,
  M: 6,
  A: 7
};
var REG_PAIR = {
  B: 0,
  D: 1,
  H: 2,
  SP: 3
};
var REG_PAIR_PUSH = {
  B: 0,
  D: 1,
  H: 2,
  PSW: 3
};
var IMPLIED = {
  NOP: 0,
  HLT: 118,
  RET: 201,
  XCHG: 235,
  EI: 251,
  DI: 243,
  CMA: 47,
  STC: 55,
  CMC: 63,
  DAA: 39,
  RLC: 7,
  RRC: 15,
  RAL: 23,
  RAR: 31,
  PCHL: 233,
  SPHL: 249,
  XTHL: 227,
  RNZ: 192,
  RZ: 200,
  RNC: 208,
  RC: 216,
  RPO: 224,
  RPE: 232,
  RP: 240,
  RM: 248
};
var ALU_REG = {
  ADD: 128,
  ADC: 136,
  SUB: 144,
  SBB: 152,
  ANA: 160,
  XRA: 168,
  ORA: 176,
  CMP: 184
};
var ALU_IMM = {
  ADI: 198,
  ACI: 206,
  SUI: 214,
  SBI: 222,
  ANI: 230,
  XRI: 238,
  ORI: 246,
  CPI: 254
};
var ADDR16 = {
  JMP: 195,
  JNZ: 194,
  JZ: 202,
  JNC: 210,
  JC: 218,
  JPO: 226,
  JPE: 234,
  JP: 242,
  JM: 250,
  CALL: 205,
  CNZ: 196,
  CZ: 204,
  CNC: 212,
  CC: 220,
  CPO: 228,
  CPE: 236,
  CP: 244,
  CM: 252,
  LDA: 58,
  STA: 50,
  LHLD: 42,
  SHLD: 34
};
var ALL_MNEMONICS = new Set([
  ...Object.keys(IMPLIED),
  ...Object.keys(ALU_REG),
  ...Object.keys(ALU_IMM),
  ...Object.keys(ADDR16),
  "MOV",
  "MVI",
  "INR",
  "DCR",
  "LXI",
  "DAD",
  "INX",
  "DCX",
  "PUSH",
  "POP",
  "LDAX",
  "STAX",
  "IN",
  "OUT",
  "RST",
  "DB",
  "DW",
  "DS",
  "ORG",
  "SECTION",
  "END",
  "EQU"
]);
var INVERT_JUMP = {
  Z: "JNZ",
  NZ: "JZ",
  C: "JNC",
  NC: "JC",
  PO: "JPE",
  PE: "JPO",
  P: "JM",
  M: "JP",
  "==": "JNZ",
  "<>": "JZ"
};
var VALID_PROC_REGS = new Set(["PSW", "B", "D", "H"]);
function popsAndRet(regs, orig) {
  const out = [];
  for (let k = regs.length - 1;k >= 0; k--) {
    out.push({ text: `	POP ${regs[k]}`, orig });
  }
  out.push({ text: `	RET`, orig });
  return out;
}
function preprocess(source) {
  const lines = source.split(`
`);
  const out = [];
  const stack = [];
  let counter = 0;
  let procCounter = 0;
  let proc = null;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const orig = i + 1;
    const bare = stripComment(line).trim();
    const ifMatch = bare.match(/^\.?if\s+(\S+)\s*$/i);
    if (ifMatch) {
      const cond = ifMatch[1].toUpperCase();
      const jmp = INVERT_JUMP[cond];
      if (!jmp) {
        throw new AsmError(`unknown .if condition: ${ifMatch[1]}`, orig, line, firstNonSpaceCol(line));
      }
      const id = counter++;
      stack.push({ id, sawElse: false, line: orig, source: line });
      out.push({ text: `	${jmp} @_if_${id}_else`, orig });
      continue;
    }
    if (/^\.?else\s*$/i.test(bare)) {
      const top = stack[stack.length - 1];
      if (!top) {
        throw new AsmError(".else without .if", orig, line, firstNonSpaceCol(line));
      }
      if (top.sawElse) {
        throw new AsmError("duplicate .else", orig, line, firstNonSpaceCol(line));
      }
      top.sawElse = true;
      out.push({ text: `	JMP @_if_${top.id}_exit`, orig });
      out.push({ text: `@_if_${top.id}_else:`, orig });
      continue;
    }
    if (/^\.?endif\s*$/i.test(bare)) {
      const top = stack.pop();
      if (!top) {
        throw new AsmError(".endif without .if", orig, line, firstNonSpaceCol(line));
      }
      const suffix = top.sawElse ? "exit" : "else";
      out.push({ text: `@_if_${top.id}_${suffix}:`, orig });
      continue;
    }
    const procMatch = bare.match(/^([A-Za-z_]\w*):?\s+\.?proc\b\s*(.*)$/i);
    if (procMatch && !ALL_MNEMONICS.has(procMatch[1].toUpperCase())) {
      if (proc) {
        throw new AsmError("nested .proc not allowed", orig, line, firstNonSpaceCol(line));
      }
      const name = procMatch[1];
      const regsRaw = procMatch[2].trim();
      const regs = [];
      if (regsRaw) {
        for (const r of regsRaw.split(/[,\s]+/)) {
          if (!r)
            continue;
          const up = r.toUpperCase();
          if (!VALID_PROC_REGS.has(up)) {
            throw new AsmError(`invalid .proc register: ${r} (expected PSW, B, D, or H)`, orig, line, firstNonSpaceCol(line));
          }
          regs.push(up);
        }
      }
      const id = procCounter++;
      proc = {
        regs,
        line: orig,
        source: line,
        exitLabel: `__proc_${id}_exit`,
        returnUsed: false
      };
      out.push({ text: `${name}:`, orig });
      for (const r of regs) {
        out.push({ text: `	PUSH ${r}`, orig });
      }
      continue;
    }
    if (/^\.proc(\s|$)/i.test(bare) || /^proc\s+\S/i.test(bare)) {
      throw new AsmError(".proc requires a label", orig, line, firstNonSpaceCol(line));
    }
    if (/^\.?endp\s*$/i.test(bare)) {
      if (!proc) {
        throw new AsmError(".endp without .proc", orig, line, firstNonSpaceCol(line));
      }
      if (proc.returnUsed) {
        out.push({ text: `${proc.exitLabel}:`, orig });
      }
      out.push(...popsAndRet(proc.regs, orig));
      proc = null;
      continue;
    }
    if (/^\.?return\s*$/i.test(bare)) {
      if (!proc) {
        throw new AsmError(".return outside .proc", orig, line, firstNonSpaceCol(line));
      }
      if (proc.regs.length === 0) {
        out.push({ text: `	RET`, orig });
      } else {
        proc.returnUsed = true;
        out.push({ text: `	JMP ${proc.exitLabel}`, orig });
      }
      continue;
    }
    out.push({ text: line, orig });
  }
  if (stack.length) {
    const top = stack[stack.length - 1];
    throw new AsmError(".if without .endif", top.line, top.source, firstNonSpaceCol(top.source));
  }
  if (proc) {
    throw new AsmError(".proc without .endp", proc.line, proc.source, firstNonSpaceCol(proc.source));
  }
  return out;
}
var MAX_STATEMENTS_PER_LINE = 10;
function splitStatements(line) {
  const src = stripComment(line);
  const out = [];
  let start = 0;
  let inQ = false;
  let qc = "";
  for (let i = 0;i + 2 < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === qc)
        inQ = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inQ = true;
      qc = c;
      continue;
    }
    if (c !== " " || src[i + 1] !== "/" || src[i + 2] !== " ")
      continue;
    let j = i + 3;
    while (j < src.length && src[j] === " ")
      j++;
    let tokStart = j;
    if (src[j] === ".")
      j++;
    let tokEnd = j;
    while (tokEnd < src.length && /\w/.test(src[tokEnd]))
      tokEnd++;
    if (tokEnd === j)
      continue;
    let tok = src.slice(tokStart, tokEnd).toUpperCase();
    if (tok.startsWith("."))
      tok = tok.slice(1);
    if (!ALL_MNEMONICS.has(tok))
      continue;
    out.push(src.slice(start, i));
    start = i + 2;
    i += 2;
  }
  out.push(src.slice(start));
  if (out.length > MAX_STATEMENTS_PER_LINE) {
    throw new Error(`too many statements on one line (max ${MAX_STATEMENTS_PER_LINE})`);
  }
  return out;
}
function instrSize(m) {
  if (m in IMPLIED)
    return 1;
  if (m in ALU_REG)
    return 1;
  if (m === "MOV" || m === "INR" || m === "DCR")
    return 1;
  if (m === "PUSH" || m === "POP")
    return 1;
  if (m === "DAD" || m === "INX" || m === "DCX")
    return 1;
  if (m === "LDAX" || m === "STAX")
    return 1;
  if (m === "RST")
    return 1;
  if (m === "MVI")
    return 2;
  if (m in ALU_IMM)
    return 2;
  if (m === "IN" || m === "OUT")
    return 2;
  if (m === "LXI")
    return 3;
  if (m in ADDR16)
    return 3;
  throw new Error(`unknown mnemonic: ${m}`);
}
function stripComment(line) {
  let inQ = false;
  let qc = "";
  for (let i = 0;i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === qc)
        inQ = false;
    } else if (c === '"' || c === "'") {
      inQ = true;
      qc = c;
    } else if (c === ";")
      return line.slice(0, i);
  }
  return line;
}
function splitOperands(s) {
  const r = [];
  let current = "";
  let inQ = false;
  let qc = "";
  for (const c of s) {
    if (inQ) {
      current += c;
      if (c === qc)
        inQ = false;
    } else if (c === '"' || c === "'") {
      inQ = true;
      qc = c;
      current += c;
    } else if (c === ",") {
      r.push(current.trim());
      current = "";
    } else
      current += c;
  }
  if (current.trim())
    r.push(current.trim());
  return r;
}
var DIRECTIVES = new Set(["ORG", "SECTION", "END", "DB", "DW", "DS", "EQU"]);
function stripDirectiveDot(s) {
  if (s.startsWith(".") && DIRECTIVES.has(s.slice(1).toUpperCase())) {
    return s.slice(1);
  }
  return s;
}
var LABEL_RE = /^(?:[A-Za-z_]\w*|@\w+|\.\w+)$/;
function isMnemonic(tok) {
  return ALL_MNEMONICS.has(stripDirectiveDot(tok).toUpperCase());
}
function parseLine(line) {
  let s = stripComment(line).trim();
  if (!s)
    return { operands: [] };
  let label;
  const ci = s.indexOf(":");
  if (ci > 0 && LABEL_RE.test(s.slice(0, ci).trim())) {
    label = s.slice(0, ci).trim();
    s = s.slice(ci + 1).trim();
  }
  if (!s)
    return { label, operands: [] };
  let si = s.search(/\s/);
  let first = si < 0 ? s : s.slice(0, si);
  let rest = si < 0 ? "" : s.slice(si).trim();
  if (!label && rest && LABEL_RE.test(first) && !isMnemonic(first)) {
    const nextTok = rest.match(/^\S+/)?.[0] ?? "";
    if (isMnemonic(nextTok)) {
      label = first;
      si = rest.search(/\s/);
      first = si < 0 ? rest : rest.slice(0, si);
      rest = si < 0 ? "" : rest.slice(si).trim();
    }
  }
  const mnemonic = stripDirectiveDot(first);
  if (label && mnemonic.toUpperCase() === "EQU") {
    return {
      label,
      mnemonic: "EQU",
      operands: [rest],
      isEqu: true
    };
  }
  return {
    label,
    mnemonic,
    operands: rest ? splitOperands(rest) : []
  };
}
function tokenizeExpr(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    let c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "'" && i + 2 < expr.length && expr[i + 2] === "'") {
      tokens.push({ kind: "num", val: expr.charCodeAt(i + 1) });
      i += 3;
      continue;
    }
    if (c === "$") {
      tokens.push({ kind: "id", val: "$" });
      i++;
      continue;
    }
    if (c === "@") {
      let j = i + 1;
      while (j < expr.length && /\w/.test(expr[j]))
        j++;
      if (j === i + 1)
        throw new Error("expected identifier after '@'");
      tokens.push({ kind: "id", val: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (c === ".") {
      let j = i + 1;
      while (j < expr.length && /\w/.test(expr[j]))
        j++;
      if (j === i + 1)
        throw new Error("expected identifier after '.'");
      tokens.push({ kind: "id", val: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9A-Fa-f]/.test(expr[j]))
        j++;
      if (j < expr.length && /[hH]/.test(expr[j])) {
        tokens.push({ kind: "num", val: parseInt(expr.slice(i, j), 16) });
        j++;
      } else {
        tokens.push({ kind: "num", val: parseInt(expr.slice(i, j), 10) });
      }
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < expr.length && /\w/.test(expr[j]))
        j++;
      tokens.push({ kind: "id", val: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "<" && expr[i + 1] === "<") {
      tokens.push({ kind: "op", val: "<<" });
      i += 2;
      continue;
    }
    if (c === ">" && expr[i + 1] === ">") {
      tokens.push({ kind: "op", val: ">>" });
      i += 2;
      continue;
    }
    if ("+-*/%&|^~()".includes(c)) {
      tokens.push({ kind: "op", val: c });
      i++;
      continue;
    }
    throw new Error(`unexpected character in expression: '${c}'`);
  }
  return tokens;
}
function evalExpr(expr, symbols, pc = 0, lastLabel = "") {
  const tokens = tokenizeExpr(expr);
  let pos = 0;
  function peek() {
    return tokens[pos];
  }
  function next() {
    return tokens[pos++];
  }
  function isOp(val) {
    const t = peek();
    return t !== undefined && t.kind === "op" && t.val === val;
  }
  function atom() {
    const t = peek();
    if (!t)
      throw new Error("unexpected end of expression");
    if (t.kind === "num") {
      next();
      return t.val;
    }
    if (t.kind === "id") {
      next();
      const raw = t.val;
      if (raw === "$")
        return pc;
      const upper = raw.toUpperCase();
      if (upper === "LOW" || upper === "HIGH") {
        if (!isOp("("))
          throw new Error(`${upper} requires parentheses`);
        next();
        const v = parseOr();
        if (!isOp(")"))
          throw new Error("expected ')'");
        next();
        return upper === "LOW" ? v & 255 : v >> 8 & 255;
      }
      let name = raw;
      if (name.startsWith("@") || name.startsWith(".")) {
        if (!lastLabel)
          throw new Error(`local label without scope: ${raw}`);
        name = lastLabel + name;
      }
      const k = name.toUpperCase();
      if (symbols.has(k))
        return symbols.get(k);
      throw new Error(`unknown symbol: ${raw}`);
    }
    if (t.kind === "op" && t.val === "(") {
      next();
      const v = parseOr();
      if (!isOp(")"))
        throw new Error("expected ')'");
      next();
      return v;
    }
    throw new Error(`unexpected token: ${t.val}`);
  }
  function unary() {
    if (isOp("-")) {
      next();
      return -unary() & 65535;
    }
    if (isOp("+")) {
      next();
      return unary();
    }
    if (isOp("~")) {
      next();
      return ~unary() & 65535;
    }
    return atom();
  }
  function multiplicative() {
    let v = unary();
    while (isOp("*") || isOp("/") || isOp("%")) {
      const op = next().val;
      let r = unary();
      if (op === "*")
        v = v * r & 65535;
      else if (op === "/")
        v = Math.trunc(v / r) & 65535;
      else
        v = v % r & 65535;
    }
    return v;
  }
  function additive() {
    let v = multiplicative();
    while (isOp("+") || isOp("-")) {
      const op = next().val;
      let r = multiplicative();
      v = op === "+" ? v + r & 65535 : v - r & 65535;
    }
    return v;
  }
  function shift() {
    let v = additive();
    while (isOp("<<") || isOp(">>")) {
      const op = next().val;
      let r = additive();
      v = op === "<<" ? v << r & 65535 : v >>> r & 65535;
    }
    return v;
  }
  function parseAnd() {
    let v = shift();
    while (isOp("&")) {
      next();
      v = v & shift();
    }
    return v;
  }
  function parseXor() {
    let v = parseAnd();
    while (isOp("^")) {
      next();
      v = (v ^ parseAnd()) & 65535;
    }
    return v;
  }
  function parseOr() {
    let v = parseXor();
    while (isOp("|")) {
      next();
      v = (v | parseXor()) & 65535;
    }
    return v;
  }
  const result = parseOr();
  if (pos < tokens.length)
    throw new Error(`unexpected token: ${tokens[pos].val}`);
  return result;
}
function encode(m, ops, symbols, pc = 0, lastLabel = "") {
  if (m in IMPLIED)
    return [IMPLIED[m]];
  if (m in ALU_REG)
    return [ALU_REG[m] | REG8[ops[0].toUpperCase()]];
  if (m in ALU_IMM)
    return [ALU_IMM[m], evalExpr(ops[0], symbols, pc, lastLabel) & 255];
  if (m in ADDR16) {
    const v = evalExpr(ops[0], symbols, pc, lastLabel);
    return [ADDR16[m], v & 255, v >> 8 & 255];
  }
  if (m === "MOV")
    return [
      64 | REG8[ops[0].toUpperCase()] << 3 | REG8[ops[1].toUpperCase()]
    ];
  if (m === "MVI") {
    const v = evalExpr(ops[1], symbols, pc, lastLabel);
    return [6 | REG8[ops[0].toUpperCase()] << 3, v & 255];
  }
  if (m === "INR")
    return [4 | REG8[ops[0].toUpperCase()] << 3];
  if (m === "DCR")
    return [5 | REG8[ops[0].toUpperCase()] << 3];
  if (m === "LXI") {
    const v = evalExpr(ops[1], symbols, pc, lastLabel);
    return [
      1 | REG_PAIR[ops[0].toUpperCase()] << 4,
      v & 255,
      v >> 8 & 255
    ];
  }
  if (m === "DAD")
    return [9 | REG_PAIR[ops[0].toUpperCase()] << 4];
  if (m === "INX")
    return [3 | REG_PAIR[ops[0].toUpperCase()] << 4];
  if (m === "DCX")
    return [11 | REG_PAIR[ops[0].toUpperCase()] << 4];
  if (m === "PUSH")
    return [197 | REG_PAIR_PUSH[ops[0].toUpperCase()] << 4];
  if (m === "POP")
    return [193 | REG_PAIR_PUSH[ops[0].toUpperCase()] << 4];
  if (m === "LDAX")
    return [10 | REG_PAIR[ops[0].toUpperCase()] << 4];
  if (m === "STAX")
    return [2 | REG_PAIR[ops[0].toUpperCase()] << 4];
  if (m === "IN")
    return [219, evalExpr(ops[0], symbols, pc, lastLabel) & 255];
  if (m === "OUT")
    return [211, evalExpr(ops[0], symbols, pc, lastLabel) & 255];
  if (m === "RST") {
    const n = evalExpr(ops[0], symbols, pc, lastLabel);
    return [199 | n << 3];
  }
  throw new Error(`cannot encode: ${m} ${ops.join(", ")}`);
}
function dbBytes(operands, symbols, pc = 0, lastLabel = "") {
  const out = [];
  for (const op of operands) {
    if (op.startsWith('"') && op.endsWith('"') || op.startsWith("'") && op.endsWith("'")) {
      for (const ch of op.slice(1, -1))
        out.push(ch.charCodeAt(0));
    } else {
      out.push(evalExpr(op, symbols, pc, lastLabel) & 255);
    }
  }
  return out;
}
function dwBytes(operands, symbols, pc = 0, lastLabel = "") {
  const out = [];
  for (const op of operands) {
    const v = evalExpr(op, symbols, pc, lastLabel) & 65535;
    out.push(v & 255, v >> 8 & 255);
  }
  return out;
}
function parseDs(operands) {
  if (operands.length !== 1)
    throw new Error("DS takes one operand: count [(fill)]");
  const m = operands[0].match(/^(.+?)\s+\((.+)\)\s*$/);
  if (m)
    return { count: m[1], fill: m[2] };
  return { count: operands[0], fill: "0" };
}
function dsBytes(operands, symbols, pc = 0, lastLabel = "") {
  const { count, fill } = parseDs(operands);
  const n = evalExpr(count, symbols, pc, lastLabel);
  const f = evalExpr(fill, symbols, pc, lastLabel) & 255;
  return new Array(n).fill(f);
}
function countDs(operands, symbols, pc = 0, lastLabel = "") {
  const { count } = parseDs(operands);
  return evalExpr(count, symbols, pc, lastLabel);
}
function countDb(operands) {
  let n = 0;
  for (const op of operands) {
    if (op.startsWith('"') && op.endsWith('"') || op.startsWith("'") && op.endsWith("'"))
      n += op.length - 2;
    else
      n++;
  }
  return n;
}
function asm(source) {
  const pp = preprocess(source);
  const symbols = new Map;
  const pending = [];
  let pc = 0;
  let lastLabel = "";
  let ended = false;
  for (let idx = 0;idx < pp.length && !ended; idx++) {
    const { text: line, orig } = pp[idx];
    try {
      for (const stmt of splitStatements(line)) {
        const parts = parseLine(stmt);
        if (parts.label) {
          let labelName = parts.label;
          if (labelName.startsWith("@") || labelName.startsWith(".")) {
            if (!lastLabel)
              throw new Error(`local label without preceding normal label: ${labelName}`);
            labelName = lastLabel + labelName;
          } else if (!parts.isEqu) {
            lastLabel = parts.label;
          }
          if (parts.isEqu) {
            tryDefineEqu(symbols, pending, labelName, parts.operands[0], pc, lastLabel, orig, line);
            continue;
          }
          symbols.set(labelName.toUpperCase(), pc);
        }
        if (!parts.mnemonic)
          continue;
        const m = parts.mnemonic.toUpperCase();
        if (m === "EQU")
          continue;
        if (m === "ORG") {
          pc = evalExpr(parts.operands[0], symbols, pc, lastLabel);
          continue;
        }
        if (m === "SECTION")
          continue;
        if (m === "END") {
          ended = true;
          break;
        }
        if (m === "DB") {
          pc += countDb(parts.operands);
          continue;
        }
        if (m === "DW") {
          pc += parts.operands.length * 2;
          continue;
        }
        if (m === "DS") {
          pc += countDs(parts.operands, symbols, pc, lastLabel);
          continue;
        }
        pc += instrSize(m);
      }
    } catch (e) {
      if (e instanceof AsmError)
        throw e;
      throw new AsmError(e.message, orig, line, firstNonSpaceCol(line));
    }
  }
  resolvePendingEqus(symbols, pending);
  const sections = [];
  let current = null;
  const sectionNames = new Set;
  let lastLabel2 = "";
  let endedPass2 = false;
  for (let idx = 0;idx < pp.length && !endedPass2; idx++) {
    const { text: line, orig } = pp[idx];
    try {
      for (const stmt of splitStatements(line)) {
        const parts = parseLine(stmt);
        if (parts.label && !parts.label.startsWith("@") && !parts.label.startsWith(".") && !parts.isEqu) {
          lastLabel2 = parts.label;
        }
        if (parts.isEqu || !parts.mnemonic)
          continue;
        const m = parts.mnemonic.toUpperCase();
        if (m === "EQU")
          continue;
        const curPc = current ? current.start + current.data.length : 0;
        if (m === "ORG") {
          if (current && current.data.length) {
            current.end = current.start + current.data.length - 1;
            sections.push(current);
          }
          const addr = evalExpr(parts.operands[0], symbols, curPc, lastLabel2);
          current = { start: addr, end: addr, data: [] };
          continue;
        }
        if (m === "SECTION") {
          if (!current)
            throw new Error("SECTION before ORG");
          const name = parts.operands[0];
          if (!name)
            throw new Error("SECTION requires a name");
          if (sectionNames.has(name.toUpperCase()))
            throw new Error(`duplicate section name: ${name}`);
          sectionNames.add(name.toUpperCase());
          current.name = name;
          continue;
        }
        if (m === "END") {
          endedPass2 = true;
          break;
        }
        if (!current)
          throw new Error("code before ORG");
        const bytes = m === "DB" ? dbBytes(parts.operands, symbols, curPc, lastLabel2) : m === "DW" ? dwBytes(parts.operands, symbols, curPc, lastLabel2) : m === "DS" ? dsBytes(parts.operands, symbols, curPc, lastLabel2) : encode(m, parts.operands, symbols, curPc, lastLabel2);
        current.data.push(...bytes);
      }
    } catch (e) {
      if (e instanceof AsmError)
        throw e;
      throw new AsmError(e.message, orig, line, firstNonSpaceCol(line));
    }
  }
  if (current && current.data.length) {
    current.end = current.start + current.data.length - 1;
    sections.push(current);
  }
  return sections;
}
function hex4(n) {
  return n.toString(16).toUpperCase().padStart(4, "0");
}
function hex2(n) {
  return n.toString(16).toUpperCase().padStart(2, "0");
}
function isUnknownSymbolErr(e) {
  return e instanceof Error && /^unknown symbol:/.test(e.message);
}
function tryDefineEqu(symbols, pending, name, expr, pc, lastLabel, orig, line) {
  try {
    symbols.set(name.toUpperCase(), evalExpr(expr, symbols, pc, lastLabel));
  } catch (e) {
    if (isUnknownSymbolErr(e)) {
      pending.push({ name, expr, pc, lastLabel, orig, line });
    } else {
      throw e;
    }
  }
}
function resolvePendingEqus(symbols, pending) {
  while (pending.length > 0) {
    let progress = false;
    const next = [];
    for (const p of pending) {
      try {
        symbols.set(p.name.toUpperCase(), evalExpr(p.expr, symbols, p.pc, p.lastLabel));
        progress = true;
      } catch (e) {
        if (isUnknownSymbolErr(e)) {
          next.push(p);
        } else {
          throw new AsmError(e.message, p.orig, p.line, firstNonSpaceCol(p.line));
        }
      }
    }
    if (!progress) {
      const p = next[0];
      try {
        evalExpr(p.expr, symbols, p.pc, p.lastLabel);
      } catch (e) {
        throw new AsmError(e.message, p.orig, p.line, firstNonSpaceCol(p.line));
      }
      return;
    }
    pending.length = 0;
    pending.push(...next);
  }
}
function collectSymbols(pp) {
  let symbols = new Map;
  const pending = [];
  let pc = 0;
  let lastLabel = "";
  let ended = false;
  for (let idx = 0;idx < pp.length && !ended; idx++) {
    let { text: line, orig } = pp[idx];
    try {
      for (const stmt of splitStatements(line)) {
        let parts = parseLine(stmt);
        if (parts.label) {
          let labelName = parts.label;
          if (labelName.startsWith("@") || labelName.startsWith(".")) {
            if (!lastLabel)
              throw new Error(`local label without preceding normal label: ${labelName}`);
            labelName = lastLabel + labelName;
          } else if (!parts.isEqu) {
            lastLabel = parts.label;
          }
          if (parts.isEqu) {
            tryDefineEqu(symbols, pending, labelName, parts.operands[0], pc, lastLabel, orig, line);
            continue;
          }
          symbols.set(labelName.toUpperCase(), pc);
        }
        if (!parts.mnemonic)
          continue;
        let m = parts.mnemonic.toUpperCase();
        if (m === "EQU")
          continue;
        if (m === "ORG") {
          pc = evalExpr(parts.operands[0], symbols, pc, lastLabel);
          continue;
        }
        if (m === "SECTION")
          continue;
        if (m === "END") {
          ended = true;
          break;
        }
        if (m === "DB") {
          pc += countDb(parts.operands);
          continue;
        }
        if (m === "DW") {
          pc += parts.operands.length * 2;
          continue;
        }
        if (m === "DS") {
          pc += countDs(parts.operands, symbols, pc, lastLabel);
          continue;
        }
        pc += instrSize(m);
      }
    } catch (e) {
      if (e instanceof AsmError)
        throw e;
      throw new AsmError(e.message, orig, line, firstNonSpaceCol(line));
    }
  }
  resolvePendingEqus(symbols, pending);
  return symbols;
}
function lineInfo(source) {
  let pp = preprocess(source);
  let symbols = collectSymbols(pp);
  let out = [];
  let pc = 0;
  let lastLabel = "";
  let done = false;
  for (let idx = 0;idx < pp.length; idx++) {
    let { text: line, orig } = pp[idx];
    if (done) {
      out.push({ orig, prefix: "", display: line, bytes: [] });
      continue;
    }
    try {
      const statements = splitStatements(line);
      for (let si = 0;si < statements.length; si++) {
        const stmt = statements[si];
        const display = si === 0 ? line : "";
        let parts = parseLine(stmt);
        if (parts.label && !parts.label.startsWith("@") && !parts.label.startsWith(".") && !parts.isEqu) {
          lastLabel = parts.label;
        }
        if (parts.isEqu) {
          let val = evalExpr(parts.operands[0], symbols, pc, lastLabel);
          out.push({ orig, prefix: "=" + hex4(val), display, bytes: [] });
          continue;
        }
        if (!parts.mnemonic) {
          if (parts.label) {
            out.push({
              orig,
              prefix: hex4(pc) + ":",
              display,
              addr: pc,
              bytes: []
            });
          } else if (si === 0) {
            out.push({ orig, prefix: "", display, bytes: [] });
          }
          continue;
        }
        let m = parts.mnemonic.toUpperCase();
        if (m === "ORG") {
          pc = evalExpr(parts.operands[0], symbols, pc, lastLabel);
          out.push({
            orig,
            prefix: hex4(pc) + ":",
            display,
            addr: pc,
            bytes: []
          });
          continue;
        }
        if (m === "SECTION") {
          out.push({ orig, prefix: "", display, bytes: [] });
          continue;
        }
        if (m === "END") {
          out.push({ orig, prefix: "", display, bytes: [] });
          done = true;
          break;
        }
        if (m === "DS") {
          const n = countDs(parts.operands, symbols, pc, lastLabel);
          out.push({
            orig,
            prefix: hex4(pc) + ":",
            display,
            addr: pc,
            bytes: []
          });
          pc += n;
          continue;
        }
        let bytes = m === "DB" ? dbBytes(parts.operands, symbols, pc, lastLabel) : m === "DW" ? dwBytes(parts.operands, symbols, pc, lastLabel) : encode(m, parts.operands, symbols, pc, lastLabel);
        for (let i = 0;i < bytes.length; i += 4) {
          let chunk = bytes.slice(i, i + 4);
          let prefix = hex4(pc + i) + ": " + chunk.map(hex2).join(" ");
          out.push({
            orig,
            prefix,
            display: i === 0 ? display : "",
            addr: pc + i,
            bytes: chunk
          });
        }
        if (bytes.length === 0) {
          out.push({
            orig,
            prefix: hex4(pc) + ":",
            display,
            addr: pc,
            bytes: []
          });
        }
        pc += bytes.length;
      }
    } catch (e) {
      if (e instanceof AsmError)
        throw e;
      throw new AsmError(e.message, orig, line, firstNonSpaceCol(line));
    }
  }
  return out;
}
var DATA_DIRECTIVES = new Set(["DB", "DW", "DS"]);
if (false) {}

// docs/examples.ts
var fetchExample = (f) => fetch(`examples/${f}`).then((r) => r.text());
function file(name, filename, src = "") {
  return { name, filename, source: fetchExample(src || filename) };
}
var EXAMPLES = [
  file("aloha", "hello.asm"),
  file("ok", "ok.asm"),
  file("sections", "sections.asm"),
  file("expressions", "expressions.asm"),
  file("current address $", "addr.asm"),
  file("local labels @ and .", "locals.asm"),
  file("if / else", "ifelse.asm"),
  file("proc: .return -> RET (no saves)", "proc-ret.asm"),
  file("proc: .return -> JMP exit (with saves)", "proc-jmp.asm"),
  file("dump editor", "dumped.asm"),
  file("chars", "chars.asm"),
  file("noise", "noise.asm"),
  file("banner", "banner.asm"),
  file("pong", "pong.asm"),
  file("sokoban", "sokoban.asm"),
  file("volcano", "volcano.asm"),
  file("lestnica", "lestnica.asm")
];

// docs/build-info.ts
var BUILD_TIME = "2026-04-21 18:59:28";

// docs/playground.ts
var STORAGE_KEY = "asm8-playground:source";
var FILENAME_KEY = "asm8-playground:filename";
var TABS_KEY = "asm8-playground:tabs";
var ACTIVE_KEY = "asm8-playground:active";
var THEME_KEY = "asm8-playground:theme";
var FORMAT_KEY = "asm8-playground:format";
var DEFAULT_FILENAME = "program.asm";
var OUTPUT_FORMATS = [
  "asm",
  "bin",
  "rk",
  "rkr",
  "pki",
  "gam"
];
var DEFAULT_FORMAT = "asm";
var tabs = [];
var active = 0;
function applyTheme(t) {
  document.body.classList.toggle("theme-light", t === "light");
  themeBtn.textContent = t === "light" ? "dark" : "light";
}
function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
function saveTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}
}
var source = document.getElementById("source");
var gutter = document.getElementById("gutter");
var highlight = document.getElementById("highlight");
var errorEl = document.getElementById("error");
var select = document.getElementById("example");
var modal = document.getElementById("modal");
var modalContent = document.getElementById("modal-content");
var confirmModal = document.getElementById("confirm-modal");
var confirmMessage = document.getElementById("confirm-message");
var confirmOk = document.getElementById("confirm-ok");
var confirmCancel = document.getElementById("confirm-cancel");
var uploadBtn = document.getElementById("upload-asm");
var downloadBtn = document.getElementById("download-btn");
var downloadFormatSel = document.getElementById("download-format");
var runBinBtn = document.getElementById("run-bin");
var resetBtn = document.getElementById("reset");
var themeBtn = document.getElementById("theme");
var fileInput = document.getElementById("file-input");
var filenameInput = document.getElementById("filename");
var tabsEl = document.getElementById("tabs");
function asmName() {
  return filenameInput.value.trim() || DEFAULT_FILENAME;
}
function outputName(format2) {
  const n = asmName();
  const base = n.replace(/\.[^.]*$/, "") || n;
  return `${base}.${format2}`;
}
function rk86CheckSum(v) {
  let sum = 0;
  let j = 0;
  while (j < v.length - 1) {
    const c = v[j];
    sum = sum + c + (c << 8) & 65535;
    j += 1;
  }
  const sum_h = sum & 65280;
  const sum_l = sum & 255;
  sum = sum_h | sum_l + v[j] & 255;
  return sum;
}
function buildOutputFile(sections, format2) {
  if (sections.length === 0)
    return new Uint8Array(0);
  const start = sections.reduce((m, s) => Math.min(m, s.start), Infinity);
  const end = sections.reduce((m, s) => Math.max(m, s.end), 0);
  const size = end - start + 1;
  const payload = new Uint8Array(size);
  for (const s of sections)
    payload.set(s.data, s.start - start);
  if (format2 === "bin")
    return payload;
  const hasSync = format2 === "pki" || format2 === "gam";
  const headerLen = hasSync ? 5 : 4;
  const out = new Uint8Array(headerLen + size + 3);
  let o = 0;
  if (hasSync)
    out[o++] = 230;
  out[o++] = start >> 8 & 255;
  out[o++] = start & 255;
  out[o++] = end >> 8 & 255;
  out[o++] = end & 255;
  out.set(payload, o);
  o += size;
  const checksum = rk86CheckSum(payload);
  out[o++] = 230;
  out[o++] = checksum >> 8 & 255;
  out[o++] = checksum & 255;
  return out;
}
var LINE_HEIGHT = 20;
var PAD_TOP = 8;
for (const ex of EXAMPLES) {
  const opt = document.createElement("option");
  opt.value = ex.name;
  opt.textContent = ex.name;
  select.appendChild(opt);
}
select.addEventListener("change", async () => {
  const ex = EXAMPLES.find((e) => e.name === select.value);
  if (!ex)
    return;
  const exSource = await ex.source;
  tabs[active].source = source.value;
  const uniqueName = uniqueFilename(ex.filename);
  tabs.push({ filename: uniqueName, source: exSource });
  active = tabs.length - 1;
  source.value = exSource;
  filenameInput.value = uniqueName;
  lastGoodName = uniqueName;
  source.scrollTop = 0;
  saveTabs();
  renderTabs();
  onChange();
  source.focus();
});
function uniqueFilename(base) {
  if (!tabs.some((t, i) => i !== active && t.filename === base))
    return base;
  const m = base.match(/^(.*?)(\.[^.]*)?$/);
  const stem = m ? m[1] : base;
  const ext = m && m[2] ? m[2] : "";
  let n = 2;
  while (tabs.some((t, i) => i !== active && t.filename === `${stem}-${n}${ext}`))
    n++;
  return `${stem}-${n}${ext}`;
}
function deselectExample() {
  if (select.value)
    select.value = "";
}
source.addEventListener("input", deselectExample);
filenameInput.addEventListener("input", deselectExample);
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function hex22(n) {
  return n.toString(16).toUpperCase().padStart(2, "0");
}
function hex42(n) {
  return n.toString(16).toUpperCase().padStart(4, "0");
}
function formatDump(display, baseAddr, bytes, perRow) {
  const lines = [];
  const trimmed = display.replace(/^\s+/, "");
  if (trimmed)
    lines.push(trimmed);
  if (lines.length)
    lines.push("");
  for (let i = 0;i < bytes.length; i += perRow) {
    const chunk = bytes.slice(i, i + perRow);
    lines.push(`${hex42(baseAddr + i)}: ${chunk.map(hex22).join(" ")}`);
  }
  return lines.join(`
`);
}
function fmtGutterGroup(rs) {
  if (!rs || rs.length === 0)
    return "";
  const first = rs[0];
  if (!first.prefix)
    return "";
  if (first.prefix.startsWith("=")) {
    return `<span class="equ">${esc(first.prefix)}</span>`;
  }
  const m = first.prefix.match(/^([0-9A-F]{4}):/);
  if (!m)
    return esc(first.prefix);
  const addr = m[1];
  const allBytes = rs.flatMap((r) => r.bytes);
  if (allBytes.length === 0) {
    return `<span class="addr">${addr}:</span>`;
  }
  const head = allBytes.slice(0, 4).map(hex22).join(" ");
  if (allBytes.length <= 4) {
    return `<span class="addr">${addr}:</span> <span class="bytes">${head}</span>`;
  }
  const baseAddr = first.addr ?? parseInt(addr, 16);
  const dump = formatDump(first.display, baseAddr, allBytes, 8);
  return `<span class="addr">${addr}:</span> <span class="bytes">${head}</span>` + `<span class="more" data-dump="${esc(dump)}">…</span>`;
}
function openModal(text) {
  modalContent.textContent = text;
  modal.hidden = false;
}
function closeModal() {
  modal.hidden = true;
}
var confirmResolver = null;
function askConfirm(message) {
  confirmMessage.textContent = message;
  confirmModal.hidden = false;
  confirmOk.focus();
  return new Promise((resolve2) => {
    confirmResolver = resolve2;
  });
}
function closeConfirm(result) {
  confirmModal.hidden = true;
  const r = confirmResolver;
  confirmResolver = null;
  if (r)
    r(result);
}
confirmOk.addEventListener("click", () => closeConfirm(true));
confirmCancel.addEventListener("click", () => closeConfirm(false));
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal)
    closeConfirm(false);
});
gutter.addEventListener("click", (e) => {
  const t = e.target;
  if (!t.classList.contains("more"))
    return;
  const dump = t.getAttribute("data-dump");
  if (dump !== null)
    openModal(dump);
});
modal.addEventListener("click", (e) => {
  if (e.target === modal)
    closeModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!modal.hidden)
      closeModal();
    else if (!confirmModal.hidden)
      closeConfirm(false);
  }
  if (e.key === "Enter" && !confirmModal.hidden) {
    e.preventDefault();
    closeConfirm(true);
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
    if (runBinBtn.disabled)
      return;
    e.preventDefault();
    runBinBtn.click();
  }
});
function renderGutter(info, totalLines) {
  const groups = new Map;
  for (const r of info) {
    const arr = groups.get(r.orig);
    if (arr)
      arr.push(r);
    else
      groups.set(r.orig, [r]);
  }
  const out = [];
  for (let i = 1;i <= totalLines; i++) {
    out.push(fmtGutterGroup(groups.get(i)));
  }
  gutter.innerHTML = out.join(`
`);
}
function renderHighlight(errLine) {
  highlight.innerHTML = "";
  if (errLine === null)
    return;
  const div = document.createElement("div");
  div.className = "err-line";
  div.style.position = "absolute";
  div.style.left = "0";
  div.style.right = "0";
  div.style.top = `${PAD_TOP + (errLine - 1) * LINE_HEIGHT - source.scrollTop}px`;
  div.style.height = `${LINE_HEIGHT}px`;
  highlight.appendChild(div);
}
var errLine = null;
var lastSections = null;
function compile() {
  const src = source.value;
  const totalLines = src.length === 0 ? 1 : src.split(`
`).length;
  try {
    const info = lineInfo(src);
    lastSections = asm(src);
    renderGutter(info, totalLines);
    errLine = null;
    renderHighlight(null);
    errorEl.classList.remove("visible");
    errorEl.textContent = "";
    updateDownloadEnabled();
    runBinBtn.disabled = lastSections.length === 0;
  } catch (e) {
    lastSections = null;
    updateDownloadEnabled();
    runBinBtn.disabled = true;
    if (e instanceof AsmError) {
      errLine = e.line;
      errorEl.classList.add("visible");
      errorEl.textContent = `line ${e.line}: ${e.message}`;
    } else {
      errLine = null;
      errorEl.classList.add("visible");
      errorEl.textContent = e.message;
    }
    gutter.innerHTML = "";
    renderHighlight(errLine);
  }
}
function saveTabs() {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    localStorage.setItem(ACTIVE_KEY, String(active));
  } catch {}
}
function save() {
  tabs[active].source = source.value;
  saveTabs();
}
function renderTabs() {
  tabsEl.innerHTML = "";
  tabs.forEach((t, i) => {
    const el = document.createElement("div");
    el.className = "tab" + (i === active ? " active" : "");
    el.title = t.filename;
    const name = document.createElement("span");
    name.textContent = t.filename || "(untitled)";
    el.appendChild(name);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "×";
    close.title = "close tab";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(i);
    });
    el.appendChild(close);
    el.addEventListener("click", () => switchTab(i));
    tabsEl.appendChild(el);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "tab-add";
  add.textContent = "+";
  add.title = "new tab";
  add.addEventListener("click", () => newTab());
  tabsEl.appendChild(add);
}
function nextUntitled() {
  let n = 1;
  while (tabs.some((t) => t.filename === `untitled-${n}.asm`))
    n++;
  return `untitled-${n}.asm`;
}
function switchTab(i) {
  if (i === active || i < 0 || i >= tabs.length)
    return;
  tabs[active].source = source.value;
  active = i;
  source.value = tabs[active].source;
  filenameInput.value = tabs[active].filename;
  source.scrollTop = 0;
  saveTabs();
  renderTabs();
  deselectExample();
  compile();
  syncScroll();
  source.focus();
}
function newTab() {
  tabs[active].source = source.value;
  tabs.push({ filename: nextUntitled(), source: "" });
  active = tabs.length - 1;
  source.value = "";
  filenameInput.value = tabs[active].filename;
  source.scrollTop = 0;
  saveTabs();
  renderTabs();
  deselectExample();
  compile();
  syncScroll();
  source.focus();
}
async function closeTab(i) {
  const current = i === active ? source.value : tabs[i].source;
  if (current.trim().length > 0) {
    const ok = await askConfirm(`Close "${tabs[i].filename}"? Its content will be lost.`);
    if (!ok)
      return;
  }
  if (tabs.length === 1) {
    tabs[0] = { filename: DEFAULT_FILENAME, source: "" };
    active = 0;
    source.value = "";
    filenameInput.value = tabs[0].filename;
    lastGoodName = tabs[0].filename;
  } else {
    tabs.splice(i, 1);
    if (active > i)
      active--;
    else if (active === i && active >= tabs.length)
      active = tabs.length - 1;
    source.value = tabs[active].source;
    filenameInput.value = tabs[active].filename;
    lastGoodName = tabs[active].filename;
  }
  saveTabs();
  renderTabs();
  deselectExample();
  compile();
  syncScroll();
}
var lastGoodName = "";
filenameInput.addEventListener("focus", () => {
  lastGoodName = filenameInput.value;
});
filenameInput.addEventListener("input", () => {
  tabs[active].filename = filenameInput.value;
  saveTabs();
  renderTabs();
});
filenameInput.addEventListener("change", () => {
  const val = filenameInput.value.trim();
  const dup = tabs.findIndex((t, i) => i !== active && t.filename === val);
  if (!val || dup !== -1) {
    if (dup !== -1)
      alert(`A tab named "${val}" already exists.`);
    filenameInput.value = lastGoodName;
    tabs[active].filename = lastGoodName;
  } else {
    filenameInput.value = val;
    tabs[active].filename = val;
    lastGoodName = val;
  }
  saveTabs();
  renderTabs();
});
function syncScroll() {
  gutter.style.transform = `translateY(${-source.scrollTop}px)`;
  if (errLine !== null)
    renderHighlight(errLine);
}
function onChange() {
  save();
  compile();
  syncScroll();
}
source.addEventListener("input", onChange);
source.addEventListener("scroll", syncScroll);
window.addEventListener("resize", syncScroll);
function downloadBlob(data, name, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function findOverlap(sections) {
  const sorted = [...sections].sort((a, b) => a.start - b.start);
  for (let i = 1;i < sorted.length; i++) {
    if (sorted[i].start <= sorted[i - 1].end)
      return [sorted[i - 1], sorted[i]];
  }
  return null;
}
function buildOutput(format2) {
  if (!lastSections || lastSections.length === 0)
    return null;
  const overlap = findOverlap(lastSections);
  if (overlap) {
    const [a, b] = overlap;
    alert(`sections overlap: ${hex42(a.start)}-${hex42(a.end)} and ${hex42(b.start)}-${hex42(b.end)}`);
    return null;
  }
  return buildOutputFile(lastSections, format2);
}
function toBase64(bytes) {
  let s = "";
  for (let i = 0;i < bytes.length; i++)
    s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function loadFormat() {
  try {
    const v = localStorage.getItem(FORMAT_KEY);
    if (v && OUTPUT_FORMATS.includes(v)) {
      return v;
    }
  } catch {}
  return DEFAULT_FORMAT;
}
function saveFormat(f) {
  try {
    localStorage.setItem(FORMAT_KEY, f);
  } catch {}
}
function selectedFormat() {
  return downloadFormatSel.value;
}
function updateDownloadEnabled() {
  const fmt = selectedFormat();
  downloadBtn.disabled = fmt !== "asm" && (!lastSections || lastSections.length === 0);
}
downloadFormatSel.value = loadFormat();
updateDownloadEnabled();
downloadFormatSel.addEventListener("change", () => {
  saveFormat(selectedFormat());
  updateDownloadEnabled();
});
downloadBtn.addEventListener("click", () => {
  const fmt = selectedFormat();
  if (fmt === "asm") {
    downloadBlob(source.value, asmName(), "text/plain");
    return;
  }
  const data = buildOutput(fmt);
  if (!data)
    return;
  downloadBlob(data, outputName(fmt), "application/octet-stream");
});
runBinBtn.addEventListener("click", () => {
  const rk = buildOutput("rk");
  if (!rk)
    return;
  const dataUrl = `data:;name=${outputName("rk")};base64,${toBase64(rk)}`;
  const runUrl = `https://rk86.ru/beta/index.html?run=${encodeURIComponent(dataUrl)}`;
  window.open(runUrl, "_blank", "noopener");
});
uploadBtn.addEventListener("click", () => fileInput.click());
resetBtn.addEventListener("click", async () => {
  const ok = await askConfirm("Reset the current tab to the 'aloha' example? This replaces its content.");
  if (!ok)
    return;
  const def = EXAMPLES.find((e) => e.name === "aloha");
  if (!def)
    return;
  const defSource = await def.source;
  const uniqueName = uniqueFilename(def.filename);
  tabs[active] = { filename: uniqueName, source: defSource };
  source.value = defSource;
  filenameInput.value = uniqueName;
  lastGoodName = uniqueName;
  select.value = def.name;
  source.scrollTop = 0;
  saveTabs();
  renderTabs();
  onChange();
  source.focus();
});
fileInput.addEventListener("change", async () => {
  const f = fileInput.files?.[0];
  if (!f)
    return;
  const text = await f.text();
  const uniqueName = uniqueFilename(f.name);
  tabs.push({ filename: uniqueName, source: text });
  active = tabs.length - 1;
  source.value = text;
  filenameInput.value = uniqueName;
  lastGoodName = uniqueName;
  source.scrollTop = 0;
  fileInput.value = "";
  saveTabs();
  renderTabs();
  onChange();
  source.focus();
});
var buildTimeEl = document.getElementById("build-time");
if (buildTimeEl && BUILD_TIME)
  buildTimeEl.textContent = BUILD_TIME;
themeBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("theme-light") ? "dark" : "light";
  applyTheme(next);
  saveTheme(next);
});
applyTheme(loadTheme());
async function loadTabsFromStorage() {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        tabs = parsed.map((t) => ({
          filename: String(t.filename ?? DEFAULT_FILENAME),
          source: String(t.source ?? "")
        }));
        const a = Number(localStorage.getItem(ACTIVE_KEY) ?? 0) | 0;
        active = a < 0 || a >= tabs.length ? 0 : a;
        return;
      }
    }
  } catch {}
  let src = "";
  let name = "";
  try {
    src = localStorage.getItem(STORAGE_KEY) ?? "";
    name = localStorage.getItem(FILENAME_KEY) ?? "";
  } catch {}
  if (!src)
    src = await EXAMPLES[0]?.source ?? "";
  if (!name)
    name = EXAMPLES[0]?.filename ?? DEFAULT_FILENAME;
  tabs = [{ filename: name, source: src }];
  active = 0;
  saveTabs();
}
(async () => {
  await loadTabsFromStorage();
  source.value = tabs[active].source;
  filenameInput.value = tabs[active].filename;
  lastGoodName = tabs[active].filename;
  renderTabs();
  onChange();
})();
