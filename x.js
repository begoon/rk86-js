const output = document.getElementById("output");
console.log(output);
output.innerHTML = ".";

let frames = 0;
let started = new Date();
let lastTicks = 0;
let lastPerf = 0;

function ticker(ticks) {
    if (lastTicks === undefined) {
        lastTicks = ticks;
        lastPerf = performance.now();
        requestAnimationFrame(ticker);
        return;
    }
    const elapsed = new Date();
    const duration = elapsed - started;
    if (duration > 1000) {
        const fps = Math.round(frames);
        const ticksPerSec = Math.round(ticks - lastTicks);
        lastTicks = ticks;
        perf = performance.now();
        const perfPerSec = Math.round(perf - lastPerf);
        lastPerf = perf;
        output.innerText = `fps ${fps} tps=${ticksPerSec} psp=${perfPerSec}`;
        frames = 0;
        started = new Date();
    }
    frames += 1;
    requestAnimationFrame(ticker);
}

requestAnimationFrame(ticker);
