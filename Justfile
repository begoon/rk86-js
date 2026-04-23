default: build test

install:
    cd classic && bun install
    cd kit && bun install

build: install
    cd classic && just build
    cd kit && bun run build

test: install
    cd classic && just test
    cd kit && just test

serve port='8000':
    cd docs && python3 -m http.server --bind 127.0.0.1 {{ port }}

clean:
    git clean -fdx -e .claude -e kit/.claude
