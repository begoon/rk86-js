// src/frontend/lex.ts
class ParserError extends Error {
  fileName;
  line;
  column;
  constructor(message, fileName, line, column) {
    super(`${fileName}:${line}:${column}: ${message}`);
    this.fileName = fileName;
    this.line = line;
    this.column = column;
  }
}

class Lex {
  pp;
  buffer = [];
  cursor = 0;
  constructor(pp) {
    this.pp = pp;
  }
  get token() {
    return this.at(0);
  }
  get kind() {
    return this.at(0).kind;
  }
  get text() {
    return this.at(0).text;
  }
  get line() {
    return this.at(0).line;
  }
  get column() {
    return this.at(0).column;
  }
  get fileName() {
    return this.at(0).fileName;
  }
  at(offset) {
    while (this.buffer.length <= this.cursor + offset) {
      this.buffer.push(this.pp.next());
    }
    return this.buffer[this.cursor + offset];
  }
  advance() {
    this.cursor++;
  }
  atEnd() {
    return this.at(0).kind === "eof";
  }
  ifText(text) {
    if (this.at(0).text === text) {
      this.advance();
      return true;
    }
    return false;
  }
  needText(text) {
    if (!this.ifText(text))
      this.throwUnexpected(`expected '${text}'`);
  }
  ifKind(kind) {
    if (this.at(0).kind === kind) {
      this.advance();
      return true;
    }
    return false;
  }
  ifIdent() {
    if (this.at(0).kind !== "ident")
      return null;
    const t = this.at(0).text;
    this.advance();
    return t;
  }
  needIdent() {
    const id = this.ifIdent();
    if (id === null)
      this.throwUnexpected("expected identifier");
    return id;
  }
  ifInteger() {
    if (this.at(0).kind !== "integer")
      return null;
    const v = this.at(0).integer ?? 0n;
    this.advance();
    return v;
  }
  peekText(text, offset = 0) {
    return this.at(offset).text === text;
  }
  peekIdent(name, offset = 0) {
    const t = this.at(offset);
    return t.kind === "ident" && t.text === name;
  }
  throwHere(message) {
    throw new ParserError(message, this.at(0).fileName, this.at(0).line, this.at(0).column);
  }
  throwUnexpected(expected) {
    const t = this.at(0);
    this.throwHere(`${expected}, got '${t.text || t.kind}'`);
  }
}

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

// src/frontend/fs.ts
class MemoryFileSystem {
  files;
  constructor(files = {}) {
    this.files = new Map(Object.entries(files));
  }
  set(path, text) {
    this.files.set(this.normalize(path), text);
  }
  readText(path) {
    return this.files.get(this.normalize(path)) ?? null;
  }
  exists(path) {
    return this.files.has(this.normalize(path));
  }
  resolve(...parts) {
    if (parts.length === 0)
      return "";
    const joined = parts.reduce((acc, p) => p.startsWith("/") ? p : acc ? join(acc, p) : p, "");
    return this.normalize(joined);
  }
  dirname(path) {
    return dirname(this.normalize(path));
  }
  normalize(p) {
    return p.replace(/\/+/g, "/");
  }
}
function findIncludeFile(fs, name, localDir, globalDirs) {
  if (localDir !== null) {
    const candidate = fs.resolve(localDir, name);
    if (fs.exists(candidate))
      return candidate;
  }
  for (const dir of globalDirs) {
    const candidate = fs.resolve(dir, name);
    if (fs.exists(candidate))
      return candidate;
  }
  return null;
}

// src/frontend/tokenizer.ts
class TokenizerError extends Error {
  fileName;
  line;
  column;
  constructor(message, fileName, line, column) {
    super(`${fileName}:${line}:${column}: ${message}`);
    this.fileName = fileName;
    this.line = line;
    this.column = column;
  }
}
var TAB_SIZE = 4;
function tab(column) {
  return (column + TAB_SIZE & ~TAB_SIZE) + 1;
}
function isIdentStart(c) {
  return c === 95 || c >= 97 && c <= 122 || c >= 65 && c <= 90;
}
function isIdentCont(c) {
  return isIdentStart(c) || c >= 48 && c <= 57;
}
function isHexDigit(c) {
  return c >= 48 && c <= 57 || c >= 97 && c <= 102 || c >= 65 && c <= 70;
}
function isOctDigit(c) {
  return c >= 48 && c <= 55;
}
function isDecDigit(c) {
  return c >= 48 && c <= 57;
}

