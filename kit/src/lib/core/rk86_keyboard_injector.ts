type KeyValue = number | string;

export interface SequenceAction {
    keys: KeyValue | KeyValue[] | string;
    duration: number;
    action: "press" | "down" | "up" | "pause";
}

function normalizeKeys(keys: KeyValue | KeyValue[] | string): KeyValue[] {
    if (typeof keys === "number") return [keys];
    if (Array.isArray(keys)) return keys;
    // string: split by comma or space, trim, filter empty
    return keys.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

export function convert_keyboard_sequence(sequence: SequenceAction[]): SequenceAction[] {
    const queue: SequenceAction[] = [];
    sequence.forEach(({ keys: keys_, duration, action }) => {
        const keys = normalizeKeys(keys_);
        if (action === "press") {
            keys.forEach((key) => {
                queue.push({ keys: [key], duration, action: "down" });
                queue.push({ keys: [key], duration, action: "up" });
            });
        } else {
            queue.push({ keys, duration, action });
        }
    });
    return queue;
}
