const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");

function rows(text) {
  return text.trim().split("\n").map((line) => {
    const n = line.trim().split(/\s+/).map(Number);
    return { age: n[0], sbp: n.slice(1, 4), dbp: n.slice(4, 7), map: n.slice(7, 10) };
  });
}

function elsayedRows(text) {
  return text.trim().split("\n").map((line) => {
    const n = line.trim().split(/\s+/).map(Number);
    return { ga: n[0], day: n[1], sbp: n.slice(2, 5), dbp: n.slice(5, 8), map: n.slice(8, 11) };
  });
}

// Independent fixtures transcribed from the selected published tables.
const DAY_ONE_SOURCE = rows(`
22 22 39 55 14 23 31 17 28 39
23 23 40 56 15 24 32 18 29 40
24 25 42 57 16 25 33 19 31 41
25 26 43 58 17 26 34 20 32 42
26 27 44 60 18 27 35 21 33 43
27 29 45 61 19 28 36 22 34 44
28 31 47 63 20 29 37 24 35 46
29 33 48 64 21 30 38 25 36 47
30 35 50 66 22 31 39 26 37 48
31 36 51 68 23 32 40 27 38 49
32 37 52 69 24 33 41 28 39 50
33 38 53 70 25 34 42 29 40 51
34 40 55 71 26 35 43 31 42 52
35 41 57 73 27 36 44 32 43 54
36 42 59 75 28 37 45 33 44 55
37 44 60 76 29 38 46 34 45 56
38 46 61 77 30 39 47 35 46 57
39 47 62 79 31 40 48 36 47 58
40 48 64 81 32 41 49 37 49 60
41 50 65 82 33 42 50 39 50 61
42 51 67 84 34 43 51 40 51 62`);

const CORRECTED_AGE_SOURCE = rows(`
24 33 49 68 14 29 46 20 36 53
25 36 51 69 15 30 47 22 37 54
26 38 52 70 17 31 48 24 38 55
27 40 54 71 18 32 49 25 39 56
28 41 55 72 19 33 50 26 40 57
29 42 56 73 20 34 51 27 41 58
30 43 59 75 21 35 52 28 43 60
31 46 61 78 22 36 53 30 44 61
32 48 62 80 23 37 54 31 45 63
33 50 63 81 24 38 55 33 46 64
34 51 66 83 25 39 56 34 48 65
35 52 69 84 26 40 57 35 50 66
36 55 71 87 27 41 58 36 51 68
37 57 72 89 28 42 59 38 52 69
38 59 75 90 29 43 60 39 54 70
39 60 78 91 30 44 60 40 55 70
40 61 80 92 30 44 61 40 56 71
41 62 81 93 31 46 62 41 58 72
42 63 82 95 32 47 63 42 59 74
43 65 83 97 33 48 64 44 60 75
44 66 86 98 34 49 65 45 61 76
45 69 88 100 35 50 66 46 63 77
46 71 89 102 36 51 66 48 64 78`);

const HYPERTENSION_SOURCE = rows(`
26 55 72 77 30 50 56 38 57 63
28 60 75 80 38 50 54 45 58 63
30 65 80 85 40 55 60 48 63 68
32 68 83 88 40 55 60 49 64 69
34 70 85 90 40 55 60 50 65 70
36 72 87 92 50 65 70 57 72 77
38 77 92 97 50 65 70 59 74 79
40 80 95 100 50 65 70 60 75 80
42 85 98 102 50 65 70 62 76 81
44 88 105 110 50 68 73 63 80 85`);

const ELSAYED_UAC_SOURCE = elsayedRows(`
23 1 24 35 42 14 18 21 20 24 27
23 2 26 37 44 19 23 25 22 25 29
23 3 36 44 52 20 24 27 25 29 35
24 1 25 36 42 15 18 22 22 24 27
24 2 26 38 48 19 23 26 25 28 31
24 3 37 46 54 21 25 29 27 31 39
25 1 30 37 43 18 22 25 20 25 30
25 2 33 42 52 20 24 27 25 29 32
25 3 39 45 58 22 26 31 27 34 42
26 1 32 38 44 19 24 27 21 26 32
26 2 34 42 52 20 23 29 23 29 34
26 3 40 48 60 23 27 33 25 33 43
27 1 33 39 45 20 24 28 22 27 33
27 2 35 44 56 22 26 30 24 30 34
27 3 42 50 62 24 28 34 29 37 44
28 1 34 40 48 22 26 31 24 29 35
28 2 37 46 58 23 28 33 25 30 36
28 3 43 54 64 25 29 36 30 39 47`);

