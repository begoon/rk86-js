.PHONY: build files

all: build files build-catalog

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

build-catalog:
	$(MAKE) -C catalog

files:
	(cd files && ls -1 >../files.lst)
	./rkdump$(EXE) < files.lst > rk86_tape_catalog.js

release:
	7z a rk86js-1.51.zip -xr!\*rb -xr!\*md -xr!Makefile -xr!.DS_Store \
		*.html *.js *.bmp files/ catalog/ js/ termlib/

run:
	$(OPENER) index.html

canary:
	"${ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" \
		--allow-file-access-from-files file://$(CURDIR)/index.html

chrome:
	open -a "Google Chrome" --args \
		--allow-file-access-from-files file://$(PWD)/index.html

safari:
	open -a "Safari" index.html

clean:
	-rm files.lst rkdump$(EXE) rk86_tape_catalog.js
	$(MAKE) -C catalog clean
