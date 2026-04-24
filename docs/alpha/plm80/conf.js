// Per-deployment overrides for the playground. Loaded as a classic script
// before playground.js, so every field on `window.plm80Config` is picked up
// at startup.

// If the emulator is hosted on the same origin as this page (e.g. an embed
// on the rk86-js mirror), uncomment the line below so "Run" uses the
// same-origin `?handoff` protocol instead of the URL-length-bounded `?run`.
window.plm80EmulatorUrl = "../";
