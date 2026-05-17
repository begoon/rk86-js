// node_modules/asm8080/dist/asm8.js
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

// node_modules/asm8080/dist/asm8.js
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
function parseLine(line) {
  let s = stripComment(line).trim();
  if (!s)
    return { operands: [] };
  let label;
  const ci = s.indexOf(":");
  if (ci > 0 && /^[A-Za-z_]\w*$/.test(s.slice(0, ci).trim())) {
    label = s.slice(0, ci).trim();
    s = s.slice(ci + 1).trim();
  }
  if (!s)
    return { label, operands: [] };
  const si = s.search(/\s/);
  const first = si < 0 ? s : s.slice(0, si);
  const rest = si < 0 ? "" : s.slice(si).trim();
  if (!label && rest) {
    const parts = rest.split(/\s+/);
    if (stripDirectiveDot(parts[0]).toUpperCase() === "EQU") {
      return {
        label: first,
        mnemonic: "EQU",
        operands: [parts.slice(1).join(" ")],
        isEqu: true
      };
    }
  }
  return {
    label,
    mnemonic: stripDirectiveDot(first),
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
function evalExpr(expr, symbols) {
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
      const k = t.val.toUpperCase();
      if (k === "LOW" || k === "HIGH") {
        if (!isOp("("))
          throw new Error(`${k} requires parentheses`);
        next();
        const v = parseOr();
        if (!isOp(")"))
          throw new Error("expected ')'");
        next();
        return k === "LOW" ? v & 255 : v >> 8 & 255;
      }
      if (symbols.has(k))
        return symbols.get(k);
      throw new Error(`unknown symbol: ${t.val}`);
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
function encode(m, ops, symbols) {
  if (m in IMPLIED)
    return [IMPLIED[m]];
  if (m in ALU_REG)
    return [ALU_REG[m] | REG8[ops[0].toUpperCase()]];
  if (m in ALU_IMM)
    return [ALU_IMM[m], evalExpr(ops[0], symbols) & 255];
  if (m in ADDR16) {
    const v = evalExpr(ops[0], symbols);
    return [ADDR16[m], v & 255, v >> 8 & 255];
  }
  if (m === "MOV")
    return [
      64 | REG8[ops[0].toUpperCase()] << 3 | REG8[ops[1].toUpperCase()]
    ];
  if (m === "MVI") {
    const v = evalExpr(ops[1], symbols);
    return [6 | REG8[ops[0].toUpperCase()] << 3, v & 255];
  }
  if (m === "INR")
    return [4 | REG8[ops[0].toUpperCase()] << 3];
  if (m === "DCR")
    return [5 | REG8[ops[0].toUpperCase()] << 3];
  if (m === "LXI") {
    const v = evalExpr(ops[1], symbols);
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
    return [219, evalExpr(ops[0], symbols) & 255];
  if (m === "OUT")
    return [211, evalExpr(ops[0], symbols) & 255];
  if (m === "RST") {
    const n = evalExpr(ops[0], symbols);
    return [199 | n << 3];
  }
  throw new Error(`cannot encode: ${m} ${ops.join(", ")}`);
}
function dbBytes(operands, symbols) {
  const out = [];
  for (const op of operands) {
    if (op.startsWith('"') && op.endsWith('"') || op.startsWith("'") && op.endsWith("'")) {
      for (const ch of op.slice(1, -1))
        out.push(ch.charCodeAt(0));
    } else {
      out.push(evalExpr(op, symbols) & 255);
    }
  }
  return out;
}
function dwBytes(operands, symbols) {
  const out = [];
  for (const op of operands) {
    const v = evalExpr(op, symbols) & 65535;
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
function dsBytes(operands, symbols) {
  const { count, fill } = parseDs(operands);
  const n = evalExpr(count, symbols);
  const f = evalExpr(fill, symbols) & 255;
  return new Array(n).fill(f);
}
function countDs(operands, symbols) {
  const { count } = parseDs(operands);
  return evalExpr(count, symbols);
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
  const lines = source.split(`
`);
  const symbols = new Map;
  let pc = 0;
  let ended = false;
  for (let idx = 0;idx < lines.length && !ended; idx++) {
    const line = lines[idx];
    try {
      for (const stmt of splitStatements(line)) {
        const parts = parseLine(stmt);
        if (parts.label) {
          if (parts.isEqu) {
            symbols.set(parts.label.toUpperCase(), evalExpr(parts.operands[0], symbols));
            continue;
          }
          symbols.set(parts.label.toUpperCase(), pc);
        }
        if (!parts.mnemonic)
          continue;
        const m = parts.mnemonic.toUpperCase();
        if (m === "EQU")
          continue;
        if (m === "ORG") {
          pc = evalExpr(parts.operands[0], symbols);
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
          pc += countDs(parts.operands, symbols);
          continue;
        }
        pc += instrSize(m);
      }
    } catch (e) {
      if (e instanceof AsmError)
        throw e;
      throw new AsmError(e.message, idx + 1, line, firstNonSpaceCol(line));
    }
  }
  const sections = [];
  let current = null;
  const sectionNames = new Set;
  let endedPass2 = false;
  for (let idx = 0;idx < lines.length && !endedPass2; idx++) {
    const line = lines[idx];
    try {
      for (const stmt of splitStatements(line)) {
        const parts = parseLine(stmt);
        if (parts.isEqu || !parts.mnemonic)
          continue;
        const m = parts.mnemonic.toUpperCase();
        if (m === "EQU")
          continue;
        if (m === "ORG") {
          if (current && current.data.length) {
            current.end = current.start + current.data.length - 1;
            sections.push(current);
          }
          const addr = evalExpr(parts.operands[0], symbols);
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
        const bytes = m === "DB" ? dbBytes(parts.operands, symbols) : m === "DW" ? dwBytes(parts.operands, symbols) : m === "DS" ? dsBytes(parts.operands, symbols) : encode(m, parts.operands, symbols);
        current.data.push(...bytes);
      }
    } catch (e) {
      if (e instanceof AsmError)
        throw e;
      throw new AsmError(e.message, idx + 1, line, firstNonSpaceCol(line));
    }
  }
  if (current && current.data.length) {
    current.end = current.start + current.data.length - 1;
    sections.push(current);
  }
  return sections;
}
if (false) {}

// src/token.ts
var KEYWORDS = [
  "DECLARE",
  "PROCEDURE",
  "END",
  "IF",
  "THEN",
  "ELSE",
  "DO",
  "WHILE",
  "CASE",
  "CALL",
  "RETURN",
  "GO",
  "TO",
  "GOTO",
  "BYTE",
  "WORD",
  "ADDRESS",
  "LABEL",
  "BASED",
  "AT",
  "DATA",
  "INITIAL",
  "LITERALLY",
  "PUBLIC",
  "EXTERNAL",
  "REENTRANT",
  "INTERRUPT",
  "AND",
  "OR",
  "XOR",
  "NOT",
  "MOD",
  "PLUS",
  "MINUS",
  "EQ",
  "LT",
  "GT",
  "LE",
  "GE",
  "NE",
  "HIGH",
  "LOW",
  "STRUCTURE",
  "HALT",
  "ENABLE",
  "DISABLE",
  "REGS",
  "BY",
  "SHR",
  "SHL",
  "ROR",
  "ROL"
];

// src/lexer.ts
var KEYWORD_SET = new Set(KEYWORDS);
function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const here = () => ({ line, col, offset: i });
  const advance = (n = 1) => {
    for (let k = 0;k < n; k++) {
      if (source[i] === `
`) {
        line++;
        col = 1;
      } else
        col++;
      i++;
    }
  };
  while (i < source.length) {
    const c = source[i];
    if (c === " " || c === "\t" || c === "\r" || c === `
`) {
      advance();
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      advance(2);
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/"))
        advance();
      if (i < source.length)
        advance(2);
      continue;
    }
    const start = here();
    if (isAlpha(c)) {
      let j = i;
      while (j < source.length && isIdent(source[j]))
        j++;
      const text = source.slice(i, j).toUpperCase();
      advance(j - i);
      if (KEYWORD_SET.has(text)) {
        tokens.push({ kind: "kw", text, keyword: text, pos: start });
      } else {
        tokens.push({ kind: "ident", text, pos: start });
      }
      continue;
    }
    if (isDigit(c)) {
      let j = i;
      while (j < source.length && isHexDigit(source[j]))
        j++;
      let base = 10;
      let digEnd = j;
      let end = j;
      const next = source[j]?.toUpperCase();
      if (next === "H") {
        base = 16;
        end = j + 1;
      } else if (next === "O" || next === "Q") {
        base = 8;
        end = j + 1;
      } else {
        const last = source[j - 1].toUpperCase();
        if (last === "B") {
          base = 2;
          digEnd = j - 1;
        } else if (last === "D") {
          base = 10;
          digEnd = j - 1;
        }
      }
      const digits = source.slice(i, digEnd);
      const value = parseInt(digits, base);
      const text = source.slice(i, end);
      advance(end - i);
      tokens.push({ kind: "number", text, value, pos: start });
      continue;
    }
    if (c === "'") {
      advance();
      let text = "";
      while (i < source.length) {
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            text += "'";
            advance(2);
            continue;
          }
          advance();
          break;
        }
        text += source[i];
        advance();
      }
      tokens.push({ kind: "string", text, pos: start });
      continue;
    }
    const two = source.slice(i, i + 2);
    if (two === ":=" || two === "<>" || two === "<=" || two === ">=") {
      advance(2);
      tokens.push({ kind: "punct", text: two, pos: start });
      continue;
    }
    advance();
    tokens.push({ kind: "punct", text: c, pos: start });
  }
  tokens.push({ kind: "eof", text: "", pos: here() });
  return tokens;
}
function isAlpha(c) {
  return c >= "A" && c <= "Z" || c >= "a" && c <= "z" || c === "$" || c === "_";
}
function isDigit(c) {
  return c >= "0" && c <= "9";
}
function isHexDigit(c) {
  return isDigit(c) || c >= "A" && c <= "F" || c >= "a" && c <= "f";
}
function isIdent(c) {
  return isAlpha(c) || isDigit(c);
}

// src/preprocess.ts
function preprocess(tokens) {
  const macros = new Map;
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    if (isLiterallyDecl(tokens, i)) {
      const name = tokens[i + 1].text;
      const body = tokens[i + 3].text;
      const bodyTokens = tokenize(body);
      bodyTokens.pop();
      macros.set(name, bodyTokens);
      i += 5;
      continue;
    }
    for (const et of expand(tokens[i], macros, new Set))
      out.push(et);
    i++;
  }
  return out;
}
function isLiterallyDecl(tokens, i) {
  return tokens[i]?.kind === "kw" && tokens[i].keyword === "DECLARE" && tokens[i + 1]?.kind === "ident" && tokens[i + 2]?.kind === "kw" && tokens[i + 2].keyword === "LITERALLY" && tokens[i + 3]?.kind === "string" && tokens[i + 4]?.kind === "punct" && tokens[i + 4].text === ";";
}
function expand(tok, macros, seen) {
  if (tok.kind !== "ident" || !macros.has(tok.text) || seen.has(tok.text)) {
    return [tok];
  }
  const body = macros.get(tok.text);
  const next = new Set(seen);
  next.add(tok.text);
  const result = [];
  for (const bt of body) {
    for (const et of expand(bt, macros, next))
      result.push(et);
  }
  return result;
}

// src/parser.ts
class ParseError extends Error {
  pos;
  constructor(message, pos) {
    super(`${pos.line}:${pos.col}: ${message}`);
    this.pos = pos;
  }
}
function parse2(tokens) {
  const p = new Parser(tokens);
  return p.program();
}

class Parser {
  toks;
  i = 0;
  constructor(toks) {
    this.toks = toks;
  }
  peek(offset = 0) {
    return this.toks[this.i + offset] ?? this.toks[this.toks.length - 1];
  }
  at() {
    return this.peek();
  }
  eof() {
    return this.at().kind === "eof";
  }
  isKw(kw, offset = 0) {
    const t = this.peek(offset);
    return t.kind === "kw" && t.keyword === kw;
  }
  isPunct(s, offset = 0) {
    const t = this.peek(offset);
    return t.kind === "punct" && t.text === s;
  }
  eatKw(kw) {
    const t = this.at();
    if (!this.isKw(kw))
      throw new ParseError(`expected ${kw}, got '${t.text}'`, t.pos);
    this.i++;
    return t;
  }
  eatPunct(s) {
    const t = this.at();
    if (!this.isPunct(s))
      throw new ParseError(`expected '${s}', got '${t.text}'`, t.pos);
    this.i++;
    return t;
  }
  eatIdent() {
    const t = this.at();
    if (t.kind !== "ident")
      throw new ParseError(`expected identifier, got '${t.text}'`, t.pos);
    this.i++;
    return t;
  }
  program() {
    const pos = this.at().pos;
    const items = [];
    while (!this.eof()) {
      this.collectItem(items);
    }
    return { kind: "program", items, pos };
  }
  collectItem(out) {
    if (this.isKw("DECLARE")) {
      this.declarations(out);
      return;
    }
    if (this.peek().kind === "ident" && this.isPunct(":", 1) && this.isKw("PROCEDURE", 2)) {
      out.push(this.procedure());
      return;
    }
    out.push(this.statement());
  }
  procedure() {
    const nameTok = this.eatIdent();
    this.eatPunct(":");
    const procKw = this.eatKw("PROCEDURE");
    const params = [];
    if (this.isPunct("(")) {
      this.eatPunct("(");
      if (!this.isPunct(")")) {
        params.push(this.eatIdent().text);
        while (this.isPunct(",")) {
          this.eatPunct(",");
          params.push(this.eatIdent().text);
        }
      }
      this.eatPunct(")");
    }
    let returnType;
    if (this.isKw("BYTE")) {
      this.eatKw("BYTE");
      returnType = "byte";
    } else if (this.isKw("WORD")) {
      this.eatKw("WORD");
      returnType = "word";
    } else if (this.isKw("ADDRESS")) {
      this.eatKw("ADDRESS");
      returnType = "address";
    }
    let at;
    let regs;
    while (this.isKw("AT") || this.isKw("REGS")) {
      if (this.isKw("AT")) {
        if (at !== undefined)
          throw new ParseError(`duplicate AT`, this.at().pos);
        this.eatKw("AT");
        at = this.parseAtAddress(procKw.pos);
      } else {
        if (regs !== undefined)
          throw new ParseError(`duplicate REGS`, this.at().pos);
        this.eatKw("REGS");
        regs = this.parseRegList(procKw.pos);
      }
    }
    this.eatPunct(";");
    const body = [];
    while (!this.isKw("END")) {
      if (this.eof())
        throw new ParseError(`unterminated PROCEDURE ${nameTok.text}`, procKw.pos);
      this.collectItem(body);
    }
    this.eatKw("END");
    if (this.peek().kind === "ident") {
      const endName = this.eatIdent();
      if (endName.text !== nameTok.text) {
        throw new ParseError(`END ${endName.text} does not match PROCEDURE ${nameTok.text}`, endName.pos);
      }
    }
    this.eatPunct(";");
    if (at !== undefined) {
      for (const item of body) {
        if (item.kind !== "decl") {
          throw new ParseError(`PROCEDURE ${nameTok.text} AT(...) must have no statements; body may only DECLARE its parameters`, item.pos);
        }
      }
    }
    if (regs !== undefined && at === undefined) {
      throw new ParseError(`REGS requires AT(...) on procedure ${nameTok.text}`, nameTok.pos);
    }
    if (regs !== undefined && regs.length !== params.length) {
      throw new ParseError(`REGS has ${regs.length} registers but procedure ${nameTok.text} has ${params.length} parameters`, nameTok.pos);
    }
    const proc = {
      kind: "proc",
      name: nameTok.text,
      params,
      body,
      pos: nameTok.pos
    };
    if (returnType)
      proc.returnType = returnType;
    if (at !== undefined)
      proc.at = at;
    if (regs !== undefined)
      proc.regs = regs;
    return proc;
  }
  declarations(out) {
    const kw = this.eatKw("DECLARE");
    const names = [];
    if (this.isPunct("(")) {
      this.eatPunct("(");
      const first = this.eatIdent();
      names.push({ name: first.text, pos: first.pos });
      while (this.isPunct(",")) {
        this.eatPunct(",");
        const nx = this.eatIdent();
        names.push({ name: nx.text, pos: nx.pos });
      }
      this.eatPunct(")");
    } else {
      const first = this.eatIdent();
      names.push({ name: first.text, pos: first.pos });
    }
    const type = this.typeSpec();
    let initial;
    let at;
    if (this.isKw("AT")) {
      this.eatKw("AT");
      at = this.parseAtAddress(kw.pos);
      if (names.length > 1) {
        throw new ParseError(`AT not allowed with multi-name DECLARE; declare names separately`, kw.pos);
      }
    }
    if (this.isKw("INITIAL")) {
      if (at !== undefined)
        throw new ParseError(`INITIAL cannot combine with AT`, kw.pos);
      this.eatKw("INITIAL");
      this.eatPunct("(");
      initial = [this.expression()];
      while (this.isPunct(",")) {
        this.eatPunct(",");
        initial.push(this.expression());
      }
      this.eatPunct(")");
      if (names.length > 1) {
        throw new ParseError(`INITIAL not allowed with multi-name DECLARE; declare names separately`, kw.pos);
      }
    }
    this.eatPunct(";");
    for (const n of names) {
      const base = { kind: "decl", name: n.name, type, pos: n.pos };
      if (initial)
        base.initial = initial;
      if (at !== undefined)
        base.at = at;
      out.push(base);
    }
  }
  isBuiltin(name) {
    return name === "LOW" || name === "HIGH" || name === "SHR" || name === "SHL" || name === "ROR" || name === "ROL";
  }
  parseRegList(errPos) {
    this.eatPunct("(");
    const regs = [];
    regs.push(this.parseReg(errPos));
    while (this.isPunct(",")) {
      this.eatPunct(",");
      regs.push(this.parseReg(errPos));
    }
    this.eatPunct(")");
    return regs;
  }
  parseReg(errPos) {
    const t = this.at();
    if (t.kind !== "ident")
      throw new ParseError(`expected register name`, t.pos);
    const name = t.text;
    const valid = ["A", "B", "C", "D", "E", "H", "L", "BC", "DE", "HL"];
    if (!valid.includes(name))
      throw new ParseError(`'${name}' is not a valid register`, t.pos);
    this.i++;
    return name;
  }
  parseAtAddress(errPos) {
    let hadParen = false;
    if (this.isPunct("(")) {
      this.eatPunct("(");
      hadParen = true;
    }
    const t = this.at();
    if (t.kind !== "number")
      throw new ParseError(`AT address must be a numeric literal`, t.pos);
    this.i++;
    if (hadParen)
      this.eatPunct(")");
    if (t.value === undefined)
      throw new ParseError(`AT address missing value`, errPos);
    return t.value;
  }
  typeSpec() {
    let element;
    if (this.isKw("BYTE")) {
      this.eatKw("BYTE");
      element = "byte";
    } else if (this.isKw("WORD")) {
      this.eatKw("WORD");
      element = "word";
    } else if (this.isKw("ADDRESS")) {
      this.eatKw("ADDRESS");
      element = "address";
    } else {
      const t = this.at();
      throw new ParseError(`expected BYTE/WORD/ADDRESS, got '${t.text}'`, t.pos);
    }
    if (this.isPunct("(")) {
      this.eatPunct("(");
      const size = this.at();
      if (size.kind !== "number")
        throw new ParseError(`array size must be a numeric literal`, size.pos);
      this.i++;
      this.eatPunct(")");
      return { kind: "array", element, size: size.value };
    }
    return { kind: element };
  }
  statement() {
    const t = this.at();
    if (t.kind === "ident" && this.isPunct(":", 1) && !this.isKw("PROCEDURE", 2)) {
      this.i++;
      this.eatPunct(":");
      return { kind: "label", name: t.text, pos: t.pos };
    }
    if (this.isKw("IF"))
      return this.ifStmt();
    if (this.isKw("DO"))
      return this.doStmt();
    if (this.isKw("CALL"))
      return this.callStmt();
    if (this.isKw("RETURN"))
      return this.returnStmt();
    if (this.isKw("GO") || this.isKw("GOTO"))
      return this.gotoStmt();
    if (this.isPunct(";")) {
      this.i++;
      return { kind: "null", pos: t.pos };
    }
    return this.assignStmt();
  }
  ifStmt() {
    const kw = this.eatKw("IF");
    const cond = this.expression();
    this.eatKw("THEN");
    const then = this.statement();
    let elseS;
    if (this.isKw("ELSE")) {
      this.eatKw("ELSE");
      elseS = this.statement();
    }
    return { kind: "if", cond, then, ...elseS ? { else: elseS } : {}, pos: kw.pos };
  }
  doStmt() {
    const kw = this.eatKw("DO");
    if (this.isKw("WHILE")) {
      this.eatKw("WHILE");
      const cond = this.expression();
      this.eatPunct(";");
      const body2 = this.doBody(kw.pos);
      return { kind: "while", cond, body: body2, pos: kw.pos };
    }
    if (this.isKw("CASE")) {
      this.eatKw("CASE");
      const selector = this.expression();
      this.eatPunct(";");
      const cases = [];
      while (!this.isKw("END")) {
        if (this.eof())
          throw new ParseError(`unterminated DO CASE`, kw.pos);
        cases.push(this.statement());
      }
      this.eatKw("END");
      this.eatPunct(";");
      return { kind: "case", selector, cases, pos: kw.pos };
    }
    if (this.peek().kind === "ident" && this.isPunct("=", 1)) {
      const varTok = this.eatIdent();
      this.eatPunct("=");
      const from = this.expression();
      this.eatKw("TO");
      const to = this.expression();
      let step;
      if (this.isKw("BY")) {
        this.eatKw("BY");
        step = this.expression();
      }
      this.eatPunct(";");
      const body2 = this.doBody(kw.pos);
      const s = { kind: "iter", var: varTok.text, from, to, body: body2, pos: kw.pos };
      if (step)
        s.step = step;
      return s;
    }
    this.eatPunct(";");
    const body = this.doBody(kw.pos);
    return { kind: "do", body, pos: kw.pos };
  }
  doBody(startPos) {
    const body = [];
    while (!this.isKw("END")) {
      if (this.eof())
        throw new ParseError(`unterminated DO`, startPos);
      this.collectItem(body);
    }
    this.eatKw("END");
    this.eatPunct(";");
    return body;
  }
  callStmt() {
    const kw = this.eatKw("CALL");
    const name = this.eatIdent();
    const args = [];
    if (this.isPunct("(")) {
      this.eatPunct("(");
      if (!this.isPunct(")")) {
        args.push(this.expression());
        while (this.isPunct(",")) {
          this.eatPunct(",");
          args.push(this.expression());
        }
      }
      this.eatPunct(")");
    }
    this.eatPunct(";");
    return { kind: "call", name: name.text, args, pos: kw.pos };
  }
  returnStmt() {
    const kw = this.eatKw("RETURN");
    let value;
    if (!this.isPunct(";"))
      value = this.expression();
    this.eatPunct(";");
    return { kind: "return", ...value ? { value } : {}, pos: kw.pos };
  }
  gotoStmt() {
    const kw = this.at();
    if (this.isKw("GO")) {
      this.eatKw("GO");
      this.eatKw("TO");
    } else
      this.eatKw("GOTO");
    const label = this.eatIdent();
    this.eatPunct(";");
    return { kind: "goto", label: label.text, pos: kw.pos };
  }
  assignStmt() {
    const first = this.lvalue();
    const targets = [first];
    while (this.isPunct(",")) {
      this.eatPunct(",");
      targets.push(this.lvalue());
    }
    const eq = this.eatPunct("=");
    const value = this.expression();
    this.eatPunct(";");
    return { kind: "assign", targets, value, pos: eq.pos };
  }
  lvalue() {
    const name = this.eatIdent();
    if (this.isPunct("(")) {
      this.eatPunct("(");
      const index = this.expression();
      this.eatPunct(")");
      return { kind: "index", name: name.text, index, pos: name.pos };
    }
    return { kind: "ref", name: name.text, pos: name.pos };
  }
  expression() {
    return this.orExpr();
  }
  orExpr() {
    let lhs = this.andExpr();
    while (this.isKw("OR") || this.isKw("XOR")) {
      const op = this.at().keyword;
      const pos = this.at().pos;
      this.i++;
      const rhs = this.andExpr();
      lhs = { kind: "bin", op, lhs, rhs, pos };
    }
    return lhs;
  }
  andExpr() {
    let lhs = this.notExpr();
    while (this.isKw("AND")) {
      const pos = this.at().pos;
      this.i++;
      const rhs = this.notExpr();
      lhs = { kind: "bin", op: "AND", lhs, rhs, pos };
    }
    return lhs;
  }
  notExpr() {
    if (this.isKw("NOT")) {
      const pos = this.at().pos;
      this.i++;
      const arg = this.notExpr();
      return { kind: "un", op: "NOT", arg, pos };
    }
    return this.relExpr();
  }
  relExpr() {
    const lhs = this.addExpr();
    const relOps = { "=": "=", "<>": "<>", "<": "<", ">": ">", "<=": "<=", ">=": ">=" };
    const t = this.at();
    if (t.kind === "punct" && t.text in relOps) {
      const op = relOps[t.text];
      const pos = t.pos;
      this.i++;
      const rhs = this.addExpr();
      return { kind: "bin", op, lhs, rhs, pos };
    }
    return lhs;
  }
  addExpr() {
    let lhs = this.mulExpr();
    while (this.isPunct("+") || this.isPunct("-")) {
      const op = this.at().text;
      const pos = this.at().pos;
      this.i++;
      const rhs = this.mulExpr();
      lhs = { kind: "bin", op, lhs, rhs, pos };
    }
    return lhs;
  }
  mulExpr() {
    let lhs = this.unaryExpr();
    while (this.isPunct("*") || this.isPunct("/") || this.isKw("MOD")) {
      const op = this.isKw("MOD") ? "MOD" : this.at().text;
      const pos = this.at().pos;
      this.i++;
      const rhs = this.unaryExpr();
      lhs = { kind: "bin", op, lhs, rhs, pos };
    }
    return lhs;
  }
  unaryExpr() {
    if (this.isPunct("-")) {
      const pos = this.at().pos;
      this.i++;
      const arg = this.unaryExpr();
      return { kind: "un", op: "-", arg, pos };
    }
    if (this.isPunct("+")) {
      const pos = this.at().pos;
      this.i++;
      const arg = this.unaryExpr();
      return { kind: "un", op: "+", arg, pos };
    }
    return this.primary();
  }
  primary() {
    const t = this.at();
    if (t.kind === "number") {
      this.i++;
      return { kind: "num", value: t.value, pos: t.pos };
    }
    if (t.kind === "string") {
      this.i++;
      return { kind: "str", value: t.text, pos: t.pos };
    }
    if (this.isPunct(".")) {
      const dot = this.at();
      this.eatPunct(".");
      const id = this.eatIdent();
      return { kind: "addrOf", name: id.text, pos: dot.pos };
    }
    if (t.kind === "kw" && this.isBuiltin(t.text)) {
      const name = t.text;
      const pos = t.pos;
      this.i++;
      this.eatPunct("(");
      const args = [this.expression()];
      while (this.isPunct(",")) {
        this.eatPunct(",");
        args.push(this.expression());
      }
      this.eatPunct(")");
      return { kind: "builtin", name, args, pos };
    }
    if (this.isPunct("(")) {
      this.eatPunct("(");
      const e = this.expression();
      this.eatPunct(")");
      return e;
    }
    if (t.kind === "ident") {
      this.i++;
      if (this.isPunct("(")) {
        this.eatPunct("(");
        const args = [];
        if (!this.isPunct(")")) {
          args.push(this.expression());
          while (this.isPunct(",")) {
            this.eatPunct(",");
            args.push(this.expression());
          }
        }
        this.eatPunct(")");
        return { kind: "call", name: t.text, args, pos: t.pos };
      }
      return { kind: "ref", name: t.text, pos: t.pos };
    }
    throw new ParseError(`unexpected '${t.text}'`, t.pos);
  }
}

// src/sema.ts
class Scope {
  parent;
  kind;
  table = new Map;
  constructor(parent, kind) {
    this.parent = parent;
    this.kind = kind;
  }
  define(name, sym) {
    const existing = this.table.get(name);
    if (existing)
      return existing;
    this.table.set(name, sym);
    return null;
  }
  lookupLocal(name) {
    return this.table.get(name);
  }
  lookup(name) {
    return this.table.get(name) ?? this.parent?.lookup(name);
  }
}

class SemaError extends Error {
  pos;
  constructor(message, pos) {
    super(`${pos.line}:${pos.col}: ${message}`);
    this.pos = pos;
  }
}
function analyze(program) {
  const res = {
    global: new Scope(null, "global"),
    scopeOf: new Map,
    symOf: new Map,
    typeOf: new Map,
    sigOf: new Map
  };
  const a = new Analyzer(res);
  a.program(program);
  return res;
}

class Analyzer {
  res;
  constructor(res) {
    this.res = res;
  }
  program(p) {
    this.hoistDecls(p.items, this.res.global, "global");
    for (const item of p.items)
      this.walkItem(item, this.res.global);
  }
  hoistDecls(items, scope, storage) {
    for (const item of items) {
      if (item.kind === "decl") {
        this.defineVar(item, scope, item.at !== undefined ? "absolute" : storage);
      } else if (item.kind === "proc")
        this.defineProc(item, scope);
      else if (item.kind === "label")
        this.defineLabel(item.name, item.pos, scope);
    }
  }
  defineVar(d, scope, storage, proc) {
    const sym = proc ? { kind: "var", decl: d, storage, proc } : { kind: "var", decl: d, storage };
    const prev = scope.define(d.name, sym);
    if (prev)
      throw new SemaError(`duplicate declaration of '${d.name}'`, d.pos);
  }
  defineLabel(name, pos, scope) {
    const existing = scope.lookupLocal(name);
    if (existing && existing.kind !== "label") {
      throw new SemaError(`label '${name}' conflicts with existing declaration`, pos);
    }
    if (!existing)
      scope.define(name, { kind: "label", name, pos });
  }
  defineProc(proc, parent) {
    const procScope = new Scope(parent, "proc");
    this.res.scopeOf.set(proc, procScope);
    const paramKinds = new Array(proc.params.length).fill(undefined);
    for (const item of proc.body) {
      if (item.kind !== "decl")
        continue;
      const idx = proc.params.indexOf(item.name);
      if (idx >= 0) {
        const k = scalarOf(item.type, item.pos, true);
        paramKinds[idx] = k;
      }
    }
    for (let i = 0;i < proc.params.length; i++) {
      const k = paramKinds[i];
      if (!k)
        throw new SemaError(`parameter '${proc.params[i]}' has no DECLARE in body of '${proc.name}'`, proc.pos);
    }
    for (const item of proc.body) {
      if (item.kind !== "decl")
        continue;
      const idx = proc.params.indexOf(item.name);
      if (idx >= 0) {
        const prev2 = procScope.define(item.name, {
          kind: "param",
          decl: item,
          index: idx,
          proc
        });
        if (prev2)
          throw new SemaError(`duplicate parameter '${item.name}'`, item.pos);
      } else {
        this.defineVar(item, procScope, "local", proc);
      }
    }
    for (const item of proc.body) {
      if (item.kind === "label")
        this.defineLabel(item.name, item.pos, procScope);
      else if (item.kind === "proc") {
        throw new SemaError(`nested procedures not supported in v0`, item.pos);
      }
    }
    const sig = proc.returnType ? { params: paramKinds, return: proc.returnType } : { params: paramKinds };
    this.res.sigOf.set(proc, sig);
    if (proc.regs) {
      const wordRegs = new Set(["BC", "DE", "HL"]);
      const byteRegs = new Set(["A", "B", "C", "D", "E", "H", "L"]);
      const seen = new Set;
      for (let i = 0;i < proc.regs.length; i++) {
        const r = proc.regs[i];
        if (seen.has(r))
          throw new SemaError(`duplicate register '${r}' in REGS for '${proc.name}'`, proc.pos);
        seen.add(r);
        const pk = paramKinds[i];
        if (pk === "byte") {
          if (!byteRegs.has(r))
            throw new SemaError(`register '${r}' is not valid for BYTE parameter '${proc.params[i]}'`, proc.pos);
        } else {
          if (!wordRegs.has(r))
            throw new SemaError(`register '${r}' is not valid for WORD/ADDRESS parameter '${proc.params[i]}'`, proc.pos);
        }
      }
    }
    const prev = parent.define(proc.name, { kind: "proc", proc, sig });
    if (prev)
      throw new SemaError(`duplicate declaration of '${proc.name}'`, proc.pos);
  }
  walkItem(item, scope) {
    if (item.kind === "decl") {
      if (item.initial) {
        for (const e of item.initial)
          this.typeExpr(e, scope);
      }
      return;
    }
    if (item.kind === "proc") {
      const inner = this.res.scopeOf.get(item);
      if (!inner)
        throw new Error("internal: proc scope missing");
      for (const bodyItem of item.body) {
        if (bodyItem.kind === "decl") {
          if (bodyItem.initial) {
            for (const e of bodyItem.initial)
              this.typeExpr(e, inner);
          }
          continue;
        }
        this.walkStmt(bodyItem, inner, item);
      }
      return;
    }
    this.walkStmt(item, scope, null);
  }
  walkStmt(s, scope, enclosingProc) {
    switch (s.kind) {
      case "null":
      case "label":
        return;
      case "assign":
        this.checkAssign(s, scope);
        return;
      case "if":
        this.typeExpr(s.cond, scope);
        this.walkStmt(s.then, scope, enclosingProc);
        if (s.else)
          this.walkStmt(s.else, scope, enclosingProc);
        return;
      case "do":
      case "while":
        if (s.kind === "while")
          this.typeExpr(s.cond, scope);
        for (const it of s.body) {
          if (it.kind === "decl")
            continue;
          if (it.kind === "proc")
            throw new SemaError("nested procedures not supported in v0", it.pos);
          this.walkStmt(it, scope, enclosingProc);
        }
        return;
      case "iter": {
        const sym = scope.lookup(s.var);
        if (!sym)
          throw new SemaError(`undefined loop variable '${s.var}'`, s.pos);
        if (sym.kind !== "var" && sym.kind !== "param") {
          throw new SemaError(`'${s.var}' is not assignable`, s.pos);
        }
        if (sym.decl.type.kind === "array") {
          throw new SemaError(`loop variable '${s.var}' must be scalar`, s.pos);
        }
        this.typeExpr(s.from, scope);
        this.typeExpr(s.to, scope);
        if (s.step)
          this.typeExpr(s.step, scope);
        for (const it of s.body) {
          if (it.kind === "decl")
            continue;
          if (it.kind === "proc")
            throw new SemaError("nested procedures not supported in v0", it.pos);
          this.walkStmt(it, scope, enclosingProc);
        }
        return;
      }
      case "case":
        this.typeExpr(s.selector, scope);
        for (const c of s.cases)
          this.walkStmt(c, scope, enclosingProc);
        return;
      case "call": {
        const sym = scope.lookup(s.name);
        if (!sym)
          throw new SemaError(`undefined procedure '${s.name}'`, s.pos);
        if (sym.kind !== "proc")
          throw new SemaError(`'${s.name}' is not a procedure`, s.pos);
        if (sym.sig.params.length !== s.args.length) {
          throw new SemaError(`procedure '${s.name}' expects ${sym.sig.params.length} args, got ${s.args.length}`, s.pos);
        }
        for (const a of s.args)
          this.typeExpr(a, scope);
        return;
      }
      case "return":
        if (!enclosingProc) {
          if (s.value)
            throw new SemaError(`RETURN with value outside procedure`, s.pos);
          return;
        }
        if (s.value) {
          this.typeExpr(s.value, scope);
          if (!enclosingProc.returnType) {
            throw new SemaError(`procedure '${enclosingProc.name}' is typeless; RETURN must not have a value`, s.pos);
          }
        } else if (enclosingProc.returnType) {
          throw new SemaError(`procedure '${enclosingProc.name}' returns ${enclosingProc.returnType}; RETURN needs a value`, s.pos);
        }
        return;
      case "goto": {
        const sym = scope.lookup(s.label);
        if (!sym || sym.kind !== "label") {
          throw new SemaError(`undefined label '${s.label}'`, s.pos);
        }
        return;
      }
    }
  }
  checkAssign(s, scope) {
    for (const t of s.targets) {
      const sym = scope.lookup(t.name);
      if (!sym)
        throw new SemaError(`undefined variable '${t.name}'`, t.pos);
      if (sym.kind === "proc")
        throw new SemaError(`cannot assign to procedure '${t.name}'`, t.pos);
      if (sym.kind === "label")
        throw new SemaError(`cannot assign to label '${t.name}'`, t.pos);
      this.res.symOf.set(t, sym);
      if (t.kind === "index") {
        if (sym.decl.type.kind !== "array") {
          throw new SemaError(`'${t.name}' is not an array`, t.pos);
        }
        this.typeExpr(t.index, scope);
      } else {
        if (sym.decl.type.kind === "array") {
          throw new SemaError(`cannot assign to whole array '${t.name}'`, t.pos);
        }
      }
    }
    this.typeExpr(s.value, scope);
  }
  typeExpr(e, scope) {
    const cached = this.res.typeOf.get(e);
    if (cached)
      return cached;
    const t = this.computeType(e, scope);
    this.res.typeOf.set(e, t);
    return t;
  }
  computeType(e, scope) {
    switch (e.kind) {
      case "num":
        return e.value > 255 ? { kind: "word" } : { kind: "byte" };
      case "str":
        return { kind: "string", length: e.value.length };
      case "ref": {
        const sym = scope.lookup(e.name);
        if (!sym)
          throw new SemaError(`undefined identifier '${e.name}'`, e.pos);
        this.res.symOf.set(e, sym);
        if (sym.kind === "label")
          throw new SemaError(`label '${e.name}' used as value`, e.pos);
        if (sym.kind === "proc") {
          if (sym.sig.params.length !== 0) {
            throw new SemaError(`procedure '${e.name}' expects arguments`, e.pos);
          }
          if (!sym.sig.return)
            throw new SemaError(`typeless procedure '${e.name}' has no value`, e.pos);
          return { kind: sym.sig.return };
        }
        return toResolved(sym.decl.type);
      }
      case "index": {
        const sym = scope.lookup(e.name);
        if (!sym)
          throw new SemaError(`undefined identifier '${e.name}'`, e.pos);
        if (sym.kind !== "var" && sym.kind !== "param") {
          throw new SemaError(`'${e.name}' is not indexable`, e.pos);
        }
        this.res.symOf.set(e, sym);
        if (sym.decl.type.kind !== "array")
          throw new SemaError(`'${e.name}' is not an array`, e.pos);
        this.typeExpr(e.index, scope);
        return { kind: sym.decl.type.element };
      }
      case "call": {
        const sym = scope.lookup(e.name);
        if (!sym)
          throw new SemaError(`undefined identifier '${e.name}'`, e.pos);
        this.res.symOf.set(e, sym);
        if (sym.kind === "var" || sym.kind === "param") {
          if (sym.decl.type.kind !== "array") {
            throw new SemaError(`'${e.name}' is not indexable`, e.pos);
          }
          if (e.args.length !== 1) {
            throw new SemaError(`array '${e.name}' requires a single index`, e.pos);
          }
          this.typeExpr(e.args[0], scope);
          return { kind: sym.decl.type.element };
        }
        if (sym.kind !== "proc") {
          throw new SemaError(`'${e.name}' is not callable`, e.pos);
        }
        if (sym.sig.params.length !== e.args.length) {
          throw new SemaError(`procedure '${e.name}' expects ${sym.sig.params.length} args, got ${e.args.length}`, e.pos);
        }
        for (const a of e.args)
          this.typeExpr(a, scope);
        if (!sym.sig.return)
          throw new SemaError(`typeless procedure '${e.name}' has no value`, e.pos);
        return { kind: sym.sig.return };
      }
      case "builtin": {
        for (const a of e.args)
          this.typeExpr(a, scope);
        switch (e.name) {
          case "LOW":
          case "HIGH":
            if (e.args.length !== 1)
              throw new SemaError(`${e.name} takes 1 argument`, e.pos);
            return { kind: "byte" };
          case "SHR":
          case "SHL":
          case "ROR":
          case "ROL": {
            if (e.args.length !== 2)
              throw new SemaError(`${e.name} takes 2 arguments`, e.pos);
            const valT = this.res.typeOf.get(e.args[0]);
            return valT?.kind === "word" || valT?.kind === "address" ? { kind: "word" } : { kind: "byte" };
          }
        }
      }
      case "addrOf": {
        const sym = scope.lookup(e.name);
        if (!sym)
          throw new SemaError(`undefined identifier '${e.name}'`, e.pos);
        this.res.symOf.set(e, sym);
        if (sym.kind !== "var" && sym.kind !== "param" && sym.kind !== "proc") {
          throw new SemaError(`cannot take address of '${e.name}'`, e.pos);
        }
        return { kind: "address" };
      }
      case "un":
        return this.typeExpr(e.arg, scope);
      case "bin": {
        const lt = this.typeExpr(e.lhs, scope);
        const rt = this.typeExpr(e.rhs, scope);
        switch (e.op) {
          case "=":
          case "<>":
          case "<":
          case ">":
          case "<=":
          case ">=":
            return { kind: "byte" };
          default:
            return promote(lt, rt, e.pos);
        }
      }
    }
  }
}
function scalarOf(t, pos, allowScalarOnly) {
  if (t.kind === "array") {
    if (allowScalarOnly)
      throw new SemaError(`array not allowed here`, pos);
    return t.element;
  }
  return t.kind;
}
function toResolved(t) {
  if (t.kind === "array")
    return { kind: "array", element: t.element, size: t.size };
  return { kind: t.kind };
}
function promote(l, r, pos) {
  const lk = scalarKindOf(l, pos);
  const rk = scalarKindOf(r, pos);
  if (lk === "word" || rk === "word")
    return { kind: "word" };
  if (lk === "address" || rk === "address")
    return { kind: "address" };
  return { kind: "byte" };
}
function scalarKindOf(t, pos) {
  if (t.kind === "byte" || t.kind === "word" || t.kind === "address")
    return t.kind;
  throw new SemaError(`expected scalar, got ${t.kind}`, pos);
}

// src/runtime.ts
var RUNTIME = {
  rt_mul8: `rt_mul8:
    mov  c, a
    mvi  a, 0
    mvi  d, 8
rt_mul8_loop:
    add  a
    mov  e, a
    mov  a, c
    add  a
    mov  c, a
    mov  a, e
    jnc  rt_mul8_skip
    add  b
rt_mul8_skip:
    dcr  d
    jnz  rt_mul8_loop
    ret`,
  rt_div8: `rt_div8:
    mvi  c, 0
rt_div8_loop:
    sub  b
    jc   rt_div8_done
    inr  c
    jmp  rt_div8_loop
rt_div8_done:
    mov  a, c
    ret`,
  rt_mod8: `rt_mod8:
    sub  b
    jnc  rt_mod8
    add  b
    ret`,
  rt_mul16: `rt_mul16:
    mov  b, h
    mov  c, l
    lxi  h, 0
    mvi  a, 16
rt_mul16_loop:
    push psw
    dad  h
    ora  a
    mov  a, c
    ral
    mov  c, a
    mov  a, b
    ral
    mov  b, a
    jnc  rt_mul16_skip
    dad  d
rt_mul16_skip:
    pop  psw
    dcr  a
    jnz  rt_mul16_loop
    ret`,
  rt_div16: `rt_div16:
    lxi  b, 0
rt_div16_loop:
    mov  a, l
    sub  e
    mov  l, a
    mov  a, h
    sbb  d
    mov  h, a
    jc   rt_div16_done
    inx  b
    jmp  rt_div16_loop
rt_div16_done:
    mov  h, b
    mov  l, c
    ret`,
  rt_mod16: `rt_mod16:
    mov  a, l
    sub  e
    mov  l, a
    mov  a, h
    sbb  d
    mov  h, a
    jnc  rt_mod16
    dad  d
    ret`
};

// src/codegen.ts
class CodegenError extends Error {
  pos;
  constructor(message, pos) {
    super(`${pos.line}:${pos.col}: ${message}`);
    this.pos = pos;
  }
}
function generate(program, res, opts = {}) {
  const cg = new Codegen(program, res, opts);
  return cg.run();
}

class Codegen {
  program;
  res;
  opts;
  out = [];
  labelCounter = 0;
  procs = [];
  topDecls = [];
  currentProc = null;
  usedRuntime = new Set;
  constructor(program, res, opts) {
    this.program = program;
    this.res = res;
    this.opts = opts;
  }
  run() {
    const origin = this.opts.origin ?? 256;
    this.line(`; generated by plm-80`);
    this.emitAbsoluteEqus();
    this.line(`    org  ${hex16(origin)}`);
    this.line(`start:`);
    if (this.opts.stack !== undefined)
      this.line(`    lxi  sp, ${hex16(this.opts.stack)}`);
    for (const item of this.program.items) {
      if (item.kind === "decl")
        this.topDecls.push(item);
      else if (item.kind === "proc")
        this.procs.push(item);
      else
        this.emitStmt(item);
    }
    this.line(`    hlt`);
    for (const proc of this.procs) {
      if (proc.at !== undefined)
        continue;
      this.blank();
      this.emitProc(proc);
    }
    for (const name of this.usedRuntime) {
      this.blank();
      const body = RUNTIME[name];
      if (!body)
        throw new Error(`internal: unknown runtime helper '${name}'`);
      for (const line of body.split(`
`))
        this.line(line);
    }
    this.blank();
    this.emitData();
    this.line(`    end`);
    return this.out.join(`
`) + `
`;
  }
  emitAbsoluteEqus() {
    const equs = [];
    for (const item of this.program.items) {
      if (item.kind === "decl" && item.at !== undefined) {
        equs.push({ label: dataLabel(item.name), addr: item.at });
      } else if (item.kind === "proc" && item.at !== undefined) {
        equs.push({ label: procLabel(item.name), addr: item.at });
      }
    }
    if (equs.length === 0)
      return;
    for (const e of equs)
      this.line(`${e.label} equ ${hex16(e.addr)}`);
    this.blank();
  }
  emitProc(proc) {
    this.currentProc = proc;
    this.line(`${procLabel(proc.name)}:`);
    for (const item of proc.body) {
      if (item.kind === "decl" || item.kind === "proc")
        continue;
      this.emitStmt(item);
    }
    if (!this.lastLineIsRet())
      this.line(`    ret`);
    this.currentProc = null;
  }
  lastLineIsRet() {
    for (let i = this.out.length - 1;i >= 0; i--) {
      const s = this.out[i].trim();
      if (s === "")
        continue;
      return s === "ret";
    }
    return false;
  }
  emitData() {
    this.line(`; --- data ---`);
    const seen = new Set;
    const emitDecl = (d, labelName) => {
      if (seen.has(labelName))
        return;
      seen.add(labelName);
      if (d.at !== undefined)
        return;
      const t = d.type;
      if (t.kind === "byte") {
        if (d.initial) {
          this.line(`${labelName}: db ${this.constByte(d.initial[0], d.pos)}`);
        } else {
          this.line(`${labelName}: ds 1`);
        }
      } else if (t.kind === "word" || t.kind === "address") {
        if (d.initial) {
          this.line(`${labelName}: dw ${this.constWord(d.initial[0], d.pos)}`);
        } else {
          this.line(`${labelName}: ds 2`);
        }
      } else {
        const unit = t.element === "byte" ? 1 : 2;
        if (d.initial) {
          if (unit === 1) {
            const parts = [];
            let used = 0;
            for (const e of d.initial) {
              if (e.kind === "str") {
                if (e.value.includes('"')) {
                  throw new CodegenError(`string INITIAL containing '"' is not yet supported`, e.pos);
                }
                parts.push(`"${e.value}"`);
                used += e.value.length;
              } else {
                parts.push(this.constByte(e, d.pos));
                used += 1;
              }
            }
            this.line(`${labelName}: db ${parts.join(", ")}`);
            const pad = t.size - used;
            if (pad > 0)
              this.line(`    ds ${pad}`);
          } else {
            const parts = d.initial.map((e) => this.constWord(e, d.pos));
            this.line(`${labelName}: dw ${parts.join(", ")}`);
            const pad = t.size - d.initial.length;
            if (pad > 0)
              this.line(`    ds ${pad * 2}`);
          }
        } else {
          this.line(`${labelName}: ds ${t.size * unit}`);
        }
      }
    };
    for (const d of this.topDecls)
      emitDecl(d, dataLabel(d.name));
    for (const proc of this.procs) {
      if (proc.regs)
        continue;
      for (const item of proc.body) {
        if (item.kind !== "decl")
          continue;
        emitDecl(item, localLabel(proc.name, item.name));
      }
    }
  }
  constByte(e, where) {
    if (e.kind !== "num")
      throw new CodegenError("INITIAL must be a numeric literal in v0", where);
    if (e.value < 0 || e.value > 255)
      throw new CodegenError(`byte literal out of range: ${e.value}`, e.pos);
    return hex8(e.value);
  }
  constWord(e, where) {
    if (e.kind !== "num")
      throw new CodegenError("INITIAL must be a numeric literal in v0", where);
    if (e.value < 0 || e.value > 65535)
      throw new CodegenError(`word literal out of range: ${e.value}`, e.pos);
    return hex16(e.value);
  }
  emitStmt(s) {
    switch (s.kind) {
      case "null":
        return;
      case "label":
        this.line(`${userLabel(s.name)}:`);
        return;
      case "assign":
        this.emitAssign(s);
        return;
      case "if":
        this.emitIf(s);
        return;
      case "do":
        for (const it of s.body) {
          if (it.kind === "decl" || it.kind === "proc")
            continue;
          this.emitStmt(it);
        }
        return;
      case "while":
        this.emitWhile(s);
        return;
      case "iter":
        this.emitIter(s);
        return;
      case "case":
        this.emitCase(s);
        return;
      case "call":
        this.emitCall(s.name, s.args, s.pos, false);
        return;
      case "return":
        if (s.value)
          this.evalExpr(s.value, this.procReturnType());
        this.line(`    ret`);
        return;
      case "goto":
        this.line(`    jmp  ${userLabel(s.label)}`);
        return;
    }
  }
  emitAssign(s) {
    const vType = this.assignTargetType(s.targets[0]);
    this.evalExpr(s.value, vType);
    for (let i = 0;i < s.targets.length; i++) {
      const t = s.targets[i];
      if (i < s.targets.length - 1) {
        if (vType === "word")
          this.line(`    push h`);
        else
          this.line(`    push psw`);
      }
      this.storeToLValue(t, vType);
      if (i < s.targets.length - 1) {
        if (vType === "word")
          this.line(`    pop  h`);
        else
          this.line(`    pop  psw`);
      }
    }
  }
  assignTargetType(t) {
    const sym = this.res.symOf.get(t);
    if (!sym || sym.kind !== "var" && sym.kind !== "param") {
      throw new CodegenError(`cannot resolve assignment target '${t.name}'`, t.pos);
    }
    const decl = sym.decl;
    const type = t.kind === "index" ? decl.type.kind === "array" ? decl.type.element : decl.type.kind : decl.type.kind;
    if (type === "byte")
      return "byte";
    if (type === "word" || type === "address")
      return "word";
    throw new CodegenError(`unsupported assignment target type '${type}'`, t.pos);
  }
  storeToLValue(t, vType) {
    const sym = this.res.symOf.get(t);
    const label = symLabel(sym);
    if (t.kind === "ref") {
      if (vType === "byte")
        this.line(`    sta  ${label}`);
      else
        this.line(`    shld ${label}`);
      return;
    }
    if (vType === "byte") {
      this.line(`    push psw`);
      this.computeAddr(sym, t.index, 1);
      this.line(`    pop  psw`);
      this.line(`    mov  m, a`);
    } else {
      this.line(`    push h`);
      this.computeAddr(sym, t.index, 2);
      this.line(`    pop  d`);
      this.line(`    mov  m, e`);
      this.line(`    inx  h`);
      this.line(`    mov  m, d`);
    }
  }
  computeAddr(sym, index, unit) {
    if (sym.kind !== "var" && sym.kind !== "param") {
      throw new CodegenError(`'${symName(sym)}' not indexable at runtime`, index.pos);
    }
    if (sym.decl.type.kind !== "array")
      throw new Error("internal: not an array");
    this.evalExpr(index, "word");
    if (unit === 2)
      this.line(`    dad  h`);
    this.line(`    lxi  d, ${symLabel(sym)}`);
    this.line(`    dad  d`);
  }
  emitIf(s) {
    const elseLabel = this.fresh("else");
    const endLabel = this.fresh("endif");
    this.evalExpr(s.cond, "byte");
    this.line(`    ora  a`);
    this.line(`    jz   ${s.else ? elseLabel : endLabel}`);
    this.emitStmt(s.then);
    if (s.else) {
      this.line(`    jmp  ${endLabel}`);
      this.line(`${elseLabel}:`);
      this.emitStmt(s.else);
    }
    this.line(`${endLabel}:`);
  }
  emitIter(s) {
    const varSym = this.currentScope().lookup(s.var);
    if (!varSym || varSym.kind !== "var" && varSym.kind !== "param") {
      throw new CodegenError(`loop variable '${s.var}' not assignable`, s.pos);
    }
    if (varSym.decl.type.kind === "array") {
      throw new CodegenError(`loop variable '${s.var}' must be scalar`, s.pos);
    }
    const width = varSym.decl.type.kind === "byte" ? "byte" : "word";
    const label = symLabel(varSym);
    this.evalExpr(s.from, width);
    if (width === "byte")
      this.line(`    sta  ${label}`);
    else
      this.line(`    shld ${label}`);
    const head = this.fresh("iter");
    const body = this.fresh("iterbody");
    const end = this.fresh("iterend");
    this.line(`${head}:`);
    this.evalExpr(s.to, width);
    if (width === "byte") {
      this.line(`    mov  b, a`);
      this.line(`    lda  ${label}`);
      this.line(`    cmp  b`);
      this.line(`    jc   ${body}`);
      this.line(`    jz   ${body}`);
      this.line(`    jmp  ${end}`);
    } else {
      this.line(`    xchg`);
      this.line(`    lhld ${label}`);
      this.line(`    mov  a, l`);
      this.line(`    sub  e`);
      this.line(`    mov  c, a`);
      this.line(`    mov  a, h`);
      this.line(`    sbb  d`);
      this.line(`    jc   ${body}`);
      this.line(`    ora  c`);
      this.line(`    jz   ${body}`);
      this.line(`    jmp  ${end}`);
    }
    this.line(`${body}:`);
    for (const it of s.body) {
      if (it.kind === "decl" || it.kind === "proc")
        continue;
      this.emitStmt(it);
    }
    if (s.step)
      this.evalExpr(s.step, width);
    else if (width === "byte")
      this.line(`    mvi  a, 01h`);
    else
      this.line(`    lxi  h, 0001h`);
    if (width === "byte") {
      this.line(`    mov  b, a`);
      this.line(`    lda  ${label}`);
      this.line(`    add  b`);
      this.line(`    sta  ${label}`);
    } else {
      this.line(`    xchg`);
      this.line(`    lhld ${label}`);
      this.line(`    dad  d`);
      this.line(`    shld ${label}`);
    }
    this.line(`    jmp  ${head}`);
    this.line(`${end}:`);
  }
  emitCase(s) {
    const end = this.fresh("caseend");
    const table = this.fresh("casetab");
    const labels = s.cases.map((_, i) => `${table}_${i}`);
    this.evalExpr(s.selector, "word");
    this.line(`    dad  h`);
    this.line(`    lxi  d, ${table}`);
    this.line(`    dad  d`);
    this.line(`    mov  a, m`);
    this.line(`    inx  h`);
    this.line(`    mov  h, m`);
    this.line(`    mov  l, a`);
    this.line(`    pchl`);
    for (let i = 0;i < s.cases.length; i++) {
      this.line(`${labels[i]}:`);
      this.emitStmt(s.cases[i]);
      this.line(`    jmp  ${end}`);
    }
    this.line(`${table}:`);
    this.line(`    dw ${labels.join(", ")}`);
    this.line(`${end}:`);
  }
  emitWhile(s) {
    const head = this.fresh("while");
    const end = this.fresh("endw");
    this.line(`${head}:`);
    this.evalExpr(s.cond, "byte");
    this.line(`    ora  a`);
    this.line(`    jz   ${end}`);
    for (const it of s.body) {
      if (it.kind === "decl" || it.kind === "proc")
        continue;
      this.emitStmt(it);
    }
    this.line(`    jmp  ${head}`);
    this.line(`${end}:`);
  }
  emitCall(name, args, pos, asExpr) {
    const sym = this.res.global.lookup(name) ?? this.currentScope()?.lookup(name);
    if (!sym || sym.kind !== "proc") {
      throw new CodegenError(`not a procedure: '${name}'`, pos);
    }
    const proc = sym.proc;
    const regs = proc.regs;
    for (let i = 0;i < args.length; i++) {
      const pType = sym.sig.params[i] === "byte" ? "byte" : "word";
      this.evalExpr(args[i], pType);
      if (regs) {
        this.moveToReg(pType, regs[i], pos);
      } else {
        const paramName = proc.params[i];
        const paramSym = this.res.scopeOf.get(proc).lookupLocal(paramName);
        if (!paramSym || paramSym.kind !== "param" && paramSym.kind !== "var") {
          throw new CodegenError(`cannot resolve param '${paramName}' of '${name}'`, pos);
        }
        const slot = symLabel(paramSym);
        if (pType === "byte")
          this.line(`    sta  ${slot}`);
        else
          this.line(`    shld ${slot}`);
      }
    }
    this.line(`    call ${procLabel(name)}`);
    if (!asExpr) {}
  }
  moveToReg(width, reg, pos) {
    if (width === "byte") {
      switch (reg) {
        case "A":
          return;
        case "B":
          this.line(`    mov  b, a`);
          return;
        case "C":
          this.line(`    mov  c, a`);
          return;
        case "D":
          this.line(`    mov  d, a`);
          return;
        case "E":
          this.line(`    mov  e, a`);
          return;
        case "H":
          this.line(`    mov  h, a`);
          return;
        case "L":
          this.line(`    mov  l, a`);
          return;
        default:
          throw new CodegenError(`internal: bad byte reg '${reg}'`, pos);
      }
    } else {
      switch (reg) {
        case "HL":
          return;
        case "DE":
          this.line(`    xchg`);
          return;
        case "BC":
          this.line(`    mov  b, h`);
          this.line(`    mov  c, l`);
          return;
        default:
          throw new CodegenError(`internal: bad word reg '${reg}'`, pos);
      }
    }
  }
  currentScope() {
    if (!this.currentProc)
      return this.res.global;
    return this.res.scopeOf.get(this.currentProc) ?? this.res.global;
  }
  procReturnType() {
    const rt = this.currentProc?.returnType;
    if (rt === "word" || rt === "address")
      return "word";
    return "byte";
  }
  evalExpr(e, want) {
    switch (e.kind) {
      case "num":
        if (want === "byte") {
          if (e.value < 0 || e.value > 255)
            throw new CodegenError(`byte literal out of range: ${e.value}`, e.pos);
          this.line(`    mvi  a, ${hex8(e.value)}`);
        } else {
          this.line(`    lxi  h, ${hex16(e.value & 65535)}`);
        }
        return;
      case "ref": {
        const sym = this.res.symOf.get(e);
        if (!sym)
          throw new CodegenError(`unresolved ref '${e.name}'`, e.pos);
        if (sym.kind === "proc") {
          this.emitCall(e.name, [], e.pos, true);
          if (want === "word" && sym.sig.return === "byte")
            this.byteToWord();
          if (want === "byte" && (sym.sig.return === "word" || sym.sig.return === "address"))
            this.wordToByte();
          return;
        }
        if (sym.kind !== "var" && sym.kind !== "param") {
          throw new CodegenError(`'${e.name}' not readable as value`, e.pos);
        }
        const t = sym.decl.type;
        if (t.kind === "array")
          throw new CodegenError(`cannot read whole array '${e.name}'`, e.pos);
        const label = symLabel(sym);
        if (t.kind === "byte") {
          this.line(`    lda  ${label}`);
          if (want === "word")
            this.byteToWord();
        } else {
          this.line(`    lhld ${label}`);
          if (want === "byte")
            this.wordToByte();
        }
        return;
      }
      case "index": {
        const sym = this.res.symOf.get(e);
        if (!sym || sym.kind !== "var" && sym.kind !== "param") {
          throw new CodegenError(`cannot index '${e.name}'`, e.pos);
        }
        if (sym.decl.type.kind !== "array")
          throw new CodegenError(`'${e.name}' is not an array`, e.pos);
        const unit = sym.decl.type.element === "byte" ? 1 : 2;
        this.computeAddr(sym, e.index, unit);
        if (unit === 1) {
          this.line(`    mov  a, m`);
          if (want === "word")
            this.byteToWord();
        } else {
          this.line(`    mov  e, m`);
          this.line(`    inx  h`);
          this.line(`    mov  d, m`);
          this.line(`    xchg`);
          if (want === "byte")
            this.wordToByte();
        }
        return;
      }
      case "call": {
        const sym = this.res.symOf.get(e);
        if (!sym)
          throw new CodegenError(`unresolved '${e.name}'`, e.pos);
        if (sym.kind === "var" || sym.kind === "param") {
          if (sym.decl.type.kind !== "array")
            throw new CodegenError(`'${e.name}' is not indexable`, e.pos);
          const unit = sym.decl.type.element === "byte" ? 1 : 2;
          this.computeAddr(sym, e.args[0], unit);
          if (unit === 1) {
            this.line(`    mov  a, m`);
            if (want === "word")
              this.byteToWord();
          } else {
            this.line(`    mov  e, m`);
            this.line(`    inx  h`);
            this.line(`    mov  d, m`);
            this.line(`    xchg`);
            if (want === "byte")
              this.wordToByte();
          }
          return;
        }
        if (sym.kind !== "proc")
          throw new CodegenError(`'${e.name}' is not callable`, e.pos);
        this.emitCall(e.name, e.args, e.pos, true);
        const ret = sym.sig.return;
        if (want === "word" && ret === "byte")
          this.byteToWord();
        if (want === "byte" && (ret === "word" || ret === "address"))
          this.wordToByte();
        return;
      }
      case "addrOf": {
        const sym = this.res.symOf.get(e);
        if (!sym)
          throw new CodegenError(`unresolved addrOf '${e.name}'`, e.pos);
        const label = symLabel(sym);
        this.line(`    lxi  h, ${label}`);
        if (want === "byte")
          this.wordToByte();
        return;
      }
      case "builtin": {
        this.emitBuiltin(e, want);
        return;
      }
      case "un":
        this.evalExpr(e.arg, want);
        if (e.op === "+")
          return;
        if (e.op === "-") {
          if (want === "byte") {
            this.line(`    cma`);
            this.line(`    inr  a`);
          } else {
            this.line(`    mov  a, l`);
            this.line(`    cma`);
            this.line(`    mov  l, a`);
            this.line(`    mov  a, h`);
            this.line(`    cma`);
            this.line(`    mov  h, a`);
            this.line(`    inx  h`);
          }
          return;
        }
        if (e.op === "NOT") {
          if (want === "byte")
            this.line(`    cma`);
          else {
            this.line(`    mov  a, l`);
            this.line(`    cma`);
            this.line(`    mov  l, a`);
            this.line(`    mov  a, h`);
            this.line(`    cma`);
            this.line(`    mov  h, a`);
          }
          return;
        }
        return;
      case "bin":
        this.emitBinary(e.op, e.lhs, e.rhs, want, e.pos);
        return;
      case "str":
        throw new CodegenError(`string expressions not supported in v0`, e.pos);
    }
  }
  emitBinary(op, lhs, rhs, want, pos) {
    const isRel = op === "=" || op === "<>" || op === "<" || op === ">" || op === "<=" || op === ">=";
    const operandType = isRel ? this.widerOperandType(lhs, rhs) : want;
    if (isRel) {
      this.emitCompare(op, lhs, rhs, operandType, pos);
      if (want === "word")
        this.byteToWord();
      return;
    }
    this.evalExpr(lhs, operandType);
    if (operandType === "byte")
      this.line(`    push psw`);
    else
      this.line(`    push h`);
    this.evalExpr(rhs, operandType);
    if (operandType === "byte") {
      this.line(`    mov  b, a`);
      this.line(`    pop  psw`);
      switch (op) {
        case "+":
          this.line(`    add  b`);
          break;
        case "-":
          this.line(`    sub  b`);
          break;
        case "AND":
          this.line(`    ana  b`);
          break;
        case "OR":
          this.line(`    ora  b`);
          break;
        case "XOR":
          this.line(`    xra  b`);
          break;
        case "*":
          this.callRuntime("rt_mul8");
          break;
        case "/":
          this.callRuntime("rt_div8");
          break;
        case "MOD":
          this.callRuntime("rt_mod8");
          break;
        default:
          throw new CodegenError(`operator '${op}' not yet implemented for BYTE`, pos);
      }
    } else {
      this.line(`    xchg`);
      this.line(`    pop  h`);
      switch (op) {
        case "+":
          this.line(`    dad  d`);
          break;
        case "-":
          this.line(`    mov  a, l`);
          this.line(`    sub  e`);
          this.line(`    mov  l, a`);
          this.line(`    mov  a, h`);
          this.line(`    sbb  d`);
          this.line(`    mov  h, a`);
          break;
        case "AND":
          this.emitWordBitwise("ana");
          break;
        case "OR":
          this.emitWordBitwise("ora");
          break;
        case "XOR":
          this.emitWordBitwise("xra");
          break;
        case "*":
          this.callRuntime("rt_mul16");
          break;
        case "/":
          this.callRuntime("rt_div16");
          break;
        case "MOD":
          this.callRuntime("rt_mod16");
          break;
        default:
          throw new CodegenError(`operator '${op}' not yet implemented for WORD`, pos);
      }
    }
  }
  callRuntime(name) {
    this.usedRuntime.add(name);
    this.line(`    call ${name}`);
  }
  emitBuiltin(e, want) {
    if (e.name === "LOW" || e.name === "HIGH") {
      const arg = e.args[0];
      const argT = this.res.typeOf.get(arg);
      const argWide = argT?.kind === "word" || argT?.kind === "address";
      if (argWide) {
        this.evalExpr(arg, "word");
        this.line(e.name === "LOW" ? `    mov  a, l` : `    mov  a, h`);
      } else {
        this.evalExpr(arg, "byte");
        if (e.name === "HIGH")
          this.line(`    mvi  a, 00h`);
      }
      if (want === "word")
        this.byteToWord();
      return;
    }
    const val = e.args[0];
    const count = e.args[1];
    const valT = this.res.typeOf.get(val);
    const wide = valT?.kind === "word" || valT?.kind === "address";
    this.evalExpr(val, wide ? "word" : "byte");
    if (count.kind === "num") {
      const n = count.value;
      if (n < 0 || n > (wide ? 15 : 7)) {
        throw new CodegenError(`${e.name} count out of range`, e.pos);
      }
      for (let i = 0;i < n; i++)
        this.emitShiftOnce(e.name, wide);
    } else {
      const loop = this.fresh(`${e.name.toLowerCase()}_loop`);
      const done = this.fresh(`${e.name.toLowerCase()}_done`);
      if (wide)
        this.line(`    push h`);
      else
        this.line(`    push psw`);
      this.evalExpr(count, "byte");
      this.line(`    mov  c, a`);
      if (wide)
        this.line(`    pop  h`);
      else
        this.line(`    pop  psw`);
      this.line(`${loop}:`);
      this.line(`    mov  a, c`);
      this.line(`    ora  a`);
      this.line(`    jz   ${done}`);
      this.emitShiftOnce(e.name, wide);
      this.line(`    dcr  c`);
      this.line(`    jmp  ${loop}`);
      this.line(`${done}:`);
    }
    if (want === "byte" && wide)
      this.wordToByte();
    if (want === "word" && !wide)
      this.byteToWord();
  }
  emitShiftOnce(op, wide) {
    if (!wide) {
      switch (op) {
        case "SHR":
          this.line(`    ora  a`);
          this.line(`    rar`);
          return;
        case "SHL":
          this.line(`    add  a`);
          return;
        case "ROR":
          this.line(`    rrc`);
          return;
        case "ROL":
          this.line(`    rlc`);
          return;
      }
    }
    switch (op) {
      case "SHL":
        this.line(`    dad  h`);
        return;
      case "SHR":
        this.line(`    ora  a`);
        this.line(`    mov  a, h`);
        this.line(`    rar`);
        this.line(`    mov  h, a`);
        this.line(`    mov  a, l`);
        this.line(`    rar`);
        this.line(`    mov  l, a`);
        return;
      case "ROL": {
        const skip = this.fresh("rol_skip");
        this.line(`    dad  h`);
        this.line(`    jnc  ${skip}`);
        this.line(`    inr  l`);
        this.line(`${skip}:`);
        return;
      }
      case "ROR":
        this.line(`    mov  a, l`);
        this.line(`    rrc`);
        this.line(`    mov  a, h`);
        this.line(`    rar`);
        this.line(`    mov  h, a`);
        this.line(`    mov  a, l`);
        this.line(`    rar`);
        this.line(`    mov  l, a`);
        return;
    }
  }
  emitWordBitwise(mne) {
    this.line(`    mov  a, l`);
    this.line(`    ${mne}  e`);
    this.line(`    mov  l, a`);
    this.line(`    mov  a, h`);
    this.line(`    ${mne}  d`);
    this.line(`    mov  h, a`);
  }
  emitCompare(op, lhs, rhs, t, pos) {
    let left = lhs, right = rhs, normOp = op;
    if (op === ">") {
      left = rhs;
      right = lhs;
      normOp = "<";
    } else if (op === "<=") {
      left = rhs;
      right = lhs;
      normOp = ">=";
    }
    this.evalExpr(left, t);
    if (t === "byte")
      this.line(`    push psw`);
    else
      this.line(`    push h`);
    this.evalExpr(right, t);
    const tt = this.fresh("ctrue");
    const end = this.fresh("cend");
    if (t === "byte") {
      this.line(`    mov  b, a`);
      this.line(`    pop  psw`);
      this.line(`    cmp  b`);
    } else {
      this.line(`    xchg`);
      this.line(`    pop  h`);
      this.line(`    mov  a, l`);
      this.line(`    sub  e`);
      this.line(`    mov  a, h`);
      this.line(`    sbb  d`);
    }
    let jmpTrue;
    switch (normOp) {
      case "=":
        jmpTrue = "jz";
        break;
      case "<>":
        jmpTrue = "jnz";
        break;
      case "<":
        jmpTrue = "jc";
        break;
      case ">=":
        jmpTrue = "jnc";
        break;
      default:
        throw new CodegenError(`unknown relational op '${op}'`, pos);
    }
    this.line(`    ${jmpTrue}   ${tt}`);
    this.line(`    xra  a`);
    this.line(`    jmp  ${end}`);
    this.line(`${tt}:`);
    this.line(`    mvi  a, 0FFh`);
    this.line(`${end}:`);
  }
  widerOperandType(a, b) {
    const ta = this.res.typeOf.get(a);
    const tb = this.res.typeOf.get(b);
    const isWord = (t) => t?.kind === "word" || t?.kind === "address";
    return isWord(ta) || isWord(tb) ? "word" : "byte";
  }
  byteToWord() {
    this.line(`    mov  l, a`);
    this.line(`    mvi  h, 0`);
  }
  wordToByte() {
    this.line(`    mov  a, l`);
  }
  line(s) {
    this.out.push(s);
  }
  blank() {
    this.out.push("");
  }
  fresh(hint) {
    this.labelCounter++;
    return `L${this.labelCounter}_${hint}`;
  }
}
function hex8(n) {
  const s = (n & 255).toString(16).toUpperCase().padStart(2, "0");
  return (s[0] >= "A" ? "0" : "") + s + "h";
}
function hex16(n) {
  const s = (n & 65535).toString(16).toUpperCase().padStart(4, "0");
  return (s[0] >= "A" ? "0" : "") + s + "h";
}
function dataLabel(name) {
  return name.toLowerCase();
}
function localLabel(proc, name) {
  return `${proc.toLowerCase()}_${name.toLowerCase()}`;
}
function procLabel(name) {
  return name.toLowerCase();
}
function userLabel(name) {
  return name.toLowerCase();
}
function symLabel(sym) {
  if (sym.kind === "var") {
    if (sym.storage === "global" || sym.storage === "absolute")
      return dataLabel(sym.decl.name);
    if (!sym.proc)
      throw new Error(`local var '${sym.decl.name}' has no owning proc`);
    return localLabel(sym.proc.name, sym.decl.name);
  }
  if (sym.kind === "param")
    return localLabel(sym.proc.name, sym.decl.name);
  if (sym.kind === "proc")
    return procLabel(sym.proc.name);
  throw new Error(`no asm label for symbol kind '${sym.kind}'`);
}
function symName(sym) {
  if (sym.kind === "var" || sym.kind === "param")
    return sym.decl.name;
  if (sym.kind === "proc")
    return sym.proc.name;
  return "<label>";
}

// src/compile.ts
function compile(source, opts = {}) {
  const tokens = preprocess(tokenize(source));
  const ast = parse2(tokens);
  const res = analyze(ast);
  return generate(ast, res, opts);
}

// docs/build-info.ts
var BUILD_TIME = "2026-04-24 09:31:32";

// docs/playground.ts
var fetchExample = (f) => fetch(`examples/${f}`).then((r) => r.text());
var EXAMPLES = (window.plm80Examples ?? []).map((e) => {
  const ex = {
    name: e.name,
    filename: e.filename,
    source: fetchExample(e.filename)
  };
  ex.source.then((s) => {
    ex.resolvedSource = s;
    renderTabs();
  }, () => {});
  return ex;
});
function tabMatchesExample(t) {
  const ex = EXAMPLES.find((e) => e.filename === t.filename);
  return !!ex && ex.resolvedSource === t.source;
}
var TABS_KEY = "plm80-playground:tabs";
var ACTIVE_KEY = "plm80-playground:active";
var THEME_KEY = "plm80-playground:theme";
var FORMAT_KEY = "plm80-playground:format";
var ORG_KEY = "plm80-playground:org";
var STACK_KEY = "plm80-playground:stack";
var DEFAULT_FILENAME = "program.plm";
var DEFAULT_ORG = "0";
var DEFAULT_STACK = "76CFh";
var OUTPUT_FORMATS = ["plm", "asm", "bin", "rk", "rkr", "pki", "gam"];
var DEFAULT_FORMAT = "plm";
var tabs = [];
var active = 0;
function applyTheme(t) {
  document.body.classList.toggle("theme-light", t === "light");
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
var asmOut = document.getElementById("asm");
var bytesOut = document.getElementById("bytes");
var bytesTitle = document.getElementById("bytes-title");
var errorEl = document.getElementById("error");
var select = document.getElementById("example");
var confirmModal = document.getElementById("confirm-modal");
var confirmMessage = document.getElementById("confirm-message");
var confirmOk = document.getElementById("confirm-ok");
var confirmCancel = document.getElementById("confirm-cancel");
var uploadBtn = document.getElementById("upload-btn");
var downloadBtn = document.getElementById("download-btn");
var downloadFormatSel = document.getElementById("download-format");
var runBinBtn = document.getElementById("run-bin");
var resetBtn = document.getElementById("reset");
var themeBtn = document.getElementById("theme");
var fileInput = document.getElementById("file-input");
var filenameInput = document.getElementById("filename");
var orgInput = document.getElementById("org");
var stackInput = document.getElementById("stack");
var tabsEl = document.getElementById("tabs");
function plmName() {
  return filenameInput.value.trim() || DEFAULT_FILENAME;
}
function stem(name) {
  return name.replace(/\.[^.]*$/, "") || name;
}
function outputName(format2) {
  return `${stem(plmName())}.${format2}`;
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
  const s = m ? m[1] : base;
  const ext = m && m[2] ? m[2] : "";
  let n = 2;
  while (tabs.some((t, i) => i !== active && t.filename === `${s}-${n}${ext}`))
    n++;
  return `${s}-${n}${ext}`;
}
function deselectExample() {
  if (select.value)
    select.value = "";
}
source.addEventListener("input", deselectExample);
filenameInput.addEventListener("input", deselectExample);
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function hex2(n) {
  return n.toString(16).toUpperCase().padStart(2, "0");
}
function hex4(n) {
  return n.toString(16).toUpperCase().padStart(4, "0");
}
function formatBytes(data, base) {
  const perRow = 16;
  const rows = [];
  for (let i = 0;i < data.length; i += perRow) {
    const chunk = data.slice(i, i + perRow);
    const hex = Array.from(chunk).map(hex2).join(" ").padEnd(perRow * 3 - 1, " ");
    let ascii = "";
    for (const b of chunk)
      ascii += b >= 32 && b < 127 ? String.fromCharCode(b) : ".";
    rows.push(`<span class="addr">${hex4(base + i)}</span>  ` + `<span class="byte">${esc(hex)}</span>  ` + `<span class="ascii">${esc(ascii)}</span>`);
  }
  return rows.join(`
`);
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
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !confirmModal.hidden)
    closeConfirm(false);
  if (e.key === "Enter" && !confirmModal.hidden) {
    e.preventDefault();
    closeConfirm(true);
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
    if (runBinBtn.disabled)
      return;
    e.preventDefault();
    runBinBtn.click();
  }
});
function parseHex(raw) {
  const v = raw.trim();
  if (!v)
    return;
  const m = v.match(/^0x([0-9a-f]+)$|^([0-9a-f]+)h?$/i);
  if (!m)
    return null;
  return parseInt(m[1] ?? m[2], 16);
}
var lastAsm = null;
var lastSections = null;
function setError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add("visible");
}
function clearError() {
  errorEl.textContent = "";
  errorEl.classList.remove("visible");
}
function formatCompileError(e, file) {
  if (e instanceof ParseError || e instanceof SemaError || e instanceof CodegenError) {
    return `${file}:${e.message}`;
  }
  if (e instanceof AsmError) {
    return `assembler line ${e.line}: ${e.message}`;
  }
  return e.message ?? String(e);
}
function runPipeline() {
  const src = source.value;
  const file = plmName();
  const org = parseHex(orgInput.value);
  const sp = parseHex(stackInput.value);
  if (org === null) {
    setError(`org: invalid hex value '${orgInput.value}'`);
    lastAsm = null;
    lastSections = null;
    asmOut.textContent = "";
    bytesOut.innerHTML = "";
    bytesTitle.textContent = "bytes";
    updateDownloadEnabled();
    runBinBtn.disabled = true;
    return;
  }
  if (sp === null) {
    setError(`sp: invalid hex value '${stackInput.value}'`);
    lastAsm = null;
    lastSections = null;
    asmOut.textContent = "";
    bytesOut.innerHTML = "";
    bytesTitle.textContent = "bytes";
    updateDownloadEnabled();
    runBinBtn.disabled = true;
    return;
  }
  const opts = {};
  if (org !== undefined)
    opts.origin = org;
  if (sp !== undefined)
    opts.stack = sp;
  let asmText;
  try {
    asmText = compile(src, opts);
  } catch (e) {
    lastAsm = null;
    lastSections = null;
    asmOut.textContent = "";
    bytesOut.innerHTML = "";
    bytesTitle.textContent = "bytes";
    setError(formatCompileError(e, file));
    updateDownloadEnabled();
    runBinBtn.disabled = true;
    return;
  }
  lastAsm = asmText;
  asmOut.textContent = asmText;
  try {
    lastSections = asm(asmText);
  } catch (e) {
    lastSections = null;
    bytesOut.innerHTML = "";
    bytesTitle.textContent = "bytes";
    setError(formatCompileError(e, file));
    updateDownloadEnabled();
    runBinBtn.disabled = true;
    return;
  }
  clearError();
  const sec = lastSections[0];
  if (!sec) {
    bytesOut.innerHTML = "";
    bytesTitle.textContent = "bytes (empty)";
  } else {
    const bytes = Uint8Array.from(sec.data);
    bytesOut.innerHTML = formatBytes(bytes, sec.start);
    const span = sec.end - sec.start + 1;
    bytesTitle.textContent = `bytes — ${hex4(sec.start)}..${hex4(sec.end)} (${span} B)`;
  }
  updateDownloadEnabled();
  runBinBtn.disabled = !lastSections || lastSections.length === 0;
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
    const live = i === active ? source.value : t.source;
    const matches = tabMatchesExample({ filename: t.filename, source: live });
    el.className = "tab" + (i === active ? " active" : "") + (matches ? " example" : " modified");
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
  while (tabs.some((t) => t.filename === `untitled-${n}.plm`))
    n++;
  return `untitled-${n}.plm`;
}
function switchTab(i) {
  if (i === active || i < 0 || i >= tabs.length)
    return;
  tabs[active].source = source.value;
  active = i;
  source.value = tabs[active].source;
  filenameInput.value = tabs[active].filename;
  lastGoodName = tabs[active].filename;
  source.scrollTop = 0;
  saveTabs();
  renderTabs();
  deselectExample();
  runPipeline();
  source.focus();
}
function newTab() {
  tabs[active].source = source.value;
  tabs.push({ filename: nextUntitled(), source: "" });
  active = tabs.length - 1;
  source.value = "";
  filenameInput.value = tabs[active].filename;
  lastGoodName = tabs[active].filename;
  source.scrollTop = 0;
  saveTabs();
  renderTabs();
  deselectExample();
  runPipeline();
  source.focus();
}
async function closeTab(i) {
  const current = i === active ? source.value : tabs[i].source;
  const matchesExample = tabMatchesExample({
    filename: tabs[i].filename,
    source: current
  });
  if (current.trim().length > 0 && !matchesExample) {
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
  runPipeline();
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
function onChange() {
  save();
  runPipeline();
  renderTabs();
}
source.addEventListener("input", onChange);
function saveOrgStack() {
  try {
    localStorage.setItem(ORG_KEY, orgInput.value);
    localStorage.setItem(STACK_KEY, stackInput.value);
  } catch {}
}
orgInput.addEventListener("input", () => {
  saveOrgStack();
  runPipeline();
});
stackInput.addEventListener("input", () => {
  saveOrgStack();
  runPipeline();
});
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
function buildBinary(format2) {
  if (!lastSections || lastSections.length === 0)
    return null;
  const overlap = findOverlap(lastSections);
  if (overlap) {
    const [a, b] = overlap;
    alert(`sections overlap: ${hex4(a.start)}-${hex4(a.end)} and ${hex4(b.start)}-${hex4(b.end)}`);
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
  if (fmt === "plm") {
    downloadBtn.disabled = false;
    return;
  }
  if (fmt === "asm") {
    downloadBtn.disabled = lastAsm === null;
    return;
  }
  downloadBtn.disabled = !lastSections || lastSections.length === 0;
}
downloadFormatSel.value = loadFormat();
updateDownloadEnabled();
downloadFormatSel.addEventListener("change", () => {
  saveFormat(selectedFormat());
  updateDownloadEnabled();
});
downloadBtn.addEventListener("click", () => {
  const fmt = selectedFormat();
  if (fmt === "plm") {
    downloadBlob(source.value, plmName(), "text/plain");
    return;
  }
  if (fmt === "asm") {
    if (lastAsm === null)
      return;
    downloadBlob(lastAsm, outputName("asm"), "text/plain");
    return;
  }
  const data = buildBinary(fmt);
  if (!data)
    return;
  downloadBlob(data, outputName(fmt), "application/octet-stream");
});
var EMULATOR_URL_DEFAULT = "https://rk86.ru/beta/index.html";
var EMULATOR_URL = window.plm80EmulatorUrl ?? EMULATOR_URL_DEFAULT;
var HANDOFF_PREFIX = "plm80-handoff:";
var HANDOFF_TTL_MS = 60 * 60 * 1000;
function sweepStaleHandoffs() {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1;i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(HANDOFF_PREFIX))
        continue;
      const raw = localStorage.getItem(key);
      if (!raw)
        continue;
      try {
        const { ts } = JSON.parse(raw);
        if (!ts || now - ts > HANDOFF_TTL_MS)
          localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}
function newHandoffId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function")
    return c.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
runBinBtn.addEventListener("click", () => {
  const rk = buildBinary("rk");
  if (!rk)
    return;
  const target = new URL(EMULATOR_URL, location.href);
  const dataUrl = `data:;name=${outputName("rk")};base64,${toBase64(rk)}`;
  if (target.origin === location.origin) {
    sweepStaleHandoffs();
    const id = newHandoffId();
    try {
      localStorage.setItem(HANDOFF_PREFIX + id, JSON.stringify({ ts: Date.now(), url: dataUrl }));
    } catch (e) {
      alert(`localStorage unavailable, cannot hand off to emulator: ${e.message}`);
      return;
    }
    target.searchParams.set("handoff", id);
  } else {
    target.searchParams.set("run", dataUrl);
  }
  window.open(target.toString(), "_blank", "noopener");
});
uploadBtn.addEventListener("click", () => fileInput.click());
resetBtn.addEventListener("click", async () => {
  const ok = await askConfirm("Reset the current tab to the first example? This replaces its content.");
  if (!ok)
    return;
  const def = EXAMPLES[0];
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
function loadOrgStack() {
  try {
    orgInput.value = localStorage.getItem(ORG_KEY) ?? DEFAULT_ORG;
    stackInput.value = localStorage.getItem(STACK_KEY) ?? DEFAULT_STACK;
  } catch {
    orgInput.value = DEFAULT_ORG;
    stackInput.value = DEFAULT_STACK;
  }
}
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
  const src = await EXAMPLES[0]?.source ?? "";
  const name = EXAMPLES[0]?.filename ?? DEFAULT_FILENAME;
  tabs = [{ filename: name, source: src }];
  active = 0;
  saveTabs();
}
(async () => {
  loadOrgStack();
  await loadTabsFromStorage();
  source.value = tabs[active].source;
  filenameInput.value = tabs[active].filename;
  lastGoodName = tabs[active].filename;
  renderTabs();
  onChange();
})();
