Радио-86РК на JavaScript
========================

Это эмулятор культового компьютера восьмидесятых Радио-86РК на JavaScript'е.
Эмуляция происходит на уровне команд процессора Intel 8080.

Можно сразу запустить собранный эмулятор -- [demin.ws/rk][]

[demin.ws/rk]: http://demin.ws/rk

Эмулятор тестировался на Google Chrome и Safari под Mac и Windows.

Если вы хотите запускать эмулятор локально, то для Google Chrome надо
использовать параметр `--allow-file-access-from-files`.

Например, на Mac:

    open -a "Google Chrome" --args --allow-file-access-from-files file://$PWD/index.html

Старые версии (до 0.6 включительно) доступны на [radio86.googlecode.com][].

[radio86.googlecode.com]: http://radio86.googlecode.com 

Данная версия (1.0 и выше) основана на проекте [i8080-js][].

[i8080-js]: http://github.com/begoon/i8080-js/

[Пост с описанием проекта][].

[Пост с описанием проекта]: http://...

Немного [информации о семействе микросхем КР580][],
использованных в Радио-86РК.

[информации о семействе микросхем КР580]: http://demin.ws/projects/radio86/info/kr580/
