.PHONY: build files

all: test build files build-catalog release

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

release: release-production release-beta

release-production:
	-rm -rf docs
	mkdir docs
	cp -R catalog files js termlib *.html *.js *.bmp *.ico CNAME i docs/
	rm docs/rkdump.js
	python version.py rk86_keyboard_layout.html >rk86_keyboard_layout.version.html
	mv rk86_keyboard_layout.version.html docs/rk86_keyboard_layout.html
	rm docs/catalog/Makefile
	rm docs/catalog/*.rb
	rm docs/*.test.js
	touch docs/.nojekyll

release-beta:
	-rm -rf docs/beta
	mkdir docs/beta
	cp -R catalog files js termlib *.html *.js *.bmp *.ico CNAME i docs/beta
	rm docs/beta/rkdump.js
	python version.py rk86_keyboard_layout.html >rk86_keyboard_layout.version.html
	mv rk86_keyboard_layout.version.html docs/beta/rk86_keyboard_layout.html
	rm docs/beta/catalog/Makefile
	rm docs/beta/catalog/*.rb
	rm docs/beta/*.test.js

dev-release: release
	cp experiments/* docs

serve-python:
	(cd docs && python3 -m http.server --bind 127.0.0.1 8000)

serve:
	(cd docs && npx http-server . -p 8000)

test:
	npx ava

clean:
	-rm files.lst rkdump$(EXE) rk86_tape_catalog.js
	$(MAKE) -C catalog clean
