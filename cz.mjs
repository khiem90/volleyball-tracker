import sharp from "sharp";
const [inp, outp, l, t, w, h, scale] = process.argv.slice(2);
await sharp(inp).extract({ left: +l, top: +t, width: +w, height: +h })
  .resize({ width: Math.round(+w * (+scale || 2)), kernel: "nearest" })
  .toFile(outp);
console.log(outp);
