default: test-js build

install:
    bun install

test: test-js test-i8080

test-js:
    bun test --only-failures

test-watch:
    bun test --watch --only-failures

test-i8080:
    bun test/i8080_ex.ts

test-ex1-bun:
    bun test/i8080_ex.ts --ex1 --verbose

test-ex1-node:
    bunx tsx test/i8080_ex.ts --ex1 --verbose

test-ci: test-js test-ex1-bun

#

build:
    bun run build

lint:
    bunx eslint *.ts

#

release-root:
    bun run build
    rsync -a build/ docs/

release-beta:
    BASE_PATH=/beta bun run build
    cp -R ./build/* docs/beta/

release: release-root

release-experimental: release-beta

#

serve port='8000':
    cd docs && python3 -m http.server --bind 127.0.0.1 {{ port }}

serve-dev:
    bun dev

clean:
    git clean -fdx -e .claude

#

terminal-run *args='':
    bun src/lib/terminal/rk86_terminal.ts {{ args }}

terminal-build:
    bun build src/lib/terminal/rk86_terminal.ts --outfile ./rk86.ts --target=bun
    echo '#!/usr/bin/env bun' | cat - ./rk86.ts > packages/rk86/rk86.js
    chmod +x packages/rk86/rk86.js
    rm -f packages/rk86/rk86 packages/rk86/rk86.ts

terminal-bump:
    cd packages/rk86 && npm version patch

terminal-publish: terminal-build terminal-bump
    cd packages/rk86 && npm publish

#

component-build:
    bun tools/build_embedded_monitors.ts
    bun build src/lib/component/radio86-emulator.ts --outfile packages/radio86-emulator/radio86-emulator.js --minify

component-bump:
    cd packages/radio86-emulator && npm version patch

component-publish: component-build component-bump
    cd packages/radio86-emulator && npm publish

#

build-asm: build-claude build-exiter

build-claude:
    bunx asm8080 info/asm/claude.asm -o info/asm --split

build-exiter:
    bunx asm8080 info/asm/exiter.asm -o info/asm --split

update-asm8:
    cp \
    ../asm8/docs/playground.js \
    ../asm8/docs/index.html \
    ../asm8/docs/style.css \
    static/asm/

update-c8080:
    cp \
    ../c8080-js/docs/playground.js \
    ../c8080-js/docs/index.html \
    ../c8080-js/docs/style.css \
    ../c8080-js/docs/initial.c \
    static/c8080/

update-plm80:
    cp \
    ../plm80/docs/playground.js \
    ../plm80/docs/index.html \
    ../plm80/docs/style.css \
    static/plm80/

update-tape:
    cp \
    ../rk86-tape/docs/index.html \
    ../rk86-tape/docs/examples.json \
    static/tape/
    rsync -a --delete ../rk86-tape/docs/wav/ static/tape/wav/
