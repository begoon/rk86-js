import sys
import datetime

date = datetime.datetime.now().strftime("%Y/%m/%d")
date_time = datetime.datetime.now().strftime("Build %Y/%m/%d %H:%M%:%S")

with open(sys.argv[1], 'r') as f:
    print(
        f.read().replace(
            '<span>@</span>',
            f'<span title="{date_time}">{date}</span>',
        )
    )
