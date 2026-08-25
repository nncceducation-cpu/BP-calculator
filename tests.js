global.DAY_ONE_BP = [
  { age: 22, sbp: [22,39,55], dbp: [14,23,31], map: [17,28,39] },
  { age: 23, sbp: [23,40,56], dbp: [15,24,32], map: [18,29,40] }
];
global.CORRECTED_AGE_BP = [
  { age: 24, sbp: [33,49,68], dbp: [14,29,46], map: [20,36,53] },
  { age: 25, sbp: [36,51,69], dbp: [15,30,47], map: [22,37,54] }
];
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("app.js", "utf8")
  .replace(/const form = document[\s\S]*?function roundOne/, "function roundOne")
  .replace(/form\.addEventListener[\s\S]*$/, "module.exports = { calculateCga, interpolateTable, referenceValues, classifyPressure };");
const context = { module: { exports: {} }, DAY_ONE_BP, CORRECTED_AGE_BP };
vm.createContext(context);
vm.runInContext(source, context);
const { calculateCga, interpolateTable, referenceValues, classifyPressure } = context.module.exports;
function assert(condition, message) { if (!condition) throw new Error(message); }
const cga = calculateCga(28, 4, 18);
assert(cga.weeks === 31 && cga.days === 1, "CGA calculation failed");
const dayOne = referenceValues(22, 22, 1);
assert(dayOne.sbp[0] === 22 && dayOne.map[2] === 39 && dayOne.model === "day-one", "Day-one lookup failed");
const later = referenceValues(22, 24, 15);
assert(later.sbp[1] === 49 && later.dbp[0] === 14 && later.model === "corrected-age", "Corrected-age lookup failed");
const midpoint = interpolateTable(CORRECTED_AGE_BP, 24.5);
assert(midpoint.sbp[0] === 34.5 && midpoint.map[1] === 36.5, "Interpolation failed");
assert(interpolateTable(CORRECTED_AGE_BP, 23.9) === null, "Lower guard failed");
assert(interpolateTable(CORRECTED_AGE_BP, 25.1) === null, "Upper guard failed");
assert(classifyPressure(19, 20) === "low", "Low BP classification failed");
assert(classifyPressure(20, 20) === "acceptable", "Boundary BP classification failed");
console.log("All calculator tests passed.");