const dataContext = {};
vm.createContext(dataContext);
vm.runInContext(`${fs.readFileSync("data.js", "utf8")}\n${fs.readFileSync("additional-data.js", "utf8")}\nthis.__tables = { DAY_ONE_BP, CORRECTED_AGE_BP, ELSAYED_UAC_BP, HYPERTENSION_BP, HILLMAN_BP, KISS_BP };`, dataContext);
const { DAY_ONE_BP, CORRECTED_AGE_BP, ELSAYED_UAC_BP, HYPERTENSION_BP, HILLMAN_BP, KISS_BP } = dataContext.__tables;

const appSource = fs.readFileSync("app.js", "utf8")
  .replace(/const form = document[\s\S]*?function roundOne/, "function roundOne")
  .replace(/form\.addEventListener[\s\S]*$/, "module.exports = { calculateCga, interpolateTable, elsayedReferenceValues, hillmanReferenceValues, kissReferenceValues, referenceValues, classifyPressure, classifyHypertension };");
const appContext = {
  module: { exports: {} },
  DAY_ONE_BP,
  CORRECTED_AGE_BP,
  ELSAYED_UAC_BP,
  HYPERTENSION_BP,
  HILLMAN_BP,
  KISS_BP
};
vm.createContext(appContext);
vm.runInContext(`${fs.readFileSync("contemporary-data.js", "utf8")}\n${fs.readFileSync("contemporary.js", "utf8")}\nthis.__contemporary = { erasmusEstimateAtZ, contemporaryReferenceValues };`, appContext);
vm.runInContext(appSource, appContext);
const { calculateCga, interpolateTable, elsayedReferenceValues, hillmanReferenceValues, kissReferenceValues, referenceValues, classifyPressure, classifyHypertension } = appContext.module.exports;
const { erasmusEstimateAtZ, contemporaryReferenceValues } = appContext.__contemporary;

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