class Tokenizer {
  source;
  fileName;
  cursor = 0;
  line = 1;
  column = 1;
  kind = "eof";
  tokenLine = 0;
  tokenColumn = 0;
  tokenStart = 0;
  tokenEnd = 0;
  tokenInteger = 0n;
  tokenFloat = 0;
  constructor(source, fileName) {
    this.source = source;
    this.fileName = fileName;
  }
  get tokenText() {
    return this.source.slice(this.tokenStart, this.tokenEnd);
  }
  snapshot() {
    const t = {
      kind: this.kind,
      line: this.tokenLine,
      column: this.tokenColumn,
      start: this.tokenStart,
      end: this.tokenEnd,
      ...this.kind === "integer" ? { integer: this.tokenInteger } : {},
      ...this.kind === "float" ? { float: this.tokenFloat } : {}
    };
    return t;
  }
  next() {
    this.skipTrivia();
    this.tokenLine = this.line;
    this.tokenColumn = this.column;
    this.tokenStart = this.cursor;
    this.kind = this.scan();
    this.tokenEnd = this.cursor;
    this.advanceColumns(this.tokenStart, this.tokenEnd);
  }
  skipTrivia() {
    for (;; ) {
      const c = this.source.charCodeAt(this.cursor);
      if (c === 9) {
        this.cursor++;
        this.column = tab(this.column);
      } else if (c === 32) {
        this.cursor++;
        this.column++;
      } else if (c === 13) {
        this.cursor++;
      } else {
        break;
      }
    }
  }
  advanceColumns(from, to) {
    for (let i = from;i < to; i++) {
      const c = this.source.charCodeAt(i);
      if (c === 9)
        this.column = tab(this.column);
      else if (c === 13)
        continue;
      else if (c === 10) {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
  }
  throwHere(message) {
    throw new TokenizerError(message, this.fileName, this.tokenLine || this.line, this.tokenColumn || this.column);
  }
  peek(offset = 0) {
    return this.source.charCodeAt(this.cursor + offset);
  }
  scan() {
    const c0 = this.peek();
    this.cursor++;
    if (isIdentStart(c0)) {
      while (isIdentCont(this.peek()))
        this.cursor++;
      return "ident";
    }
    if (isDecDigit(c0)) {
      this.cursor--;
      this.scanNumber();
      if (this.kind === "float")
        return "float";
      return "integer";
    }
    switch (c0) {
      case Number.NaN:
      case 0:
        this.cursor--;
        return "eof";
      case 10:
        return "eol";
      case 39:
        return this.scanQuoted(39, "string1");
      case 34:
        return this.scanQuoted(34, "string2");
      case 33:
      case 61:
      case 37:
      case 94:
        if (this.peek() === 61)
          this.cursor++;
        return "operator";
      case 47:
        return this.scanSlash();
      case 42:
        if (this.peek() === 47 || this.peek() === 61)
          this.cursor++;
        return "operator";
      case 46:
        if (this.peek() === 46 && this.peek(1) === 46)
          this.cursor += 2;
        return "operator";
      case 43:
        if (this.peek() === 43 || this.peek() === 61)
          this.cursor++;
        return "operator";
      case 45:
        if (this.peek() === 45 || this.peek() === 61 || this.peek() === 62)
          this.cursor++;
        return "operator";
      case 60:
        return this.scanAngle(60);
      case 62:
        return this.scanAngle(62);
      case 124:
        if (this.peek() === 124 || this.peek() === 61)
          this.cursor++;
        return "operator";
      case 38:
        if (this.peek() === 38 || this.peek() === 61)
          this.cursor++;
        return "operator";
      case 92:
        if (this.peek() === 10) {
          this.cursor++;
          return "remark";
        }
        if (this.peek() === 13 && this.peek(1) === 10) {
          this.cursor += 2;
          return "remark";
        }
        return "operator";
      default:
        if (Number.isNaN(c0)) {
          this.cursor--;
          return "eof";
        }
        return "operator";
    }
  }
  scanNumber() {
    const start = this.cursor;
    let end = start;
    let radix = 10;
    if (this.source.charCodeAt(start) === 48 && (this.peek(1) === 120 || this.peek(1) === 88)) {
      end = start + 2;
      while (isHexDigit(this.source.charCodeAt(end)))
        end++;
      if (end === start + 2)
        this.throwHere("number out of range");
      radix = 16;
      this.cursor = end;
      this.tokenInteger = BigInt(this.source.slice(start, end));
    } else if (this.source.charCodeAt(start) === 48) {
      end = start + 1;
      while (isOctDigit(this.source.charCodeAt(end)))
        end++;
      radix = 8;
      this.cursor = end;
      this.tokenInteger = BigInt("0o" + (end === start + 1 ? "0" : this.source.slice(start + 1, end)));
    } else {
      end = start;
      while (isDecDigit(this.source.charCodeAt(end)))
        end++;
      if (end === start)
        this.throwHere("number out of range");
      this.cursor = end;
      this.tokenInteger = BigInt(this.source.slice(start, end));
    }
    if (radix === 10) {
      const peek0 = this.source.charCodeAt(this.cursor);
      if (peek0 === 46 || peek0 === 101 || peek0 === 69) {
        let i = this.cursor;
        if (peek0 === 46) {
          i++;
          while (isDecDigit(this.source.charCodeAt(i)))
            i++;
        }
        const e = this.source.charCodeAt(i);
        if (e === 101 || e === 69) {
          i++;
          const sign = this.source.charCodeAt(i);
          if (sign === 43 || sign === 45)
            i++;
          const expStart = i;
          while (isDecDigit(this.source.charCodeAt(i)))
            i++;
          if (i === expStart)
            this.throwHere("number out of range");
        }
        const text = this.source.slice(start, i);
        const f = Number.parseFloat(text);
        if (!Number.isFinite(f))
          this.throwHere("number out of range");
        this.tokenFloat = f;
        this.cursor = i;
        this.kind = "float";
        return;
      }
    }
    this.kind = "integer";
  }
  scanQuoted(quote, kind) {
    const quoteName = quote === 39 ? "'" : '"';
    for (;; ) {
      const c = this.peek();
      if (Number.isNaN(c) || c === 0 || c === 10)
        this.throwHere(`missing terminating ${quoteName} character`);
      this.cursor++;
      if (c === quote)
        return kind;
      if (c === 92) {
        const c1 = this.peek();
        if (Number.isNaN(c1) || c1 === 0 || c1 === 10)
          this.throwHere(`missing terminating ${quoteName} character`);
        this.cursor++;
      }
    }
  }
  scanSlash() {
    const next = this.peek();
    if (next === 61) {
      this.cursor++;
      return "operator";
    }
    if (next === 47) {
      this.cursor++;
      for (;; ) {
        const c = this.peek();
        if (Number.isNaN(c) || c === 0)
          break;
        if (c === 10 && this.source.charCodeAt(this.cursor - 2) !== 92)
          break;
        this.cursor++;
      }
      return "remark";
    }
    if (next === 42) {
      this.cursor++;
      let c = this.peek();
      if (Number.isNaN(c) || c === 0)
        this.throwHere("unterminated comment");
      this.cursor++;
      for (;; ) {
        const c1 = this.peek();
        if (Number.isNaN(c1) || c1 === 0)
          this.throwHere("unterminated comment");
        this.cursor++;
        if (c === 42 && c1 === 47)
          break;
        c = c1;
      }
      return "remark";
    }
    return "operator";
  }
  scanAngle(lead) {
    if (this.peek() === 61) {
      this.cursor++;
      return "operator";
    }
    if (this.peek() === lead) {
      this.cursor++;
      if (this.peek() === 61)
        this.cursor++;
    }
    return "operator";
  }
}

// src/frontend/preprocessor.ts
class PreprocessorError extends Error {
  fileName;
  line;
  column;
  constructor(message, fileName, line, column) {
    super(`${fileName}:${line}:${column}: ${message}`);
    this.fileName = fileName;
    this.line = line;
    this.column = column;
  }
}

class Preprocessor {
  fs;
  includeDirs;
  frames = [];
  macros = new Map;
  pragmaOnce = new Set;
  constructor(opts) {
    this.fs = opts.fs;
    this.includeDirs = [...opts.includeDirs ?? []];
    for (const d of opts.defines ?? [])
      this.defineFromCli(d);
  }
  openFile(path) {
    const resolved = this.fs.resolve(path);
    const text = this.fs.readText(resolved);
    if (text === null)
      throw new Error(`file not found: ${path}`);
    this.pushFrame(text, resolved, "file", null, []);
  }
  openSource(source, fileName) {
    this.pushFrame(source, fileName, "file", null, []);
  }
  defineMacro(name, body = "") {
    this.addMacroInternal(name, body, null, "none");
  }
  hasMacro(name) {
    return this.macros.has(name);
  }
  currentFileName() {
    return this.top().tokenizer.fileName;
  }
  isDefinedForIf(name) {
    if (name === "__has_include")
      return true;
    return this.macros.has(name);
  }
  hasIncludeCheck(name, currentFile, quoted) {
    const localDir = quoted ? this.fs.dirname(currentFile) : null;
    return findIncludeFile(this.fs, name, localDir, this.includeDirs) !== null;
  }
  next() {
    while (this.frames.length > 0) {
      const frame = this.top();
      frame.tokenizer.next();
      const kind = frame.tokenizer.kind;
      if (kind === "eof") {
        this.leave();
        continue;
      }
      if (kind === "remark" || kind === "eol")
        continue;
      if (kind === "operator" && frame.tokenizer.tokenText === "#") {
        this.handleDirective(frame);
        continue;
      }
      if (kind === "ident") {
        const name = frame.tokenizer.tokenText;
        const m = this.macros.get(name);
        if (m !== undefined && !m.disabled) {
          if (m.args === null) {
            m.disabled = true;
            this.pushFrame(m.body, name, "macro", m, []);
            continue;
          }
          const src = frame.tokenizer.source;
          if (src.charCodeAt(frame.tokenizer.tokenEnd) !== 40) {
            return this.toPPToken(frame);
          }
          frame.tokenizer.next();
          const argNames = this.captureMacroArgs(frame, m);
          m.disabled = true;
          this.pushFrame(m.body, name, "macro", m, argNames);
          continue;
        }
      }
      return this.toPPToken(frame);
    }
    return { kind: "eof", text: "", fileName: "<eof>", line: 0, column: 0 };
  }
  toPPToken(frame) {
    const t = frame.tokenizer;
    const base = {
      kind: t.kind,
      text: t.tokenText,
      fileName: t.fileName,
      line: t.tokenLine,
      column: t.tokenColumn
    };
    if (t.kind === "integer")
      return { ...base, integer: t.tokenInteger };
    if (t.kind === "float")
      return { ...base, float: t.tokenFloat };
    return base;
  }
  pushFrame(source, fileName, kind, activeMacro, argNames) {
    const tokenizer = new Tokenizer(source, fileName);
    this.frames.push({ tokenizer, kind, endifCounter: 0, activeMacro, argNames });
  }
  top() {
    const f = this.frames[this.frames.length - 1];
    if (!f)
      throw new Error("preprocessor: no active frame");
    return f;
  }
  leave() {
    const frame = this.frames.pop();
    if (!frame)
      return;
    if (frame.endifCounter !== 0)
      this.error(frame, "unterminated #if");
    if (frame.kind === "macro" && frame.activeMacro !== null) {
      frame.activeMacro.disabled = false;
      for (const arg of frame.argNames)
        this.deleteMacroInternal(arg);
    }
  }
  handleDirective(frame) {
    const startLine = frame.tokenizer.tokenLine;
    const startColumn = frame.tokenizer.tokenColumn;
    const bodyStart = frame.tokenizer.tokenEnd;
    const tokens = this.readDirectiveTokens(frame);
    const bodyEnd = frame.tokenizer.tokenStart;
    const rawBody = frame.tokenizer.source.slice(bodyStart, bodyEnd);
    const r = new DirectiveReader(tokens, rawBody, frame.tokenizer.fileName, startLine, startColumn);
    if (r.atEnd())
      return;
    const name = r.takeIdent();
    switch (name) {
      case "include":
        return this.dirInclude(frame, r);
      case "define":
        return this.dirDefine(r);
      case "undef":
        return this.dirUndef(r);
      case "if":
        return this.dirIf(frame, r);
      case "ifdef":
        return this.dirIfdef(frame, r, false);
      case "ifndef":
        return this.dirIfdef(frame, r, true);
      case "else":
        return this.dirElse(frame, r);
      case "endif":
        return this.dirEndif(frame, r);
      case "pragma":
        return this.dirPragma(frame, r);
      case "error":
        throw new PreprocessorError(`#error ${r.restText().trim()}`, r.fileName, r.line, r.column);
      case "warning": {
        r.restText();
        return;
      }
      default:
        throw new PreprocessorError(`invalid preprocessing directive #${name}`, r.fileName, startLine, startColumn);
    }
  }
  readDirectiveTokens(frame) {
    const t = frame.tokenizer;
    const tokens = [];
    for (;; ) {
      t.next();
      if (t.kind === "eof" || t.kind === "eol")
        return tokens;
      if (t.kind === "remark")
        continue;
      const base = {
        kind: t.kind,
        text: t.tokenText,
        line: t.tokenLine,
        column: t.tokenColumn,
        start: t.tokenStart,
        end: t.tokenEnd,
        ...t.kind === "integer" ? { integer: t.tokenInteger } : {},
        ...t.kind === "float" ? { float: t.tokenFloat } : {}
      };
      tokens.push(base);
    }
  }
  dirInclude(frame, r) {
    const first = r.take();
    if (!first)
      r.fail("expected filename after #include");
    let name;
    let quoted;
    if (first.kind === "string2" && first.text.length >= 2) {
      name = first.text.slice(1, -1);
      quoted = true;
    } else if (first.text === "<") {
      let buf = "";
      for (;; ) {
        const nx = r.take();
        if (!nx)
          r.fail("expected '>'");
        if (nx.text === ">")
          break;
        buf += nx.text;
      }
      name = buf;
      quoted = false;
    } else {
      r.fail('#include expects "FILENAME" or <FILENAME>');
    }
    const localDir = quoted ? this.fs.dirname(frame.tokenizer.fileName) : null;
    const fullPath = findIncludeFile(this.fs, name, localDir, this.includeDirs);
    if (fullPath === null)
      r.fail(`file "${name}" not found`);
    if (this.pragmaOnce.has(fullPath))
      return;
    const text = this.fs.readText(fullPath);
    if (text === null)
      r.fail(`file "${name}" not readable`);
    this.pushFrame(text, fullPath, "file", null, []);
  }
  dirDefine(r) {
    const nameTok = r.take();
    if (!nameTok || nameTok.kind !== "ident")
      r.fail("expected identifier");
    const name = nameTok.text;
    const next = r.peek();
    const functionLike = next !== null && next.text === "(" && next.start === nameTok.end;
    let args = null;
    let variadic = "none";
    if (functionLike) {
      r.take();
      args = [];
      if (r.peek()?.text !== ")") {
        for (;; ) {
          const argTok = r.take();
          if (!argTok)
            r.fail("expected identifier or ')'");
          if (argTok.text === "...") {
            args.push("__VA_ARGS__");
            variadic = "va_last";
            break;
          }
          if (argTok.kind !== "ident")
            r.fail("expected identifier");
          args.push(argTok.text);
          if (r.peek()?.text === "...") {
            r.take();
            variadic = "va_last";
            break;
          }
          if (!r.consumeIfText(","))
            break;
        }
      }
      if (!r.consumeIfText(")"))
        r.fail("expected ')'");
    }
    const body = r.restText();
    this.addMacroInternal(name, body, args, variadic);
  }
  dirUndef(r) {
    const name = r.takeIdent();
    r.expectEnd();
    this.deleteMacroInternal(name);
  }
  dirIfdef(frame, r, negate) {
    const name = r.takeIdent();
    r.expectEnd();
    const cond = this.isDefinedForIf(name);
    this.enterIf(frame, negate ? !cond : cond);
  }
  dirIf(frame, r) {
    const value = new IfExpr(r, this).parse();
    r.expectEnd();
    this.enterIf(frame, value !== 0n);
  }
  dirElse(frame, r) {
    r.expectEnd();
    if (frame.endifCounter === 0)
      r.fail("#else without #if");
    this.skipUntil(frame, ["endif"]);
  }
  dirEndif(frame, r) {
    r.expectEnd();
    if (frame.endifCounter === 0)
      r.fail("#endif without #if");
    frame.endifCounter--;
  }
  dirPragma(frame, r) {
    const name = r.takeIdent();
    if (name === "once") {
      r.expectEnd();
      this.pragmaOnce.add(frame.tokenizer.fileName);
      return;
    }
    r.restText();
  }
  enterIf(frame, cond) {
    frame.endifCounter++;
    if (!cond)
      this.skipUntil(frame, ["else", "endif"]);
  }
  skipUntil(frame, stopAt) {
    const t = frame.tokenizer;
    let depth = 1;
    outer:
      for (;; ) {
        for (;; ) {
          t.next();
          const k = t.kind;
          if (k === "eof") {
            this.error(frame, "unterminated #if");
            return;
          }
          if (k === "operator" && t.tokenText === "#")
            break;
        }
        let directive = "";
        for (;; ) {
          t.next();
          const k = t.kind;
          if (k === "eof" || k === "eol")
            break;
          if (k === "remark")
            continue;
          if (k === "ident") {
            directive = t.tokenText;
          }
          break;
        }
        for (;; ) {
          const k = t.kind;
          if (k === "eof" || k === "eol")
            break;
          t.next();
        }
        if (directive === "if" || directive === "ifdef" || directive === "ifndef") {
          depth++;
          continue outer;
        }
        if (directive === "endif") {
          depth--;
          if (depth === 0) {
            frame.endifCounter--;
            return;
          }
          continue outer;
        }
        if (directive === "else" && depth === 1 && stopAt.includes("else"))
          return;
      }
  }
  addMacroInternal(name, body, args = null, variadic = "none") {
    const prev = this.macros.get(name) ?? null;
    this.macros.set(name, { name, body, args, variadic, disabled: false, prev });
  }
  deleteMacroInternal(name) {
    const cur = this.macros.get(name);
    if (!cur)
      return;
    if (cur.prev)
      this.macros.set(name, cur.prev);
    else
      this.macros.delete(name);
  }
  defineFromCli(def) {
    const eq = def.indexOf("=");
    if (eq === -1)
      this.addMacroInternal(def, "1", null, "none");
    else
      this.addMacroInternal(def.slice(0, eq), def.slice(eq + 1), null, "none");
  }
  captureMacroArgs(frame, m) {
    const argNames = m.args ?? [];
    const t = frame.tokenizer;
    const captured = [];
    if (argNames.length === 0) {
      if (!this.expectCloseParen(t))
        this.errorT(t, "macro takes no arguments");
      return [];
    }
    let prevEnd = t.tokenEnd;
    let depth = 0;
    let argText = "";
    let sawCloseParen = false;
    let handledEmptyCall = false;
    if (t.source.charCodeAt(t.tokenEnd) === 41) {}
    const flushArg = () => {
      captured.push(argText);
      argText = "";
    };
    for (;; ) {
      t.next();
      if (t.kind === "eof")
        this.errorT(t, "unterminated macro argument list");
      if (t.kind === "remark") {
        prevEnd = t.tokenEnd;
        continue;
      }
      const isOp = t.kind === "operator";
      const text = t.tokenText;
      if (isOp && text === "(") {
        depth++;
      } else if (isOp && text === ")") {
        if (depth === 0) {
          sawCloseParen = true;
          break;
        }
        depth--;
      } else if (isOp && text === "," && depth === 0) {
        const isLastVariadic = m.variadic === "va_last" && captured.length + 1 === argNames.length;
        if (!isLastVariadic) {
          flushArg();
          prevEnd = t.tokenEnd;
          handledEmptyCall = true;
          continue;
        }
      } else if (isOp && text === "#") {
        this.errorT(t, "can't use # here");
      }
      argText += t.source.slice(prevEnd, t.tokenEnd);
      prevEnd = t.tokenEnd;
    }
    if (sawCloseParen) {
      if (argText.length > 0 || handledEmptyCall || captured.length > 0)
        flushArg();
    }
    while (captured.length < argNames.length) {
      if (m.variadic === "va_last" && captured.length === argNames.length - 1)
        captured.push("");
      else
        this.errorT(t, "not enough parameters in macro");
    }
    if (captured.length > argNames.length)
      this.errorT(t, "extra parameters in macro");
    for (let i = 0;i < argNames.length; i++) {
      this.addMacroInternal(argNames[i], captured[i] ?? "", null, "none");
    }
    return [...argNames];
  }
  expectCloseParen(t) {
    t.next();
    while (t.kind === "remark")
      t.next();
    return t.kind === "operator" && t.tokenText === ")";
  }
  errorT(t, message) {
    throw new PreprocessorError(message, t.fileName, t.tokenLine || t.line, t.tokenColumn || t.column);
  }
  error(frame, message) {
    throw new PreprocessorError(message, frame.tokenizer.fileName, frame.tokenizer.line, frame.tokenizer.column);
  }
}

class DirectiveReader {
  tokens;
  rawBody;
  pos = 0;
  fileName;
  line;
  column;
  constructor(tokens, rawBody, fileName, line, column) {
    this.tokens = tokens;
    this.rawBody = rawBody;
    this.fileName = fileName;
    this.line = line;
    this.column = column;
  }
  atEnd() {
    return this.pos >= this.tokens.length;
  }
  peek(offset = 0) {
    return this.tokens[this.pos + offset] ?? null;
  }
  take() {
    return this.tokens[this.pos++] ?? null;
  }
  takeIdent() {
    const t = this.take();
    if (!t || t.kind !== "ident")
      this.fail("expected identifier");
    return t.text;
  }
  consumeIfText(text) {
    const t = this.peek();
    if (t && t.text === text) {
      this.pos++;
      return true;
    }
    return false;
  }
  expectEnd() {
    if (!this.atEnd())
      this.fail("extra tokens at end of directive");
  }
  restText() {
    if (this.atEnd())
      return "";
    let out = "";
    for (let i = this.pos;i < this.tokens.length; i++) {
      if (out !== "")
        out += " ";
      out += this.tokens[i].text;
    }
    this.pos = this.tokens.length;
    return out;
  }
  fail(message) {
    throw new PreprocessorError(message, this.fileName, this.line, this.column);
  }
}

class IfExpr {
  r;
  pp;
  constructor(r, pp) {
    this.r = r;
    this.pp = pp;
  }
  parse() {
    return this.ternary();
  }
  ternary() {
    const cond = this.logicalOr();
    if (this.r.consumeIfText("?")) {
      const t = this.ternary();
      if (!this.r.consumeIfText(":"))
        this.r.fail("expected ':' in ternary");
      const f = this.ternary();
      return cond !== 0n ? t : f;
    }
    return cond;
  }
  logicalOr() {
    let v = this.logicalAnd();
    while (this.r.consumeIfText("||")) {
      const rhs = this.logicalAnd();
      v = v !== 0n || rhs !== 0n ? 1n : 0n;
    }
    return v;
  }
  logicalAnd() {
    let v = this.bitOr();
    while (this.r.consumeIfText("&&")) {
      const rhs = this.bitOr();
      v = v !== 0n && rhs !== 0n ? 1n : 0n;
    }
    return v;
  }
  bitOr() {
    let v = this.bitXor();
    while (this.r.consumeIfText("|"))
      v = v | this.bitXor();
    return v;
  }
  bitXor() {
    let v = this.bitAnd();
    while (this.r.consumeIfText("^"))
      v = v ^ this.bitAnd();
    return v;
  }
  bitAnd() {
    let v = this.equality();
    while (this.r.consumeIfText("&"))
      v = v & this.equality();
    return v;
  }
  equality() {
    let v = this.relational();
    for (;; ) {
      if (this.r.consumeIfText("=="))
        v = v === this.relational() ? 1n : 0n;
      else if (this.r.consumeIfText("!="))
        v = v !== this.relational() ? 1n : 0n;
      else
        break;
    }
    return v;
  }
  relational() {
    let v = this.shift();
    for (;; ) {
      if (this.r.consumeIfText("<="))
        v = v <= this.shift() ? 1n : 0n;
      else if (this.r.consumeIfText(">="))
        v = v >= this.shift() ? 1n : 0n;
      else if (this.r.consumeIfText("<"))
        v = v < this.shift() ? 1n : 0n;
      else if (this.r.consumeIfText(">"))
        v = v > this.shift() ? 1n : 0n;
      else
        break;
    }
    return v;
  }
  shift() {
    let v = this.additive();
    for (;; ) {
      if (this.r.consumeIfText("<<"))
        v = v << this.additive();
      else if (this.r.consumeIfText(">>"))
        v = v >> this.additive();
      else
        break;
    }
    return v;
  }
  additive() {
    let v = this.multiplicative();
    for (;; ) {
      if (this.r.consumeIfText("+"))
        v = v + this.multiplicative();
      else if (this.r.consumeIfText("-"))
        v = v - this.multiplicative();
      else
        break;
    }
    return v;
  }
  multiplicative() {
    let v = this.unary();
    for (;; ) {
      if (this.r.consumeIfText("*"))
        v = v * this.unary();
      else if (this.r.consumeIfText("/")) {
        const y = this.unary();
        if (y === 0n)
          this.r.fail("division by zero in preprocessor expression");
        v = v / y;
      } else if (this.r.consumeIfText("%")) {
        const y = this.unary();
        if (y === 0n)
          this.r.fail("division by zero in preprocessor expression");
        v = v % y;
      } else
        break;
    }
    return v;
  }
  unary() {
    if (this.r.consumeIfText("+"))
      return this.unary();
    if (this.r.consumeIfText("-"))
      return -this.unary();
    if (this.r.consumeIfText("!"))
      return this.unary() === 0n ? 1n : 0n;
    if (this.r.consumeIfText("~"))
      return ~this.unary();
    return this.primary();
  }
  primary() {
    const t = this.r.take();
    if (!t)
      this.r.fail("unexpected end of expression");
    if (t.kind === "integer")
      return t.integer ?? 0n;
    if (t.text === "(") {
      const v = this.parse();
      if (!this.r.consumeIfText(")"))
        this.r.fail("expected ')'");
      return v;
    }
    if (t.kind === "ident") {
      if (t.text === "defined")
        return this.parseDefined();
      if (t.text === "__has_include")
        return this.parseHasInclude();
      return 0n;
    }
    this.r.fail(`unexpected token '${t.text}' in preprocessor expression`);
  }
  parseDefined() {
    const needClose = this.r.consumeIfText("(");
    const id = this.r.takeIdent();
    if (needClose && !this.r.consumeIfText(")"))
      this.r.fail("expected ')'");
    return this.pp.isDefinedForIf(id) ? 1n : 0n;
  }
  parseHasInclude() {
    if (!this.r.consumeIfText("("))
      this.r.fail("expected '(' after __has_include");
    let name = "";
    let quoted = false;
    const first = this.r.take();
    if (!first)
      this.r.fail("expected filename in __has_include");
    if (first.kind === "string2" && first.text.length >= 2) {
      name = first.text.slice(1, -1);
      quoted = true;
    } else if (first.text === "<") {
      for (;; ) {
        const nx = this.r.take();
        if (!nx)
          this.r.fail("expected '>'");
        if (nx.text === ">")
          break;
        name += nx.text;
      }
    } else {
      this.r.fail('__has_include expects "FILE" or <FILE>');
    }
    if (!this.r.consumeIfText(")"))
      this.r.fail("expected ')'");
    return this.pp.hasIncludeCheck(name, this.pp.currentFileName(), quoted) ? 1n : 0n;
  }
}

// src/frontend/symbols.ts
function emptyScope() {
  return { variables: new Map, typedefs: new Map, structTags: new Map };
}

class SymbolTable {
  stack = [emptyScope()];
  functions = new Map;
  enumConstants = new Map;
  defineEnumConstant(name, value) {
    this.enumConstants.set(name, value);
  }
  lookupEnumConstant(name) {
    return this.enumConstants.get(name) ?? null;
  }
  pushScope() {
    this.stack.push(emptyScope());
  }
  popScope() {
    if (this.stack.length > 1)
      this.stack.pop();
  }
  declareVariable(v) {
    this.top().variables.set(v.name, v);
  }
  lookupVariable(name) {
    for (let i = this.stack.length - 1;i >= 0; i--) {
      const v = this.stack[i].variables.get(name);
      if (v !== undefined)
        return v;
    }
    return null;
  }
  declareTypedef(name, type) {
    this.top().typedefs.set(name, type);
  }
  lookupTypedef(name) {
    for (let i = this.stack.length - 1;i >= 0; i--) {
      const t = this.stack[i].typedefs.get(name);
      if (t !== undefined)
        return t;
    }
    return null;
  }
  hasTypedef(name) {
    return this.lookupTypedef(name) !== null;
  }
  declareFunction(f) {
    this.functions.set(f.name, f);
    this.stack[0].variables.set(f.name, {
      name: f.name,
      type: f.type,
      pos: f.pos,
      storage: "global",
      address: null,
      linkFile: null,
      initializer: null
    });
  }
  declareStruct(name, type) {
    this.top().structTags.set(name, type);
  }
  lookupStruct(name) {
    for (let i = this.stack.length - 1;i >= 0; i--) {
      const t = this.stack[i].structTags.get(name);
      if (t !== undefined)
        return t;
    }
    return null;
  }
  isAtGlobalScope() {
    return this.stack.length === 1;
  }
  top() {
    return this.stack[this.stack.length - 1];
  }
}

// src/frontend/parser.ts
var BASE_TYPE_KEYWORDS = new Set([
  "void",
  "char",
  "short",
  "int",
  "long",
  "signed",
  "unsigned",
  "_Bool",
  "float",
  "double"
]);
var STORAGE_KEYWORDS = new Set(["extern", "static", "auto", "register", "__global", "__stack"]);
var TYPE_QUAL_KEYWORDS = new Set(["const", "volatile"]);

class Parser {
  lex;
  symbols = new SymbolTable;
  functionLinks = new Map;
  currentFunctionLocals = [];
  lastDeclaredName = null;
  constructor(lex) {
    this.lex = lex;
  }
  parseProgram() {
    const globals = [];
    const functions = [];
    while (!this.lex.atEnd())
      this.parseTopLevel(globals, functions);
    return { globals, functions, cmm: false };
  }
  parseTopLevel(globals, functions) {
    const pos = this.pos();
    if (this.lex.peekIdent("typedef")) {
      this.parseTypedef();
      return;
    }
    if (this.lex.peekIdent("asm")) {
      this.parseAsm();
      return;
    }
    const ts = this.parseDeclSpec();
    if (this.lex.ifText(";"))
      return;
    const starCount = this.parsePointers();
    const name = this.lex.needIdent();
    if (this.lex.ifText("(")) {
      this.parseFunction(pos, ts, starCount, name, functions);
      return;
    }
    const firstType = this.wrapArrayBounds(this.wrapPointers(ts.base, starCount));
    this.skipTrailingAttributes();
    let firstInit = null;
    if (this.lex.ifText("="))
      firstInit = this.parseInitializer();
    const firstVar = {
      name,
      type: firstType,
      pos,
      storage: ts.storage === "auto" ? "global" : ts.storage,
      address: null,
      linkFile: null,
      initializer: firstInit
    };
    globals.push(firstVar);
    this.symbols.declareVariable(firstVar);
    while (this.lex.ifText(",")) {
      const morePos = this.pos();
      const moreStars = this.parsePointers();
      const moreName = this.lex.needIdent();
      const moreType = this.wrapArrayBounds(this.wrapPointers(ts.base, moreStars));
      this.skipTrailingAttributes();
      let moreInit = null;
      if (this.lex.ifText("="))
        moreInit = this.parseInitializer();
      const moreVar = {
        name: moreName,
        type: moreType,
        pos: morePos,
        storage: ts.storage === "auto" ? "global" : ts.storage,
        address: null,
        linkFile: null,
        initializer: moreInit
      };
      globals.push(moreVar);
      this.symbols.declareVariable(moreVar);
    }
    this.lex.needText(";");
  }
  wrapArrayBounds(base) {
    const dims = [];
    while (this.lex.ifText("[")) {
      let length = null;
      if (!this.lex.peekText("]")) {
        const expr = this.parseAssign();
        const folded = foldConstNode(expr);
        if (folded !== null)
          length = Number(folded);
      }
      this.lex.needText("]");
      dims.push(length);
    }
    let t = base;
    for (let i = dims.length - 1;i >= 0; i--)
      t = { kind: "array", of: t, length: dims[i] };
    return t;
  }
  parseTypedef() {
    this.lex.advance();
    const ts = this.parseDeclSpec();
    const stars = this.parsePointers();
    const name = this.lex.needIdent();
    this.lex.needText(";");
    this.symbols.declareTypedef(name, this.wrapPointers(ts.base, stars));
  }
  parseFunction(pos, ts, retStars, name, functions) {
    const retType = this.wrapPointers(ts.base, retStars);
    const { params, variadic } = this.parseParamList();
    this.lastDeclaredName = name;
    this.skipTrailingAttributes();
    this.lastDeclaredName = null;
    const funcType = {
      kind: "function",
      ret: retType,
      params: params.map((p) => p.type)
    };
    const func = {
      name,
      type: funcType,
      params,
      locals: [],
      body: null,
      storage: ts.storage === "stack" ? "stack" : "global",
      variadic,
      pos
    };
    if (this.lex.ifText(";")) {
      this.symbols.declareFunction(func);
      functions.push(func);
      return;
    }
    this.lex.needText("{");
    this.symbols.declareFunction(func);
    this.symbols.pushScope();
    this.currentFunctionLocals = [];
    for (const p of params)
      if (p.name)
        this.symbols.declareVariable(p);
    const body = this.parseBlock(pos);
    const locals = this.currentFunctionLocals;
    this.currentFunctionLocals = [];
    this.symbols.popScope();
    const finished = { ...func, body, locals };
    functions.push(finished);
    this.symbols.declareFunction(finished);
  }
  parseParamList() {
    const params = [];
    let variadic = false;
    if (this.lex.ifText(")"))
      return { params, variadic };
    if (this.lex.peekIdent("void") && this.lex.peekText(")", 1)) {
      this.lex.advance();
      this.lex.advance();
      return { params, variadic };
    }
    for (;; ) {
      if (this.lex.ifText("...")) {
        variadic = true;
        break;
      }
      const pos = this.pos();
      const ts = this.parseDeclSpec();
      const stars = this.parsePointers();
      const pname = this.lex.ifIdent() ?? "";
      while (this.lex.ifText("[")) {
        while (!this.lex.ifText("]")) {
          if (this.lex.atEnd())
            this.lex.throwHere("unterminated array bounds");
          this.lex.advance();
        }
      }
      const ptype = this.wrapPointers(ts.base, stars);
      params.push({
        name: pname,
        type: ptype,
        pos,
        storage: "auto",
        address: null,
        linkFile: null,
        initializer: null
      });
      if (!this.lex.ifText(","))
        break;
    }
    this.lex.needText(")");
    return { params, variadic };
  }
  parseDeclSpec() {
    let storage = "auto";
    const baseParts = [];
    let typedefType = null;
    let structType = null;
    for (;; ) {
      const t = this.lex.text;
      if (this.lex.kind !== "ident")
        break;
      if (STORAGE_KEYWORDS.has(t)) {
        if (t === "__global")
          storage = "global";
        else if (t === "__stack")
          storage = "stack";
        else if (t === "extern")
          storage = "extern";
        else if (t === "static")
          storage = "static";
        this.lex.advance();
        continue;
      }
      if (TYPE_QUAL_KEYWORDS.has(t)) {
        this.lex.advance();
        continue;
      }
      if (BASE_TYPE_KEYWORDS.has(t)) {
        baseParts.push(t);
        this.lex.advance();
        continue;
      }
      if (t === "struct" || t === "union") {
        structType = this.parseStructRef();
        continue;
      }
      if (t === "enum") {
        this.parseEnumSpec();
        baseParts.push("int");
        continue;
      }
      if (baseParts.length === 0 && typedefType === null && this.symbols.hasTypedef(t)) {
        typedefType = this.symbols.lookupTypedef(t);
        this.lex.advance();
        continue;
      }
      break;
    }
    if (baseParts.length === 0 && typedefType === null && structType === null) {
      this.lex.throwUnexpected("expected a type");
    }
    const base = structType ?? typedefType ?? this.composeBaseType(baseParts);
    return { base, storage };
  }
  skipTrailingAttributes() {
    for (;; ) {
      if (this.lex.peekIdent("__link")) {
        const sourceFile = this.lex.fileName;
        this.lex.advance();
        this.lex.needText("(");
        if (this.lex.kind === "string2") {
          const rel = this.lex.text.slice(1, -1);
          if (this.lastDeclaredName !== null) {
            this.functionLinks.set(this.lastDeclaredName, { rel, sourceFile });
          }
          this.lex.advance();
        }
        this.lex.needText(")");
        continue;
      }
      if (this.lex.peekIdent("__attribute__") || this.lex.peekIdent("__address")) {
        this.lex.advance();
        this.lex.needText("(");
        let depth = 1;
        while (depth > 0) {
          if (this.lex.atEnd())
            this.lex.throwHere("unterminated attribute");
          if (this.lex.ifText("(")) {
            depth++;
            continue;
          }
          if (this.lex.ifText(")")) {
            depth--;
            continue;
          }
          this.lex.advance();
        }
        continue;
      }
      break;
    }
  }
  parseEnumSpec() {
    this.lex.advance();
    if (this.lex.kind === "ident" && !this.lex.peekText("{"))
      this.lex.advance();
    if (!this.lex.ifText("{"))
      return;
    let next = 0n;
    while (!this.lex.ifText("}")) {
      if (this.lex.atEnd())
        this.lex.throwHere("unterminated enum");
      const name = this.lex.needIdent();
      let value = next;
      if (this.lex.ifText("=")) {
        const expr = this.parseAssign();
        const folded = foldConstNode(expr);
        if (folded === null)
          this.lex.throwHere(`enum value for '${name}' is not a constant`);
        value = folded;
      }
      this.symbols.defineEnumConstant(name, value);
      next = value + 1n;
      if (!this.lex.ifText(",")) {
        this.lex.needText("}");
        break;
      }
    }
  }
  parseStructRef() {
    this.lex.advance();
    let name = "";
    if (this.lex.kind === "ident" && !this.lex.peekText("{"))
      name = this.lex.needIdent();
    if (this.lex.ifText("{")) {
      const fields = [];
      let offset = 0;
      while (!this.lex.ifText("}")) {
        if (this.lex.atEnd())
          this.lex.throwHere("unterminated struct body");
        const fts = this.parseDeclSpec();
        for (;; ) {
          const stars = this.parsePointers();
          const fname = this.lex.needIdent();
          const ftype = this.wrapArrayBounds(this.wrapPointers(fts.base, stars));
          const size = Math.max(fieldTypeSize(ftype), 1);
          fields.push({ name: fname, type: ftype, offset });
          offset += size;
          if (!this.lex.ifText(","))
            break;
        }
        this.lex.needText(";");
      }
      const type = { kind: "struct", name, fields, size: offset };
      if (name !== "")
        this.symbols.declareStruct(name, type);
      return type;
    }
    if (name !== "") {
      const prior = this.symbols.lookupStruct(name);
      if (prior)
        return prior;
    }
    return { kind: "struct", name, fields: null, size: 0 };
  }
  composeBaseType(parts) {
    const has = (s) => parts.includes(s);
    const countLong = parts.filter((p) => p === "long").length;
    if (has("void"))
      return { kind: "base", base: "void" };
    if (has("_Bool"))
      return { kind: "base", base: "bool" };
    if (has("char")) {
      if (has("signed"))
        return { kind: "base", base: "schar" };
      if (has("unsigned"))
        return { kind: "base", base: "uchar" };
      return { kind: "base", base: "char" };
    }
    if (has("float"))
      return { kind: "base", base: "float" };
    if (has("double"))
      return { kind: "base", base: "double" };
    if (has("short"))
      return { kind: "base", base: has("unsigned") ? "ushort" : "short" };
    if (countLong >= 2)
      return { kind: "base", base: has("unsigned") ? "ullong" : "llong" };
    if (countLong === 1)
      return { kind: "base", base: has("unsigned") ? "ulong" : "long" };
    if (has("unsigned"))
      return { kind: "base", base: "uint" };
    if (has("signed") || has("int"))
      return { kind: "base", base: "int" };
    return { kind: "base", base: "int" };
  }
  parsePointers() {
    let n = 0;
    for (;; ) {
      if (this.lex.ifText("*")) {
        n++;
        continue;
      }
      const t = this.lex.text;
      if (this.lex.kind === "ident" && (STORAGE_KEYWORDS.has(t) || TYPE_QUAL_KEYWORDS.has(t))) {
        this.lex.advance();
        continue;
      }
      break;
    }
    return n;
  }
  wrapPointers(base, stars) {
    let t = base;
    for (let i = 0;i < stars; i++)
      t = { kind: "pointer", to: t };
    return t;
  }
  parseBlock(pos) {
    const stmts = [];
    this.symbols.pushScope();
    while (!this.lex.ifText("}")) {
      if (this.lex.atEnd())
        this.lex.throwHere("unexpected end of file, expected '}'");
      stmts.push(this.parseStatement());
    }
    this.symbols.popScope();
    return { kind: "block", pos, stmts };
  }
  parseStatement() {
    const pos = this.pos();
    if (this.lex.ifText(";"))
      return { kind: "block", pos, stmts: [] };
    if (this.lex.ifText("{"))
      return this.parseBlock(pos);
    if (this.lex.peekIdent("return"))
      return this.parseReturn();
    if (this.lex.peekIdent("if"))
      return this.parseIf();
    if (this.lex.peekIdent("while"))
      return this.parseWhile();
    if (this.lex.peekIdent("do"))
      return this.parseDoWhile();
    if (this.lex.peekIdent("for"))
      return this.parseFor();
    if (this.lex.peekIdent("switch"))
      return this.parseSwitch();
    if (this.lex.peekIdent("push_pop"))
      return this.parsePushPop();
    if (this.lex.peekIdent("asm"))
      return this.parseAsm();
    if (this.lex.peekIdent("break")) {
      this.lex.advance();
      this.lex.needText(";");
      return { kind: "break", pos };
    }
    if (this.lex.peekIdent("continue")) {
      this.lex.advance();
      this.lex.needText(";");
      return { kind: "continue", pos };
    }
    if (this.lex.peekIdent("goto")) {
      this.lex.advance();
      const label = this.lex.needIdent();
      this.lex.needText(";");
      return { kind: "goto", pos, label };
    }
    if (this.lex.peekIdent("case")) {
      this.lex.advance();
      const value = this.parseExpression();
      this.lex.needText(":");
      return { kind: "case", pos, value };
    }
    if (this.lex.peekIdent("default")) {
      this.lex.advance();
      this.lex.needText(":");
      return { kind: "default", pos };
    }
    if (this.lex.kind === "ident" && this.lex.at(1).text === ":") {
      const name = this.lex.needIdent();
      this.lex.advance();
      return { kind: "label", pos, name };
    }
    if (this.isDeclStart())
      return this.parseLocalDecl();
    const e = this.parseExpression();
    this.lex.needText(";");
    return e;
  }
  isDeclStart() {
    const t = this.lex.text;
    if (this.lex.kind !== "ident")
      return false;
    if (BASE_TYPE_KEYWORDS.has(t))
      return true;
    if (STORAGE_KEYWORDS.has(t))
      return true;
    if (TYPE_QUAL_KEYWORDS.has(t))
      return true;
    if (t === "struct" || t === "union" || t === "enum" || t === "typedef")
      return true;
    if (this.symbols.hasTypedef(t))
      return true;
    return false;
  }
  parseLocalDecl() {
    const pos = this.pos();
    const ts = this.parseDeclSpec();
    if (this.lex.ifText(";"))
      return { kind: "block", pos, stmts: [] };
    const stmts = [];
    for (;; ) {
      const declPos = this.pos();
      const stars = this.parsePointers();
      const name = this.lex.needIdent();
      const type = this.wrapArrayBounds(this.wrapPointers(ts.base, stars));
      const local = {
        name,
        type,
        pos: declPos,
        storage: ts.storage === "auto" ? "auto" : ts.storage,
        address: null,
        linkFile: null,
        initializer: null
      };
      this.symbols.declareVariable(local);
      this.currentFunctionLocals.push(local);
      let initExpr = null;
      if (this.lex.ifText("=")) {
        const init = this.parseInitializer();
        if (init.kind === "expr")
          initExpr = init.expr;
      }
      if (initExpr !== null) {
        const target = { kind: "var", pos: declPos, name, resolved: local };
        stmts.push({ kind: "assign", pos: declPos, target, value: initExpr });
      }
      if (!this.lex.ifText(","))
        break;
    }
    this.lex.needText(";");
    return { kind: "block", pos, stmts };
  }
  parseInitializer() {
    if (this.lex.ifText("{")) {
      const items = [];
      if (!this.lex.ifText("}")) {
        for (;; ) {
          items.push(this.parseInitializer());
          if (this.lex.ifText(",")) {
            if (this.lex.ifText("}"))
              break;
            continue;
          }
          this.lex.needText("}");
          break;
        }
      }
      return { kind: "list", items };
    }
    return { kind: "expr", expr: this.parseAssign() };
  }
  parseSwitch() {
    const pos = this.pos();
    this.lex.advance();
    this.lex.needText("(");
    const expr = this.parseExpression();
    this.lex.needText(")");
    const body = this.parseStatement();
    return { kind: "switch", pos, expr, body };
  }
  parseAsm() {
    const pos = this.pos();
    this.lex.advance();
    if (this.lex.ifText("(")) {
      const parts2 = [];
      while (!this.lex.ifText(")")) {
        if (this.lex.atEnd())
          this.lex.throwHere("unterminated asm(...)");
        parts2.push(this.lex.text);
        this.lex.advance();
      }
      this.lex.ifText(";");
      return { kind: "asm", pos, text: parts2.join(" ") };
    }
    this.lex.needText("{");
    const parts = [];
    let depth = 1;
    let lastLine = this.lex.line;
    let lastFile = this.lex.fileName;
    let lastColEnd = -1;
    while (depth > 0) {
      if (this.lex.atEnd())
        this.lex.throwHere("unterminated asm { ... }");
      if (this.lex.peekText("{"))
        depth++;
      else if (this.lex.peekText("}")) {
        depth--;
        if (depth === 0)
          break;
      }
      const tok = this.lex.token;
      let sep2;
      if (tok.line !== lastLine || tok.fileName !== lastFile)
        sep2 = `
`;
      else if (tok.column === lastColEnd)
        sep2 = "";
      else
        sep2 = " ";
      parts.push(sep2, tok.text);
      lastLine = tok.line;
      lastFile = tok.fileName;
      lastColEnd = tok.column + tok.text.length;
      this.lex.advance();
    }
    this.lex.advance();
    return { kind: "asm", pos, text: parts.join("").trimStart() };
  }
  parseReturn() {
    const pos = this.pos();
    this.lex.advance();
    let value = null;
    if (!this.lex.peekText(";"))
      value = this.parseExpression();
    this.lex.needText(";");
    return { kind: "return", pos, value };
  }
  parseIf() {
    const pos = this.pos();
    this.lex.advance();
    this.lex.needText("(");
    const cond = this.parseExpression();
    this.lex.needText(")");
    const then = this.parseStatement();
    let els = null;
    if (this.lex.peekIdent("else")) {
      this.lex.advance();
      els = this.parseStatement();
    }
    return { kind: "if", pos, cond, then, else: els };
  }
  parseWhile() {
    const pos = this.pos();
    this.lex.advance();
    this.lex.needText("(");
    const cond = this.parseExpression();
    this.lex.needText(")");
    const body = this.parseStatement();
    return { kind: "while", pos, cond, body };
  }
  parseDoWhile() {
    const pos = this.pos();
    this.lex.advance();
    const body = this.parseStatement();
    if (!this.lex.peekIdent("while"))
      this.lex.throwUnexpected("expected 'while'");
    this.lex.advance();
    this.lex.needText("(");
    const cond = this.parseExpression();
    this.lex.needText(")");
    this.lex.needText(";");
    return { kind: "do", pos, body, cond };
  }
  parseFor() {
    const pos = this.pos();
    this.lex.advance();
    this.lex.needText("(");
    let init = null;
    if (!this.lex.ifText(";")) {
      if (this.isDeclStart())
        init = this.parseLocalDecl();
      else {
        init = this.parseExpressionWithComma();
        this.lex.needText(";");
      }
    }
    let cond = null;
    if (!this.lex.ifText(";")) {
      cond = this.parseExpressionWithComma();
      this.lex.needText(";");
    }
    let step = null;
    if (!this.lex.peekText(")"))
      step = this.parseExpressionWithComma();
    this.lex.needText(")");
    const body = this.parseStatement();
    return { kind: "for", pos, init, cond, step, body };
  }
  parseExpressionWithComma() {
    let e = this.parseExpression();
    while (this.lex.peekText(",")) {
      const pos = this.pos();
      this.lex.advance();
      const rhs = this.parseExpression();
      e = { kind: "binary", pos, op: "comma", lhs: e, rhs };
    }
    return e;
  }
  parsePushPop() {
    const pos = this.pos();
    this.lex.advance();
    this.lex.needText("(");
    const regs = [];
    if (!this.lex.ifText(")")) {
      for (;; ) {
        regs.push(this.parseAssign());
        if (this.lex.ifText(")"))
          break;
        this.lex.needText(",");
      }
    }
    this.lex.needText("{");
    const body = this.parseBlock(pos);
    return { kind: "pushPop", pos, regs, body };
  }
  parseExpression() {
    return this.parseAssign();
  }
  parseAssign() {
    const pos = this.pos();
    const lhs = this.parseTernary();
    if (this.lex.ifText("=")) {
      const rhs = this.parseAssign();
      return { kind: "assign", pos, target: lhs, value: rhs };
    }
    for (const [op, bop] of COMPOUND_ASSIGN) {
      if (this.lex.ifText(op)) {
        const rhs = this.parseAssign();
        const combined = { kind: "binary", pos, op: bop, lhs, rhs };
        return { kind: "assign", pos, target: lhs, value: combined };
      }
    }
    return lhs;
  }
  parseTernary() {
    const pos = this.pos();
    const cond = this.parseLogicalOr();
    if (this.lex.ifText("?")) {
      const a = this.parseAssign();
      this.lex.needText(":");
      const b = this.parseAssign();
      return { kind: "ternary", pos, cond, then: a, else: b };
    }
    return cond;
  }
  parseLogicalOr() {
    return this.parseLeftAssoc("logor", ["||"], () => this.parseLogicalAnd());
  }
  parseLogicalAnd() {
    return this.parseLeftAssoc("logand", ["&&"], () => this.parseBitOr());
  }
  parseBitOr() {
    return this.parseLeftAssoc("or", ["|"], () => this.parseBitXor());
  }
  parseBitXor() {
    return this.parseLeftAssoc("xor", ["^"], () => this.parseBitAnd());
  }
  parseBitAnd() {
    return this.parseLeftAssoc("and", ["&"], () => this.parseEquality());
  }
  parseEquality() {
    return this.parseLeftAssocMap([["==", "eq"], ["!=", "ne"]], () => this.parseRelational());
  }
  parseRelational() {
    return this.parseLeftAssocMap([["<=", "le"], [">=", "ge"], ["<", "lt"], [">", "gt"]], () => this.parseShift());
  }
  parseShift() {
    return this.parseLeftAssocMap([["<<", "shl"], [">>", "shr"]], () => this.parseAdditive());
  }
  parseAdditive() {
    return this.parseLeftAssocMap([["+", "add"], ["-", "sub"]], () => this.parseMultiplicative());
  }
  parseMultiplicative() {
    return this.parseLeftAssocMap([["*", "mul"], ["/", "div"], ["%", "mod"]], () => this.parseUnary());
  }
  parseLeftAssoc(op, tokens, next) {
    let lhs = next();
    for (;; ) {
      const pos = this.pos();
      const match = tokens.find((t) => this.lex.peekText(t));
      if (match === undefined)
        break;
      this.lex.advance();
      const rhs = next();
      lhs = { kind: "binary", pos, op, lhs, rhs };
    }
    return lhs;
  }
  parseLeftAssocMap(map, next) {
    let lhs = next();
    outer:
      for (;; ) {
        const pos = this.pos();
        for (const [tok, op] of map) {
          if (this.lex.peekText(tok)) {
            this.lex.advance();
            const rhs = next();
            lhs = { kind: "binary", pos, op, lhs, rhs };
            continue outer;
          }
        }
        break;
      }
    return lhs;
  }
  parseUnary() {
    const pos = this.pos();
    for (const [tok, op] of UNARY_OPS) {
      if (this.lex.ifText(tok)) {
        const arg = this.parseUnary();
        return { kind: "unary", pos, op, arg };
      }
    }
    if (this.lex.peekText("(") && this.peekIsTypeAfterParen()) {
      this.lex.advance();
      this.parseDeclSpec();
      this.parsePointers();
      this.lex.needText(")");
      return this.parseUnary();
    }
    return this.parsePostfix();
  }
  peekIsTypeAfterParen() {
    const t1 = this.lex.at(1);
    if (t1.kind !== "ident")
      return false;
    const name = t1.text;
    if (BASE_TYPE_KEYWORDS.has(name))
      return true;
    if (TYPE_QUAL_KEYWORDS.has(name))
      return true;
    if (name === "struct" || name === "union" || name === "enum")
      return true;
    if (this.symbols.hasTypedef(name))
      return true;
    return false;
  }
  isTypeStart() {
    const t = this.lex.text;
    if (this.lex.kind !== "ident")
      return false;
    if (BASE_TYPE_KEYWORDS.has(t))
      return true;
    if (TYPE_QUAL_KEYWORDS.has(t))
      return true;
    if (t === "struct" || t === "union" || t === "enum")
      return true;
    if (this.symbols.hasTypedef(t))
      return true;
    return false;
  }
  parsePostfix() {
    let node = this.parsePrimary();
    for (;; ) {
      const pos = this.pos();
      if (this.lex.ifText("(")) {
        const args = [];
        if (!this.lex.ifText(")")) {
          for (;; ) {
            args.push(this.parseAssign());
            if (!this.lex.ifText(","))
              break;
          }
          this.lex.needText(")");
        }
        node = { kind: "call", pos, target: node, args };
        continue;
      }
      if (this.lex.ifText("[")) {
        const index = this.parseExpression();
        this.lex.needText("]");
        const plus = { kind: "binary", pos, op: "add", lhs: node, rhs: index };
        node = { kind: "unary", pos, op: "deref", arg: plus };
        continue;
      }
      if (this.lex.peekText(".") || this.lex.peekText("->")) {
        const arrow = this.lex.peekText("->");
        this.lex.advance();
        const field = this.lex.needIdent();
        node = { kind: "member", pos, object: node, field, arrow };
        continue;
      }
      if (this.lex.ifText("++")) {
        node = { kind: "unary", pos, op: "postinc", arg: node };
        continue;
      }
      if (this.lex.ifText("--")) {
        node = { kind: "unary", pos, op: "postdec", arg: node };
        continue;
      }
      break;
    }
    return node;
  }
  parsePrimary() {
    const pos = this.pos();
    if (this.lex.kind === "integer") {
      const value = this.lex.token.integer ?? 0n;
      this.lex.advance();
      return { kind: "const", pos, type: { kind: "base", base: "int" }, value };
    }
    if (this.lex.kind === "string2") {
      let raw = decodeStringLiteral(this.lex.text);
      this.lex.advance();
      while (this.lex.kind === "string2") {
        raw += decodeStringLiteral(this.lex.text);
        this.lex.advance();
      }
      return { kind: "const", pos, type: { kind: "pointer", to: { kind: "base", base: "char" } }, value: raw };
    }
    if (this.lex.kind === "string1") {
      const text = this.lex.text;
      this.lex.advance();
      const value = decodeCharLiteral(text);
      return { kind: "const", pos, type: { kind: "base", base: "int" }, value };
    }
    if (this.lex.ifText("(")) {
      const e = this.parseExpressionWithComma();
      this.lex.needText(")");
      return e;
    }
    if (this.lex.peekIdent("sizeof")) {
      this.lex.advance();
      let size = 2;
      if (this.lex.ifText("(")) {
        if (this.isTypeStart()) {
          const ts = this.parseDeclSpec();
          const stars = this.parsePointers();
          let t = this.wrapPointers(ts.base, stars);
          t = this.wrapArrayBounds(t);
          size = Math.max(fieldTypeSize(t), 1);
        } else {
          const inner = this.parseExpressionWithComma();
          size = sizeofExpr(inner);
        }
        this.lex.needText(")");
      } else {
        const inner = this.parseUnary();
        size = sizeofExpr(inner);
      }
      return { kind: "const", pos, type: { kind: "base", base: "uint" }, value: BigInt(size) };
    }
    if (this.lex.kind === "ident") {
      const name = this.lex.text;
      this.lex.advance();
      const enumValue = this.symbols.lookupEnumConstant(name);
      if (enumValue !== null) {
        return { kind: "const", pos, type: { kind: "base", base: "int" }, value: enumValue };
      }
      const resolved = this.symbols.lookupVariable(name);
      return { kind: "var", pos, name, resolved };
    }
    this.lex.throwUnexpected("expected expression");
  }
  pos() {
    return { file: this.lex.fileName, line: this.lex.line, column: this.lex.column };
  }
}
function sizeofExpr(n) {
  if (n.kind === "var" && n.resolved)
    return Math.max(fieldTypeSize(n.resolved.type), 1);
  if (n.kind === "const" && typeof n.value === "string")
    return n.value.length + 1;
  if (n.kind === "const")
    return 2;
  return 2;
}
function fieldTypeSize(t) {
  if (t.kind === "base") {
    switch (t.base) {
      case "char":
      case "schar":
      case "uchar":
      case "bool":
        return 1;
      case "short":
      case "ushort":
      case "int":
      case "uint":
        return 2;
      case "long":
      case "ulong":
        return 4;
      case "llong":
      case "ullong":
        return 8;
      case "float":
        return 4;
      case "double":
        return 8;
      case "void":
        return 0;
    }
  }
  if (t.kind === "pointer")
    return 2;
  if (t.kind === "array")
    return fieldTypeSize(t.of) * (t.length ?? 0);
  if (t.kind === "struct")
    return t.size;
  return 0;
}
function foldConstNode(n) {
  if (n.kind === "const")
    return typeof n.value === "bigint" ? n.value : null;
  if (n.kind === "unary") {
    const v = foldConstNode(n.arg);
    if (v === null)
      return null;
    switch (n.op) {
      case "neg":
        return -v;
      case "not":
        return v === 0n ? 1n : 0n;
      case "bnot":
        return ~v;
      default:
        return null;
    }
  }
  if (n.kind === "binary") {
    const l = foldConstNode(n.lhs);
    const r = foldConstNode(n.rhs);
    if (l === null || r === null)
      return null;
    switch (n.op) {
      case "add":
        return l + r;
      case "sub":
        return l - r;
      case "mul":
        return l * r;
      case "div":
        return r === 0n ? null : l / r;
      case "mod":
        return r === 0n ? null : l % r;
      case "shl":
        return l << r;
      case "shr":
        return l >> r;
      case "and":
        return l & r;
      case "or":
        return l | r;
      case "xor":
        return l ^ r;
      default:
        return null;
    }
  }
  return null;
}
var COMPOUND_ASSIGN = [
  ["+=", "add"],
  ["-=", "sub"],
  ["*=", "mul"],
  ["/=", "div"],
  ["%=", "mod"],
  ["<<=", "shl"],
  [">>=", "shr"],
  ["&=", "and"],
  ["|=", "or"],
  ["^=", "xor"]
];
var UNARY_OPS = [
  ["++", "preinc"],
  ["--", "predec"],
  ["-", "neg"],
  ["!", "not"],
  ["~", "bnot"],
  ["*", "deref"],
  ["&", "addr"]
];
function decodeStringLiteral(text) {
  const inner = text.slice(1, -1);
  let out = "";
  for (let i = 0;i < inner.length; i++) {
    const c = inner[i];
    if (c !== "\\" || i + 1 >= inner.length) {
      out += c;
      continue;
    }
    const esc = inner[++i];
    switch (esc) {
      case "n":
        out += `
`;
        break;
      case "r":
        out += "\r";
        break;
      case "t":
        out += "\t";
        break;
      case "0":
        out += "\x00";
        break;
      case "\\":
        out += "\\";
        break;
      case "'":
        out += "'";
        break;
      case '"':
        out += '"';
        break;
      case "a":
        out += "\x07";
        break;
      case "b":
        out += "\b";
        break;
      case "f":
        out += "\f";
        break;
      case "v":
        out += "\v";
        break;
      case "x": {
        let hex = "";
        while (i + 1 < inner.length && /[0-9a-fA-F]/.test(inner[i + 1]))
          hex += inner[++i];
        out += String.fromCharCode(parseInt(hex, 16));
        break;
      }
      default:
        if (esc >= "0" && esc <= "7") {
          let oct = esc;
          while (i + 1 < inner.length && inner[i + 1] >= "0" && inner[i + 1] <= "7" && oct.length < 3)
            oct += inner[++i];
          out += String.fromCharCode(parseInt(oct, 8));
        } else {
          out += esc;
        }
    }
  }
  return out;
}
function decodeCharLiteral(text) {
  const inner = text.slice(1, -1);
  if (inner.length === 0)
    return 0n;
  if (inner[0] === "\\" && inner.length >= 2) {
    const esc = inner[1];
    switch (esc) {
      case "n":
        return 10n;
      case "r":
        return 13n;
      case "t":
        return 9n;
      case "0":
        return 0n;
      case "\\":
        return 92n;
      case "'":
        return 39n;
      case '"':
        return 34n;
      case "a":
        return 7n;
      case "b":
        return 8n;
      case "f":
        return 12n;
      case "v":
        return 11n;
      case "x": {
        const hex = inner.slice(2);
        return BigInt("0x" + hex);
      }
      default:
        if (esc >= "0" && esc <= "7")
          return BigInt("0o" + inner.slice(1));
        return BigInt(esc.charCodeAt(0));
    }
  }
  return BigInt(inner.charCodeAt(0));
}

// src/runtime/printf.ts
var PRINTF_SOURCE = `
// Auto-generated by c8080-js: mini printf/sprintf runtime.
int __va_args[8];
char *__printf_out_ptr;

int __printf_putchar(int c) {
    if (__printf_out_ptr == (char*)0) { putchar(c); return 0; }
    *__printf_out_ptr = c;
    __printf_out_ptr = __printf_out_ptr + 1;
    return 0;
}

int __printf_putint(int val) {
    char buf[6];
    int j;
    if (val < 0) { __printf_putchar('-'); val = -val; }
    if (val == 0) { __printf_putchar('0'); return 0; }
    j = 0;
    while (val != 0) {
        buf[j] = '0' + (val % 10);
        j = j + 1;
        val = val / 10;
    }
    while (j > 0) {
        j = j - 1;
        __printf_putchar(buf[j]);
    }
    return 0;
}

int __printf_core(char *fmt) {
    int i;
    int c;
    char *s;
    i = 0;
    while (*fmt != 0) {
        c = *fmt;
        fmt = fmt + 1;
        if (c != '%') {
            __printf_putchar(c);
            continue;
        }
        c = *fmt;
        if (c == 0) break;
        fmt = fmt + 1;
        if (c == 'd') { __printf_putint(__va_args[i]); i = i + 1; }
        else if (c == 's') {
            s = (char*)__va_args[i];
            i = i + 1;
            while (*s != 0) { __printf_putchar(*s); s = s + 1; }
        }
        else if (c == 'c') { __printf_putchar(__va_args[i]); i = i + 1; }
        else if (c == '%') { __printf_putchar('%'); }
        else { __printf_putchar('%'); __printf_putchar(c); }
    }
    return 0;
}

int printf(char *fmt, ...) {
    __printf_out_ptr = (char*)0;
    __printf_core(fmt);
    return 0;
}

int sprintf(char *buf, char *fmt, ...) {
    char *start;
    start = buf;
    __printf_out_ptr = buf;
    __printf_core(fmt);
    *__printf_out_ptr = 0;
    return __printf_out_ptr - start;
}
`;

// src/runtime/link.ts
var EMBEDDED_SOURCES = [
  { provides: ["printf", "sprintf", "__printf_core", "__printf_putchar", "__printf_putint"], source: PRINTF_SOURCE }
];
function linkBuiltins(program) {
  const defined = new Set(program.functions.filter((f) => f.body !== null).map((f) => f.name));
  const called = collectCalledNames(program);
  const extraFns = [...program.functions];
  const extraGlobals = [...program.globals];
  for (const { provides, source } of EMBEDDED_SOURCES) {
    const needs = provides.some((n) => called.has(n) && !defined.has(n));
    if (!needs)
      continue;
    const sub = parseEmbedded(source);
    for (const f of sub.functions) {
      if (defined.has(f.name))
        continue;
      extraFns.push(f);
      if (f.body !== null)
        defined.add(f.name);
      for (const n of collectCalledNamesFromFn(f))
        called.add(n);
    }
    for (const g of sub.globals)
      extraGlobals.push(g);
  }
  return { ...program, functions: extraFns, globals: extraGlobals };
}
function parseEmbedded(source) {
  const fs = new MemoryFileSystem({ "/__builtin.c": source });
  const pp = new Preprocessor({ fs });
  pp.openFile("/__builtin.c");
  return new Parser(new Lex(pp)).parseProgram();
}
function collectCalledNames(program) {
  const names = new Set;
  for (const f of program.functions)
    for (const n of collectCalledNamesFromFn(f))
      names.add(n);
  return names;
}
function collectCalledNamesFromFn(f) {
  const names = new Set;
  const visit = (n) => {
    if (!n)
      return;
    if (n.kind === "call" && n.target.kind === "var")
      names.add(n.target.name);
    for (const c of children(n))
      visit(c);
  };
  visit(f.body);
  return names;
}
function children(n) {
  switch (n.kind) {
    case "block":
      return [...n.stmts];
    case "if":
      return n.else ? [n.cond, n.then, n.else] : [n.cond, n.then];
    case "while":
      return [n.cond, n.body];
    case "do":
      return [n.body, n.cond];
    case "for":
      return [n.init, n.cond, n.step, n.body].filter((x) => x !== null);
    case "return":
      return n.value ? [n.value] : [];
    case "assign":
      return [n.target, n.value];
    case "unary":
      return [n.arg];
    case "binary":
      return [n.lhs, n.rhs];
    case "call":
      return [n.target, ...n.args];
    case "member":
      return [n.object];
    case "switch":
      return [n.expr, n.body];
    case "case":
      return [n.value];
    case "load":
      return [n.target];
    case "pushPop":
      return [...n.regs, n.body];
    default:
      return [];
  }
}

// src/codegen/i8080/compile.ts
function compileProgram(p, options = {}) {
  p = linkBuiltins(p);
  const out = new Emitter;
  const warnings = [];
  const org = options.org ?? 256;
  out.directive(`ORG ${toHex(org)}`);
  out.blank();
  const hasMain = p.functions.some((f) => f.name === "main" && f.body !== null);
  if (hasMain) {
    out.instruction("JMP", "main");
    out.blank();
  }
  for (const f of p.functions)
    out.recordFunction(f);
  for (const g of p.globals)
    out.declareGlobal(g);
  const userFuncNames = new Set(p.functions.filter((f) => f.body !== null).map((f) => f.name));
  for (const f of p.functions) {
    if (f.body === null)
      continue;
    compileFunction(out, f, warnings);
    out.blank();
  }
  out.emitRuntimeHelpers(userFuncNames);
  out.emitStaticStack();
  out.emitGlobalsStorage();
  out.directive("END");
  return { asm: out.render(), warnings };
}
function compileFunction(out, f, warnings) {
  out.beginFunction(f);
  out.label(f.name);
  const lastParam = findLastIntParam(f);
  if (lastParam !== null) {
    out.instruction("SHLD", paramAddr(f.name, lastParam));
  }
  compileNode(out, f.body, warnings);
  if (!out.lastWasReturn())
    out.instruction("RET");
  out.endFunction();
}
function findLastIntParam(f) {
  for (let i = f.params.length - 1;i >= 0; i--) {
    if (isIntLike(f.params[i].type))
      return i + 1;
  }
  return null;
}
function paramAddr(func, n) {
  return `__a_${n}_${func.toLowerCase()}`;
}
function frameAddr(func) {
  return `__s_${func.toLowerCase()}`;
}
function compileNode(out, n, warnings) {
  switch (n.kind) {
    case "block":
      for (const s of n.stmts)
        compileNode(out, s, warnings);
      return;
    case "return":
      if (n.value !== null)
        compileExpression(out, n.value, warnings);
      out.instruction("RET");
      return;
    case "asm":
      out.raw(indentAsmBlock(n.text));
      return;
    case "assign":
      compileExpression(out, n, warnings);
      return;
    case "if": {
      compileExpression(out, n.cond, warnings);
      const elseLabel = out.freshLabel("else");
      const endLabel = out.freshLabel("endif");
      out.instruction("MOV", "A,H");
      out.instruction("ORA", "L");
      out.instruction("JZ", n.else ? elseLabel : endLabel);
      compileNode(out, n.then, warnings);
      if (n.else) {
        out.instruction("JMP", endLabel);
        out.label(elseLabel);
        compileNode(out, n.else, warnings);
      }
      out.label(endLabel);
      return;
    }
    case "while": {
      const loopLabel = out.freshLabel("while");
      const endLabel = out.freshLabel("endwhile");
      out.beginLoop(loopLabel, endLabel);
      out.label(loopLabel);
      compileExpression(out, n.cond, warnings);
      out.instruction("MOV", "A,H");
      out.instruction("ORA", "L");
      out.instruction("JZ", endLabel);
      compileNode(out, n.body, warnings);
      out.instruction("JMP", loopLabel);
      out.label(endLabel);
      out.endLoop();
      return;
    }
    case "do": {
      const loopLabel = out.freshLabel("do");
      const contLabel = out.freshLabel("docont");
      const endLabel = out.freshLabel("enddo");
      out.beginLoop(contLabel, endLabel);
      out.label(loopLabel);
      compileNode(out, n.body, warnings);
      out.label(contLabel);
      compileExpression(out, n.cond, warnings);
      out.instruction("MOV", "A,H");
      out.instruction("ORA", "L");
      out.instruction("JNZ", loopLabel);
      out.label(endLabel);
      out.endLoop();
      return;
    }
    case "for": {
      const loopLabel = out.freshLabel("for");
      const contLabel = out.freshLabel("forcont");
      const endLabel = out.freshLabel("endfor");
      if (n.init)
        compileNode(out, n.init, warnings);
      out.beginLoop(contLabel, endLabel);
      out.label(loopLabel);
      if (n.cond) {
        compileExpression(out, n.cond, warnings);
        out.instruction("MOV", "A,H");
        out.instruction("ORA", "L");
        out.instruction("JZ", endLabel);
      }
      compileNode(out, n.body, warnings);
      out.label(contLabel);
      if (n.step)
        compileExpression(out, n.step, warnings);
      out.instruction("JMP", loopLabel);
      out.label(endLabel);
      out.endLoop();
      return;
    }
    case "break": {
      const l = out.currentLoopEnd();
      if (l === null) {
        warnings.push("break outside loop");
        return;
      }
      out.instruction("JMP", l);
      return;
    }
    case "continue": {
      const l = out.currentLoopCont();
      if (l === null) {
        warnings.push("continue outside loop");
        return;
      }
      out.instruction("JMP", l);
      return;
    }
    case "switch":
      compileSwitch(out, n, warnings);
      return;
    case "label":
      out.label(`.Lu_${n.name}`);
      return;
    case "goto":
      out.instruction("JMP", `.Lu_${n.label}`);
      return;
    case "case":
    case "default":
      warnings.push(`${n.kind} outside of a switch`);
      return;
    default:
      if (isExpressionKind(n.kind)) {
        compileExpression(out, n, warnings);
        return;
      }
      warnings.push(`unhandled statement kind '${n.kind}'`);
      return;
  }
}
function formatOperands(operands) {
  return operands.replace(/,\s*/g, ", ");
}
function indentAsmBlock(text) {
  return text.split(`
`).map((line) => {
    const trimmed = line.trimStart();
    if (trimmed === "")
      return "";
    if (/^[A-Za-z_.][A-Za-z_.0-9]*:\s*$/.test(trimmed))
      return trimmed;
    return "    " + trimmed;
  }).join(`
`);
}
function isExpressionKind(k) {
  return k === "const" || k === "var" || k === "binary" || k === "unary" || k === "call" || k === "load" || k === "assign" || k === "member" || k === "ternary";
}
function compileExpression(out, n, warnings) {
  const folded = foldConst(n);
  if (folded !== null) {
    out.instruction("LXI", `H,${toDec(folded)}`);
    return;
  }
  switch (n.kind) {
    case "const":
      if (typeof n.value === "string") {
        const lbl = out.internString(n.value);
        out.instruction("LXI", `H,${lbl}`);
      } else {
        out.instruction("LXI", `H,${toDec(n.value)}`);
      }
      return;
    case "var": {
      const addr = variableAddress(out, n.name, n.resolved);
      if (addr === null) {
        warnings.push(`unresolved variable '${n.name}'`);
        out.instruction("LXI", "H,0");
        return;
      }
      if (n.resolved && n.resolved.type.kind === "array") {
        out.instruction("LXI", `H,${addr}`);
        return;
      }
      if (n.resolved && isByteType(n.resolved.type)) {
        out.instruction("LDA", addr);
        out.instruction("MOV", "L,A");
        out.instruction("MVI", "H,0");
        return;
      }
      out.instruction("LHLD", addr);
      return;
    }
    case "binary":
      if (n.op === "logand" || n.op === "logor") {
        compileShortCircuit(out, n.op, n.lhs, n.rhs, warnings);
        return;
      }
      compileBinary(out, n.op, n.lhs, n.rhs, warnings);
      return;
    case "unary":
      compileUnary(out, n.op, n.arg, warnings);
      return;
    case "call":
      compileCall(out, n, warnings);
      return;
    case "member":
      compileMemberRead(out, n, warnings);
      return;
    case "ternary": {
      const elseLabel = out.freshLabel("telse");
      const endLabel = out.freshLabel("tend");
      compileExpression(out, n.cond, warnings);
      out.instruction("MOV", "A,H");
      out.instruction("ORA", "L");
      out.instruction("JZ", elseLabel);
      compileExpression(out, n.then, warnings);
      out.instruction("JMP", endLabel);
      out.label(elseLabel);
      compileExpression(out, n.else, warnings);
      out.label(endLabel);
      return;
    }
    case "assign": {
      const structSize = assignedStructSize(n.target, n.value);
      if (structSize !== null) {
        compileStructCopy(out, n.target, n.value, structSize, warnings);
        return;
      }
      if (n.target.kind === "var") {
        compileExpression(out, n.value, warnings);
        const addr = variableAddress(out, n.target.name, n.target.resolved);
        if (addr === null) {
          warnings.push(`unresolved assignment target '${n.target.name}'`);
          return;
        }
        if (n.target.resolved && isByteType(n.target.resolved.type)) {
          out.instruction("MOV", "A,L");
          out.instruction("STA", addr);
        } else {
          out.instruction("SHLD", addr);
        }
        return;
      }
      if (n.target.kind === "member") {
        compileMemberAssign(out, n.target, n.value, warnings);
        return;
      }
      if (n.target.kind === "unary" && n.target.op === "deref") {
        compileExpression(out, n.target.arg, warnings);
        out.instruction("PUSH", "H");
        compileExpression(out, n.value, warnings);
        out.instruction("POP", "D");
        out.instruction("XCHG");
        if (derefIsByte(n.target.arg)) {
          out.instruction("MOV", "M,E");
        } else {
          out.instruction("MOV", "M,E");
          out.instruction("INX", "H");
          out.instruction("MOV", "M,D");
        }
        return;
      }
      warnings.push(`unsupported assignment target: ${n.target.kind}`);
      return;
    }
    default:
      warnings.push(`unhandled expression kind '${n.kind}'`);
      out.instruction("LXI", "H,0");
      return;
  }
}
function compileBinary(out, op, lhs, rhs, warnings) {
  compileExpression(out, lhs, warnings);
  out.instruction("PUSH", "H");
  compileExpression(out, rhs, warnings);
  if (op === "add" || op === "sub") {
    const ptrSize = pointeeByteSize(lhs);
    if (ptrSize > 1)
      scaleHL(out, ptrSize, warnings);
  }
  out.instruction("POP", "D");
  switch (op) {
    case "add":
      out.instruction("DAD", "D");
      return;
    case "sub": {
      out.instruction("MOV", "A,H");
      out.instruction("CMA");
      out.instruction("MOV", "H,A");
      out.instruction("MOV", "A,L");
      out.instruction("CMA");
      out.instruction("MOV", "L,A");
      out.instruction("INX", "H");
      out.instruction("DAD", "D");
      return;
    }
    case "mul":
      out.instruction("CALL", "__o_mul_u16");
      out.noteCallTo("__o_mul_u16");
      return;
    case "div": {
      out.instruction("XCHG");
      out.instruction("CALL", "__o_div_u16");
      out.noteCallTo("__o_div_u16");
      return;
    }
    case "mod": {
      out.instruction("XCHG");
      out.instruction("CALL", "__o_div_u16");
      out.noteCallTo("__o_div_u16");
      out.instruction("XCHG");
      return;
    }
    case "shl": {
      out.instruction("CALL", "__o_shl_u16");
      out.noteCallTo("__o_shl_u16");
      return;
    }
    case "shr": {
      out.instruction("CALL", "__o_shr_u16");
      out.noteCallTo("__o_shr_u16");
      return;
    }
    case "eq":
    case "ne":
    case "lt":
    case "le":
    case "gt":
    case "ge":
      compileCompare(out, op);
      return;
    case "and":
    case "or":
    case "xor":
      compileBitwise16(out, op);
      return;
    default:
      warnings.push(`unhandled binary op '${op}'`);
      out.instruction("LXI", "H,0");
      return;
  }
}
function compileShortCircuit(out, op, lhs, rhs, warnings) {
  const falseLabel = out.freshLabel(op === "logand" ? "land0" : "lor0");
  const trueLabel = out.freshLabel(op === "logand" ? "land1" : "lor1");
  const endLabel = out.freshLabel("lend");
  compileExpression(out, lhs, warnings);
  out.instruction("MOV", "A,H");
  out.instruction("ORA", "L");
  if (op === "logand") {
    out.instruction("JZ", falseLabel);
  } else {
    out.instruction("JNZ", trueLabel);
  }
  compileExpression(out, rhs, warnings);
  out.instruction("MOV", "A,H");
  out.instruction("ORA", "L");
  if (op === "logand") {
    out.instruction("JZ", falseLabel);
    out.instruction("LXI", "H,1");
    out.instruction("JMP", endLabel);
    out.label(falseLabel);
    out.instruction("LXI", "H,0");
  } else {
    out.instruction("JNZ", trueLabel);
    out.instruction("LXI", "H,0");
    out.instruction("JMP", endLabel);
    out.label(trueLabel);
    out.instruction("LXI", "H,1");
  }
  out.label(endLabel);
}
function compileCompare(out, op) {
  switch (op) {
    case "eq":
    case "ne": {
      out.instruction("MOV", "A,E");
      out.instruction("XRA", "L");
      out.instruction("MOV", "L,A");
      out.instruction("MOV", "A,D");
      out.instruction("XRA", "H");
      out.instruction("ORA", "L");
      setBoolFromFlag(out, op === "eq" ? "JZ" : "JNZ");
      return;
    }
    case "lt":
    case "ge": {
      out.instruction("MOV", "A,E");
      out.instruction("SUB", "L");
      out.instruction("MOV", "A,D");
      out.instruction("SBB", "H");
      setBoolFromFlag(out, op === "lt" ? "JM" : "JP");
      return;
    }
    case "le":
    case "gt": {
      out.instruction("MOV", "A,L");
      out.instruction("SUB", "E");
      out.instruction("MOV", "A,H");
      out.instruction("SBB", "D");
      setBoolFromFlag(out, op === "gt" ? "JM" : "JP");
      return;
    }
  }
}
function setBoolFromFlag(out, jumpWhenTrue) {
  const t = out.freshLabel("cmpT");
  const e = out.freshLabel("cmpE");
  out.instruction(jumpWhenTrue, t);
  out.instruction("LXI", "H,0");
  out.instruction("JMP", e);
  out.label(t);
  out.instruction("LXI", "H,1");
  out.label(e);
}
function compileBitwise16(out, op) {
  const byteOp = op === "and" ? "ANA" : op === "or" ? "ORA" : "XRA";
  out.instruction("MOV", "A,L");
  out.instruction(byteOp, "E");
  out.instruction("MOV", "L,A");
  out.instruction("MOV", "A,H");
  out.instruction(byteOp, "D");
  out.instruction("MOV", "H,A");
}
function compileUnary(out, op, arg, warnings) {
  if (op === "deref") {
    compileDeref(out, arg, warnings);
    return;
  }
  if (op === "addr") {
    if (arg.kind === "var") {
      const addr = variableAddress(out, arg.name, arg.resolved);
      if (addr) {
        out.instruction("LXI", `H,${addr}`);
        return;
      }
    }
    if (arg.kind === "unary" && arg.op === "deref") {
      compileExpression(out, arg.arg, warnings);
      return;
    }
    warnings.push(`&expr not supported for this operand`);
    out.instruction("LXI", "H,0");
    return;
  }
  if (op === "preinc" || op === "predec" || op === "postinc" || op === "postdec") {
    compileIncDec(out, op, arg, warnings);
    return;
  }
  compileExpression(out, arg, warnings);
  switch (op) {
    case "neg":
      out.instruction("MOV", "A,H");
      out.instruction("CMA");
      out.instruction("MOV", "H,A");
      out.instruction("MOV", "A,L");
      out.instruction("CMA");
      out.instruction("MOV", "L,A");
      out.instruction("INX", "H");
      return;
    case "bnot":
      out.instruction("MOV", "A,H");
      out.instruction("CMA");
      out.instruction("MOV", "H,A");
      out.instruction("MOV", "A,L");
      out.instruction("CMA");
      out.instruction("MOV", "L,A");
      return;
    case "not": {
      out.instruction("MOV", "A,H");
      out.instruction("ORA", "L");
      const t = out.freshLabel("notT");
      const e = out.freshLabel("notE");
      out.instruction("JZ", t);
      out.instruction("LXI", "H,0");
      out.instruction("JMP", e);
      out.label(t);
      out.instruction("LXI", "H,1");
      out.label(e);
      return;
    }
    default:
      warnings.push(`unhandled unary op '${op}'`);
      out.instruction("LXI", "H,0");
      return;
  }
}
function computeMemberAddress(out, n, warnings) {
  const field = resolveField(n);
  if (!field) {
    warnings.push(`cannot resolve field '${n.field}'`);
    out.instruction("LXI", "H,0");
    return null;
  }
  if (n.arrow) {
    compileExpression(out, n.object, warnings);
  } else {
    compileAddrOf(out, n.object, warnings);
  }
  if (field.offset > 0) {
    out.instruction("LXI", `D,${field.offset}`);
    out.instruction("DAD", "D");
  }
  return field;
}
function compileMemberRead(out, n, warnings) {
  const field = computeMemberAddress(out, n, warnings);
  if (!field)
    return;
  if (field.type.kind === "array" || field.type.kind === "struct")
    return;
  if (isByteType(field.type)) {
    out.instruction("MOV", "A,M");
    out.instruction("MOV", "L,A");
    out.instruction("MVI", "H,0");
  } else {
    out.instruction("MOV", "E,M");
    out.instruction("INX", "H");
    out.instruction("MOV", "D,M");
    out.instruction("XCHG");
  }
}
function compileMemberAssign(out, target, value, warnings) {
  const field = resolveField(target);
  if (!field) {
    warnings.push(`cannot resolve field '${target.field}'`);
    return;
  }
  if (target.arrow)
    compileExpression(out, target.object, warnings);
  else
    compileAddrOf(out, target.object, warnings);
  if (field.offset > 0) {
    out.instruction("LXI", `D,${field.offset}`);
    out.instruction("DAD", "D");
  }
  out.instruction("PUSH", "H");
  compileExpression(out, value, warnings);
  out.instruction("POP", "D");
  out.instruction("XCHG");
  if (isByteType(field.type)) {
    out.instruction("MOV", "M,E");
  } else {
    out.instruction("MOV", "M,E");
    out.instruction("INX", "H");
    out.instruction("MOV", "M,D");
  }
}
function resolveField(n) {
  const st = structTypeOf(n.object, n.arrow);
  if (!st || !st.fields)
    return null;
  return st.fields.find((f) => f.name === n.field) ?? null;
}
function structTypeOf(n, isArrowContext) {
  if (n.kind === "var" && n.resolved) {
    const t = n.resolved.type;
    if (isArrowContext) {
      if (t.kind === "pointer" && t.to.kind === "struct")
        return t.to;
    } else {
      if (t.kind === "struct")
        return t;
    }
  }
  if (n.kind === "unary" && n.op === "deref") {
    return elementStructType(n.arg);
  }
  if (n.kind === "member") {
    const parent = structTypeOf(n.object, n.arrow);
    if (parent && parent.fields) {
      const f = parent.fields.find((ff) => ff.name === n.field);
      if (f && f.type.kind === "struct")
        return f.type;
    }
  }
  return null;
}
function elementStructType(n) {
  if (n.kind === "var" && n.resolved) {
    const t = n.resolved.type;
    if (t.kind === "pointer" && t.to.kind === "struct")
      return t.to;
    if (t.kind === "array" && t.of.kind === "struct")
      return t.of;
  }
  if (n.kind === "binary" && n.op === "add") {
    return elementStructType(n.lhs) ?? elementStructType(n.rhs);
  }
  if (n.kind === "unary" && (n.op === "preinc" || n.op === "predec" || n.op === "postinc" || n.op === "postdec")) {
    return elementStructType(n.arg);
  }
  return null;
}
function compileAddrOf(out, n, warnings) {
  if (n.kind === "var") {
    const addr = variableAddress(out, n.name, n.resolved);
    if (addr) {
      out.instruction("LXI", `H,${addr}`);
      return;
    }
  }
  if (n.kind === "unary" && n.op === "deref") {
    compileExpression(out, n.arg, warnings);
    return;
  }
  if (n.kind === "member") {
    const field = resolveField(n);
    if (field) {
      if (n.arrow)
        compileExpression(out, n.object, warnings);
      else
        compileAddrOf(out, n.object, warnings);
      if (field.offset > 0) {
        out.instruction("LXI", `D,${field.offset}`);
        out.instruction("DAD", "D");
      }
      return;
    }
  }
  warnings.push(`cannot take address of ${n.kind}`);
  out.instruction("LXI", "H,0");
}
function staticStructType(n) {
  if (n.kind === "var" && n.resolved && n.resolved.type.kind === "struct")
    return n.resolved.type;
  if (n.kind === "member") {
    const parent = structTypeOf(n.object, n.arrow);
    if (parent && parent.fields) {
      const f = parent.fields.find((ff) => ff.name === n.field);
      if (f && f.type.kind === "struct")
        return f.type;
    }
  }
  if (n.kind === "unary" && n.op === "deref") {
    if (n.arg.kind === "var" && n.arg.resolved) {
      const t = n.arg.resolved.type;
      if (t.kind === "pointer" && t.to.kind === "struct")
        return t.to;
    }
  }
  return null;
}
function assignedStructSize(target, value) {
  const t = staticStructType(target);
  const v = staticStructType(value);
  if (!t || !v)
    return null;
  if (t.size === 0)
    return null;
  return t.size;
}
function compileStructCopy(out, target, value, size, warnings) {
  compileAddrOf(out, value, warnings);
  out.instruction("PUSH", "H");
  compileAddrOf(out, target, warnings);
  out.instruction("XCHG");
  out.instruction("POP", "H");
  out.instruction("MVI", `B,${size}`);
  const loop = out.freshLabel("scpy");
  out.label(loop);
  out.instruction("MOV", "A,M");
  out.instruction("STAX", "D");
  out.instruction("INX", "H");
  out.instruction("INX", "D");
  out.instruction("DCR", "B");
  out.instruction("JNZ", loop);
}
function compileIncDec(out, op, arg, warnings) {
  const isPre = op === "preinc" || op === "predec";
  const delta = op === "preinc" || op === "postinc" ? 1 : -1;
  if (arg.kind === "var") {
    const addr = variableAddress(out, arg.name, arg.resolved);
    if (!addr) {
      warnings.push(`unresolved ${op} target`);
      out.instruction("LXI", "H,0");
      return;
    }
    const ptrSize = arg.resolved?.type.kind === "pointer" ? typeSize(arg.resolved.type.to) : 1;
    if (arg.resolved && isByteType(arg.resolved.type)) {
      out.instruction("LDA", addr);
      if (!isPre) {
        out.instruction("MOV", "L,A");
        out.instruction("MVI", "H,0");
      }
      out.instruction(delta > 0 ? "INR" : "DCR", "A");
      out.instruction("STA", addr);
      if (isPre) {
        out.instruction("MOV", "L,A");
        out.instruction("MVI", "H,0");
      }
      return;
    }
    out.instruction("LHLD", addr);
    if (!isPre) {
      out.instruction("PUSH", "H");
    }
    const step = Math.max(ptrSize, 1);
    for (let i = 0;i < step; i++)
      out.instruction(delta > 0 ? "INX" : "DCX", "H");
    out.instruction("SHLD", addr);
    if (!isPre)
      out.instruction("POP", "H");
    return;
  }
  if (arg.kind === "unary" && arg.op === "deref") {
    compileIncDecAtAddress(out, op, arg.arg, derefIsByte(arg.arg), warnings);
    return;
  }
  if (arg.kind === "member") {
    const field = resolveField(arg);
    if (!field) {
      warnings.push(`${op} on unresolved member`);
      out.instruction("LXI", "H,0");
      return;
    }
    if (arg.arrow)
      compileExpression(out, arg.object, warnings);
    else
      compileAddrOf(out, arg.object, warnings);
    if (field.offset > 0) {
      out.instruction("LXI", `D,${field.offset}`);
      out.instruction("DAD", "D");
    }
    compileIncDecAtAddress(out, op, { kind: "const", pos: arg.pos, type: { kind: "base", base: "int" }, value: 0n }, isByteType(field.type), warnings, true);
    return;
  }
  warnings.push(`${op} on this operand not supported`);
  out.instruction("LXI", "H,0");
}
function compileIncDecAtAddress(out, op, addrExpr, byte, warnings, addrInHL = false) {
  const isPre = op === "preinc" || op === "predec";
  const delta = op === "preinc" || op === "postinc" ? 1 : -1;
  if (!addrInHL)
    compileExpression(out, addrExpr, warnings);
  if (byte) {
    out.instruction("MOV", "A,M");
    if (!isPre) {
      out.instruction("PUSH", "PSW");
    }
    out.instruction(delta > 0 ? "INR" : "DCR", "A");
    out.instruction("MOV", "M,A");
    if (!isPre) {
      out.instruction("POP", "PSW");
    }
    out.instruction("MOV", "L,A");
    out.instruction("MVI", "H,0");
    return;
  }
  out.instruction("MOV", "E,M");
  out.instruction("INX", "H");
  out.instruction("MOV", "D,M");
  out.instruction("DCX", "H");
  if (!isPre) {
    out.instruction("PUSH", "D");
  }
  if (delta > 0)
    out.instruction("INX", "D");
  else
    out.instruction("DCX", "D");
  out.instruction("MOV", "M,E");
  out.instruction("INX", "H");
  out.instruction("MOV", "M,D");
  out.instruction("DCX", "H");
  if (isPre) {
    out.instruction("XCHG");
  } else {
    out.instruction("POP", "H");
  }
}
function compileDeref(out, arg, warnings) {
  compileExpression(out, arg, warnings);
  if (derefIsByte(arg)) {
    out.instruction("MOV", "A,M");
    out.instruction("MOV", "L,A");
    out.instruction("MVI", "H,0");
  } else {
    out.instruction("MOV", "E,M");
    out.instruction("INX", "H");
    out.instruction("MOV", "D,M");
    out.instruction("XCHG");
  }
}
function derefIsByte(addressExpr) {
  if (addressExpr.kind === "var" && addressExpr.resolved) {
    const t = addressExpr.resolved.type;
    if (t.kind === "pointer")
      return isByteType(t.to);
    if (t.kind === "array")
      return isByteType(t.of);
  }
  if (addressExpr.kind === "binary" && addressExpr.op === "add") {
    return derefIsByte(addressExpr.lhs) || derefIsByte(addressExpr.rhs);
  }
  if (addressExpr.kind === "unary") {
    if (addressExpr.op === "preinc" || addressExpr.op === "predec" || addressExpr.op === "postinc" || addressExpr.op === "postdec") {
      return derefIsByte(addressExpr.arg);
    }
    if (addressExpr.op === "addr")
      return derefIsByte(addressExpr.arg);
  }
  if (addressExpr.kind === "member") {
    const field = resolveField(addressExpr);
    if (field) {
      if (field.type.kind === "pointer")
        return isByteType(field.type.to);
      if (field.type.kind === "array")
        return isByteType(field.type.of);
    }
  }
  return false;
}
function isByteType(t) {
  if (t.kind !== "base")
    return false;
  return t.base === "char" || t.base === "schar" || t.base === "uchar" || t.base === "bool";
}
function pointeeByteSize(n) {
  if (n.kind === "var" && n.resolved) {
    const t = n.resolved.type;
    if (t.kind === "pointer")
      return typeSize(t.to);
    if (t.kind === "array")
      return typeSize(t.of);
  }
  if (n.kind === "binary" && n.op === "add") {
    return pointeeByteSize(n.lhs) || pointeeByteSize(n.rhs);
  }
  if (n.kind === "member") {
    const field = resolveField(n);
    if (field) {
      if (field.type.kind === "pointer")
        return typeSize(field.type.to);
      if (field.type.kind === "array")
        return typeSize(field.type.of);
    }
  }
  return 0;
}
function scaleHL(out, size, warnings) {
  if (size === 1 || size === 0)
    return;
  let log = 0;
  let s = size;
  while (s > 1 && (s & 1) === 0) {
    log++;
    s >>= 1;
  }
  if (s === 1) {
    for (let i = 0;i < log; i++)
      out.instruction("DAD", "H");
    return;
  }
  out.instruction("LXI", `D,${size}`);
  out.instruction("CALL", "__o_mul_u16");
  out.noteCallTo("__o_mul_u16");
}
function compileSwitch(out, n, warnings) {
  const stmts = n.body.kind === "block" ? n.body.stmts : [n.body];
  const cases = [];
  let defaultIdx = -1;
  let defaultLabel = null;
  for (let i = 0;i < stmts.length; i++) {
    const s = stmts[i];
    if (s.kind === "case") {
      const v = foldConstExpr(s.value);
      if (v === null) {
        warnings.push(`non-constant case value`);
        continue;
      }
      cases.push({ value: v, label: out.freshLabel(`case`), idx: i });
    } else if (s.kind === "default") {
      defaultIdx = i;
      defaultLabel = out.freshLabel("default");
    }
  }
  const endLabel = out.freshLabel("endsw");
  compileExpression(out, n.expr, warnings);
  for (const c of cases) {
    const lo = Number(c.value & 0xffn);
    const hi = Number(c.value >> 8n & 0xffn);
    out.instruction("MOV", "A,L");
    out.instruction("CPI", `${lo}`);
    const skip = out.freshLabel("swskip");
    out.instruction("JNZ", skip);
    out.instruction("MOV", "A,H");
    out.instruction("CPI", `${hi}`);
    out.instruction("JZ", c.label);
    out.label(skip);
  }
  out.instruction("JMP", defaultLabel ?? endLabel);
  out.beginLoop(endLabel, endLabel);
  for (let i = 0;i < stmts.length; i++) {
    const s = stmts[i];
    if (s.kind === "case") {
      const c = cases.find((cc) => cc.idx === i);
      if (c)
        out.label(c.label);
      continue;
    }
    if (s.kind === "default") {
      if (defaultLabel)
        out.label(defaultLabel);
      continue;
    }
    compileNode(out, s, warnings);
  }
  out.endLoop();
  out.label(endLabel);
}
function foldConstExpr(n) {
  if (n.kind === "const")
    return typeof n.value === "bigint" ? n.value : null;
  if (n.kind === "unary") {
    const v = foldConstExpr(n.arg);
    if (v === null)
      return null;
    if (n.op === "neg")
      return -v;
    if (n.op === "bnot")
      return ~v;
    return null;
  }
  if (n.kind === "binary") {
    const l = foldConstExpr(n.lhs);
    const r = foldConstExpr(n.rhs);
    if (l === null || r === null)
      return null;
    switch (n.op) {
      case "add":
        return l + r;
      case "sub":
        return l - r;
      case "mul":
        return l * r;
      case "shl":
        return l << r;
      case "shr":
        return l >> r;
      case "or":
        return l | r;
      case "and":
        return l & r;
      case "xor":
        return l ^ r;
    }
  }
  return null;
}
function compileCall(out, n, warnings) {
  if (n.target.kind !== "var") {
    warnings.push("indirect call not yet supported");
    out.instruction("LXI", "H,0");
    return;
  }
  const name = n.target.name;
  out.noteCallTo(name);
  const args = n.args;
  const callee = out.findFunction(name);
  if (callee && callee.variadic) {
    const declared = callee.params.length;
    for (let i = declared;i < args.length; i++) {
      compileExpression(out, args[i], warnings);
      out.instruction("SHLD", vaArgAddr(i - declared));
    }
    out.noteVaArgsUsed(Math.max(0, args.length - declared));
    for (let i = 0;i < declared - 1 && i < args.length; i++) {
      compileExpression(out, args[i], warnings);
      out.instruction("SHLD", paramAddr(name, i + 1));
    }
    if (declared > 0 && declared - 1 < args.length) {
      compileExpression(out, args[declared - 1], warnings);
    }
    out.instruction("CALL", name);
    return;
  }
  if (callee && callee.storage === "stack") {
    const savedSlots = [];
    for (let i = 0;i < callee.params.length; i++)
      savedSlots.push(paramAddr(name, i + 1));
    for (let i = 0;i < callee.locals.length; i++) {
      const l = callee.locals[i];
      const sz = Math.max(typeSize(l.type), 1);
      if (sz !== 2) {
        warnings.push(`__stack function '${name}' has local '${l.name}' of size ${sz}; only word-sized locals are supported for recursion right now`);
        return;
      }
      savedSlots.push(localAddr(name, i));
    }
    for (const addr of savedSlots) {
      out.instruction("LHLD", addr);
      out.instruction("PUSH", "H");
    }
    for (let i = 0;i < args.length - 1; i++) {
      compileExpression(out, args[i], warnings);
      out.instruction("SHLD", paramAddr(name, i + 1));
    }
    if (args.length > 0)
      compileExpression(out, args[args.length - 1], warnings);
    out.instruction("CALL", name);
    out.instruction("XCHG");
    for (let i = savedSlots.length - 1;i >= 0; i--) {
      out.instruction("POP", "H");
      out.instruction("SHLD", savedSlots[i]);
    }
    out.instruction("XCHG");
    return;
  }
  for (let i = 0;i < args.length - 1; i++) {
    compileExpression(out, args[i], warnings);
    out.instruction("SHLD", paramAddr(name, i + 1));
  }
  if (args.length > 0)
    compileExpression(out, args[args.length - 1], warnings);
  out.instruction("CALL", name);
}
function vaArgAddr(idx) {
  return `__va_args+${idx * 2}`;
}
function variableAddress(out, name, v) {
  if (v === null) {
    return name;
  }
  const found = out.findVariableStorage(name, v);
  return found;
}
function isIntLike(t) {
  if (t.kind === "base") {
    return t.base === "int" || t.base === "uint" || t.base === "short" || t.base === "ushort" || t.base === "char" || t.base === "schar" || t.base === "uchar" || t.base === "bool";
  }
  if (t.kind === "pointer")
    return true;
  return false;
}
function foldConst(n) {
  if (n.kind === "const")
    return typeof n.value === "bigint" ? n.value : null;
  if (n.kind === "unary") {
    const v = foldConst(n.arg);
    if (v === null)
      return null;
    switch (n.op) {
      case "neg":
        return -v;
      case "not":
        return v === 0n ? 1n : 0n;
      case "bnot":
        return ~v;
      default:
        return null;
    }
  }
  if (n.kind === "binary") {
    const l = foldConst(n.lhs);
    const r = foldConst(n.rhs);
    if (l === null || r === null)
      return null;
    switch (n.op) {
      case "add":
        return l + r;
      case "sub":
        return l - r;
      case "mul":
        return l * r;
      case "div":
        return r === 0n ? null : l / r;
      case "mod":
        return r === 0n ? null : l % r;
      case "shl":
        return l << r;
      case "shr":
        return l >> r;
      case "and":
        return l & r;
      case "or":
        return l | r;
      case "xor":
        return l ^ r;
      default:
        return null;
    }
  }
  return null;
}
function toHex(n) {
  return `${n.toString(16).toUpperCase()}h`;
}
function toDec(n) {
  return n.toString();
}

class Emitter {
  lines = [];
  lastInstruction = "";
  labelCounter = 0;
  loopStack = [];
  strings = new Map;
  currentFrame = null;
  frames = [];
  globalVars = new Map;
  directive(text) {
    this.lines.push(`    ${text}`);
    this.lastInstruction = "";
  }
  directiveRaw(text) {
    this.lines.push(`    ${text}`);
    this.lastInstruction = "";
  }
  blank() {
    this.lines.push("");
  }
  label(name) {
    this.lines.push(`${name}:`);
    this.lastInstruction = "";
  }
  instruction(op, operands) {
    const formatted = operands ? formatOperands(operands) : undefined;
    this.lines.push(formatted ? `    ${op.padEnd(6)}${formatted}` : `    ${op}`);
    this.lastInstruction = op.toUpperCase();
  }
  raw(text) {
    this.lines.push(text);
    this.lastInstruction = "";
  }
  lastWasReturn() {
    return this.lastInstruction === "RET";
  }
  render() {
    return this.lines.join(`
`) + `
`;
  }
  freshLabel(prefix) {
    this.labelCounter++;
    return `.L${prefix}${this.labelCounter}`;
  }
  beginLoop(cont, end) {
    this.loopStack.push({ cont, end });
  }
  endLoop() {
    this.loopStack.pop();
  }
  currentLoopEnd() {
    return this.loopStack[this.loopStack.length - 1]?.end ?? null;
  }
  currentLoopCont() {
    return this.loopStack[this.loopStack.length - 1]?.cont ?? null;
  }
  beginFunction(f) {
    const frame = { func: f, paramSlots: f.params.length };
    this.currentFrame = frame;
    this.frames.push(frame);
  }
  endFunction() {
    this.currentFrame = null;
  }
  callsSeen = new Set;
  noteCallTo(name) {
    this.callsSeen.add(name);
  }
  vaArgSlots = 0;
  noteVaArgsUsed(count) {
    if (count > this.vaArgSlots)
      this.vaArgSlots = count;
  }
  getVaArgSlots() {
    return this.vaArgSlots;
  }
  declaredFunctions = new Map;
  recordFunction(f) {
    const existing = this.declaredFunctions.get(f.name);
    if (!existing || f.body !== null && existing.body === null) {
      this.declaredFunctions.set(f.name, f);
    }
  }
  findFunction(name) {
    return this.declaredFunctions.get(name);
  }
  emitRuntimeHelpers(userDefined) {
    for (const name of this.callsSeen) {
      if (userDefined.has(name))
        continue;
      const helper = RUNTIME_HELPERS[name];
      if (!helper)
        continue;
      this.blank();
      this.raw(helper.trimEnd());
    }
  }
  findVariableStorage(name, v) {
    if (this.currentFrame !== null) {
      const paramIdx = this.currentFrame.func.params.findIndex((p) => p === v || p.name === name);
      if (paramIdx >= 0)
        return paramAddr(this.currentFrame.func.name, paramIdx + 1);
      const localIdx = this.currentFrame.func.locals.findIndex((l) => l === v || l.name === name);
      if (localIdx >= 0)
        return localAddr(this.currentFrame.func.name, localIdx);
    }
    this.globalVars.set(name, v);
    return name;
  }
  declareGlobal(v) {
    this.globalVars.set(v.name, v);
  }
  internString(s) {
    const existing = this.strings.get(s);
    if (existing !== undefined)
      return existing;
    const label = `__str${this.strings.size}`;
    this.strings.set(s, label);
    return label;
  }
  emitStaticStack() {
    if (this.frames.length === 0 && this.strings.size === 0)
      return;
    this.blank();
    this.label("__static_stack");
    let offset = 0;
    for (const frame of this.frames) {
      let frameBytes = frame.func.params.length * 2;
      const localOffsets = [];
      for (const l of frame.func.locals) {
        localOffsets.push(frameBytes);
        frameBytes += Math.max(typeSize(l.type), 1);
      }
      if (frameBytes > 0) {
        this.directive(`DS   ${frameBytes}  ; ${frame.func.name}`);
      }
      this.lines.push(`${frameAddr(frame.func.name)}: EQU __static_stack+${offset}`);
      for (let i = 0;i < frame.func.params.length; i++) {
        this.lines.push(`${paramAddr(frame.func.name, i + 1)}: EQU ${frameAddr(frame.func.name)}+${i * 2}`);
      }
      for (let i = 0;i < frame.func.locals.length; i++) {
        this.lines.push(`${localAddr(frame.func.name, i)}: EQU ${frameAddr(frame.func.name)}+${localOffsets[i]}`);
      }
      offset += frameBytes;
    }
  }
  emitGlobalsStorage() {
    const unique = new Map;
    for (const [name, v] of this.globalVars)
      unique.set(name, v);
    if (unique.size === 0 && this.strings.size === 0)
      return;
    this.blank();
    for (const [name, v] of unique) {
      this.label(name);
      if (v.initializer !== null) {
        emitInitializerData(this, v.type, v.initializer);
      } else {
        const size = Math.max(typeSize(v.type), 1);
        this.directive(`DS   ${size}`);
      }
    }
    for (const [text, label] of this.strings) {
      this.label(label);
      this.directive(`DB   ${encodeDbString(text)}, 0`);
    }
  }
}
function localAddr(func, idx) {
  return `__l_${idx}_${func.toLowerCase()}`;
}
function typeSize(t) {
  if (t.kind === "base") {
    switch (t.base) {
      case "char":
      case "schar":
      case "uchar":
      case "bool":
        return 1;
      case "short":
      case "ushort":
      case "int":
      case "uint":
        return 2;
      case "long":
      case "ulong":
        return 4;
      case "llong":
      case "ullong":
        return 8;
      case "float":
        return 4;
      case "double":
        return 8;
      case "void":
        return 0;
    }
  }
  if (t.kind === "pointer")
    return 2;
  if (t.kind === "array")
    return typeSize(t.of) * (t.length ?? 0);
  if (t.kind === "struct")
    return t.size;
  if (t.kind === "function")
    return 0;
  return 0;
}
var RUNTIME_HELPERS = {
  __o_mul_u16: `
__o_mul_u16:
    MOV   B,H
    MOV   C,L
    LXI   H,0
    MVI   A,16
.Lmulloop:
    DAD   H
    XCHG
    DAD   H
    XCHG
    JNC   .Lmulskip
    DAD   B
.Lmulskip:
    DCR   A
    JNZ   .Lmulloop
    RET
`,
  __o_div_u16: `
__o_div_u16:
    MOV   B,D
    MOV   C,E
    LXI   D,0
    MVI   A,16
    STA   __o_div_cnt
.Ldivloop:
    DAD   H
    MOV   A,E
    RAL
    MOV   E,A
    MOV   A,D
    RAL
    MOV   D,A
    MOV   A,E
    SUB   C
    MOV   E,A
    MOV   A,D
    SBB   B
    MOV   D,A
    JC    .Ldivrestore
    INR   L
    JMP   .Ldivnext
.Ldivrestore:
    MOV   A,E
    ADD   C
    MOV   E,A
    MOV   A,D
    ADC   B
    MOV   D,A
.Ldivnext:
    LDA   __o_div_cnt
    DCR   A
    STA   __o_div_cnt
    JNZ   .Ldivloop
    RET

__o_div_cnt:
    DS    1
`,
  __o_shl_u16: `
__o_shl_u16:
    MOV   A,L
    ANI   0Fh
    RZ
    XCHG
    MOV   B,A
.Lshlloop:
    DAD   H
    DCR   B
    JNZ   .Lshlloop
    RET
`,
  __o_shr_u16: `
__o_shr_u16:
    MOV   A,L
    ANI   0Fh
    RZ
    XCHG
    MOV   B,A
.Lshrloop:
    MOV   A,H
    ORA   A
    RAR
    MOV   H,A
    MOV   A,L
    RAR
    MOV   L,A
    DCR   B
    JNZ   .Lshrloop
    RET
`,
  putchar: `
putchar:
    MOV   E,L
    MVI   C,2
    CALL  5
    RET
`,
  puts: `
puts:
    SHLD  __rt_puts_p
.Lputsloop:
    LHLD  __rt_puts_p
    MOV   A,M
    ORA   A
    JZ    .Lputsdone
    MOV   E,A
    MVI   C,2
    PUSH  H
    CALL  5
    POP   H
    INX   H
    SHLD  __rt_puts_p
    JMP   .Lputsloop
.Lputsdone:
    RET

__rt_puts_p:
    DS    2
`
};
function emitInitializerData(out, type, init) {
  if (init.kind === "expr") {
    const e = init.expr;
    if (e.kind === "const" && typeof e.value === "string") {
      if (type.kind === "pointer") {
        const label = out.internString(e.value);
        out.directiveRaw(`DW   ${label}`);
        return;
      }
      out.directiveRaw(`DB   ${encodeDbString(e.value)}, 0`);
      const declared = typeSize(type);
      const actual = e.value.length + 1;
      if (declared > actual)
        out.directiveRaw(`DS   ${declared - actual}`);
      return;
    }
    const v = foldConst(e);
    if (v === null) {
      out.directiveRaw(`DS   ${Math.max(typeSize(type), 1)}   ; non-constant initializer dropped`);
      return;
    }
    emitScalarBytes(out, type, v);
    return;
  }
  if (type.kind === "array") {
    let emitted = 0;
    for (const item of init.items) {
      emitInitializerData(out, type.of, item);
      emitted += Math.max(typeSize(type.of), 1);
    }
    const total = Math.max(typeSize(type), 1);
    if (total > emitted)
      out.directiveRaw(`DS   ${total - emitted}`);
    return;
  }
  if (type.kind === "struct" && type.fields) {
    let emitted = 0;
    const items = init.items;
    for (let i = 0;i < type.fields.length; i++) {
      const f = type.fields[i];
      if (f.offset > emitted) {
        out.directiveRaw(`DS   ${f.offset - emitted}`);
        emitted = f.offset;
      }
      if (i < items.length) {
        emitInitializerData(out, f.type, items[i]);
      } else {
        out.directiveRaw(`DS   ${Math.max(typeSize(f.type), 1)}`);
      }
      emitted += Math.max(typeSize(f.type), 1);
    }
    if (type.size > emitted)
      out.directiveRaw(`DS   ${type.size - emitted}`);
    return;
  }
  for (const item of init.items) {
    if (item.kind === "expr") {
      const v = foldConst(item.expr);
      if (v !== null)
        emitScalarBytes(out, { kind: "base", base: "int" }, v);
      else
        out.directiveRaw(`DW   0   ; non-const item`);
    }
  }
}
function emitScalarBytes(out, type, value) {
  const size = Math.max(typeSize(type), 1);
  if (size === 1)
    out.directiveRaw(`DB   ${Number(value) & 255}`);
  else if (size === 2)
    out.directiveRaw(`DW   ${Number(value) & 65535}`);
  else {
    const parts = [];
    let v = value;
    for (let i = 0;i < size; i++) {
      parts.push(String(Number(v & 0xffn)));
      v = v >> 8n;
    }
    out.directiveRaw(`DB   ${parts.join(", ")}`);
  }
}
function encodeDbString(s) {
  const parts = [];
  let buf = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 34 || code > 126) {
      if (buf.length > 0) {
        parts.push(`"${buf}"`);
        buf = "";
      }
      parts.push(code.toString());
    } else {
      buf += ch;
    }
  }
  if (buf.length > 0)
    parts.push(`"${buf}"`);
  if (parts.length === 0)
    parts.push("0");
  return parts.join(", ");
}

