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

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

int dump_file(const char* name) {
  char dump_name[1024];
  char in_name[1024], js_name[1024];
  FILE *f, *js;
  int start, end, entry;
  unsigned char ch;
  char* period;
  int i;

  strcpy(dump_name, name);

  period = strchr(dump_name, '.');
  assert(period != NULL);

  strcpy(in_name, "files/");
  strcat(in_name, name);
  f = fopen(in_name, "rb+");
  if (!f) {
    fprintf(stderr, "unable to open file [%s]\n", in_name);
    exit(1);
  }

  strcpy(js_name, "tape/");
  strcat(js_name, name);
  strcat(js_name, ".js");

  js = fopen(js_name, "w");
  if (!js) {
    fprintf(stderr, "unable to create file [%s]\n", js_name);
    exit(1);
  }

  // If the file name starts with "mon" this is an image of Monitor
  // (no sync-byte, start and end addresses at front).
  if (!strcmp(period, ".bin") || !strcmp(period, ".COM")) {
    long sz;
    assert(fseek(f, 0L, SEEK_END) == 0);
    sz = ftell(f);
    assert(sz > -1L);

    if (!memcmp(name, "mon", 3)) {
      end = 0xffff;
      start = end - sz + 1;
      entry = 0xf800;
    } else if (!strcmp(period, ".COM")) {
      start = 0x100;
      end = start + sz - 1;
      entry = start;
    } else {
      end = sz;
      start = 0;
      entry = 0;
    }

    assert(fseek(f, 0L, SEEK_SET) == 0);
  } else {
    // Is it the sync-byte (E6)?
    fread(&ch, 1, 1, f);  
    if (ch == 0xe6) fread(&ch, 1, 1, f); 

    // start address
    start = ch << 8;
    fread(&ch, 1, 1, f); start |= ch;

    // end address
    fread(&ch, 1, 1, f); end = ch << 8;
    fread(&ch, 1, 1, f); end |= ch;

    entry = start;
    *period = 0;
  }

  fprintf(js, "%s\n", "function tape_file() {");
  fprintf(js, "%s\n", "var file = {");
  fprintf(js, "name: \"%s\",\n", name);
  fprintf(js, "start: 0x%04x,\n", start);
  fprintf(js, "end: 0x%04x,\n", end);
  fprintf(js, "entry: 0x%04x,\n", entry);
  fprintf(js, "image:\n");

  fprintf(stderr, "%s\n", name);

  fprintf(js, "\"");
  i = 0;
  while (start <= end) {
    char ch;
    assert(!feof(f));
    fread(&ch, 1, 1, f);
    fprintf(js, "\\x%02X", (unsigned char)ch);
    ++i;
    if (i >= 32) {
      i = 0;
      fprintf(js, "\"");
      if (start < end) fprintf(js, " +\n\"");
    }
    ++start;
  }                     
  if (i > 0) fprintf(js, "\"");

  fprintf(js, "%s\n", "};");
  fprintf(js, "%s\n", "ui.file_loaded(file);");
  fprintf(js, "%s\n", "}");
  fprintf(js, "%s\n", "tape_file();");

  fclose(f);
  fclose(js);

  return 0;
}

int main(int argc, char* argv[]) {

  if (argc == 2) return dump_file(argv[1]);

  printf("%s\n", "function tape_catalog() {");
  printf("  %s\n", "return [");

  while (!feof(stdin)) {
    char line[1024];
    int sz;
    char* p;

    *line = 0;
    fgets(line, sizeof(line), stdin);
    sz = strlen(line);
    if (!sz) break;
    p = line + strlen(line) - 1;
    while (p != line && (*p == '\r' || *p == '\n')) *p-- = 0;

    dump_file(line);

    printf("    \"%s\",\n", line);
  }

  printf("  %s\n", "];");
  printf("%s\n", "}");

  return 0;
}
