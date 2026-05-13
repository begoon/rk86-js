#!/usr/bin/env bun
// @bun
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
      proc = { regs, line: orig, source: line };
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
      out.push(...popsAndRet(proc.regs, orig));
      proc = null;
      continue;
    }
    if (/^\.?return\s*$/i.test(bare)) {
      if (!proc) {
        throw new AsmError(".return outside .proc", orig, line, firstNonSpaceCol(line));
      }
      out.push(...popsAndRet(proc.regs, orig));
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
            symbols.set(labelName.toUpperCase(), evalExpr(parts.operands[0], symbols, pc, lastLabel));
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
if (false) {}

// src/lib/terminal/rk86_terminal.ts
import { spawn } from "child_process";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { basename } from "path";
// packages/rk86/package.json
var package_default = {
  name: "rk86",
  version: "2.0.29",
  description: "\u042D\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0420\u0430\u0434\u0438\u043E-86\u0420\u041A (Intel 8080) \u0434\u043B\u044F \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u0430",
  bin: {
    rk86: "rk86.js"
  },
  type: "module",
  keywords: [
    "rk86",
    "radio-86rk",
    "emulator",
    "intel-8080",
    "i8080",
    "retro"
  ],
  author: "Alexander Demin",
  license: "MIT",
  repository: {
    type: "git",
    url: "https://github.com/begoon/rk86-js-web"
  }
};

// src/lib/core/rk86_colors.ts
var COLOR_MODES = ["mono", "color1", "color2", "color3"];
var DEFAULT_COLOR_MODE = "color1";
function attrToRgb(mode, attrs) {
  const hglt = (attrs & 1) !== 0;
  const gpa0 = (attrs & 4) !== 0;
  const gpa1 = (attrs & 8) !== 0;
  switch (mode) {
    case "color1": {
      const rgb = (gpa1 ? 255 : 0) | (gpa0 ? 65280 : 0) | (hglt ? 16711680 : 0);
      return rgb === 0 ? 12632256 : rgb;
    }
    case "color2":
      return (gpa0 ? 0 : 16711680) | (gpa1 ? 0 : 65280) | (hglt ? 0 : 255);
    case "color3":
      return (gpa0 ? 0 : 255) | (gpa1 ? 0 : 65280) | (hglt ? 0 : 16711680);
    case "mono":
    default:
      return 12632256;
  }
}
function hasCellOffset(mode) {
  return mode !== "color3";
}
function rgbToAnsiBaseFg(rgb) {
  const r = rgb >> 16 & 255;
  const g = rgb >> 8 & 255;
  const b = rgb & 255;
  const palette = [
    [30, 0, 0, 0],
    [31, 255, 0, 0],
    [32, 0, 255, 0],
    [33, 255, 255, 0],
    [34, 0, 0, 255],
    [35, 255, 0, 255],
    [36, 0, 255, 255],
    [37, 255, 255, 255]
  ];
  let best = 37;
  let bestDist = Infinity;
  for (const [code, pr, pg, pb] of palette) {
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = code;
    }
  }
  return best;
}

// src/lib/core/hex.ts
function hex(v, prefix) {
  return v.toString(16).toUpperCase();
}
function hex8(v, prefix) {
  return (prefix ? prefix : "") + hex(v & 255, prefix).padStart(2, "0");
}
function hex16(v, prefix) {
  return (prefix ? prefix : "") + hex(v & 65535, prefix).padStart(4, "0");
}
function hexArray(array) {
  return array.map((c) => hex8(c)).join(" ");
}
function fromHex(v) {
  if (typeof v === "string") {
    return v.startsWith("0x") ? parseInt(v, 16) : parseInt(v);
  }
  return v;
}

// src/lib/core/i8080.ts
class I8080 {
  memory;
  io;
  sp = 0;
  pc = 0;
  iff = 0;
  pf = 0;
  hf = 0;
  sf = 0;
  zf = 0;
  cf = 0;
  regs = [0, 0, 0, 0, 0, 0, 0, 0];
  static F_CARRY = 1;
  static F_UN1 = 2;
  static F_PARITY = 4;
  static F_UN3 = 8;
  static F_HCARRY = 16;
  static F_UN5 = 32;
  static F_ZERO = 64;
  static F_NEG = 128;
  parity_table = [
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1]
  ].flat();
  half_carry_table = [0, 0, 1, 0, 1, 0, 1, 1];
  sub_half_carry_table = [0, 1, 1, 1, 0, 0, 0, 1];
  constructor(machine) {
    this.memory = machine.memory;
    this.io = machine.io;
  }
  export() {
    const h8 = (n) => "0x" + hex8(n);
    const h16 = (n) => "0x" + hex16(n);
    return {
      a: h8(this.a()),
      sf: this.sf ? 1 : 0,
      zf: this.zf ? 1 : 0,
      hf: this.hf ? 1 : 0,
      pf: this.pf ? 1 : 0,
      cf: this.cf ? 1 : 0,
      bc: h16(this.bc()),
      de: h16(this.de()),
      hl: h16(this.hl()),
      sp: h16(this.sp),
      pc: h16(this.pc),
      iff: this.iff ? 1 : 0
    };
  }
  import(snapshot) {
    const h = fromHex;
    this.set_a(h(snapshot.a));
    this.sf = snapshot.sf;
    this.zf = snapshot.zf;
    this.hf = snapshot.hf;
    this.pf = snapshot.pf;
    this.cf = snapshot.cf;
    this.set_rp(0, h(snapshot.bc));
    this.set_rp(2, h(snapshot.de));
    this.set_rp(4, h(snapshot.hl));
    this.set_rp(6, h(snapshot.sp));
    this.pc = h(snapshot.pc);
    this.iff = h(snapshot.iff);
  }
  memory_read_byte(addr) {
    return this.memory.read(addr & 65535) & 255;
  }
  memory_write_byte(addr, w8) {
    this.memory.write(addr & 65535, w8 & 255);
  }
  memory_read_word(addr) {
    return this.memory_read_byte(addr + 1) << 8 | this.memory_read_byte(addr);
  }
  memory_write_word(addr, w16) {
    this.memory_write_byte(addr + 1, w16 >> 8);
    this.memory_write_byte(addr, w16 & 255);
  }
  reg(r) {
    return r != 6 ? this.regs[r] : this.memory_read_byte(this.hl());
  }
  set_reg(r, value) {
    const v8 = value & 255;
    if (r != 6)
      this.regs[r] = v8;
    else
      this.memory_write_byte(this.hl(), v8);
  }
  rp(r) {
    return r != 6 ? this.regs[r] << 8 | this.regs[r + 1] : this.sp;
  }
  set_rp(r, w16) {
    if (r != 6) {
      this.set_reg(r, w16 >> 8);
      this.set_reg(r + 1, w16 & 255);
    } else
      this.sp = w16;
  }
  store_flags() {
    let f = 0;
    if (this.sf)
      f |= I8080.F_NEG;
    else
      f &= ~I8080.F_NEG;
    if (this.zf)
      f |= I8080.F_ZERO;
    else
      f &= ~I8080.F_ZERO;
    if (this.hf)
      f |= I8080.F_HCARRY;
    else
      f &= ~I8080.F_HCARRY;
    if (this.pf)
      f |= I8080.F_PARITY;
    else
      f &= ~I8080.F_PARITY;
    if (this.cf)
      f |= I8080.F_CARRY;
    else
      f &= ~I8080.F_CARRY;
    f |= I8080.F_UN1;
    f &= ~I8080.F_UN3;
    f &= ~I8080.F_UN5;
    return f;
  }
  retrieve_flags(f) {
    this.sf = f & I8080.F_NEG ? 1 : 0;
    this.zf = f & I8080.F_ZERO ? 1 : 0;
    this.hf = f & I8080.F_HCARRY ? 1 : 0;
    this.pf = f & I8080.F_PARITY ? 1 : 0;
    this.cf = f & I8080.F_CARRY ? 1 : 0;
  }
  bc() {
    return this.rp(0);
  }
  de() {
    return this.rp(2);
  }
  hl() {
    return this.rp(4);
  }
  b() {
    return this.reg(0);
  }
  c() {
    return this.reg(1);
  }
  d() {
    return this.reg(2);
  }
  e() {
    return this.reg(3);
  }
  h() {
    return this.reg(4);
  }
  l() {
    return this.reg(5);
  }
  a() {
    return this.reg(7);
  }
  set_b(v) {
    this.set_reg(0, v);
  }
  set_c(v) {
    this.set_reg(1, v);
  }
  set_d(v) {
    this.set_reg(2, v);
  }
  set_e(v) {
    this.set_reg(3, v);
  }
  set_h(v) {
    this.set_reg(4, v);
  }
  set_l(v) {
    this.set_reg(5, v);
  }
  set_a(v) {
    this.set_reg(7, v);
  }
  next_pc_byte() {
    const v = this.memory_read_byte(this.pc);
    this.pc = this.pc + 1 & 65535;
    return v;
  }
  next_pc_word() {
    return this.next_pc_byte() | this.next_pc_byte() << 8;
  }
  inr(r) {
    let v = this.reg(r);
    v = v + 1 & 255;
    this.set_reg(r, v);
    this.sf = (v & 128) != 0 ? 1 : 0;
    this.zf = v == 0 ? 1 : 0;
    this.hf = (v & 15) == 0 ? 1 : 0;
    this.pf = this.parity_table[v];
  }
  dcr(r) {
    let v = this.reg(r);
    v = v - 1 & 255;
    this.set_reg(r, v);
    this.sf = (v & 128) != 0 ? 1 : 0;
    this.zf = v == 0 ? 1 : 0;
    this.hf = !((v & 15) == 15) ? 1 : 0;
    this.pf = this.parity_table[v];
  }
  add_im8(v, carry) {
    let a = this.a();
    const w16 = a + v + carry;
    const index = (a & 136) >> 1 | (v & 136) >> 2 | (w16 & 136) >> 3;
    a = w16 & 255;
    this.sf = (a & 128) != 0 ? 1 : 0;
    this.zf = a == 0 ? 1 : 0;
    this.hf = this.half_carry_table[index & 7] ? 1 : 0;
    this.pf = this.parity_table[a] ? 1 : 0;
    this.cf = (w16 & 256) != 0 ? 1 : 0;
    this.set_a(a);
  }
  add(r, carry) {
    this.add_im8(this.reg(r), carry);
  }
  sub_im8(v, carry) {
    let a = this.a();
    const w16 = a - v - carry & 65535;
    const index = (a & 136) >> 1 | (v & 136) >> 2 | (w16 & 136) >> 3;
    a = w16 & 255;
    this.sf = (a & 128) != 0 ? 1 : 0;
    this.zf = a == 0 ? 1 : 0;
    this.hf = !this.sub_half_carry_table[index & 7] ? 1 : 0;
    this.pf = this.parity_table[a] ? 1 : 0;
    this.cf = (w16 & 256) != 0 ? 1 : 0;
    this.set_a(a);
  }
  sub(r, carry) {
    this.sub_im8(this.reg(r), carry);
  }
  cmp_im8(v) {
    const a = this.a();
    this.sub_im8(v, 0);
    this.set_a(a);
  }
  cmp(r) {
    this.cmp_im8(this.reg(r));
  }
  ana_im8(v) {
    let a = this.a();
    this.hf = ((a | v) & 8) != 0 ? 1 : 0;
    a &= v;
    this.sf = (a & 128) != 0 ? 1 : 0;
    this.zf = a == 0 ? 1 : 0;
    this.pf = this.parity_table[a] ? 1 : 0;
    this.cf = 0;
    this.set_a(a);
  }
  ana(r) {
    this.ana_im8(this.reg(r));
  }
  xra_im8(v) {
    let a = this.a();
    a ^= v;
    this.sf = (a & 128) != 0 ? 1 : 0;
    this.zf = a == 0 ? 1 : 0;
    this.hf = 0;
    this.pf = this.parity_table[a];
    this.cf = 0;
    this.set_a(a);
  }
  xra(r) {
    this.xra_im8(this.reg(r));
  }
  ora_im8(v) {
    let a = this.a();
    a |= v;
    this.sf = (a & 128) != 0 ? 1 : 0;
    this.zf = a == 0 ? 1 : 0;
    this.hf = 0;
    this.pf = this.parity_table[a];
    this.cf = 0;
    this.set_a(a);
  }
  ora(r) {
    this.ora_im8(this.reg(r));
  }
  dad(r) {
    const hl = this.hl() + this.rp(r);
    this.cf = (hl & 65536) != 0 ? 1 : 0;
    this.set_h(hl >> 8);
    this.set_l(hl & 255);
  }
  call(w16) {
    this.push(this.pc);
    this.pc = w16;
  }
  ret() {
    return this.pc = this.pop();
  }
  pop() {
    const v = this.memory_read_word(this.sp);
    this.sp = this.sp + 2 & 65535;
    return v;
  }
  push(v) {
    this.sp = this.sp - 2 & 65535;
    this.memory_write_word(this.sp, v);
  }
  rst(addr) {
    this.push(this.pc);
    this.pc = addr;
  }
  execute(opcode) {
    let cpu_cycles = -1;
    switch (opcode) {
      default:
        alert("Oops! Unhandled opcode " + opcode.toString(16));
        break;
      case 0:
      case 8:
      case 16:
      case 24:
      case 32:
      case 40:
      case 48:
      case 56:
        cpu_cycles = 4;
        break;
      case 1:
      case 17:
      case 33:
      case 49:
        cpu_cycles = 10;
        this.set_rp(opcode >> 3, this.next_pc_word());
        break;
      case 2:
      case 18:
        cpu_cycles = 7;
        this.memory_write_byte(this.rp(opcode >> 3), this.a());
        break;
      case 3:
      case 19:
      case 35:
      case 51: {
        cpu_cycles = 5;
        const r = opcode >> 3;
        this.set_rp(r, this.rp(r) + 1 & 65535);
        break;
      }
      case 4:
      case 12:
      case 20:
      case 28:
      case 36:
      case 44:
      case 52:
      case 60:
        cpu_cycles = opcode != 52 ? 5 : 10;
        this.inr(opcode >> 3);
        break;
      case 5:
      case 13:
      case 21:
      case 29:
      case 37:
      case 45:
      case 53:
      case 61:
        cpu_cycles = opcode != 53 ? 5 : 10;
        this.dcr(opcode >> 3);
        break;
      case 6:
      case 14:
      case 22:
      case 30:
      case 38:
      case 46:
      case 54:
      case 62:
        cpu_cycles = opcode != 54 ? 7 : 10;
        this.set_reg(opcode >> 3, this.next_pc_byte());
        break;
      case 7: {
        cpu_cycles = 4;
        const a = this.a();
        this.cf = (a & 128) != 0 ? 1 : 0;
        this.set_a(a << 1 & 255 | this.cf);
        break;
      }
      case 9:
      case 25:
      case 41:
      case 57:
        cpu_cycles = 10;
        this.dad((opcode & 48) >> 3);
        break;
      case 10:
      case 26: {
        cpu_cycles = 7;
        const r = (opcode & 16) >> 3;
        this.set_a(this.memory_read_byte(this.rp(r)));
        break;
      }
      case 11:
      case 27:
      case 43:
      case 59: {
        cpu_cycles = 5;
        const r = (opcode & 48) >> 3;
        this.set_rp(r, this.rp(r) - 1 & 65535);
        break;
      }
      case 15:
        cpu_cycles = 4;
        this.cf = this.a() & 1;
        this.set_a(this.a() >> 1 | this.cf << 7);
        break;
      case 23: {
        cpu_cycles = 4;
        const w8 = this.cf;
        this.cf = (this.a() & 128) != 0 ? 1 : 0;
        this.set_a(this.a() << 1 | w8);
        break;
      }
      case 31: {
        cpu_cycles = 4;
        const w8 = this.cf;
        this.cf = this.a() & 1;
        this.set_a(this.a() >> 1 | w8 << 7);
        break;
      }
      case 34: {
        cpu_cycles = 16;
        const w16 = this.next_pc_word();
        this.memory_write_byte(w16, this.l());
        this.memory_write_byte(w16 + 1, this.h());
        break;
      }
      case 39: {
        cpu_cycles = 4;
        let carry = this.cf;
        let add = 0;
        const a = this.a();
        if (this.hf || (a & 15) > 9)
          add = 6;
        if (this.cf || a >> 4 > 9 || a >> 4 >= 9 && (a & 15) > 9) {
          add |= 96;
          carry = 1;
        }
        this.add_im8(add, 0);
        this.pf = this.parity_table[this.a()];
        this.cf = carry;
        break;
      }
      case 42: {
        cpu_cycles = 16;
        const w16 = this.next_pc_word();
        this.regs[5] = this.memory_read_byte(w16);
        this.regs[4] = this.memory_read_byte(w16 + 1);
        break;
      }
      case 47:
        cpu_cycles = 4;
        this.set_a(this.a() ^ 255);
        break;
      case 50:
        cpu_cycles = 13;
        this.memory_write_byte(this.next_pc_word(), this.a());
        break;
      case 55:
        cpu_cycles = 4;
        this.cf = 1;
        break;
      case 58:
        cpu_cycles = 13;
        this.set_a(this.memory_read_byte(this.next_pc_word()));
        break;
      case 63:
        cpu_cycles = 4;
        this.cf = this.cf ? 0 : 1;
        break;
      case 64:
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 119:
      case 120:
      case 121:
      case 122:
      case 123:
      case 124:
      case 125:
      case 126:
      case 127: {
        const src = opcode & 7;
        const dst = opcode >> 3 & 7;
        cpu_cycles = src == 6 || dst == 6 ? 7 : 5;
        this.set_reg(dst, this.reg(src));
        break;
      }
      case 118:
        cpu_cycles = 4;
        this.pc = this.pc - 1 & 65535;
        break;
      case 128:
      case 129:
      case 130:
      case 131:
      case 132:
      case 133:
      case 134:
      case 135:
      case 136:
      case 137:
      case 138:
      case 139:
      case 140:
      case 141:
      case 142:
      case 143: {
        const r = opcode & 7;
        cpu_cycles = r != 6 ? 4 : 7;
        this.add(r, opcode & 8 ? this.cf : 0);
        break;
      }
      case 144:
      case 145:
      case 146:
      case 147:
      case 148:
      case 149:
      case 150:
      case 151:
      case 152:
      case 153:
      case 154:
      case 155:
      case 156:
      case 157:
      case 158:
      case 159: {
        const r = opcode & 7;
        cpu_cycles = r != 6 ? 4 : 7;
        this.sub(r, opcode & 8 ? this.cf : 0);
        break;
      }
      case 160:
      case 161:
      case 162:
      case 163:
      case 164:
      case 165:
      case 166:
      case 167: {
        const r = opcode & 7;
        cpu_cycles = r != 6 ? 4 : 7;
        this.ana(r);
        break;
      }
      case 168:
      case 169:
      case 170:
      case 171:
      case 172:
      case 173:
      case 174:
      case 175: {
        const r = opcode & 7;
        cpu_cycles = r != 6 ? 4 : 7;
        this.xra(r);
        break;
      }
      case 176:
      case 177:
      case 178:
      case 179:
      case 180:
      case 181:
      case 182:
      case 183: {
        const r = opcode & 7;
        cpu_cycles = r != 6 ? 4 : 7;
        this.ora(r);
        break;
      }
      case 184:
      case 185:
      case 186:
      case 187:
      case 188:
      case 189:
      case 190:
      case 191: {
        const r = opcode & 7;
        cpu_cycles = r != 6 ? 4 : 7;
        this.cmp(r);
        break;
      }
      case 192:
      case 200:
      case 208:
      case 216:
      case 224:
      case 232:
      case 240:
      case 248: {
        const flags = [this.zf, this.cf, this.pf, this.sf];
        const r = opcode >> 4 & 3;
        const direction = (opcode & 8) != 0 ? 1 : 0;
        cpu_cycles = 5;
        if (flags[r] == direction) {
          cpu_cycles = 11;
          this.ret();
        }
        break;
      }
      case 193:
      case 209:
      case 225:
      case 241: {
        cpu_cycles = 11;
        const r = (opcode & 48) >> 3;
        const w16 = this.pop();
        if (r != 6) {
          this.set_rp(r, w16);
        } else {
          this.set_a(w16 >> 8);
          this.retrieve_flags(w16 & 255);
        }
        break;
      }
      case 194:
      case 202:
      case 210:
      case 218:
      case 226:
      case 234:
      case 242:
      case 250: {
        cpu_cycles = 10;
        const flags = [this.zf, this.cf, this.pf, this.sf];
        const r = opcode >> 4 & 3;
        const direction = (opcode & 8) != 0 ? 1 : 0;
        const w16 = this.next_pc_word();
        this.pc = flags[r] == direction ? w16 : this.pc;
        break;
      }
      case 195:
      case 203:
        cpu_cycles = 10;
        this.pc = this.next_pc_word();
        break;
      case 196:
      case 204:
      case 212:
      case 220:
      case 228:
      case 236:
      case 244:
      case 252: {
        const flags = [this.zf, this.cf, this.pf, this.sf];
        const r = opcode >> 4 & 3;
        const direction = (opcode & 8) != 0 ? 1 : 0;
        const w16 = this.next_pc_word();
        cpu_cycles = 11;
        if (flags[r] == direction) {
          cpu_cycles = 17;
          this.call(w16);
        }
        break;
      }
      case 197:
      case 213:
      case 229:
      case 245: {
        cpu_cycles = 11;
        const r = (opcode & 48) >> 3;
        const w16 = r != 6 ? this.rp(r) : this.a() << 8 | this.store_flags();
        this.push(w16);
        break;
      }
      case 198:
        cpu_cycles = 7;
        this.add_im8(this.next_pc_byte(), 0);
        break;
      case 199:
      case 207:
      case 215:
      case 223:
      case 231:
      case 239:
      case 247:
      case 255:
        this.rst(opcode & 56);
        cpu_cycles = 11;
        break;
      case 201:
      case 217:
        cpu_cycles = 10;
        this.ret();
        break;
      case 205:
      case 221:
      case 237:
      case 253:
        cpu_cycles = 17;
        this.call(this.next_pc_word());
        break;
      case 206:
        cpu_cycles = 7;
        this.add_im8(this.next_pc_byte(), this.cf);
        break;
      case 211:
        cpu_cycles = 10;
        this.io.output(this.next_pc_byte(), this.a());
        break;
      case 214:
        cpu_cycles = 7;
        this.sub_im8(this.next_pc_byte(), 0);
        break;
      case 219:
        cpu_cycles = 10;
        this.set_a(this.io.input(this.next_pc_byte()));
        break;
      case 222:
        cpu_cycles = 7;
        this.sub_im8(this.next_pc_byte(), this.cf);
        break;
      case 227: {
        cpu_cycles = 18;
        const w16 = this.memory_read_word(this.sp);
        this.memory_write_word(this.sp, this.hl());
        this.set_l(w16 & 255);
        this.set_h(w16 >> 8);
        break;
      }
      case 230:
        cpu_cycles = 7;
        this.ana_im8(this.next_pc_byte());
        break;
      case 233:
        cpu_cycles = 5;
        this.pc = this.hl();
        break;
      case 235: {
        cpu_cycles = 4;
        const l = this.l();
        this.set_l(this.e());
        this.set_e(l);
        const h = this.h();
        this.set_h(this.d());
        this.set_d(h);
        break;
      }
      case 238:
        cpu_cycles = 7;
        this.xra_im8(this.next_pc_byte());
        break;
      case 243:
      case 251:
        cpu_cycles = 4;
        this.iff = (opcode & 8) != 0 ? 1 : 0;
        this.io.interrupt(this.iff);
        break;
      case 246:
        cpu_cycles = 7;
        this.ora_im8(this.next_pc_byte());
        break;
      case 249:
        cpu_cycles = 5;
        this.sp = this.hl();
        break;
      case 254:
        cpu_cycles = 7;
        this.cmp_im8(this.next_pc_byte());
        break;
    }
    return cpu_cycles;
  }
  instruction() {
    return this.execute(this.next_pc_byte());
  }
  jump(addr) {
    this.pc = addr & 65535;
  }
}

