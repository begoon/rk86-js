function hex8(value) {
  return ('00' + value.toString(16).toUpperCase()).slice(-2);
}

function hex16(value) {
  return hex8(value >> 8) + hex8(value);
}

const xhex16 = (value) => hex8(value >> 8) + hex8(value);

console.log(hex8(111));
// const arrayAsHex = (binary) => {
//   for (let i = 0; i < binary.length; i += 16) {
//     const block = binary.slice(i, i + 16);

//   }
// }