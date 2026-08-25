global.BP_CENTILES = [
  { pma: 26, sbp: [55, 72, 77], dbp: [30, 50, 56], map: [38, 57, 63] },
  { pma: 28, sbp: [60, 75, 80], dbp: [38, 50, 54], map: [45, 58, 63] },
  { pma: 30, sbp: [65, 80, 85], dbp: [40, 55, 60], map: [48, 63, 68] },
  { pma: 32, sbp: [68, 83, 88], dbp: [40, 55, 60], map: [48, 62, 69] },
  { pma: 34, sbp: [70, 85, 90], dbp: [40, 55, 60], map: [50, 65, 70] },
  { pma: 36, sbp: [72, 87, 92], dbp: [50, 65, 70], map: [57, 72, 77] },
  { pma: 38, sbp: [77, 92, 97], dbp: [50, 65, 70], map: [59, 74, 79] },
  { pma: 40, sbp: [80, 95, 100], dbp: [50, 65, 70], map: [60, 75, 80] },
  { pma: 42, sbp: [85, 98, 102], dbp: [50, 65, 70], map: [62, 76, 81] },
  { pma: 44, sbp: [88, 105, 110], dbp: [50, 68, 73], map: [63, 80, 85] }
];

const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("app.js", "utf8")
  .replace(/const form = document[\s\S]*?function roundOne/, "function roundOne")
  .replace(/form\.addEventListener[\s\S]*$/, "module.exports = { calculateCga, interpolateValues };");
const context = { module: { exports: {} }, BP_CENTILES };
vm.createContext(context);
vm.runInContext(source, context);
const { calculateCga, interpolateValues } = context.module.exports;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cga = calculateCga(28, 4, 18);
assert(cga.weeks === 31 && cga.days === 1, "CGA calculation failed");

const exact = interpolateValues(40);
assert(exact.sbp[1] === 95 && exact.map[2] === 80, "Exact row lookup failed");

const midpoint = interpolateValues(27);
assert(midpoint.sbp[0] === 57.5 && midpoint.dbp[0] === 34, "Interpolation failed");

assert(interpolateValues(25.9) === null, "Lower range guard failed");
assert(interpolateValues(44.1) === null, "Upper range guard failed");
console.log("All calculator tests passed.");
