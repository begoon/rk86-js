all: test tape build-catalog release

build-catalog:
	$(MAKE) -C catalog

tape:
	node tools/build.js tape > rk86_tape_catalog.js

release: release-production release-beta

release-production:
	-rm -rf docs
	mkdir docs
	cp -R catalog files js termlib *.html *.js *.bmp *.ico CNAME i docs
	rm docs/catalog/Makefile
	rm docs/catalog/*.rb

release-beta:
	-rm -rf docs/beta
	mkdir docs/beta
	cp -R catalog files js termlib *.html *.js *.bmp *.ico CNAME i docs/beta
	rm docs/beta/catalog/Makefile
	rm docs/beta/catalog/*.rb

dev-release: release
	cp experiments/* docs

serve-python:
	(cd docs && python3 -m http.server --bind 127.0.0.1 8000)

serve:
	(cd docs && npx http-server . -p 8000)

test:
	npx ava

ci:
	npm install
	npm run test

clean:
	-rm rk86_tape_catalog.js
	$(MAKE) -C catalog clean
