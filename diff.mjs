import sharp from "sharp";
const [a, b] = process.argv.slice(2);
const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
  console.log("size differs", A.info.width + "x" + A.info.height, B.info.width + "x" + B.info.height); process.exit(0);
}
const { width, height, channels } = A.info;
const rowsChanged = [];
let total = 0;
for (let y = 0; y < height; y++) {
  let n = 0;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    if (Math.abs(A.data[i] - B.data[i]) > 8 || Math.abs(A.data[i+1] - B.data[i+1]) > 8 || Math.abs(A.data[i+2] - B.data[i+2]) > 8) n++;
  }
  if (n > 0) { rowsChanged.push([y, n]); total += n; }
}
console.log(`differing pixels: ${total} over ${rowsChanged.length} rows of ${height}`);
if (rowsChanged.length) {
  console.log(`first differing row (device px): ${rowsChanged[0][0]}  -> CSS y=${rowsChanged[0][0]/2}`);
  console.log(`last  differing row (device px): ${rowsChanged[rowsChanged.length-1][0]} -> CSS y=${rowsChanged[rowsChanged.length-1][0]/2}`);
}