// node_modules/asm8080/dist/asm8.js
var {readFileSync, writeFileSync, mkdirSync} = (() => ({}));
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
var DATA_DIRECTIVES = new Set(["DB", "DW", "DS"]);
function rk86CheckSum(v) {
  let sum = 0;
  let j = 0;
  while (j < v.length - 1) {
    const c = v[j];
    sum = sum + c + (c << 8) & 65535;
    j += 1;
  }
  const sumH = sum & 65280;
  const sumL = sum & 255;
  return sumH | sumL + v[j] & 255;
}
function wrapRk86File(payload, start, end, format2, trailerPadding = 0) {
  if (format2 === "bin")
    return payload;
  const hasSync = format2 === "pki" || format2 === "gam";
  const out = new Uint8Array((hasSync ? 5 : 4) + payload.length + trailerPadding + 3);
  let o = 0;
  if (hasSync)
    out[o++] = 230;
  out[o++] = start >> 8 & 255;
  out[o++] = start & 255;
  out[o++] = end >> 8 & 255;
  out[o++] = end & 255;
  out.set(payload, o);
  o += payload.length + trailerPadding;
  const checksum = rk86CheckSum(payload);
  out[o++] = 230;
  out[o++] = checksum >> 8 & 255;
  out[o++] = checksum & 255;
  return out;
}
if (false) {}

