.PHONY: build

all: test build release

build: build-core build-tape build-catalog

build-core:
	-rm -rf build
	cp -R src build

build-catalog:
	node tools/build-catalog.js > build/catalog/index.html

build-tape:
	node tools/build.js tape > build/rk86_tape_catalog.js

release: release-production release-beta

release-production:
	-rm -rf docs
	mkdir docs
	cp -R build/* docs

release-beta:
	-rm -rf docs/beta
	mkdir docs/beta
	cp -R build/* docs/beta

serve-python:
	(cd docs && python3 -m http.server --bind 127.0.0.1 8000)

serve:
	(cd build && npx http-server . -p 8000)

test:
	npx ava

ci:
	npm install
	npm run test

clean:
	-rm -rf build
	git checkout -- docs/*
