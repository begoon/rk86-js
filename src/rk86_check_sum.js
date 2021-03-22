rk86_check_sum = function (v) {
  let sum = 0;
  let j = 0;
  while (j < v.length - 1) {
    const c = v[j];
    sum = (sum + c + (c << 8)) & 0xffff;
    j += 1;
  }
  const sum_h = sum & 0xff00;
  const sum_l = sum & 0xff;
  sum = sum_h | ((sum_l + v[j]) & 0xff);
  return sum;
}