// src/formats/rks.ts
function wrapRks(payload) {
  if (payload.length === 0)
    return new Uint8Array(0);
  const end = payload.length - 1;
  let sum = 0;
  for (let i = 0;i < payload.length - 1; i++)
    sum = sum + payload[i] * 257 & 65535;
  const crc = (sum & 65280) + (sum + payload[payload.length - 1] & 255) & 65535;
  const out = new Uint8Array(payload.length + 6);
  out[0] = 0;
  out[1] = 0;
  out[2] = end & 255;
  out[3] = end >> 8 & 255;
  out.set(payload, 4);
  out[out.length - 2] = crc & 255;
  out[out.length - 1] = crc >> 8 & 255;
  return out;
}

// docs/playground.ts
var FALLBACK_SOURCE = `int main(void) { puts("hello, c8080"); return 0; }
`;
async function fetchInitialSource() {
  try {
    const r = await fetch("initial.c", { cache: "no-store" });
    if (!r.ok)
      return FALLBACK_SOURCE;
    return await r.text();
  } catch {
    return FALLBACK_SOURCE;
  }
}
var PLAYGROUND_ORG = 0;
function compile(source) {
  try {
    const fs = new MemoryFileSystem({ "/a.c": source });
    const pp = new Preprocessor({ fs });
    pp.openFile("/a.c");
    const program = new Parser(new Lex(pp)).parseProgram();
    const { asm: asmSource, warnings } = compileProgram(program, { org: PLAYGROUND_ORG });
    let bytes = null;
    let rkStart = 0;
    let rkEnd = 0;
    try {
      const sections = asm(asmSource);
      if (sections.length > 0) {
        const sorted = [...sections].sort((a, b) => a.start - b.start);
        rkStart = sorted[0].start;
        rkEnd = sorted[sorted.length - 1].end;
        const buf = new Uint8Array(rkEnd - rkStart + 1);
        for (const s of sections)
          buf.set(s.data, s.start - rkStart);
        bytes = buf;
      }
    } catch (e) {
      const msg = e instanceof AsmError ? `asm8080 ${e.line}:${e.column}: ${e.message}` : e.message;
      return { asm: asmSource, warnings, bytes: null, rkStart: 0, rkEnd: 0, error: msg };
    }
    return { asm: asmSource, warnings, bytes, rkStart, rkEnd, error: null };
  } catch (e) {
    return {
      asm: "",
      warnings: [],
      bytes: null,
      rkStart: 0,
      rkEnd: 0,
      error: e.message
    };
  }
}
function hex2(n) {
  return n.toString(16).padStart(2, "0").toUpperCase();
}
function hex4(n) {
  return n.toString(16).padStart(4, "0").toUpperCase();
}
function formatBytes(bytes, origin) {
  let firstNonZero = -1;
  let lastNonZero = -1;
  for (let i = 0;i < bytes.length; i++) {
    if (bytes[i] !== 0) {
      if (firstNonZero < 0)
        firstNonZero = i;
      lastNonZero = i;
    }
  }
  if (firstNonZero < 0)
    return "(all zero)";
  const start = firstNonZero & ~15;
  const end = Math.min(bytes.length, (lastNonZero & ~15) + 16);
  const lines = [];
  for (let i = start;i < end; i += 16) {
    const row = [...bytes.slice(i, i + 16)].map(hex2).join(" ");
    const ascii = [...bytes.slice(i, i + 16)].map((b) => b >= 32 && b < 127 ? String.fromCharCode(b) : ".").join("");
    lines.push(`${hex4(origin + i)}  ${row.padEnd(47)}  ${ascii}`);
  }
  return lines.join(`
`);
}
var STORAGE_KEY = "c8080-playground-source";
var THEME_KEY = "c8080-playground-theme";
function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
function saveTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}
}
function applyTheme(t, btn) {
  document.body.classList.toggle("theme-light", t === "light");
  if (btn)
    btn.textContent = t === "light" ? "dark" : "light";
}
function debounce(fn, ms) {
  let handle = null;
  return (...args) => {
    if (handle !== null)
      clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}
function toBase64(bytes) {
  let s = "";
  for (let i = 0;i < bytes.length; i++)
    s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
var EMULATOR_URL_DEFAULT = "https://rk86.ru/beta/index.html";
var EMULATOR_URL = window.c8080EmulatorUrl ?? EMULATOR_URL_DEFAULT;
var HANDOFF_PREFIX = "c8080-handoff:";
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
        const parsed = JSON.parse(raw);
        if (!parsed.ts || now - parsed.ts > HANDOFF_TTL_MS)
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
async function init() {
  const srcEl = document.getElementById("source");
  const asmEl = document.getElementById("asm");
  const errEl = document.getElementById("error");
  const statusEl = document.getElementById("status");
  const bytesEl = document.getElementById("bytes");
  const runBtn = document.getElementById("run");
  const downloadBtn = document.getElementById("download");
  const downloadFmt = document.getElementById("download-format");
  const resetBtn = document.getElementById("reset");
  const themeBtn = document.getElementById("theme");
  const confirmModal = document.getElementById("confirm-modal");
  const confirmMessage = document.getElementById("confirm-message");
  const confirmOk = document.getElementById("confirm-ok");
  const confirmCancel = document.getElementById("confirm-cancel");
  let confirmResolver = null;
  const askConfirm = (message) => {
    confirmMessage.textContent = message;
    confirmModal.hidden = false;
    confirmOk.focus();
    return new Promise((resolve2) => {
      confirmResolver = resolve2;
    });
  };
  const closeConfirm = (result) => {
    confirmModal.hidden = true;
    const r = confirmResolver;
    confirmResolver = null;
    if (r)
      r(result);
  };
  confirmOk.addEventListener("click", () => closeConfirm(true));
  confirmCancel.addEventListener("click", () => closeConfirm(false));
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal)
      closeConfirm(false);
  });
  window.addEventListener("keydown", (e) => {
    if (confirmModal.hidden)
      return;
    if (e.key === "Escape")
      closeConfirm(false);
    if (e.key === "Enter")
      closeConfirm(true);
  });
  applyTheme(loadTheme(), themeBtn);
  themeBtn.addEventListener("click", () => {
    const next = document.body.classList.contains("theme-light") ? "dark" : "light";
    applyTheme(next, themeBtn);
    saveTheme(next);
  });
  resetBtn.addEventListener("click", async () => {
    const ok = await askConfirm("Reset the editor to the starter example? Your current edits will be lost.");
    if (!ok)
      return;
    const fresh = await fetchInitialSource();
    srcEl.value = fresh;
    localStorage.setItem(STORAGE_KEY, fresh);
    run();
    srcEl.focus();
  });
  let latest = null;
  const triggerDownload = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  downloadBtn.addEventListener("click", () => {
    const fmt = downloadFmt.value;
    const name = "c8080-playground";
    if (fmt === "c") {
      triggerDownload(`${name}.c`, new Blob([srcEl.value], { type: "text/plain" }));
      return;
    }
    if (!latest)
      return;
    if (fmt === "asm") {
      triggerDownload(`${name}.asm`, new Blob([latest.asm], { type: "text/plain" }));
      return;
    }
    if (!latest.bytes || latest.error)
      return;
    const { bytes, rkStart, rkEnd } = latest;
    let out;
    switch (fmt) {
      case "bin":
        out = bytes;
        break;
      case "rks":
        out = wrapRks(bytes);
        break;
      case "rk":
      case "rkr":
      case "pki":
      case "gam":
        out = wrapRk86File(bytes, rkStart, rkEnd, fmt);
        break;
      default:
        return;
    }
    triggerDownload(`${name}.${fmt}`, new Blob([out], { type: "application/octet-stream" }));
  });
  const saved = localStorage.getItem(STORAGE_KEY);
  srcEl.value = saved ?? await fetchInitialSource();
  runBtn.addEventListener("click", () => {
    if (!latest || !latest.bytes || latest.error)
      return;
    const rk = wrapRk86File(latest.bytes, latest.rkStart, latest.rkEnd, "rk");
    const dataUrl = `data:;name=c8080-playground.rk;base64,${toBase64(rk)}`;
    const target = new URL(EMULATOR_URL, location.href);
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
  const run = () => {
    const t0 = performance.now();
    const result = compile(srcEl.value);
    const t1 = performance.now();
    latest = result;
    asmEl.textContent = result.asm || "(no output)";
    if (result.error) {
      errEl.textContent = result.error;
      errEl.hidden = false;
    } else {
      errEl.textContent = "";
      errEl.hidden = true;
    }
    const parts = [];
    parts.push(`${(t1 - t0).toFixed(1)} ms`);
    if (result.bytes)
      parts.push(`${result.bytes.length} bytes @ ${result.rkStart.toString(16).toUpperCase()}h–${result.rkEnd.toString(16).toUpperCase()}h`);
    if (result.warnings.length > 0)
      parts.push(`${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}`);
    statusEl.textContent = parts.join(" · ");
    if (result.bytes) {
      bytesEl.textContent = formatBytes(result.bytes, result.rkStart);
      bytesEl.hidden = false;
    } else {
      bytesEl.textContent = "";
      bytesEl.hidden = true;
    }
    runBtn.disabled = !result.bytes || result.error !== null;
    localStorage.setItem(STORAGE_KEY, srcEl.value);
  };
  const debouncedRun = debounce(run, 150);
  srcEl.addEventListener("input", debouncedRun);
  run();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init();
  });
} else {
  init();
}
