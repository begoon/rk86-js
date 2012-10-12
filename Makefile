.PHONY: build files

all: build files
	
ifeq ($(OS),Windows_NT)
  CC = c:/tcc/tcc
  EXE = .exe
  OPENER = start
else
  CC = cc
  OPENER = open
endif

build:
	$(CC) -o rkdump$(EXE) rkdump.c

files:
	(cd files && ls -1 >../files.lst)
	./rkdump$(EXE) < files.lst > rk86_tape_catalog.js

release:
	7z a rk86js-0.00.zip *.js *.html *.bmp *.md tape/

run:
	$(OPENER) index.html

chrome:
	open -a "Google Chrome" --args \
		--allow-file-access-from-files file://$(PWD)/index.html

safari:
	open -a "Safari" index.html

clean:
	-rm files.lst rkdump$(EXE) rk86_tape_catalog.js
	$(MAKE) -C catalog clean

