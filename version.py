import sys
import datetime

date_time = datetime.datetime.now().strftime("%Y/%m/%d %H:%M%:%S")

with open(sys.argv[1], 'r') as f:
    print(
        f.read().replace(
            '<span>@</span>',
            f'<span">Built on {date_time}</span>',
        )
    )
