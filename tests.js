const fs = require("fs");
const vm = require("vm");

function rows(text) {
  return text.trim().split("\n").map((line) => {
    const n = line.trim().split(/\s+/).map(Number);
    return { age: n[0], sbp: n.slice(1, 4), dbp: n.slice(4, 7), map: n.slice(7, 10) };
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

const dataContext = {};
vm.createContext(dataContext);
vm.runInContext(`${fs.readFileSync("data.js", "utf8")}\nthis.__tables = { DAY_ONE_BP, CORRECTED_AGE_BP, HYPERTENSION_BP };`, dataContext);
const { DAY_ONE_BP, CORRECTED_AGE_BP, HYPERTENSION_BP } = dataContext.__tables;

const appSource = fs.readFileSync("app.js", "utf8")
  .replace(/const form = document[\s\S]*?function roundOne/, "function roundOne")
  .replace(/form\.addEventListener[\s\S]*$/, "module.exports = { calculateCga, interpolateTable, referenceValues, classifyPressure, classifyHypertension };");
const appContext = {
  module: { exports: {} },
  DAY_ONE_BP,
  CORRECTED_AGE_BP,
  HYPERTENSION_BP
};
vm.createContext(appContext);
vm.runInContext(`${fs.readFileSync("contemporary-data.js", "utf8")}\n${fs.readFileSync("contemporary.js", "utf8")}\nthis.__contemporary = { erasmusEstimateAtZ, contemporaryReferenceValues };`, appContext);
vm.runInContext(appSource, appContext);
const { calculateCga, interpolateTable, referenceValues, classifyPressure, classifyHypertension } = appContext.module.exports;
const { erasmusEstimateAtZ, contemporaryReferenceValues } = appContext.__contemporary;

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

function equalNumber(actual, expected, message) {
  assert(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
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
