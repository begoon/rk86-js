.PHONY: build files

all: build files
	
ifeq ($(OS),Windows_NT)
  CC = c:/tcc/tcc
  EXE = .exe
else
  CC = cc
endif

build:
	$(CC) -o rkdump$(EXE) rkdump.c

files:
	(cd files && ls -1 >../files.lst)
	-mkdir tape
	./rkdump$(EXE) < files.lst > rk86_tape_catalog.js

release:
	7z a rk86js-0.00.zip *.js *.html *.bmp *.md tape/

run:
	open index.html

chrome:
	open -a "Google Chrome" --args \
		--allow-file-access-from-files file://$(PWD)/index.html

safari:
	open -a "Safari" index.html

clean:
	-rm files.lst rkdump$(EXE) rk86_tape_catalog.js
	-rm tape/*