function equalNumber(actual, expected, message) {
  assert(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function compareRows(actual, expected, label) {
  assert(actual.length === expected.length, `${label}: row count differs`);
  expected.forEach((row, rowIndex) => {
    assert(actual[rowIndex].age === row.age, `${label}: age differs at row ${rowIndex}`);
    ["sbp", "dbp", "map"].forEach((metric) => {
      row[metric].forEach((value, centileIndex) => {
        equalNumber(actual[rowIndex][metric][centileIndex], value,
          `${label}: ${row.age} weeks ${metric} centile ${centileIndex}`);
      });
    });
  });
}

function testExactRows(table, source, label) {
  source.forEach((row) => {
    const result = interpolateTable(table, row.age);
    assert(result !== null, `${label}: missing exact row ${row.age}`);
    ["sbp", "dbp", "map"].forEach((metric) => {
      row[metric].forEach((value, centileIndex) => {
        equalNumber(result[metric][centileIndex], value,
          `${label}: exact lookup ${row.age} weeks ${metric} centile ${centileIndex}`);
      });
    });
  });
}

function testDailyInterpolation(table, source, label) {
  for (let rowIndex = 0; rowIndex < source.length - 1; rowIndex += 1) {
    const low = source[rowIndex];
    const high = source[rowIndex + 1];
    const gapDays = (high.age - low.age) * 7;
    for (let day = 1; day < gapDays; day += 1) {
      const age = low.age + day / 7;
      const result = interpolateTable(table, age);
      ["sbp", "dbp", "map"].forEach((metric) => {
        low[metric].forEach((lowValue, centileIndex) => {
          const expected = Math.round((lowValue + (high[metric][centileIndex] - lowValue) * day / gapDays) * 10) / 10;
          equalNumber(result[metric][centileIndex], expected,
            `${label}: interpolation ${age} weeks ${metric} centile ${centileIndex}`);
        });
      });
    }
  }
}

function testOrdering(table, label) {
  table.forEach((row) => {
    ["sbp", "dbp", "map"].forEach((metric) => {
      assert(row[metric][0] <= row[metric][1] && row[metric][1] <= row[metric][2],
        `${label}: unordered ${metric} centiles at ${row.age} weeks`);
    });
  });
}

function testNormativeBoundaries(source, label) {
  source.forEach((row) => {
    ["sbp", "dbp", "map"].forEach((metric) => {
      const [p5, p50, p95] = row[metric];
      assert(classifyPressure(p5 - 0.1, p5, p95) === "low", `${label}: below p5 ${row.age} ${metric}`);
      assert(classifyPressure(p5, p5, p95) === "acceptable", `${label}: p5 boundary ${row.age} ${metric}`);
      assert(classifyPressure(p50, p5, p95) === "acceptable", `${label}: p50 ${row.age} ${metric}`);
      assert(classifyPressure(p95, p5, p95) === "acceptable", `${label}: p95 boundary ${row.age} ${metric}`);
      assert(classifyPressure(p95 + 0.1, p5, p95) === "high", `${label}: above p95 ${row.age} ${metric}`);
    });
  });
}

function testHypertensionBoundaries(source) {
  source.forEach((row) => {
    ["sbp", "dbp", "map"].forEach((metric) => {
      const [, p95, p99] = row[metric];
      assert(classifyHypertension(p95 - 0.1, p95, p99) === "below-95", `HTN: below p95 ${row.age} ${metric}`);
      assert(classifyHypertension(p95, p95, p99) === "elevated", `HTN: p95 boundary ${row.age} ${metric}`);
      assert(classifyHypertension(p99 - 0.1, p95, p99) === "elevated", `HTN: below p99 ${row.age} ${metric}`);
      assert(classifyHypertension(p99, p95, p99) === "markedly-elevated", `HTN: p99 boundary ${row.age} ${metric}`);
      assert(classifyHypertension(p99 + 0.1, p95, p99) === "markedly-elevated", `HTN: above p99 ${row.age} ${metric}`);
    });
  });
}

compareRows(DAY_ONE_BP, DAY_ONE_SOURCE, "Day-one source reconciliation");
compareRows(CORRECTED_AGE_BP, CORRECTED_AGE_SOURCE, "Corrected-age source reconciliation");
compareRows(HYPERTENSION_BP, HYPERTENSION_SOURCE, "Hypertension source reconciliation");
assert(ELSAYED_UAC_BP.length === ELSAYED_UAC_SOURCE.length, "Elsayed source row count");
ELSAYED_UAC_SOURCE.forEach((row, rowIndex) => {
  const actual = ELSAYED_UAC_BP[rowIndex];
  assert(actual.ga === row.ga && actual.day === row.day, `Elsayed source row ${rowIndex} age/day`);
  ["sbp", "dbp", "map"].forEach(metric => {
    row[metric].forEach((value, centileIndex) => {
      equalNumber(actual[metric][centileIndex], value,
        `Elsayed source ${row.ga} weeks day ${row.day} ${metric} centile ${centileIndex}`);
    });
  });
});

// These digests were generated independently from the native cells in the
// publisher-supplied Hillman PPTX and the Kiss supplementary Table 2.
assert(HILLMAN_BP.length === 190, "Hillman source contains all 190 GA/CGA cells");
assert(sha256(HILLMAN_BP) === "25594186ec668da6712ed1a10340663ce7d277a81c321b467649eb489d719714",
  "Hillman source-table digest");
assert(KISS_BP.length === 21, "Kiss source contains 7 GA groups by 3 published days");
assert(sha256(KISS_BP) === "500590e4fd4cfb958cbc2278d76d470c877020687b0ca40c932a73cf6f16bb62",
  "Kiss source-table digest");

HILLMAN_BP.forEach((row, index) => {
  assert(row.ga >= 22 && row.ga <= 40, `Hillman valid birth GA at row ${index}`);
  assert(row.cga >= row.ga && row.cga <= 40, `Hillman valid corrected GA at row ${index}`);
  assert(index === 0 || row.ga > HILLMAN_BP[index - 1].ga || row.cga === HILLMAN_BP[index - 1].cga + 1,
    `Hillman ordered unique cell at row ${index}`);
  ["sbp", "dbp", "map"].forEach(metric => {
    const values = row[metric];
    assert(values.length === 3, `Hillman ${metric} has P5/P50/P95 at ${row.ga}/${row.cga}`);
    assert(values[0] <= values[1] && values[1] <= values[2],
      `Hillman ordered ${metric} centiles at ${row.ga}/${row.cga}`);
    assert(classifyPressure(values[0] - 0.1, values[0], values[2]) === "low",
      `Hillman below P5 at ${row.ga}/${row.cga} ${metric}`);
    assert(classifyPressure(values[0], values[0], values[2]) === "acceptable",
      `Hillman P5 boundary at ${row.ga}/${row.cga} ${metric}`);
    assert(classifyPressure(values[2], values[0], values[2]) === "acceptable",
      `Hillman P95 boundary at ${row.ga}/${row.cga} ${metric}`);
    assert(classifyPressure(values[2] + 0.1, values[0], values[2]) === "high",
      `Hillman above P95 at ${row.ga}/${row.cga} ${metric}`);
  });
});

KISS_BP.forEach((row, index) => {
  assert([1, 3, 5].includes(row.day), `Kiss published day at row ${index}`);
  assert(row.gaMin >= 25 && row.gaMax <= 42 && row.gaMin <= row.gaMax, `Kiss GA group at row ${index}`);
  ["sbp", "dbp", "map"].forEach(metric => {
    const values = row[metric];
    assert(values.length === 3 && values[0] <= values[1] && values[1] <= values[2],
      `Kiss ordered P10/P50/P90 at ${row.gaMin}-${row.gaMax} day ${row.day} ${metric}`);
    assert(classifyPressure(values[0] - 0.1, values[0], values[2]) === "low",
      `Kiss below P10 at ${row.gaMin}-${row.gaMax} day ${row.day} ${metric}`);
    assert(classifyPressure(values[0], values[0], values[2]) === "acceptable",
      `Kiss P10 boundary at ${row.gaMin}-${row.gaMax} day ${row.day} ${metric}`);
    assert(classifyPressure(values[2], values[0], values[2]) === "acceptable",
      `Kiss P90 boundary at ${row.gaMin}-${row.gaMax} day ${row.day} ${metric}`);
    assert(classifyPressure(values[2] + 0.1, values[0], values[2]) === "high",
      `Kiss above P90 at ${row.gaMin}-${row.gaMax} day ${row.day} ${metric}`);
  });
});

[
  [DAY_ONE_BP, DAY_ONE_SOURCE, "Day-one"],
  [CORRECTED_AGE_BP, CORRECTED_AGE_SOURCE, "Corrected-age"],
  [HYPERTENSION_BP, HYPERTENSION_SOURCE, "Hypertension"]
].forEach(([table, source, label]) => {
  testExactRows(table, source, label);
  testDailyInterpolation(table, source, label);
  testOrdering(table, label);
  assert(interpolateTable(table, source[0].age - 0.1) === null, `${label}: lower extrapolation guard`);
  assert(interpolateTable(table, source[source.length - 1].age + 0.1) === null, `${label}: upper extrapolation guard`);
});

testNormativeBoundaries(DAY_ONE_SOURCE, "Day-one");
testNormativeBoundaries(CORRECTED_AGE_SOURCE, "Corrected-age");
testNormativeBoundaries(ELSAYED_UAC_SOURCE, "Elsayed invasive UAC");
testHypertensionBoundaries(HYPERTENSION_SOURCE);

// Independent fixtures read from the authors' live reference calculator.
const ERASMUS_SOURCE_FIXTURES = [
  {
    input: [24, 0, 0, 1],
    map: [15.53, 21.45, 27.44, 33.41, 39.22],
    sbp: [28.48, 35.52, 42.68, 49.94, 57.20],
    dbp: [5.75, 10.83, 16.07, 21.69, 27.75]
  },
  {
    input: [28, 3, 2, 6],
    map: [31.81, 37.43, 44.02, 51.02, 57.49],
    sbp: [46.67, 52.58, 59.52, 67.07, 74.11],
    dbp: [18.92, 25.63, 32.69, 39.57, 45.98]
  },
  {
    input: [40, 0, 7, 0],
    map: [50.81, 56.58, 62.48, 68.57, 74.81],
    sbp: [64.60, 71.62, 78.88, 86.46, 94.20],
    dbp: [39.03, 45.30, 51.46, 57.63, 63.98]
  }
];

ERASMUS_SOURCE_FIXTURES.forEach(fixture => {
  const [weeks, gaDays, postnatalDays, hours] = fixture.input;
  const ga = weeks + gaDays / 7;
  const postnatalAgeHours = postnatalDays * 24 + hours;
  [-2, -1, 0, 1, 2].forEach((zScore, centileIndex) => {
    const [map, sbp, dbp] = erasmusEstimateAtZ(ga, postnatalAgeHours, zScore);
    [[map, fixture.map[centileIndex]], [sbp, fixture.sbp[centileIndex]], [dbp, fixture.dbp[centileIndex]]]
      .forEach(([actual, expected]) => assert(Math.abs(actual - expected) < 0.0051,
        `Erasmus source fixture ${fixture.input.join("/")} z=${zScore}: expected ${expected}, received ${actual}`));
  });
});

for (let birthWeeks = 24; birthWeeks <= 41; birthWeeks += 1) {
  for (let hour = 1; hour <= 168; hour += 6) {
    const result = contemporaryReferenceValues(birthWeeks, hour);
    assert(result !== null, `Contemporary range: ${birthWeeks} weeks, hour ${hour}`);
    [result.sbp, result.dbp, result.map].forEach(values => {
      assert(values[0] <= values[1] && values[1] <= values[2],
        `Contemporary centile order: ${birthWeeks} weeks, hour ${hour}`);
    });
  }
}
assert(contemporaryReferenceValues(23 + 6 / 7, 24) === null, "Contemporary lower GA guard");
assert(contemporaryReferenceValues(42, 24) === null, "Contemporary upper GA guard");
assert(contemporaryReferenceValues(30, 0) === null, "Contemporary lower age guard");
assert(contemporaryReferenceValues(30, 169) === null, "Contemporary upper age guard");

assert(referenceValues(30, 30, 0, 1, "automatic").model === "contemporary-first-week", "Automatic contemporary selection at 1 hour");
assert(referenceValues(30, 31, 7, 0, "automatic").model === "contemporary-first-week", "Automatic contemporary selection at 168 hours");
assert(referenceValues(30, 31, 7, 1, "automatic") === null, "No automatic dataset join after 168 hours");
assert(referenceValues(23, 23, 0, 12, "automatic") === null, "No automatic dataset join below 24 weeks");
assert(referenceValues(30, 31, 7, 1, "philadelphia").model === "philadelphia-corrected-age", "Explicit historical selection after 168 hours");
assert(referenceValues(23, 23, 0, 12, "philadelphia").model === "philadelphia-day-one", "Explicit historical selection below 24 weeks");
assert(referenceValues(30, 30, 0, 1, "van-zadelhoff").model === "contemporary-first-week", "Explicit van Zadelhoff selection");

ELSAYED_UAC_SOURCE.forEach(row => {
  const representativeHour = row.day === 1 ? 12 : row.day === 2 ? 36 : 60;
  const result = elsayedReferenceValues(row.ga + 3 / 7, representativeHour);
  assert(result !== null, `Elsayed exact source selection ${row.ga} week day ${row.day}`);
  ["sbp", "dbp", "map"].forEach(metric => {
    row[metric].forEach((value, centileIndex) => {
      equalNumber(result[metric][centileIndex], value,
        `Elsayed lookup ${row.ga} week day ${row.day} ${metric} centile ${centileIndex}`);
    });
  });
});

[
  [0, 1], [23, 1], [24, 2], [47, 2], [48, 3], [71, 3], [72, 3]
].forEach(([hour, expectedDay]) => {
  const result = elsayedReferenceValues(24, hour);
  assert(result !== null && result.day === expectedDay, `Elsayed postnatal boundary hour ${hour}`);
});
assert(elsayedReferenceValues(22 + 6 / 7, 24) === null, "Elsayed lower GA guard");
assert(elsayedReferenceValues(29, 24) === null, "Elsayed upper GA guard");
assert(elsayedReferenceValues(24, -1) === null, "Elsayed lower age guard");
assert(elsayedReferenceValues(24, 73) === null, "Elsayed upper age guard");
assert(referenceValues(24, 24, 3, 0, "elsayed-uac").day === 3, "Elsayed selection at 72 hours");
assert(referenceValues(24, 24, 3, 1, "elsayed-uac") === null, "No Elsayed extrapolation after 72 hours");

for (let birthWeeks = 23; birthWeeks <= 28; birthWeeks += 1) {
  for (let birthDays = 0; birthDays <= 6; birthDays += 1) {
    for (let ageHours = 0; ageHours <= 72; ageHours += 1) {
      const postnatalDays = Math.floor(ageHours / 24);
      const additionalHours = ageHours % 24;
      const gaDecimal = birthWeeks + birthDays / 7;
      const cgaDecimal = gaDecimal + ageHours / (7 * 24);
      const result = referenceValues(gaDecimal, cgaDecimal, postnatalDays, additionalHours, "elsayed-uac");
      const expectedDay = ageHours < 24 ? 1 : ageHours < 48 ? 2 : 3;
      const source = ELSAYED_UAC_SOURCE.find(row => row.ga === birthWeeks && row.day === expectedDay);
      assert(result !== null, `Elsayed exhaustive lookup ${birthWeeks}+${birthDays}, hour ${ageHours}`);
      assert(result.ga === birthWeeks && result.day === expectedDay,
        `Elsayed exhaustive grouping ${birthWeeks}+${birthDays}, hour ${ageHours}`);
      ["sbp", "dbp", "map"].forEach(metric => {
        source[metric].forEach((value, centileIndex) => {
          equalNumber(result[metric][centileIndex], value,
            `Elsayed exhaustive ${birthWeeks}+${birthDays}, hour ${ageHours}, ${metric} ${centileIndex}`);
        });
      });
    }
  }
}

// Exhaust every supported completed hour for the Hillman weekly lookup.
for (let birthWeeks = 22; birthWeeks <= 40; birthWeeks += 1) {
  for (let birthDays = 0; birthDays <= 6; birthDays += 1) {
    const gaDecimal = birthWeeks + birthDays / 7;
    for (let ageHours = 0; ageHours <= 154 * 24 + 23; ageHours += 1) {
      const cgaDecimal = gaDecimal + ageHours / (7 * 24);
      const expectedCga = Math.floor(cgaDecimal);
      const result = hillmanReferenceValues(gaDecimal, cgaDecimal);
      if (expectedCga > 40) {
        assert(result === null, `Hillman upper-age guard ${birthWeeks}+${birthDays}, hour ${ageHours}`);
        continue;
      }
      assert(result !== null, `Hillman exhaustive lookup ${birthWeeks}+${birthDays}, hour ${ageHours}`);
      assert(result.ga === birthWeeks && result.cga === expectedCga,
        `Hillman exhaustive grouping ${birthWeeks}+${birthDays}, hour ${ageHours}`);
      const source = HILLMAN_BP.find(row => row.ga === birthWeeks && row.cga === expectedCga);
      ["sbp", "dbp", "map"].forEach(metric => {
        source[metric].forEach((value, centileIndex) => equalNumber(result[metric][centileIndex], value,
          `Hillman exhaustive value ${birthWeeks}+${birthDays}, hour ${ageHours}, ${metric} ${centileIndex}`));
      });
    }
  }
}
assert(hillmanReferenceValues(21 + 6 / 7, 22) === null, "Hillman lower birth-GA guard");
assert(hillmanReferenceValues(41, 41) === null, "Hillman upper birth-GA guard");
assert(hillmanReferenceValues(30, 29.9) === null, "Hillman corrected-age-before-birth guard");
assert(hillmanReferenceValues(30, 41) === null, "Hillman upper corrected-GA guard");
assert(referenceValues(30, 35.9, 41, 7, "hillman-weekly").cga === 35,
  "Explicit Hillman weekly selection");

// Exhaust every published Kiss GA group, day, and within-day hour.
KISS_BP.forEach(source => {
  for (let ga = source.gaMin; ga <= source.gaMax; ga += 1) {
    const startHour = source.day === 1 ? 0 : source.day === 3 ? 48 : 96;
    for (let offset = 0; offset < 24; offset += 1) {
      const ageHours = startHour + offset;
      const result = kissReferenceValues(ga + 6 / 7, ageHours);
      assert(result !== null && result.day === source.day && result.gaMin === source.gaMin && result.gaMax === source.gaMax,
        `Kiss exhaustive grouping GA ${ga}+6, hour ${ageHours}`);
      ["sbp", "dbp", "map"].forEach(metric => source[metric].forEach((value, centileIndex) =>
        equalNumber(result[metric][centileIndex], value,
          `Kiss exhaustive value GA ${ga}+6, hour ${ageHours}, ${metric} ${centileIndex}`)));
    }
  }
});
[24, 47, 72, 95, 120].forEach(hour => assert(kissReferenceValues(30, hour) === null,
  `Kiss unsupported hour ${hour} guard`));
assert(kissReferenceValues(24 + 6 / 7, 12) === null, "Kiss lower GA guard");
assert(kissReferenceValues(43, 12) === null, "Kiss upper GA guard");
assert(referenceValues(37, 37, 4, 6, "kiss-stable").day === 5, "Explicit Kiss day-5 selection");

const htmlSource = fs.readFileSync("index.html", "utf8");
const zubrowOptionIndex = htmlSource.indexOf('<option value="philadelphia">');
const vanZadelhoffOptionIndex = htmlSource.indexOf('<option value="van-zadelhoff">');
const elsayedOptionIndex = htmlSource.indexOf('<option value="elsayed-uac">');
const hillmanOptionIndex = htmlSource.indexOf('<option value="hillman-weekly">');
const kissOptionIndex = htmlSource.indexOf('<option value="kiss-stable">');
assert(zubrowOptionIndex !== -1, "Zubrow selector option exists");
assert(zubrowOptionIndex < vanZadelhoffOptionIndex && vanZadelhoffOptionIndex < elsayedOptionIndex &&
  elsayedOptionIndex < hillmanOptionIndex && hillmanOptionIndex < kissOptionIndex,
  "Reference selector order is Zubrow, van Zadelhoff, Elsayed, Hillman, Kiss");

[DAY_ONE_BP, CORRECTED_AGE_BP].forEach((table, tableIndex) => {
  table.forEach(row => {
    row.map.forEach((mapValue, index) => {
      const derivedMap = row.dbp[index] + (row.sbp[index] - row.dbp[index]) / 3;
      assert(Math.abs(mapValue - derivedMap) <= 0.34,
        `Historical MAP derivation: table ${tableIndex}, age ${row.age}, index ${index}`);
    });
  });
});

// Exhaust all supported birth GA and days-of-life combinations through 22 weeks.
for (let birthWeeks = 22; birthWeeks <= 42; birthWeeks += 1) {
  for (let birthDays = 0; birthDays <= 6; birthDays += 1) {
    for (let dol = 0; dol <= 154; dol += 1) {
      const cga = calculateCga(birthWeeks, birthDays, dol);
      const totalDays = birthWeeks * 7 + birthDays + dol;
      assert(cga.weeks === Math.floor(totalDays / 7), `CGA weeks: ${birthWeeks}+${birthDays}, DOL ${dol}`);
      assert(cga.days === totalDays % 7, `CGA days: ${birthWeeks}+${birthDays}, DOL ${dol}`);
      const result = referenceValues(birthWeeks + birthDays / 7, totalDays / 7, dol);
      if (dol === 0) {
        assert(result === null || result.model === "philadelphia-day-one", `First-24-hour model selection: DOL ${dol}`);
      } else {
        assert(result === null || result.model === "philadelphia-corrected-age", `Corrected-age model selection: DOL ${dol}`);
      }
    }
  }
}

console.log(`All ${checks.toLocaleString("en-US")} calculator checks passed.`);
