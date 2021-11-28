import sys

binaries_8 = []

sz = 0
for f in sys.argv[1:]:
    print(f'@ {f}')
    with open(f, 'rb') as f:
        binaries_8.append(f.read())
    file_sz = len(binaries_8[-1])
    print(f'# {file_sz}')
    if sz == 0:
        sz = file_sz
    else:
        if sz != file_sz:
            raise ValueError(f'file {f} size is expected to be {sz}')


def as_binary_16(binary):
    sz = len(binary)
    return [
        binary[address] | (binary[(address + 1) % sz] << 8)
        for address in range(0, sz)
    ]


binaries_16 = [as_binary_16(binary) for binary in binaries_8]


def strictly_increasing(L):
    return all(x < y for x, y in zip(L, L[1:]))


def strictly_decreasing(L):
    return all(x > y for x, y in zip(L, L[1:]))


def same(L):
    return all(x == y for x, y in zip(L, L[1:]))


def print_diff(title: str, binaries, format, cmp):
    print(title)
    for offset in range(sz):
        line = [b[offset] for b in binaries_8]
        if same(line):
            continue
        if not cmp(line):
            continue
        print(
            '%04X: %s'
            % (offset, ' '.join(list(map(lambda a: format % a, line))))
        )


print_diff('@ increments 8', binaries_8, '%02X', strictly_increasing)
print_diff('@ decrements 8', binaries_8, '%02X', strictly_decreasing)

print_diff('@ increments 16', binaries_16, '%04X', strictly_increasing)
print_diff('@ decrements 16', binaries_16, '%04X', strictly_decreasing)