// src/lib/core/rk86_file_parser.ts
var extract_rk86_word = function(v, i) {
  return (v[i] & 255) << 8 | v[i + 1] & 255;
};
var to_text = (binary) => binary.reduce((a, x) => a + String.fromCharCode(x), "");
var is_hex_file = (image) => to_text(image.slice(0, 6)) === "#!rk86";
var parse = (binary) => {
  try {
    if (!binary)
      return { ok: false };
    if (binary instanceof Uint8Array)
      binary = Array.from(binary);
    const text = to_text(binary);
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};
var convert_hex_to_binary = function(text) {
  const lines = text.split(`
`).filter((line) => line.trim().length).filter((line) => !line.startsWith(";") && !line.startsWith("#"));
  const image = [];
  for (const line of lines) {
    const hex_line = line.slice(5).trim();
    const binary_line = hex_line.split(" ").map((v) => parseInt(v, 16));
    image.push(...binary_line);
  }
  return image;
};
var file_ext = (filename) => {
  const groups = filename.match(".*\\.(.*)$");
  return groups ? groups[1] : "";
};
var parse_rk86_binary = (name, input) => {
  let file = {};
  file.name = name.split("/").slice(-1)[0];
  let image = input;
  if (is_hex_file(image)) {
    const text = to_text(image);
    image = convert_hex_to_binary(text);
    file = { ...file, ...extact_metadata(text) };
    if (file.start != null)
      file.start = parseInt(file.start, 16);
    if (file.entry != null)
      file.entry = parseInt(file.entry, 16);
  }
  if (image.length > 65536) {
    throw new Error(`\u043E\u0448\u0438\u0431\u043A\u0430: \u0434\u043B\u0438\u043D\u0430 \u0444\u0430\u0439\u043B\u0430 [${file.name}] ${image.length} \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 65556`);
  }
  const ext = file_ext(file.name);
  if (ext === "bin" || ext === "") {
    file.size = image.length;
    if (file.start == null) {
      file.start = file.name.match(/^mon/) ? 65536 - file.size : 0;
    }
    file.end = file.start + file.size - 1;
    file.image = image;
    if (file.entry == null) {
      file.entry = file.start;
    }
  } else {
    let i = 0;
    if ((image[i] & 255) == 230)
      ++i;
    file.start = extract_rk86_word(image, i);
    file.end = extract_rk86_word(image, i + 2);
    i += 4;
    file.size = file.end - file.start + 1;
    file.image = image.slice(i, i + file.size);
    file.entry = file.entry != null ? file.entry : file.start;
    if (file.name == "PVO.GAM")
      file.entry = 13312;
  }
  return file;
};
function extact_metadata(text) {
  const initial = {};
  return [...text.matchAll(/!([^ =\t\n\r]+?)=([^ \t\r\n]+)/g)].map((group) => group.slice(1)).reduce((a, [key, value]) => (a[key] = value, a), initial);
}

// src/lib/core/rk86_font.ts
function rk86_font_image() {
  return "data:image/bmp;base64," + "Qk0+IAAAAAAAAD4AAAAoAAAACAAAAAAIAAABAAEAAAAAAAAgAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAP///wAAAAAAGAAAABgAAAB+AAAAfgAAABgAAAAYAAAA" + "AAAAAAAAAAABAAAAAQAAAA8AAAAJAAAACQAAAAAAAAAAAAAAAQAAAD8AAAAq" + "AAAAKgAAACoAAAAqAAAAAAAAAAAAAAAAAAAADgAAAAEAAAAHAAAAAQAAAA4A" + "AAAAAAAAAAAAAAAAAAAfAAAAFQAAABUAAAAVAAAAFQAAAAAAAAAAAAAAAAAA" + "AA4AAAABAAAAAgAAAAkAAAAGAAAAAAAAAAAAAAAAAAAAGQAAABUAAAAZAAAA" + "EQAAABEAAAAAAAAAAAAAAAAAAAAOAAAACQAAAA4AAAAIAAAACAAAAAAAAAAA" + "AAAAAAAAAA4AAAAJAAAADgAAAAkAAAAOAAAAAAAAAAAAAAAAAAAAFQAAABUA" + "AAAOAAAAFQAAABUAAAAAAAAAAAAAAAAAAAAOAAAAAQAAAAcAAAAJAAAACQAA" + "AAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAfAAAAAAAAAAAAAAAAAAAA" + "BwAAAAgAAAAIAAAACAAAAAcAAAAAAAAAAAAAAAgAAAAIAAAACAAAAA4AAAAJ" + "AAAADgAAAAAAAAAAAAAAAAAAAAkAAAAFAAAABwAAAAkAAAAHAAAAAAAAAAAA" + "AAAAAAAACQAAAAkAAAAJAAAACQAAAA8AAAAAAAAAAAAAAAAAAAAGAAAACQAA" + "AAkAAAAJAAAABgAAAAAAAAAAAAAAAAAAAAkAAAAJAAAADwAAAAkAAAAJAAAA" + "AAAAAAAAAAAAAAAAEQAAABUAAAAVAAAAGwAAABEAAAAAAAAAAAAAAAAAAAAJ" + "AAAACQAAAAkAAAAFAAAAAwAAAAAAAAAAAAAAAAAAAAkAAAAKAAAADAAAAAoA" + "AAAJAAAAAAAAAAAAAAAAAAAACQAAAA0AAAALAAAACQAAAAkAAAAAAAAABgAA" + "AAAAAAAJAAAADQAAAAsAAAAJAAAACQAAAAAAAAAAAAAAAAAAAAkAAAAJAAAA" + "BgAAAAYAAAAJAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAA8AAAAA" + "AAAAAAAAAAQAAAAEAAAADgAAABUAAAAOAAAABAAAAAAAAAAAAAAAAAAAAAcA" + "AAAIAAAADgAAAAkAAAAGAAAAAAAAAAAAAAAAAAAADwAAAAEAAAAHAAAACQAA" + "AAYAAAAAAAAAAAAAAAEAAAAfAAAAEgAAABIAAAASAAAAEgAAAAAAAAAAAAAA" + "AAAAAA4AAAAJAAAADgAAAAgAAAAHAAAAAAAAAAAAAAAAAAAABgAAAAkAAAAH" + "AAAAAQAAAA4AAAAAAAAAAAAAAAAAAAASAAAAFQAAAB0AAAAVAAAAEgAAAAAA" + "AAAAAAAAAAAAAAQAAAAMAAAAHgAAAD8AAAAeAAAADAAAAAgAAAAAAAAAAQAA" + "AAMAAAAPAAAADAAAAAgAAAAAAAAAAAAAAAAAAAARAAAACAAAAAgAAAAEAAAA" + "CAAAAAgAAAAQAAAAAAAAAAgAAAAIAAAACAAAAAAAAAAIAAAACAAAAAgAAAAA" + "AAAAAQAAAAIAAAACAAAABAAAAAIAAAACAAAAAQAAAAAAAAAPAAAACAAAAAYA" + "AAABAAAADwAAAAAAAAAAAAAAAAAAAA4AAAABAAAABwAAAAkAAAAJAAAAAAAA" + "AAAAAAAAAAAAEQAAAAoAAAACAAAACgAAABEAAAAAAAAAAAAAAAAAAAAKAAAA" + "FQAAABUAAAARAAAAEQAAAAAAAAAAAAAAAAAAAAQAAAAKAAAAEQAAABEAAAAR" + "AAAAAAAAAAAAAAAAAAAADgAAABEAAAARAAAAEQAAABEAAAAAAAAAAAAAAAAA" + "AAAGAAAACQAAAAgAAAAIAAAAHAAAAAgAAAAIAAAAAAAAAA4AAAABAAAABgAA" + "AAgAAAAHAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACQAAAA4AAAAAAAAA" + "AAAAAAAAAAABAAAABwAAAAkAAAAJAAAABwAAAAAAAAAAAAAAAAAAAAgAAAAO" + "AAAACQAAAAkAAAAOAAAAAAAAAAAAAAAAAAAABgAAAAkAAAAJAAAACQAAAAYA" + "AAAAAAAAAAAAAAAAAAAJAAAACQAAAAkAAAAJAAAADgAAAAAAAAAAAAAAAAAA" + "ABUAAAAVAAAAFQAAABUAAAAaAAAAAAAAAAAAAAAAAAAABwAAAAIAAAACAAAA" + "AgAAAAIAAAACAAAABgAAAAAAAAAJAAAACgAAAAwAAAAKAAAACQAAAAgAAAAI" + "AAAAAAAAAAYAAAAJAAAAAQAAAAEAAAABAAAAAAAAAAEAAAAAAAAABwAAAAIA" + "AAACAAAAAgAAAAYAAAAAAAAAAgAAAAAAAAAJAAAACQAAAAkAAAAJAAAADgAA" + "AAgAAAAIAAAAAAAAAA4AAAABAAAABwAAAAkAAAAHAAAAAAAAAAAAAAAAAAAA" + "CAAAAAgAAAAIAAAAHAAAAAgAAAAJAAAABgAAAAAAAAAHAAAACAAAAA4AAAAJ" + "AAAABgAAAAAAAAAAAAAAAAAAAAcAAAAJAAAACQAAAAkAAAAHAAAAAQAAAAEA" + "AAAAAAAABwAAAAgAAAAIAAAACAAAAAcAAAAAAAAAAAAAAAAAAAAOAAAACQAA" + "AAkAAAAJAAAADgAAAAgAAAAIAAAAAAAAAA0AAAASAAAAEgAAABIAAAAOAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAAEAAAAAAAAAAE" + "AAAAAAAAAAQAAAACAAAAAQAAABEAAAAOAAAAAAAAAAgAAAAEAAAAAgAAAAEA" + "AAACAAAABAAAAAgAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAB8AAAAAAAAAAAAA" + "AAAAAAACAAAABAAAAAgAAAAQAAAACAAAAAQAAAACAAAAAAAAAAgAAAAEAAAA" + "DAAAAAwAAAAAAAAADAAAAAwAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAwAAAAM" + "AAAAAAAAAAAAAAAcAAAAAgAAAAEAAAAPAAAAEQAAABEAAAAOAAAAAAAAAA4A" + "AAARAAAAEQAAAA4AAAARAAAAEQAAAA4AAAAAAAAACAAAAAgAAAAIAAAABAAA" + "AAIAAAABAAAAHwAAAAAAAAAOAAAAEQAAABEAAAAeAAAAEAAAAAgAAAAHAAAA" + "AAAAAA4AAAARAAAAAQAAAAEAAAAeAAAAEAAAAB8AAAAAAAAAAgAAAAIAAAAf" + "AAAAEgAAAAoAAAAGAAAAAgAAAAAAAAAOAAAAEQAAAAEAAAAGAAAAAgAAAAEA" + "AAAfAAAAAAAAAB8AAAAQAAAACAAAAAYAAAABAAAAEQAAAA4AAAAAAAAADgAA" + "AAQAAAAEAAAABAAAAAQAAAAMAAAABAAAAAAAAAAOAAAAEQAAABkAAAAVAAAA" + "EwAAABEAAAAOAAAAAAAAAAAAAAAQAAAACAAAAAQAAAACAAAAAQAAAAAAAAAA" + "AAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAfAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAEAAAADAAAAAwAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAQAAAAEAAAAHwAAAAQAAAAEAAAAAAAAAAAAAAAAAAAA" + "BAAAABUAAAAOAAAAFQAAAAQAAAAAAAAAAAAAAAgAAAAEAAAAAgAAAAIAAAAC" + "AAAABAAAAAgAAAAAAAAAAgAAAAQAAAAIAAAACAAAAAgAAAAEAAAAAgAAAAAA" + "AAAAAAAAAAAAAAAAAAAEAAAAAgAAAAYAAAAGAAAAAAAAAA0AAAASAAAAFQAA" + "AAwAAAAKAAAACgAAAAQAAAAAAAAAAwAAABMAAAAIAAAABAAAAAIAAAAZAAAA" + "GAAAAAAAAAAEAAAAHgAAAAUAAAAOAAAAFAAAAA8AAAAEAAAAAAAAAAoAAAAK" + "AAAAHwAAAAoAAAAfAAAACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoA" + "AAAKAAAACgAAAAAAAAAEAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAUAAAAFAAAABQAAAD0AAAAnAAAAIAAAACAAAAA4" + "AAAABAAAAAwAAAAdAAAAPwAAAD8AAAAdAAAADAAAAAQAAAAAAAAAAAAAAAAA" + "AAA/AAAAPwAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAA" + "AAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8A" + "AAA/AAAAPwAAAD8AAAA/AAAABwAAAAcAAAAHAAAABwAAAD8AAAA/AAAAPwAA" + "AD8AAAA4AAAAOAAAADgAAAA4AAAAPwAAAD8AAAA/AAAAPwAAAAAAAAAAAAAA" + "AAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAPwAAAD8AAAA/AAAAPwAAADgAAAA4" + "AAAAOAAAADgAAAAHAAAABwAAAAcAAAAHAAAAOAAAADgAAAA4AAAAOAAAADgA" + "AAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAAAAAAAAAAAAAAAAAAAAA" + "AAwAAAAeAAAAPwAAAAwAAAAMAAAADAAAAAwAAAAMAAAACAAAAAwAAAAuAAAA" + "PwAAAD8AAAAuAAAADAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAwA" + "AAAMAAAADAAAAAwAAAA/AAAAHgAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAACEAAAASAAAADAAAAAwAAAAtAAAAPwAAAAwAAAAMAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAABwAAAAcAAAAH" + "AAAAPwAAAD8AAAA/AAAAPwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcA" + "AAAHAAAABwAAAAcAAAAHAAAABwAAADgAAAA4AAAAOAAAADgAAAAHAAAABwAA" + "AAcAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAAA" + "PwAAAD8AAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAHAAAABwAAAAcAAAAA" + "AAAAAAAAAAAAAAAAAAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAA" + "AD8AAAAAAAAAAQAAAAEAAAABAAAAHwAAABEAAAARAAAAEQAAAAAAAAABAAAA" + "HwAAABUAAAAVAAAAFQAAABUAAAAVAAAAAAAAAA4AAAARAAAAAQAAAAcAAAAB" + "AAAAEQAAAA4AAAAAAAAAHwAAABUAAAAVAAAAFQAAABUAAAAVAAAAEQAAAAAA" + "AAAOAAAAEQAAAAEAAAAGAAAAEQAAABEAAAAOAAAAAAAAABkAAAAVAAAAFQAA" + "ABkAAAARAAAAEQAAABEAAAAAAAAAHgAAABEAAAARAAAAHgAAABAAAAAQAAAA" + "EAAAAAAAAAAeAAAAEQAAABEAAAAeAAAAEQAAABEAAAAeAAAAAAAAABEAAAAV" + "AAAAFQAAAA4AAAAVAAAAFQAAABEAAAAAAAAAEAAAAAgAAAAEAAAACgAAABEA" + "AAARAAAAEQAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAfAAAAAAAA" + "AA4AAAARAAAAEAAAABAAAAAQAAAAEQAAAA4AAAAAAAAAEAAAABAAAAAQAAAA" + "HgAAABEAAAARAAAAHgAAAAAAAAARAAAACQAAAAUAAAAPAAAAEQAAABEAAAAP" + "AAAAAAAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAAB8AAAAAAAAADgAAABEA" + "AAARAAAAEQAAABEAAAARAAAADgAAAAAAAAARAAAAEQAAABEAAAAfAAAAEQAA" + "ABEAAAARAAAAAAAAABEAAAARAAAAEQAAABUAAAAVAAAAGwAAABEAAAAAAAAA" + "CQAAAAkAAAAJAAAACQAAAAkAAAAJAAAABwAAAAAAAAARAAAAEgAAABQAAAAY" + "AAAAFAAAABIAAAARAAAAAAAAABEAAAARAAAAGQAAABUAAAATAAAAEQAAABUA" + "AAAAAAAAEQAAABEAAAAZAAAAFQAAABMAAAARAAAAEQAAAAAAAAARAAAAEQAA" + "AAoAAAAEAAAACgAAABEAAAARAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAA" + "EQAAAB8AAAAAAAAABAAAAAQAAAAfAAAAFQAAABUAAAAfAAAABAAAAAAAAAAf" + "AAAAEAAAABAAAAAeAAAAEAAAABAAAAAfAAAAAAAAABEAAAAfAAAACgAAAAoA" + "AAAKAAAACgAAAAYAAAAAAAAAAQAAAB8AAAASAAAAEgAAABIAAAASAAAAEgAA" + "AAAAAAAeAAAAEQAAABEAAAAeAAAAEAAAABAAAAAfAAAAAAAAABEAAAARAAAA" + "HwAAABEAAAARAAAACgAAAAQAAAAAAAAAEgAAABUAAAAVAAAAHQAAABUAAAAV" + "AAAAEgAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAEQAAAA4AAAAAAAAADgAAAAIAAAACAAAAAgAA" + "AAIAAAACAAAADgAAAAAAAAAAAAAAAQAAAAIAAAAEAAAACAAAABAAAAAAAAAA" + "AAAAAA4AAAAIAAAACAAAAAgAAAAIAAAACAAAAA4AAAAAAAAAHwAAABAAAAAI" + "AAAADgAAAAIAAAABAAAAHwAAAAAAAAAEAAAABAAAAAQAAAAEAAAACgAAABEA" + "AAARAAAAAAAAABEAAAARAAAACgAAAAQAAAAKAAAAEQAAABEAAAAAAAAACgAA" + "ABUAAAAVAAAAFQAAABEAAAARAAAAEQAAAAAAAAAEAAAABAAAAAoAAAAKAAAA" + "EQAAABEAAAARAAAAAAAAAA4AAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAAA" + "AAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAHwAAAAAAAAAOAAAAEQAAAAEA" + "AAAOAAAAEAAAABEAAAAOAAAAAAAAABEAAAASAAAAFAAAAB4AAAARAAAAEQAA" + "AB4AAAAAAAAADQAAABIAAAAVAAAAEQAAABEAAAARAAAADgAAAAAAAAAQAAAA" + "EAAAABAAAAAeAAAAEQAAABEAAAAeAAAAAAAAAA4AAAARAAAAEQAAABEAAAAR" + "AAAAEQAAAA4AAAAAAAAAEQAAABEAAAATAAAAFQAAABkAAAARAAAAEQAAAAAA" + "AAARAAAAEQAAABEAAAAVAAAAFQAAABsAAAARAAAAAAAAAB8AAAARAAAAEAAA" + "ABAAAAAQAAAAEAAAABAAAAAAAAAAEQAAABIAAAAUAAAAGAAAABQAAAASAAAA" + "EQAAAAAAAAAOAAAAEQAAABEAAAABAAAAAQAAAAEAAAABAAAAAAAAAA4AAAAE" + "AAAABAAAAAQAAAAEAAAABAAAAA4AAAAAAAAAEQAAABEAAAARAAAAHwAAABEA" + "AAARAAAAEQAAAAAAAAAPAAAAEQAAABMAAAAQAAAAEAAAABEAAAAOAAAAAAAA" + "ABAAAAAQAAAAEAAAAB4AAAAQAAAAEAAAAB8AAAAAAAAAHwAAABAAAAAQAAAA" + "HgAAABAAAAAQAAAAHwAAAAAAAAAeAAAACQAAAAkAAAAJAAAACQAAAAkAAAAe" + "AAAAAAAAAA4AAAARAAAAEAAAABAAAAAQAAAAEQAAAA4AAAAAAAAAHgAAABEA" + "AAARAAAAHgAAABEAAAARAAAAHgAAAAAAAAARAAAAEQAAAB8AAAARAAAAEQAA" + "AAoAAAAEAAAAAAAAAA4AAAAQAAAAFwAAABUAAAATAAAAEQAAAA4AAAAAAAAA" + "BAAAAAAAAAAEAAAAAgAAAAEAAAARAAAADgAAAAAAAAAIAAAABAAAAAIAAAAB" + "AAAAAgAAAAQAAAAIAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAfAAAAAAAAAAAA" + "AAAAAAAAAgAAAAQAAAAIAAAAEAAAAAgAAAAEAAAAAgAAAAAAAAAIAAAABAAA" + "AAwAAAAMAAAAAAAAAAwAAAAMAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAA" + "DAAAAAAAAAAAAAAAHAAAAAIAAAABAAAADwAAABEAAAARAAAADgAAAAAAAAAO" + "AAAAEQAAABEAAAAOAAAAEQAAABEAAAAOAAAAAAAAAAgAAAAIAAAACAAAAAQA" + "AAACAAAAAQAAAB8AAAAAAAAADgAAABEAAAARAAAAHgAAABAAAAAIAAAABwAA" + "AAAAAAAOAAAAEQAAAAEAAAABAAAAHgAAABAAAAAfAAAAAAAAAAIAAAACAAAA" + "HwAAABIAAAAKAAAABgAAAAIAAAAAAAAADgAAABEAAAABAAAABgAAAAIAAAAB" + "AAAAHwAAAAAAAAAfAAAAEAAAAAgAAAAGAAAAAQAAABEAAAAOAAAAAAAAAA4A" + "AAAEAAAABAAAAAQAAAAEAAAADAAAAAQAAAAAAAAADgAAABEAAAAZAAAAFQAA" + "ABMAAAARAAAADgAAAAAAAAAAAAAAEAAAAAgAAAAEAAAAAgAAAAEAAAAAAAAA" + "AAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAIAAAABAAAAAwAAAAMAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAEAAAABAAAAB8AAAAEAAAABAAAAAAAAAAAAAAAAAAA" + "AAQAAAAVAAAADgAAABUAAAAEAAAAAAAAAAAAAAAIAAAABAAAAAIAAAACAAAA" + "AgAAAAQAAAAIAAAAAAAAAAIAAAAEAAAACAAAAAgAAAAIAAAABAAAAAIAAAAA" + "AAAAAAAAAAAAAAAAAAAABAAAAAIAAAAGAAAABgAAAAAAAAANAAAAEgAAABUA" + "AAAMAAAACgAAAAoAAAAEAAAAAAAAAAMAAAATAAAACAAAAAQAAAACAAAAGQAA" + "ABgAAAAAAAAABAAAAB4AAAAFAAAADgAAABQAAAAPAAAABAAAAAAAAAAKAAAA" + "CgAAAB8AAAAKAAAAHwAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK" + "AAAACgAAAAoAAAAAAAAABAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAFAAAABQAAAAUAAAA9AAAAJwAAACAAAAAgAAAA" + "OAAAAAQAAAAMAAAAHQAAAD8AAAA/AAAAHQAAAAwAAAAEAAAAAAAAAAAAAAAA" + "AAAAPwAAAD8AAAAAAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwA" + "AAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/" + "AAAAPwAAAD8AAAA/AAAAPwAAAAcAAAAHAAAABwAAAAcAAAA/AAAAPwAAAD8A" + "AAA/AAAAOAAAADgAAAA4AAAAOAAAAD8AAAA/AAAAPwAAAD8AAAAAAAAAAAAA" + "AAAAAAAAAAAAOAAAADgAAAA4AAAAOAAAAD8AAAA/AAAAPwAAAD8AAAA4AAAA" + "OAAAADgAAAA4AAAABwAAAAcAAAAHAAAABwAAADgAAAA4AAAAOAAAADgAAAA4" + "AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAA" + "AAAMAAAAHgAAAD8AAAAMAAAADAAAAAwAAAAMAAAADAAAAAgAAAAMAAAALgAA" + "AD8AAAA/AAAALgAAAAwAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAM" + "AAAADAAAAAwAAAAMAAAAPwAAAB4AAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAhAAAAEgAAAAwAAAAMAAAALQAAAD8AAAAMAAAADAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAcAAAAHAAAA" + "BwAAAD8AAAA/AAAAPwAAAD8AAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAH" + "AAAABwAAAAcAAAAHAAAABwAAAAcAAAA4AAAAOAAAADgAAAA4AAAABwAAAAcA" + "AAAHAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAA" + "AD8AAAA/AAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAHAAAABwAAAAcAAAAHAAAA" + "AAAAAAAAAAAAAAAAAAAAADgAAAA4AAAAOAAAADgAAAAAAAAAAAAAAAAAAAAA" + "AAAAAAAAAAAAAAAAAAAAAAAAAA==";
}

// src/lib/core/rk86_keyboard.ts
class Keyboard {
  state;
  modifiers;
  keydown = (code) => {
    if (code === "ShiftLeft" || code === "ShiftRight")
      this.modifiers &= ~SS;
    if (code === "ControlLeft")
      this.modifiers &= ~US;
    if (code === "F10")
      this.modifiers &= ~RL;
    const key = Keyboard.key_table[code];
    if (key)
      this.state[key[0]] &= ~key[1];
  };
  keyup = (code) => {
    if (code === "ShiftLeft" || code === "ShiftRight")
      this.modifiers |= SS;
    if (code === "ControlLeft")
      this.modifiers |= US;
    if (code === "F10")
      this.modifiers |= RL;
    const key = Keyboard.key_table[code];
    if (key)
      this.state[key[0]] |= key[1];
  };
  onkeydown = (code) => this.keydown(code);
  onkeyup = (code) => this.keyup(code);
  constructor() {
    this.reset();
  }
  reset() {
    this.state = [255, 255, 255, 255, 255, 255, 255, 255];
    this.modifiers = 255;
  }
  export() {
    const h8 = (n) => "0x" + hex8(n);
    return {
      state: this.state.map(h8),
      modifiers: h8(this.modifiers)
    };
  }
  import(snapshot) {
    this.state = snapshot.state.map(fromHex);
    this.modifiers = fromHex(snapshot.modifiers);
  }
  static key_table = {
    F8: [0, 1],
    F9: [0, 2],
    F5: [0, 4],
    F1: [0, 8],
    F2: [0, 16],
    F3: [0, 32],
    F4: [0, 64],
    Tab: [1, 1],
    Backquote: [1, 2],
    Enter: [1, 4],
    Backspace: [1, 8],
    ArrowLeft: [1, 16],
    ArrowUp: [1, 32],
    ArrowRight: [1, 64],
    ArrowDown: [1, 128],
    Digit0: [2, 1],
    Digit1: [2, 2],
    Digit2: [2, 4],
    Digit3: [2, 8],
    Digit4: [2, 16],
    Digit5: [2, 32],
    Digit6: [2, 64],
    Digit7: [2, 128],
    Digit8: [3, 1],
    Digit9: [3, 2],
    F6: [3, 4],
    Semicolon: [3, 8],
    Comma: [3, 16],
    Minus: [3, 32],
    Period: [3, 64],
    Slash: [3, 128],
    F7: [4, 1],
    KeyA: [4, 2],
    KeyB: [4, 4],
    KeyC: [4, 8],
    KeyD: [4, 16],
    KeyE: [4, 32],
    KeyF: [4, 64],
    KeyG: [4, 128],
    KeyH: [5, 1],
    KeyI: [5, 2],
    KeyJ: [5, 4],
    KeyK: [5, 8],
    KeyL: [5, 16],
    KeyM: [5, 32],
    KeyN: [5, 64],
    KeyO: [5, 128],
    KeyP: [6, 1],
    KeyQ: [6, 2],
    KeyR: [6, 4],
    KeyS: [6, 8],
    KeyT: [6, 16],
    KeyU: [6, 32],
    KeyV: [6, 64],
    KeyW: [6, 128],
    KeyX: [7, 1],
    KeyY: [7, 2],
    KeyZ: [7, 4],
    BracketLeft: [7, 8],
    Backslash: [7, 16],
    BracketRight: [7, 32],
    Quote: [7, 64],
    Space: [7, 128]
  };
}
var SS = 32;
var US = 64;
var RL = 128;

// src/lib/core/hex_map.ts
function create(array, width = 16) {
  const v = {};
  for (let i = 0;i < array.length; i += width) {
    v[":" + hex16(i).toString()] = hexArray(array.slice(i, i + width));
  }
  return v;
}
function parse2(hex2) {
  const array = [];
  for (let [label, line] of Object.entries(hex2)) {
    const address = parseInt(label.slice(1), 16);
    const line_values = line.split(" ").map((value) => parseInt(value, 16));
    for (let j = 0;j < line_values.length; j++) {
      array[address + j] = line_values[j];
    }
  }
  return array;
}

// src/lib/core/rk86_memory.ts
class Memory {
  buf = [];
  update_ruslat = () => {};
  machine;
  vg75_c001_00_cmd = 0;
  video_screen_size_x_buf = 0;
  video_screen_size_y_buf = 0;
  ik57_e008_80_cmd = 0;
  ik57_ff = 0;
  vg75_c001_80_cmd = 0;
  cursor_x_buf = 0;
  cursor_y_buf = 0;
  vg75_c001_60_cmd = 0;
  tape_8002_as_output = 0;
  video_memory_base_buf = 0;
  video_memory_size_buf = 0;
  video_memory_base = 0;
  video_memory_size = 0;
  video_screen_size_x = 0;
  video_screen_size_y = 0;
  video_screen_cursor_x = 0;
  video_screen_cursor_y = 0;
  last_access_address = 0;
  last_access_operation = undefined;
  tracer = null;
  constructor(machine) {
    this.machine = machine;
    this.init();
    this.invalidate_access_variables();
  }
  init() {
    this.buf = new Array(65536).fill(0);
    this.vg75_c001_00_cmd = 0;
    this.video_screen_size_x_buf = 0;
    this.video_screen_size_y_buf = 0;
    this.ik57_e008_80_cmd = 0;
    this.ik57_ff = 0;
    this.vg75_c001_80_cmd = 0;
    this.cursor_x_buf = 0;
    this.cursor_y_buf = 0;
    this.vg75_c001_60_cmd = 0;
    this.tape_8002_as_output = 0;
    this.video_memory_base_buf = 0;
    this.video_memory_size_buf = 0;
    this.video_memory_base = 0;
    this.video_memory_size = 0;
    this.video_screen_size_x = 0;
    this.video_screen_size_y = 0;
    this.video_screen_cursor_x = 0;
    this.video_screen_cursor_y = 0;
  }
  zero_ram() {
    for (let i = 0;i < 32768; ++i)
      this.buf[i] = 0;
  }
  snapshot(from, sz) {
    return this.buf.slice(from, from + sz);
  }
  export() {
    const h16 = (n) => "0x" + hex16(n);
    return {
      vg75_c001_00_cmd: this.vg75_c001_00_cmd,
      video_screen_size_x_buf: this.video_screen_size_x_buf,
      video_screen_size_y_buf: this.video_screen_size_y_buf,
      vg75_c001_80_cmd: this.vg75_c001_80_cmd,
      cursor_x_buf: this.cursor_x_buf,
      cursor_y_buf: this.cursor_y_buf,
      vg75_c001_60_cmd: this.vg75_c001_60_cmd,
      ik57_e008_80_cmd: this.ik57_e008_80_cmd,
      ik57_ff: this.ik57_ff,
      tape_8002_as_output: this.tape_8002_as_output,
      video_memory_base_buf: h16(this.video_memory_base_buf),
      video_memory_size_buf: h16(this.video_memory_size_buf),
      video_memory_base: h16(this.video_memory_base),
      video_memory_size: h16(this.video_memory_size),
      video_screen_size_x: this.video_screen_size_x,
      video_screen_size_y: this.video_screen_size_y,
      video_screen_cursor_x: this.video_screen_cursor_x,
      video_screen_cursor_y: this.video_screen_cursor_y,
      last_access_address: h16(this.last_access_address),
      last_access_operation: this.last_access_operation,
      memory: create(this.buf)
    };
  }
  import = (snapshot) => {
    const h = fromHex;
    this.vg75_c001_00_cmd = snapshot.vg75_c001_00_cmd;
    this.video_screen_size_x_buf = snapshot.video_screen_size_x_buf;
    this.video_screen_size_y_buf = snapshot.video_screen_size_y_buf;
    this.vg75_c001_80_cmd = snapshot.vg75_c001_80_cmd;
    this.cursor_x_buf = snapshot.cursor_x_buf;
    this.cursor_y_buf = snapshot.cursor_y_buf;
    this.vg75_c001_60_cmd = snapshot.vg75_c001_60_cmd;
    this.ik57_e008_80_cmd = snapshot.ik57_e008_80_cmd;
    this.ik57_ff = snapshot.ik57_ff ?? 0;
    this.tape_8002_as_output = snapshot.tape_8002_as_output;
    this.video_memory_base_buf = h(snapshot.video_memory_base_buf);
    this.video_memory_size_buf = h(snapshot.video_memory_size_buf);
    this.video_memory_base = h(snapshot.video_memory_base);
    this.video_memory_size = h(snapshot.video_memory_size);
    this.video_screen_size_x = snapshot.video_screen_size_x;
    this.video_screen_size_y = snapshot.video_screen_size_y;
    this.video_screen_cursor_x = snapshot.video_screen_cursor_x;
    this.video_screen_cursor_y = snapshot.video_screen_cursor_y;
    this.last_access_address = h(snapshot.last_access_address);
    this.last_access_operation = snapshot.last_access_operation;
    this.buf = parse2(snapshot.memory);
  };
  invalidate_access_variables() {
    this.last_access_address = 0;
    this.last_access_operation = undefined;
  }
  length() {
    return 65536;
  }
  read_raw(address) {
    const addr = address & 65535;
    return this.buf[addr] & 255;
  }
  read(address) {
    const addr = address & 65535;
    this.last_access_address = addr;
    this.last_access_operation = "read";
    this.tracer?.("read", addr);
    const ppi_reg = addr & 57347;
    const vg75_reg = addr & 57345;
    if (ppi_reg === 32770)
      return this.machine.keyboard.modifiers;
    if (ppi_reg === 32769) {
      const keyboard_state = this.machine.keyboard.state;
      let ch = 255;
      const kbd_scanline = ~this.buf[32768];
      for (let i = 0;i < 8; i++)
        if (1 << i & kbd_scanline)
          ch &= keyboard_state[i];
      return ch;
    }
    if (vg75_reg === 49153) {
      const ticks = this.machine.runner.total_ticks;
      const FRAME = 35600;
      const VRTC_ON = 3560;
      const vrtc = ticks % FRAME >= FRAME - VRTC_ON ? 32 : 0;
      return vrtc | (this.machine.screen.light_pen_active ? 16 : 0);
    }
    if (vg75_reg === 49152) {
      if (this.vg75_c001_60_cmd === 1) {
        this.vg75_c001_60_cmd = 2;
        return this.machine.screen.light_pen_x;
      }
      if (this.vg75_c001_60_cmd === 2) {
        this.vg75_c001_60_cmd = 0;
        return this.machine.screen.light_pen_y;
      }
      return 0;
    }
    return this.buf[addr];
  }
  write_raw(address, value8) {
    const addr = address & 65535;
    const byte = value8 & 255;
    this.buf[addr] = byte;
  }
  write = (address, value8) => {
    const addr = address & 65535;
    const byte = value8 & 255;
    this.last_access_address = addr;
    this.last_access_operation = "write";
    this.tracer?.("write", addr);
    if (addr < 63488)
      this.buf[addr] = byte;
    const ppi_reg = addr & 57347;
    const vg75_reg = addr & 57345;
    const vt57_reg = addr & 57359;
    if (ppi_reg === 32771) {
      if (byte & 128) {} else {
        const bit = byte >> 1 & 3;
        const value = byte & 1;
        if (bit === 3)
          this.set_ruslat(value);
      }
      return;
    }
    if (vg75_reg === 49153 && byte === 39)
      return;
    if (vg75_reg === 49153 && byte === 224)
      return;
    if (vg75_reg === 49153 && byte === 128) {
      this.vg75_c001_80_cmd = 1;
      return;
    }
    if (vg75_reg === 49152 && this.vg75_c001_80_cmd === 1) {
      this.vg75_c001_80_cmd += 1;
      this.cursor_x_buf = byte + 1;
      return;
    }
    if (vg75_reg === 49152 && this.vg75_c001_80_cmd === 2) {
      this.cursor_y_buf = byte + 1;
      this.machine.screen.set_cursor(this.cursor_x_buf - 1, this.cursor_y_buf - 1);
      this.video_screen_cursor_x = this.cursor_x_buf;
      this.video_screen_cursor_y = this.cursor_y_buf;
      this.vg75_c001_80_cmd = 0;
      return;
    }
    if (vg75_reg === 49153 && byte === 96) {
      if (this.machine.screen.light_pen_active)
        this.vg75_c001_60_cmd = 1;
      return;
    }
    if (vg75_reg === 49153 && byte === 0) {
      this.vg75_c001_00_cmd = 1;
      return;
    }
    if (vg75_reg === 49152 && this.vg75_c001_00_cmd === 1) {
      this.video_screen_size_x_buf = (byte & 127) + 1;
      this.vg75_c001_00_cmd += 1;
      return;
    }
    if (vg75_reg === 49152 && this.vg75_c001_00_cmd === 2) {
      this.video_screen_size_y_buf = (byte & 63) + 1;
      this.vg75_c001_00_cmd += 1;
      return;
    }
    if (vg75_reg === 49152 && this.vg75_c001_00_cmd === 3) {
      this.vg75_c001_00_cmd += 1;
      return;
    }
    if (vg75_reg === 49152 && this.vg75_c001_00_cmd === 4) {
      this.vg75_c001_00_cmd = 0;
      if (this.video_screen_size_x_buf && this.video_screen_size_y_buf) {
        this.video_screen_size_x = this.video_screen_size_x_buf;
        this.video_screen_size_y = this.video_screen_size_y_buf;
        this.machine.screen.set_geometry(this.video_screen_size_x, this.video_screen_size_y);
      }
      this.machine.screen.transparent_attr = (byte & 64) === 0;
      return;
    }
    if (vt57_reg === 57352 && byte === 128) {
      this.ik57_e008_80_cmd = 1;
      this.ik57_ff = 0;
      this.tape_8002_as_output = 1;
      return;
    }
    if (vt57_reg === 57348 && this.ik57_e008_80_cmd === 1) {
      this.video_memory_base_buf = byte;
      this.ik57_e008_80_cmd += 1;
      return;
    }
    if (vt57_reg === 57348 && this.ik57_e008_80_cmd === 2) {
      this.video_memory_base_buf |= byte << 8;
      this.ik57_e008_80_cmd += 1;
      return;
    }
    if (vt57_reg === 57349 && this.ik57_e008_80_cmd === 3) {
      this.video_memory_size_buf = byte;
      this.ik57_e008_80_cmd += 1;
      return;
    }
    if (vt57_reg === 57349 && this.ik57_e008_80_cmd === 4) {
      this.video_memory_size_buf = ((this.video_memory_size_buf | byte << 8) & 16383) + 1;
      this.ik57_e008_80_cmd = 0;
      this.video_memory_base = this.video_memory_base_buf;
      this.video_memory_size = this.video_memory_size_buf;
      this.machine.screen.set_video_memory(this.video_memory_base);
      return;
    }
    if (vt57_reg === 57352 && byte === 164) {
      this.tape_8002_as_output = 0;
      return;
    }
    if (vt57_reg === 57348 && this.ik57_e008_80_cmd === 0) {
      if (this.ik57_ff === 0) {
        this.video_memory_base_buf = this.video_memory_base & 65280 | byte;
        this.ik57_ff = 1;
      } else {
        this.video_memory_base = this.video_memory_base_buf & 255 | byte << 8;
        this.video_memory_base_buf = this.video_memory_base;
        this.machine.screen.set_video_memory(this.video_memory_base);
        this.ik57_ff = 0;
      }
      return;
    }
    if (vt57_reg === 57349 && this.ik57_e008_80_cmd === 0) {
      if (this.ik57_ff === 0) {
        this.video_memory_size_buf = byte;
        this.ik57_ff = 1;
      } else {
        this.video_memory_size = ((this.video_memory_size_buf | byte << 8) & 16383) + 1;
        this.video_memory_size_buf = this.video_memory_size;
        this.ik57_ff = 0;
      }
      return;
    }
    if (ppi_reg === 32770) {
      if (this.tape_8002_as_output) {
        this.tape_write_bit(byte & 1);
      }
      return;
    }
  };
  tape_write_bit(bit) {
    this.machine.tape.write_bit(bit);
  }
  set_ruslat(value) {
    if (this.update_ruslat)
      this.update_ruslat(value);
  }
  load_file(file) {
    for (let i = file.start;i <= file.end; ++i) {
      this.write_raw(i, file.image[i - file.start]);
    }
  }
}

// src/lib/core/rk86_runner.ts
class Runner {
  paused = false;
  tracer = null;
  last_instructions = [];
  previous_batch_time = 0;
  total_ticks = 0;
  last_iff_raise_ticks = 0;
  last_iff = 0;
  sound = null;
  sound_factory;
  instructions_per_millisecond = 0;
  ticks_per_millisecond = 0;
  FREQ = 1780000;
  TICK_PER_MS;
  execute_timer;
  machine;
  constructor(machine) {
    this.machine = machine;
    this.TICK_PER_MS = this.FREQ / 100;
    this.machine.io.interrupt = (iff) => this.interrupt(iff);
    this.machine.cpu.jump(63488);
  }
  interrupt(iff) {
    if (!this.sound)
      return;
    if (this.last_iff == iff)
      return;
    if (this.last_iff == 0 && iff == 1) {
      this.last_iff_raise_ticks = this.total_ticks;
    }
    if (this.last_iff == 1 && iff == 0) {
      const tone_ticks = this.total_ticks - this.last_iff_raise_ticks;
      const tone = this.FREQ / (tone_ticks * 2);
      const duration = 1 / tone;
      this.sound.play(tone, duration);
    }
    this.last_iff = iff;
  }
  init_sound(enabled) {
    if (enabled && this.sound == null && this.sound_factory) {
      this.sound = this.sound_factory();
      this.machine.log("\u0437\u0432\u0443\u043A \u0432\u043A\u043B\u044E\u0447\u0435\u043D");
    } else if (!enabled) {
      this.sound = null;
      this.machine.log("\u0437\u0432\u0443\u043A \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D");
    }
  }
  execute(options = {}) {
    const { terminate_address, on_terminate, exit_on_halt, on_halt, on_batch_complete, turbo } = options;
    clearTimeout(this.execute_timer);
    const bursts = turbo ? 100 : 1;
    for (let burst = 0;burst < bursts; burst++) {
      if (this.paused)
        break;
      let batch_ticks = 0;
      let batch_instructions = 0;
      while (batch_ticks < this.TICK_PER_MS) {
        if (this.tracer) {
          this.tracer("before");
          if (this.paused)
            break;
        }
        this.last_instructions.push(this.machine.cpu.pc);
        if (this.last_instructions.length > 5) {
          this.last_instructions.shift();
        }
        this.machine.memory.invalidate_access_variables();
        const instruction_ticks = this.machine.cpu.instruction();
        batch_ticks += instruction_ticks;
        this.total_ticks += instruction_ticks;
        if (this.tracer) {
          this.tracer("after");
          if (this.paused)
            break;
        }
        if (this.machine.ui.visualizer_visible && this.machine.ui.on_visualizer_hit) {
          this.machine.ui.on_visualizer_hit(this.machine.memory.read_raw(this.machine.cpu.pc));
        }
        batch_instructions += 1;
        if (terminate_address !== undefined && this.machine.cpu.pc === terminate_address) {
          on_terminate?.();
          return;
        }
        if (this.machine.memory.read_raw(this.machine.cpu.pc) === 118) {
          if (exit_on_halt) {
            on_terminate?.();
            return;
          }
          if (on_halt && on_halt())
            return;
        }
      }
      const now = performance.now();
      const elapsed = now - this.previous_batch_time;
      this.previous_batch_time = now;
      this.instructions_per_millisecond = batch_instructions / elapsed;
      this.ticks_per_millisecond = batch_ticks / elapsed;
      this.machine.screen.tick_cursor(this.total_ticks, this.FREQ * (this.machine.screen.cursor_rate / 1000));
      on_batch_complete?.();
    }
    this.execute_timer = setTimeout(() => this.execute(options), turbo ? 0 : 10);
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  reset() {
    this.machine.cpu.jump(63488);
    this.machine.keyboard.reset();
  }
}

// src/lib/core/rk86_screen.ts
class Screen {
  static #update_rate = 40;
  machine;
  cursor_rate;
  scale_x;
  scale_y;
  width;
  height;
  cursor_state;
  cursor_x;
  cursor_y;
  light_pen_x;
  light_pen_y;
  light_pen_active;
  video_memory_base = 0;
  video_memory_size = 0;
  transparent_attr = false;
  color_mode = DEFAULT_COLOR_MODE;
  ready = false;
  renderer;
  constructor(machine) {
    this.machine = machine;
    this.cursor_rate = 500;
    this.scale_x = 1;
    this.scale_y = 1;
    this.width = 78;
    this.height = 30;
    this.cursor_state = false;
    this.cursor_x = 0;
    this.cursor_y = 0;
    this.light_pen_x = 0;
    this.light_pen_y = 0;
    this.light_pen_active = 0;
  }
  export() {
    const h16 = (n) => "0x" + hex16(n);
    return {
      scale_x: this.scale_x,
      scale_y: this.scale_y,
      width: this.width,
      height: this.height,
      cursor_state: this.cursor_state ? 1 : 0,
      cursor_x: this.cursor_x,
      cursor_y: this.cursor_y,
      video_memory_base: h16(this.video_memory_base),
      video_memory_size: h16(this.video_memory_size),
      light_pen_x: this.light_pen_x,
      light_pen_y: this.light_pen_y,
      light_pen_active: this.light_pen_active
    };
  }
  import(snapshot) {
    const h = fromHex;
    this.scale_x = h(snapshot.scale_x);
    this.scale_y = h(snapshot.scale_y);
    this.width = h(snapshot.width);
    this.height = h(snapshot.height);
    this.cursor_state = h(snapshot.cursor_state) ? true : false;
    this.cursor_x = h(snapshot.cursor_x);
    this.cursor_y = h(snapshot.cursor_y);
    this.video_memory_base = h(snapshot.video_memory_base);
    this.video_memory_size = h(snapshot.video_memory_size);
    this.light_pen_x = h(snapshot.light_pen_x);
    this.light_pen_y = h(snapshot.light_pen_y);
    this.light_pen_active = h(snapshot.light_pen_active);
  }
  apply_import() {
    this.set_geometry(this.width, this.height);
    this.set_video_memory(this.video_memory_base);
  }
  start(renderer) {
    this.renderer = renderer;
    this.renderer.connect(this.machine);
    this.render_loop();
  }
  last_flip_ticks = 0;
  tick_cursor(total_ticks, ticks_per_flip) {
    while (total_ticks - this.last_flip_ticks >= ticks_per_flip) {
      this.cursor_state = !this.cursor_state;
      this.last_flip_ticks += ticks_per_flip;
    }
  }
  render_loop() {
    if (this.ready)
      this.renderer.update();
    setTimeout(() => this.render_loop(), Screen.#update_rate);
  }
  last_width = -1;
  last_height = -1;
  set_geometry(width, height) {
    this.width = width;
    this.height = height;
    this.video_memory_size = width * height;
    this.machine.ui.update_screen_geometry(this.width, this.height);
    if (this.last_width === this.width && this.last_height === this.height)
      return;
    this.machine.log(`\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0440\u0430\u0437\u043C\u0435\u0440 \u044D\u043A\u0440\u0430\u043D\u0430: ${width} x ${height}`);
    this.last_width = this.width;
    this.last_height = this.height;
    if (this.last_video_memory_base !== -1)
      this.ready = true;
  }
  last_video_memory_base = -1;
  set_video_memory(base) {
    this.video_memory_base = base;
    this.machine.ui.update_video_memory_address(this.video_memory_base);
    if (this.last_video_memory_base === this.video_memory_base)
      return;
    this.machine.log(`\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0432\u0438\u0434\u0435\u043E\u043F\u0430\u043C\u044F\u0442\u044C \u0441 \u0430\u0434\u0440\u0435\u0441\u0430`, `${hex16(this.video_memory_base)}`, `\u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C ${hex16(this.video_memory_size)}`);
    this.last_video_memory_base = this.video_memory_base;
    if (this.last_width !== -1)
      this.ready = true;
  }
  set_cursor(x, y) {
    this.cursor_x = x;
    this.cursor_y = y;
  }
}

// src/lib/core/rk86_snapshot.ts
function rk86_snapshot(machine, version) {
  const { screen, cpu, keyboard, memory } = machine;
  const h16 = (n) => "0x" + hex16(n);
  const snapshot = {
    id: "rk86",
    created: new Date().toISOString(),
    format: "1",
    emulator: "rk86.ru",
    version,
    start: h16(0),
    end: h16(65535),
    boot: { keyboard: [] },
    cpu: cpu.export(),
    keyboard: keyboard.export(),
    screen: screen.export(),
    memory: memory.export()
  };
  return JSON.stringify(snapshot, null, 4);
}
function rk86_snapshot_restore(snapshot, machine, keys_injector) {
  try {
    const json = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    if (json.id != "rk86")
      return false;
    if (!machine)
      return false;
    const { screen, cpu, memory, keyboard } = machine;
    cpu.import(json.cpu);
    keyboard.import(json.keyboard);
    screen.import(json.screen);
    memory.import(json.memory);
    screen.apply_import();
    if (keys_injector && json.boot?.keyboard)
      keys_injector(json.boot?.keyboard);
    return true;
  } catch (e) {
    console.error("failed restoring snapshot", e);
    return false;
  }
}

// src/lib/web/tape.ts
class Tape {
  machine;
  previous_bit_ticks = 0;
  bit_started = false;
  bit_count = 0;
  current_byte = 0;
  written_bytes = [];
  written_bytes_from_e6 = 0;
  output_block_count = 0;
  output_timer = null;
  constructor(machine) {
    this.machine = machine;
  }
  save(bytes) {
    const binary = new Uint8Array(bytes);
    const blob = new Blob([binary], { type: "image/gif" });
    const filename = `rk86-tape-${this.output_block_count}.bin`;
    Tape.saveAs(blob, filename);
    this.output_block_count += 1;
  }
  log(bytes) {
    for (let i = 0;i < bytes.length; i += 16) {
      const line = bytes.slice(i, i + 16);
      console.log(i.toString(16).padStart(4, "0").toUpperCase() + ":", line.map((byte) => byte.toString(16).padStart(2, "0")).join(" "));
    }
  }
  write_ended = () => {
    this.bit_started = false;
    this.current_byte = 0;
    this.bit_count = 0;
    this.written_bytes = [];
    this.written_bytes_from_e6 = 0;
    const ui = this.machine.ui;
    ui.update_activity_indicator(false);
    ui.hightlight_written_bytes(false);
  };
  flush = () => {
    const sync_byte_index = this.written_bytes.findIndex((byte) => byte === 230);
    if (sync_byte_index === -1) {
      console.error("sync byte E6 is not found");
      this.log(this.written_bytes);
    } else {
      console.log(`${sync_byte_index} bytes before sync byte`);
      const bytes = this.written_bytes.slice(sync_byte_index);
      this.log(bytes);
      this.save(bytes);
    }
    this.write_ended();
  };
  write_bit = (bit) => {
    const runner_ticks = this.machine.runner.total_ticks;
    const time = runner_ticks - this.previous_bit_ticks;
    if (time > 1e4) {
      console.log("reset tape buffer due to timeout");
      this.write_ended();
    }
    if (!this.bit_started) {
      this.bit_started = true;
    } else {
      this.bit_started = false;
      this.current_byte |= (bit ? 128 : 0) >> this.bit_count;
      if (this.bit_count < 7) {
        this.bit_count += 1;
      } else {
        this.written_bytes.push(this.current_byte);
        if (this.current_byte === 230 || this.written_bytes_from_e6 > 0) {
          this.written_bytes_from_e6 += 1;
        }
        if (this.written_bytes.length === 1) {
          this.machine.ui.update_activity_indicator(true);
          this.machine.ui.update_written_bytes(0);
        }
        if (this.written_bytes_from_e6 === 1)
          this.machine.ui.hightlight_written_bytes(true);
        if (this.written_bytes_from_e6 > 0)
          this.machine.ui.update_written_bytes(this.written_bytes_from_e6);
        if (this.output_timer)
          clearTimeout(this.output_timer);
        this.output_timer = setTimeout(this.flush, 1000);
        this.current_byte = 0;
        this.bit_count = 0;
      }
    }
    this.previous_bit_ticks = runner_ticks;
  };
  static saveAs(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

// src/lib/terminal/rk86_terminal.ts
var UPLOAD_SERVER = "https://rk86.ea.deno.net";
var charMap = {
  0: " ",
  1: "\u2598",
  2: "\u259D",
  3: "\u2580",
  4: "\u2597",
  5: "\u259A",
  6: "\u2590",
  7: "\u259C",
  8: " ",
  9: "\u273F",
  10: " ",
  11: "\u2191",
  12: " ",
  13: " ",
  14: "\u25C0",
  15: "\u25BC",
  16: "\u2596",
  17: "\u258C",
  18: "\u259E",
  19: "\u259B",
  20: "\u2584",
  21: "\u2599",
  22: "\u259F",
  23: "\u2588",
  24: " ",
  25: " ",
  26: " ",
  27: "\u2502",
  28: "\u2500",
  29: "\u25B6",
  30: "\u2310",
  31: " ",
  32: " ",
  33: "!",
  34: '"',
  35: "#",
  36: "$",
  37: "%",
  38: "&",
  39: "'",
  40: "(",
  41: ")",
  42: "*",
  43: "+",
  44: ",",
  45: "-",
  46: ".",
  47: "/",
  48: "0",
  49: "1",
  50: "2",
  51: "3",
  52: "4",
  53: "5",
  54: "6",
  55: "7",
  56: "8",
  57: "9",
  58: ":",
  59: ";",
  60: "<",
  61: "=",
  62: ">",
  63: "?",
  64: "@",
  65: "A",
  66: "B",
  67: "C",
  68: "D",
  69: "E",
  70: "F",
  71: "G",
  72: "H",
  73: "I",
  74: "J",
  75: "K",
  76: "L",
  77: "M",
  78: "N",
  79: "O",
  80: "P",
  81: "Q",
  82: "R",
  83: "S",
  84: "T",
  85: "U",
  86: "V",
  87: "W",
  88: "X",
  89: "Y",
  90: "Z",
  91: "[",
  92: "\\",
  93: "]",
  94: "^",
  95: "_",
  96: "\u042E",
  97: "\u0410",
  98: "\u0411",
  99: "\u0426",
  100: "\u0414",
  101: "\u0415",
  102: "\u0424",
  103: "\u0413",
  104: "\u0425",
  105: "\u0418",
  106: "\u0419",
  107: "\u041A",
  108: "\u041B",
  109: "\u041C",
  110: "\u041D",
  111: "\u041E",
  112: "\u041F",
  113: "\u042F",
  114: "\u0420",
  115: "\u0421",
  116: "\u0422",
  117: "\u0423",
  118: "\u0416",
  119: "\u0412",
  120: "\u042C",
  121: "\u042B",
  122: "\u0417",
  123: "\u0428",
  124: "\u042D",
  125: "\u0429",
  126: "\u0427",
  127: "\u2588"
};
for (let i = 0;i < 128; i++)
  charMap[128 + i] = charMap[i];
function rk86char(byte) {
  return charMap[byte & 255] ?? "\xB7";
}

class TerminalUI {
  canvas = { getContext: () => null, width: 0, height: 0 };
  visualizer_visible = false;
  i8080disasm;
  visualizer;
  on_visualizer_hit;
  on_pause_changed;
  refreshDebugger;
  resize_canvas() {}
  update_screen_geometry() {}
  update_video_memory_address() {}
  update_ruslat = () => {};
  update_activity_indicator = () => {};
  update_written_bytes = () => {};
  hightlight_written_bytes = () => {};
  start_update_perf = () => {};
  screenshot() {}
  memory_snapshot() {}
  emulator_snapshot() {}
}

class IO {
  input = (_port) => 0;
  output = (_port, _w8) => {};
  interrupt = (_iff) => {};
}

class TerminalRenderer {
  machine;
  loadInfo = "";
  loadInfoPrinted = false;
  connect(machine) {
    this.machine = machine;
  }
  update() {
    const { memory, screen } = this.machine;
    const dim = "\x1B[2m";
    const reset = "\x1B[0m";
    const w = screen.width;
    const mode = screen.color_mode;
    let output = "\x1B[H";
    output += `${dim}\u250C${"\u2500".repeat(w)}\u2510${reset}
`;
    const transparent = screen.transparent_attr;
    const offset = hasCellOffset(mode) && !transparent;
    const blinkOff = Math.floor(Date.now() / 320) % 2 === 1;
    const FA_PENDING = -1;
    let addr = screen.video_memory_base;
    let frameStopped = false;
    let latchedAttrs = 0;
    let blink = false;
    for (let y = 0;y < screen.height; y++) {
      let line = `${dim}\u2502${reset}`;
      const cells = new Array(w);
      if (transparent) {
        const fifo = [];
        let fifoFlag = false;
        let cellCount = 0;
        let rowStopped = frameStopped;
        let bytesFetched = 0;
        while (cellCount < w && !rowStopped) {
          const raw = memory.read(addr + bytesFetched);
          bytesFetched++;
          if (fifoFlag) {
            fifo.push(raw);
            fifoFlag = false;
            continue;
          }
          if (raw >= 240) {
            cells[cellCount++] = { ch: 0, attrs: latchedAttrs, blink, isFA: false };
            rowStopped = true;
            if (raw >= 248)
              frameStopped = true;
          } else if (raw >= 192) {
            cells[cellCount++] = { ch: 0, attrs: latchedAttrs, blink, isFA: false };
          } else if (raw >= 128) {
            latchedAttrs = raw;
            blink = (raw & 2) !== 0;
            cells[cellCount++] = { ch: FA_PENDING, attrs: latchedAttrs, blink, isFA: true };
            fifoFlag = true;
          } else {
            cells[cellCount++] = { ch: raw, attrs: latchedAttrs, blink, isFA: false };
          }
        }
        while (cellCount < w)
          cells[cellCount++] = { ch: 0, attrs: latchedAttrs, blink, isFA: false };
        let fifoIdx = 0;
        for (let x = 0;x < w; ++x) {
          if (cells[x].ch === FA_PENDING) {
            cells[x].ch = (fifo[fifoIdx] ?? 0) & 127;
            fifoIdx++;
          }
        }
        addr += bytesFetched;
        if (addr - screen.video_memory_base < (y + 1) * w) {
          addr = screen.video_memory_base + (y + 1) * w;
        }
      } else {
        let rowStopped = frameStopped;
        for (let x = 0;x < w; x++) {
          const raw = memory.read(addr + x);
          let ch;
          let isFA = false;
          if (rowStopped) {
            ch = 0;
          } else if (raw >= 240) {
            ch = 0;
            rowStopped = true;
            if (raw >= 248)
              frameStopped = true;
          } else if (raw >= 192) {
            ch = 0;
          } else if (raw >= 128) {
            latchedAttrs = raw;
            blink = (raw & 2) !== 0;
            ch = 0;
            isFA = true;
          } else {
            ch = raw;
          }
          cells[x] = { ch, attrs: latchedAttrs, blink, isFA };
        }
        addr += w;
      }
      let prevAnsi = -1;
      for (let x = 0;x < w; x++) {
        const cell = cells[x];
        const ch = cell.blink && blinkOff ? 0 : cell.ch;
        const glyph = rk86char(ch);
        let attrs = cell.attrs;
        if (offset && x + 1 < w && cells[x + 1].isFA) {
          attrs = cells[x + 1].attrs;
        }
        const ansi = rgbToAnsiBaseFg(attrToRgb(mode, attrs));
        if (ansi !== prevAnsi) {
          line += `\x1B[${ansi}m`;
          prevAnsi = ansi;
        }
        if (x === screen.cursor_x && y === screen.cursor_y) {
          line += `\x1B[4m${glyph}\x1B[24m`;
        } else {
          line += glyph;
        }
      }
      line += `${reset}${dim}\u2502${reset}`;
      output += line + `
`;
    }
    output += `${dim}\u2514${"\u2500".repeat(w)}\u2518${reset}
`;
    if (this.loadInfo && !this.loadInfoPrinted && screen.video_memory_base > 0) {
      output += this.loadInfo + `
`;
      this.loadInfoPrinted = true;
    }
    process.stdout.write(output);
  }
}

class HeadlessRenderer {
  connect(_machine) {}
  update() {}
}
var KEY_MAP = {
  a: "KeyA",
  b: "KeyB",
  c: "KeyC",
  d: "KeyD",
  e: "KeyE",
  f: "KeyF",
  g: "KeyG",
  h: "KeyH",
  i: "KeyI",
  j: "KeyJ",
  k: "KeyK",
  l: "KeyL",
  m: "KeyM",
  n: "KeyN",
  o: "KeyO",
  p: "KeyP",
  q: "KeyQ",
  r: "KeyR",
  s: "KeyS",
  t: "KeyT",
  u: "KeyU",
  v: "KeyV",
  w: "KeyW",
  x: "KeyX",
  y: "KeyY",
  z: "KeyZ",
  "0": "Digit0",
  "1": "Digit1",
  "2": "Digit2",
  "3": "Digit3",
  "4": "Digit4",
  "5": "Digit5",
  "6": "Digit6",
  "7": "Digit7",
  "8": "Digit8",
  "9": "Digit9",
  "\r": "Enter",
  "\n": "Enter",
  "\t": "Tab",
  "\x7F": "Backspace",
  "\b": "Backspace",
  " ": "Space",
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  ";": "Semicolon",
  "-": "Minus",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  "`": "Backquote",
  "'": "Quote",
  "\x1B[A": "ArrowUp",
  "\x1B[B": "ArrowDown",
  "\x1B[C": "ArrowRight",
  "\x1B[D": "ArrowLeft",
  "\x1BOP": "F1",
  "\x1BOQ": "F2",
  "\x1BOR": "F3",
  "\x1BOS": "F4",
  "\x1B[15~": "F5",
  "\x1B[17~": "F6",
  "\x1B[18~": "F7",
  "\x1B[19~": "F8",
  "\x1B[20~": "F9",
  "\x1B[21~": "F10"
};
function setupKeyboard(keyboard) {
  if (!process.stdin.isTTY)
    return;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (data) => {
    if (data === "\x03") {
      process.stdout.write("\x1B[?25h");
      process.stdout.write("\x1B[2J\x1B[H");
      process.exit(0);
    }
    if (data.length === 1 && data >= "\x01" && data <= "\x1A" && data !== "\b" && data !== "\t" && data !== `
` && data !== "\r") {
      const code2 = `Key${String.fromCharCode(data.charCodeAt(0) + 64)}`;
      keyboard.onkeydown("ControlLeft");
      keyboard.onkeydown(code2);
      setTimeout(() => {
        keyboard.onkeyup(code2);
        keyboard.onkeyup("ControlLeft");
      }, 50);
      return;
    }
    const code = KEY_MAP[data] || KEY_MAP[data.toLowerCase()];
    if (code) {
      if (data.length === 1 && data >= "A" && data <= "Z") {
        keyboard.onkeydown("ShiftLeft");
      }
      keyboard.onkeydown(code);
      setTimeout(() => {
        keyboard.onkeyup(code);
        if (data.length === 1 && data >= "A" && data <= "Z") {
          keyboard.onkeyup("ShiftLeft");
        }
      }, 50);
    }
  });
}
var MON32_B64 = "wzb4w2P+w5j7w7r8w0b8w7r8wwH+w6X8wyL5w3L+w3v6w3/6w7b6w0n7wxb7" + "w876w1L/w1b/PooyA4Axz3bNzvohAHYRX3YOAM3t+SHPdiIcdiFa/80i+c3O" + "+iH/dSIxdiEqHSIvdj7DMiZ2Mc92IWb/zSL5MgKAPTICoM3u+CFs+OUhM3Z+" + "/ljK0//+VcoA8PXNLPkqK3ZNRCopdusqJ3bx/kTKxfn+Q8rX+f5Gyu35/lPK" + "9Pn+VMr/+f5Nyib6/kfKP/r+ScqG+v5Pyi37/kzKCPr+Uspo+sMA8D4zvcrx" + "+OUhnv/NIvnhK8Pz+CEzdgYAzWP+/gjK3Pj+f8rc+MS5/Hf+Dcoa+f4uymz4" + "Bv8+Ur3Krvojw/P4eBcRM3YGAMl+p8jNufwjwyL5ISd2ES12DgDN7fkRNHbN" + "WvkiJ3YiKXbYPv8yLXbNWvkiKXbYzVr5Iit22MOu+iEAABoT/g3Kjvn+LMj+" + "IMpd+dYw+q76/gr6gvn+Efqu+v4X8q761gdPKSkpKdqu+gnDXfk3yXy6wH27" + "yc2k+c2Q+cKi+TMzySPJzXL+/gPAzc76w6765SFs/80i+eHJfsXNpfw+IM25" + "/MHJzXj7zbn5zZb5feYPysX5w8j5Cr7K5vnNePvNufkKzbr5A82W+cPX+XHN" + "mfnD7fl5vsx4+82W+cP0+X4CA82Z+cP/+c14+363+hX6/iDSF/o+Ls25/M2W" + "+X3mD8oI+sML+s14+825+eXN7vjh0jv65c1a+X3hdyPDJvrNkPnKWvrrIiN2" + "fjIldjb3PsMyMAAhov8iMQAxGHbB0eHx+SoWdsMmdj6QMgOgIgGgOgCgAgPN" + "mfnDbfoqAnbJ5SoAdn7hyTotdrfKkfp7Mi92zbb6zXj76814++vFzRb7YGnN" + "ePvRzZD5yOvNePs+P825/MNs+D7/zf/65Qnrzf364Qnr5c0K+z7/zf/64eUh" + "AcA2ACs2TTYdNpk2kyM2J35+5iDK4fohCOA2gC4ENtA2diw2IzZJLgg2pOHJ" + "PgjNmPtHPgjNmPtPyT4IzZj7d82Z+cMK+wEAAH6BT/XNkPnKn/nxeI5HzZn5" + "wxn7ebfKNfsyMHblzRb74c14++vNePvr5WBpzXj74cUBAADNRvwF4+PCTfsO" + "5s1G/M2Q++vNkPvrzYb7IQAAzZD7DubNRvzhzZD7w876xc2w+XzNpfx9zbr5" + "wclOzUb8zZn5w4b7TM1G/E3DRvzlxdVXPoAyCOAhAAA5MQAAIg12DgA6AoAP" + "Dw8P5gFf8XnmfwdPJgAlyjT88ToCgA8PDw/mAbvKv/uxTxU6L3bC3PvWEkfx" + "BcLd+xQ6AoAPDw8P5gFferfyC/x5/ubC//uvMi52wwn8/hnCt/s+/zIudhYJ" + "FcK3+yEE4DbQNnYjNiM2ST4nMgHAPuAyAcAuCDakKg12+ToudqnDofwqDXb5" + "zc76erfyrvrNpPnDnPvlxdX1PoAyCOAhAAA5MQAAFgjxeQdPPgGpMgKAOjB2" + "R/EFwmb8PgCpMgKAFTowdsJ6/NYOR/EFwnv8FBXCWPz5IQTgNtA2diM2IzZJ" + "PicyAcA+4DIBwC4INqTx0cHhyfUPDw8Pza788eYP/gr6t/zGB8YwT/XF1eXN" + "Af4hhf3lKgJ26yoAdjoEdj367vzKZf3ic/151iBPDfrp/MXNuf3Bw938rzIE" + "dsl55n9P/h/Ko/3+DMqy/f4NyvP9/grKR/3+CMrW/f4Yyrn9/hnK4v3+GsrF" + "/f4byp79/gfCOP0B8AV4+z3CKP148z3CLv0Nwif9yXHNuf16/gPAe/4IwM3i" + "/Xr+G8LF/eXVIcJ3ERB4AZ4HGncjEwt5sMJY/dHhyXn+WcLp/M2y/T4Cw+r8" + "edYgTw0+BPrq/MXNxf3Bw3f9IgB26yICdj6AMgHAfTIAwHwyAMDh0cHxyT4B" + "w+r8IfR/ESUJr3crG3uywqn9EQgDIcJ3yXsjHP5HwB4IAcD/CXr+GwFOAMLT" + "/RYCAbD4FAnJeysd/gjAHkcBQAAJev4DAbL/wvD9FhwBUAcVCcl9k9L5/SVv" + "HggBCAAJyToCgOaAyg7+OgV2t8DlKgl2zXL+vW/KKv4+ATILdiYVryIJduEy" + "BXbJJcIh/jzKIv48ylH+xQEDUM0n/cE6C3Ym4D0yC3bKTP4mQD7/wyL+OgKA" + "5oDKUf46BnYvMgZ2wxr+zQH+t8pj/q8yBXY6CXbJOgKA5oDCff4+/smvMgCA" + "MgKAOgZ25gH2BjIDgDoBgDzCl/49yeUuASYHfQ9vLzIAgDoBgC+3wrP+JfKc" + "/j7/4ckuIDoBgC+3yq/+LcK1/i4ILQfSw/58ZW/+Acr6/trz/gcHB8YgtP5f" + "wgb/PiDhyQkKDX8IGRgaDB8bAAECAwQFfCHq/sP+/nwh4v6Fb37+QOHY5W86" + "AoBn5kDCGv99/kD6P//mH+HJOgZ2t8oq/33+QPoq//Ygb3zmIMI//33+QPo7" + "/33uIOHJfeYvb33+QOHw5W/mD/4MffpQ/+4Q4ckqMXbJIjF2yR9yYWRpby04" + "NnJrAA0KLS0+AA0KGBgYGAANCiBQQy0NCiBITC0NCiBCQy0NCiBERS0NCiBT" + "UC0NCiBBRi0ZGRkZGRkACCAIACIWdvXhIh524SsiFHYhAAA5MR525dXFKhR2" + "Mc92zXj76yojds2Q+cJs+DoldnfDbPghc//NIvkhFHYGBl4jVsXl6814+83u" + "+NL2/81a+dHV63Irc+HBBSPC3v/J//8=";
function decodeMon32() {
  return Array.from(new Uint8Array(Uint8Array.from(atob(MON32_B64), (c) => c.charCodeAt(0))));
}
async function fetchFile(name) {
  if (!existsSync(name)) {
    console.error(`\u0444\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${name}`);
    process.exit(1);
  }
  const data = await readFile(name);
  return Array.from(data);
}
function printHelp() {
  console.log(`\u042D\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0420\u0430\u0434\u0438\u043E-86\u0420\u041A (\u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B)

\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: bunx rk86 [\u043E\u043F\u0446\u0438\u0438] [\u0444\u0430\u0439\u043B]

\u041E\u043F\u0446\u0438\u0438:
  -v                       \u0432\u0435\u0440\u0441\u0438\u044F
  -h                       \u0441\u043F\u0440\u0430\u0432\u043A\u0430
  -m <\u0444\u0430\u0439\u043B>                \u043C\u043E\u043D\u0438\u0442\u043E\u0440 (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 mon32.bin)
  -p                       \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B \u0431\u0435\u0437 \u0437\u0430\u043F\u0443\u0441\u043A\u0430
  -g <\u0430\u0434\u0440\u0435\u0441>               \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 (\u043D\u0435\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C \u0441 -p)
  -G <\u0430\u0434\u0440\u0435\u0441>                \u0437\u0430\u043F\u0443\u0441\u043A \u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 G \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0430 (\u0438\u043D\u044A\u0435\u043A\u0446\u0438\u044F \u043A\u043B\u0430\u0432\u0438\u0448)
  --exit-halt              \u0432\u044B\u0445\u043E\u0434 \u043F\u0440\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0438 HLT
  --exit-address [\u0430\u0434\u0440\u0435\u0441]   \u0432\u044B\u0445\u043E\u0434 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0435 \u043D\u0430 \u0430\u0434\u0440\u0435\u0441 (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: 0xFFFE)
  --headless               \u0431\u0435\u0437 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u044D\u043A\u0440\u0430\u043D\u0430 (\u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0442\u0435\u0441\u0442\u043E\u0432)
  --turbo                  \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u0438 (\u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0442\u0435\u0441\u0442\u043E\u0432)
  --timeout <\u0441\u0435\u043A>          \u0432\u044B\u0445\u043E\u0434 \u043F\u043E \u0442\u0430\u0439\u043C\u0430\u0443\u0442\u0443
  --memory <\u0444\u0430\u0439\u043B>          \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0430\u043C\u044F\u0442\u044C \u0432 \u0444\u0430\u0439\u043B \u043F\u0440\u0438 \u0432\u044B\u0445\u043E\u0434\u0435
  --memory-from <\u0430\u0434\u0440\u0435\u0441>    \u043D\u0430\u0447\u0430\u043B\u043E \u043E\u0431\u043B\u0430\u0441\u0442\u0438 \u0434\u0430\u043C\u043F\u0430 \u043F\u0430\u043C\u044F\u0442\u0438 (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: 0x0000)
  --memory-to <\u0430\u0434\u0440\u0435\u0441>      \u043A\u043E\u043D\u0435\u0446 \u043E\u0431\u043B\u0430\u0441\u0442\u0438 \u0434\u0430\u043C\u043F\u0430 \u043F\u0430\u043C\u044F\u0442\u0438 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: 0xFFFF)
  --screen <\u0444\u0430\u0439\u043B>          \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u044D\u043A\u0440\u0430\u043D 78x30 \u043A\u0430\u043A \u0442\u0435\u043A\u0441\u0442 \u043F\u0440\u0438 \u0432\u044B\u0445\u043E\u0434\u0435
  --snapshot <\u0444\u0430\u0439\u043B>        \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0441\u043D\u0438\u043C\u043E\u043A \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F (JSON) \u043F\u0440\u0438 \u0432\u044B\u0445\u043E\u0434\u0435
  --input <seq>            \u0438\u043D\u044A\u0435\u043A\u0446\u0438\u044F \u043A\u043B\u0430\u0432\u0438\u0448 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E): KeyA,Digit1,Enter,...
                           \u0442\u043E\u043A\u0435\u043D *N \u0437\u0430\u0434\u0430\u0451\u0442 \u043F\u0430\u0443\u0437\u0443 N \u043C\u0441 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 *200)
  --color <0|1|2|3>        \u0440\u0435\u0436\u0438\u043C \u0446\u0432\u0435\u0442\u0430: 0=\u0447/\u0431 (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E), 1=\u0422\u043E\u043B\u043A\u0430\u043B\u0438\u043D,
                           2=\u0410\u043A\u0438\u043C\u0435\u043D\u043A\u043E, 3=\u0410\u043F\u043E\u0433\u0435\u0439
  --online                 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043E\u043D\u043B\u0430\u0439\u043D-\u044D\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0435 rk86.ru

\u041F\u0440\u0438\u043C\u0435\u0440\u044B:
  bunx rk86                          \u0437\u0430\u043F\u0443\u0441\u043A \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0430
  bunx rk86 CHESS.GAM                \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0444\u0430\u0439\u043B
  bunx rk86 -p CHESS.GAM             \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B (\u0431\u0435\u0437 \u0437\u0430\u043F\u0443\u0441\u043A\u0430)
  bunx rk86 -m mon16.bin             \u0437\u0430\u043F\u0443\u0441\u043A \u0441 \u0434\u0440\u0443\u0433\u0438\u043C \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u043E\u043C
  bunx rk86 --exit-halt prog.bin     \u0432\u044B\u0445\u043E\u0434 \u043F\u0440\u0438 HLT
  bunx rk86 --exit-address prog.bin  \u0432\u044B\u0445\u043E\u0434 \u043F\u0440\u0438 JMP FFFEh
  bunx rk86 --exit-halt prog.asm     \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C .asm \u0444\u0430\u0439\u043B
  bunx rk86 -g 0x100 prog.bin        \u0437\u0430\u043F\u0443\u0441\u043A \u0441 \u0430\u0434\u0440\u0435\u0441\u0430 100h

\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435:
  Ctrl+C       \u0432\u044B\u0445\u043E\u0434
  Ctrl+<\u0431\u0443\u043A\u0432\u0430> \u0421\u0421 + <\u0431\u0443\u043A\u0432\u0430> (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 Ctrl+A = \u0421\u0421+A)`);
}
function flag(args, name) {
  const i = args.indexOf(name);
  if (i == -1)
    return false;
  args.splice(i, 1);
  return true;
}
function arg(args, name, defaultValue, matcher, convertor) {
  const convert = (v) => convertor ? convertor(v) : v;
  const i = args.indexOf(name);
  if (i == -1)
    return;
  if (i + 1 >= args.length || matcher && !matcher.test(args[i + 1])) {
    args.splice(i, 1);
    return defaultValue ? convert(defaultValue) : defaultValue;
  }
  const value = args[i + 1];
  args.splice(i, 2);
  return convert(value);
}
async function runOnline(file) {
  if (!file) {
    console.error("--online \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0438\u043C\u044F \u0444\u0430\u0439\u043B\u0430");
    process.exit(1);
  }
  if (!existsSync(file)) {
    console.error(`\u0444\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${file}`);
    process.exit(1);
  }
  const data = await readFile(file);
  const binary = Buffer.from(data).toString("base64");
  const name = basename(file);
  const response = await fetch(`${UPLOAD_SERVER}/load`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ binary, name })
  });
  if (!response.ok) {
    console.error(`\u043E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: HTTP ${response.status}`);
    process.exit(1);
  }
  const { id } = await response.json();
  const fileUrl = `${UPLOAD_SERVER}/file/${encodeURIComponent(name)}?${id}`;
  const url = `https://rk86.ru/index.html?run=${encodeURIComponent(fileUrl)}`;
  console.log(url);
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const openerArgs = process.platform === "win32" ? ["", url] : [url];
  spawn(opener, openerArgs, {
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32"
  }).unref();
}
async function main() {
  const args = process.argv.slice(2);
  if (flag(args, "-v") || flag(args, "--version")) {
    console.log(`rk86 ${package_default.version}`);
    process.exit(0);
  }
  if (flag(args, "-h") || flag(args, "--help")) {
    printHelp();
    process.exit(0);
  }
  if (flag(args, "--online")) {
    await runOnline(args[0]);
    process.exit(0);
  }
  const loadOnly = flag(args, "-p");
  const goAddr = arg(args, "-g", undefined, /^0x[0-9a-fA-F]+$/i, (v) => parseInt(v, 16));
  if (loadOnly && goAddr !== undefined) {
    console.error("\u043E\u0448\u0438\u0431\u043A\u0430: -p \u0438 -g \u043D\u0435\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B");
    process.exit(1);
  }
  const exitOnHalt = flag(args, "--exit-halt");
  const exitAddrValue = arg(args, "--exit-address", "0xFFFE", /^0x[0-9a-fA-F]+$/i, (v) => parseInt(v, 16));
  const exitAddr = exitAddrValue !== undefined;
  const monitorFile_ = arg(args, "-m");
  const headless = flag(args, "--headless");
  const turbo = flag(args, "--turbo");
  const timeoutSec = arg(args, "--timeout", undefined, /^\d+(\.\d+)?$/, parseFloat);
  const memoryFile = arg(args, "--memory");
  const addrRe = /^(0x)?[0-9a-fA-F]+$/i;
  const parseAddr = (v) => parseInt(v.toLowerCase().startsWith("0x") ? v.slice(2) : v, 16) & 65535;
  const memoryFrom = arg(args, "--memory-from", undefined, addrRe, parseAddr) ?? 0;
  const memoryTo = arg(args, "--memory-to", undefined, addrRe, parseAddr) ?? 65535;
  const screenFile = arg(args, "--screen");
  const snapshotFile = arg(args, "--snapshot");
  const goViaMonitor = arg(args, "-G", undefined, addrRe, parseAddr);
  const colorIdx = arg(args, "--color", "0", /^[0-3]$/, (v) => parseInt(v, 10)) ?? 0;
  const colorMode = COLOR_MODES[colorIdx];
  let inputSeq = arg(args, "--input");
  if (goViaMonitor !== undefined) {
    const hex2 = goViaMonitor.toString(16).toUpperCase();
    const keys = [...hex2].map((c) => c >= "0" && c <= "9" ? `Digit${c}` : `Key${c}`);
    const gSeq = ["KeyG", ...keys, "Enter"].join(",");
    inputSeq = inputSeq ? `${inputSeq},${gSeq}` : gSeq;
  }
  const programFile = args[0];
  const keyboard = new Keyboard;
  const io = new IO;
  const machineBuilder = {
    font: rk86_font_image(),
    keyboard,
    io,
    log: (...args2) => console.log(...args2)
  };
  const machine = machineBuilder;
  machine.ui = new TerminalUI;
  machine.memory = new Memory(machine);
  machine.cpu = new I8080(machine);
  machine.screen = new Screen(machine);
  machine.screen.color_mode = colorMode;
  machine.tape = new Tape(machine);
  machine.runner = new Runner(machine);
  machine.memory.update_ruslat = machine.ui.update_ruslat;
  const monitorContent = monitorFile_ ? await fetchFile(monitorFile_) : decodeMon32();
  const monitorFile = parse_rk86_binary(monitorFile_ || "mon32.bin", monitorContent);
  machine.memory.load_file(monitorFile);
  let entryPoint;
  let loadInfo = "";
  if (programFile) {
    const ext = file_ext(programFile).toLowerCase();
    if (ext === "asm") {
      const source = await readFile(programFile, "utf-8");
      const sections = asm(source);
      if (sections.length === 0) {
        console.error("\u043E\u0448\u0438\u0431\u043A\u0430: \u0430\u0441\u0441\u0435\u043C\u0431\u043B\u0435\u0440 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u0435\u043A\u0446\u0438\u0439");
        process.exit(1);
      }
      const lines = [];
      for (const section of sections) {
        const data = section.data;
        for (let i = 0;i < data.length; i++) {
          machine.memory.write(section.start + i, data[i]);
        }
        const name = section.name ? ` [${section.name}]` : "";
        lines.push(`${hex16(section.start)}-${hex16(section.end)}${name} (${data.length} \u0431\u0430\u0439\u0442)`);
      }
      entryPoint = goAddr ?? sections[0].start;
      loadInfo = `\u0441\u043E\u0431\u0440\u0430\u043D: ${programFile}
` + lines.join(`
`) + `
\u0437\u0430\u043F\u0443\u0441\u043A: G${hex16(entryPoint)}`;
    } else {
      const content = await fetchFile(programFile);
      const { ok, json } = parse(content);
      if (ok) {
        rk86_snapshot_restore(json, machine);
        entryPoint = parseInt(json.cpu.pc);
        loadInfo = `\u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${programFile} (PC=${hex16(entryPoint)})`;
      } else {
        const file = parse_rk86_binary(programFile, content);
        machine.memory.load_file(file);
        entryPoint = file.entry;
        loadInfo = `\u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${programFile}` + ` (${hex16(file.start)}-${hex16(file.end)}, G${hex16(file.entry)})`;
      }
    }
    if (goAddr !== undefined)
      entryPoint = goAddr;
  }
  if (!headless) {
    process.stdout.write("\x1B[?25l");
    process.stdout.write("\x1B[2J");
    setupKeyboard(keyboard);
  } else {
    process.on("SIGINT", () => doExit(null));
  }
  const renderer = headless ? new HeadlessRenderer : Object.assign(new TerminalRenderer, { loadInfo });
  machine.screen.start(renderer);
  let exiting = false;
  const doExit = async (message) => {
    if (exiting)
      return;
    exiting = true;
    if (screenFile)
      await writeFile(screenFile, dumpScreen(machine));
    if (memoryFile)
      await writeFile(memoryFile, new Uint8Array(machine.memory.buf.slice(memoryFrom, memoryTo + 1)));
    if (snapshotFile)
      await writeFile(snapshotFile, rk86_snapshot(machine, package_default.version));
    if (!headless)
      process.stdout.write("\x1B[?25h");
    if (message !== null && !headless) {
      console.log();
      console.log(message);
    }
    process.exit(0);
  };
  const onTerminate = exitOnHalt || exitAddr ? () => {
    if (!headless)
      renderer.update();
    setTimeout(() => doExit(`\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0430 \u0440\u0430\u0431\u043E\u0442\u0443 \u043D\u0430 ${hex16(machine.cpu.pc)}`), headless ? 0 : 1000);
  } : undefined;
  const armDelayMs = 500;
  if (entryPoint !== undefined && !loadOnly) {
    setTimeout(() => {
      machine.cpu.jump(entryPoint);
    }, armDelayMs);
  }
  const tickEvents = [];
  if (inputSeq) {
    const keys = inputSeq.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const TICKS_PER_MS = machine.runner.FREQ / 1000;
    const settleMs = armDelayMs + 1000;
    const keyDownMs = 50;
    const keyGapMs = 50;
    let t = settleMs * TICKS_PER_MS;
    for (const token of keys) {
      if (token.startsWith("*")) {
        const delayMs = parseInt(token.slice(1), 10);
        if (!Number.isFinite(delayMs) || delayMs < 0) {
          console.error(`\u043D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0430 \u0432 --input: ${token}`);
          process.exit(1);
        }
        t += delayMs * TICKS_PER_MS;
        continue;
      }
      const code = token;
      tickEvents.push({ at_ticks: t, action: () => keyboard.onkeydown(code) });
      t += keyDownMs * TICKS_PER_MS;
      tickEvents.push({ at_ticks: t, action: () => keyboard.onkeyup(code) });
      t += keyGapMs * TICKS_PER_MS;
    }
  }
  machine.runner.execute({
    terminate_address: exitAddr ? exitAddrValue : undefined,
    exit_on_halt: exitOnHalt,
    on_terminate: onTerminate,
    turbo,
    on_batch_complete: () => {
      const now = machine.runner.total_ticks;
      while (tickEvents.length > 0 && tickEvents[0].at_ticks <= now) {
        tickEvents.shift().action();
      }
    }
  });
  if (timeoutSec !== undefined) {
    setTimeout(() => doExit(`\u0432\u044B\u0445\u043E\u0434 \u043F\u043E \u0442\u0430\u0439\u043C\u0430\u0443\u0442\u0443 ${timeoutSec}\u0441`), timeoutSec * 1000);
  }
}
function dumpScreen(machine) {
  const { memory, screen } = machine;
  const lines = [];
  let addr = screen.video_memory_base;
  let frameStopped = false;
  for (let y = 0;y < screen.height; y++) {
    let line = "";
    let rowStopped = frameStopped;
    for (let x = 0;x < screen.width; x++) {
      const raw = memory.read_raw(addr++);
      if (rowStopped || raw >= 192) {
        line += ".";
        if (raw >= 240)
          rowStopped = true;
        if (raw >= 248)
          frameStopped = true;
        continue;
      }
      if (raw >= 128) {
        line += ".";
        continue;
      }
      const byte = raw & 127;
      if (byte === 0 || byte === 9 || byte === 10 || byte === 13) {
        line += ".";
      } else {
        line += rk86char(byte);
      }
    }
    lines.push(line);
  }
  return lines.join(`\r
`) + `\r
`;
}
main();
