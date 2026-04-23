default: serve

serve port='8000':
    cd docs && python3 -m http.server --bind 127.0.0.1 {{ port }}

clean:
    git clean -fdx -e .claude -e kit/.claude
