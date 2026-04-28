function convert_keyboard_sequence(seq) {
  const queue = [];
  seq.forEach(({ keys, duration, action }) => {
    keys = typeof keys === 'number' ? [keys] : keys;
    if (action === 'press') {
      keys.forEach(key => {
        queue.push({ keys: [key], duration, action: 'down' });
        queue.push({ keys: [key], duration, action: 'up' });
      });
    } else {
      queue.push({ keys, duration, action });
    }
  })
  return queue;
}
