// Toolbar icons, inlined into the bundle as `data:image/svg+xml` URLs so the
// page does not issue one request per icon. Keyed by file name without ".svg".
const modules = import.meta.glob<string>("./*.svg", { eager: true, query: "?inline", import: "default" });

export const icons: Record<string, string> = Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [path.slice(2, -4), url]),
);
