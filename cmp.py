import sys

binaries = []

sz = 0
for f in sys.argv[1:]:
    print(f'@ {f}')
    with open(f, 'rb') as f:
        binaries.append(f.read())
    file_sz = len(binaries[-1])
    print(f'# {file_sz}')
    if sz == 0:
        sz = file_sz
    else:
        if sz != file_sz:
            raise ValueError(f'file {f} size is expected to be {sz}')


def strictly_increasing(L):
    return all(x < y for x, y in zip(L, L[1:]))


def strictly_decreasing(L):
    return all(x > y for x, y in zip(L, L[1:]))


def same(L):
    return all(x == y for x, y in zip(L, L[1:]))


for offset in range(sz):
    line = [b[offset] for b in binaries]
    if same(line):
        continue
    if not strictly_decreasing(line):
        continue
    print(
        '%04X: %s' % (offset, ' '.join(list(map(lambda a: '%02X' % a, line))))
    )
