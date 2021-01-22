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
	7z a rk86js-1.52.zip -xr!\*rb -xr!\*md -xr!Makefile -xr!.DS_Store \
		*.html *.js *.bmp files/ catalog/ js/ termlib/


clean:
	-rm files.lst rkdump$(EXE) rk86_tape_catalog.js
	$(MAKE) -C catalog clean
