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
	-rm -rf docs
	mkdir docs
	cp -R catalog files js termlib *.html *.js *.bmp CNAME docs
	rm docs/catalog/Makefile
	rm docs/catalog/*.rb

serve:
	(cd docs && python3 -m http.server --bind 127.0.0.1 8000)

clean:
	-rm files.lst rkdump$(EXE) rk86_tape_catalog.js
	$(MAKE) -C catalog clean
