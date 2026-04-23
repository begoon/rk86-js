default: test-js build

test: test-js test-i8080

build:
    bun run build

#

lint:
    bunx eslint *.ts

test-watch:
    bun test --watch --only-failures

test-js:
    bun test --only-failures 

test-i8080:
    bun test/i8080_ex.ts

test-ex1-bun:
    bun test/i8080_ex.ts --ex1 --verbose

test-ex1-node:
    bunx tsx test/i8080_ex.ts --ex1 --verbose

test-ci: test-js test-ex1-bun

#

release-alpha:
    BASE_PATH=/alpha bun run build 
    cp -R ./build/* ../rk86-js/docs/alpha/ 

release-beta:
    BASE_PATH=/beta bun run build 
    cp -R ./build/* ../rk86-js/docs/beta/

release: release-beta release-alpha

#

terminal-run *args='':
    bun src/lib/terminal/rk86_terminal.ts {{ args }} --exit-address rrr0

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

build-asm: build-claude build-exiter build-pong

build-claude:
    bunx asm8080 info/asm/claude.asm -o info/asm --split

build-exiter:
    bunx asm8080 info/asm/exiter.asm -o info/asm --split

build-pong:
    bunx asm8080 info/asm/pong.asm -o info/asm --split

update-playground:
    cp \
    ../asm8/docs/playground.js \
    ../asm8/docs/index.html \
    ../asm8/docs/style.css \
    static/asm/
