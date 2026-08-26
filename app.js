const form = document.querySelector("#bp-form");
const resetButton = document.querySelector("#reset-button");
const results = document.querySelector("#results");
const errorBox = document.querySelector("#form-error");
const centileContent = document.querySelector("#centile-content");
const rangeWarning = document.querySelector("#range-warning");
const transitionWarning = document.querySelector("#transition-warning");

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function calculateCga(gaWeeks, gaDays, dol) {
  const totalDays = gaWeeks * 7 + gaDays + dol;
  return {
    totalDays,
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    decimalWeeks: totalDays / 7
  };
}

function interpolateTable(table, decimalAge) {
  if (decimalAge < table[0].age || decimalAge > table.at(-1).age) return null;
  const exact = table.find(row => row.age === decimalAge);
  if (exact) return { ...exact, interpolated: false, lower: exact.age, upper: exact.age };

  const upperIndex = table.findIndex(row => row.age > decimalAge);
  const lower = table[upperIndex - 1];
  const upper = table[upperIndex];
  const fraction = (decimalAge - lower.age) / (upper.age - lower.age);
  const interpolateSeries = name => lower[name].map((value, index) =>
    roundOne(value + fraction * (upper[name][index] - value))
  );

  return {
    age: decimalAge,
    sbp: interpolateSeries("sbp"),
    dbp: interpolateSeries("dbp"),
    map: interpolateSeries("map"),
    interpolated: true,
    lower: lower.age,
    upper: upper.age
  };
}

function referenceValues(gaDecimal, cgaDecimal, dol) {
  const isDayOne = dol <= 1;
  const values = interpolateTable(isDayOne ? DAY_ONE_BP : CORRECTED_AGE_BP, isDayOne ? gaDecimal : cgaDecimal);
  return values ? { ...values, model: isDayOne ? "day-one" : "corrected-age" } : null;
}

function classifyPressure(value, fifthCentile) {
  return value < fifthCentile ? "low" : "acceptable";
}

function classifyHypertension(value, percentile95, percentile99) {
  if (value >= percentile99) return "markedly-elevated";
  if (value >= percentile95) return "elevated";
  return "below-95";
}

function renderPressureValues(elementId, values) {
  const list = document.querySelector(elementId);
  list.replaceChildren();
  values.forEach((value, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `centile-row centile-${index}`;
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = CENTILE_LABELS[index];
    description.innerHTML = `<strong>${value}</strong> <span>mmHg</span>`;
    wrapper.append(term, description);
    list.append(wrapper);
  });
}

function renderPatientComparison(centiles, patientValues) {
  const comparison = document.querySelector("#patient-comparison");
  const grid = document.querySelector("#comparison-grid");
  const pressures = [
    { label: "Systolic", short: "SBP", value: patientValues.sbp, fifth: centiles.sbp[0] },
    { label: "Diastolic", short: "DBP", value: patientValues.dbp, fifth: centiles.dbp[0] },
    { label: "Mean arterial", short: "MAP", value: patientValues.map, fifth: centiles.map[0] }
  ].filter(item => item.value !== null);

  comparison.hidden = pressures.length === 0;
  grid.replaceChildren();
  pressures.forEach(item => {
    const status = classifyPressure(item.value, item.fifth);
    const card = document.createElement("article");
    card.className = `comparison-card ${status}`;
    card.innerHTML = `
      <div class="status-icon" aria-hidden="true">${status === "low" ? "!" : "✓"}</div>
      <div>
        <p class="comparison-name">${item.label} (${item.short})</p>
        <p class="comparison-value"><strong>${item.value}</strong> mmHg</p>
        <p class="comparison-status">${status === "low" ? "Low" : "Acceptable"}</p>
        <p class="comparison-threshold">5th centile: ${item.fifth} mmHg</p>
      </div>`;
    grid.append(card);
  });
}

function renderHypertensionValues(elementId, values) {
  const list = document.querySelector(elementId);
  list.replaceChildren();
  values.forEach((value, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `centile-row htn-centile-${index}`;
    wrapper.innerHTML = `<dt>${HYPERTENSION_CENTILE_LABELS[index]}</dt><dd><strong>${value}</strong> <span>mmHg</span></dd>`;
    list.append(wrapper);
  });
}

function renderHypertensionComparison(centiles, patientValues) {
  const comparison = document.querySelector("#htn-comparison");
  const grid = document.querySelector("#htn-comparison-grid");
  const pressures = [
    { label: "Systolic", short: "SBP", value: patientValues.sbp, values: centiles.sbp },
    { label: "Diastolic", short: "DBP", value: patientValues.dbp, values: centiles.dbp },
    { label: "Mean arterial", short: "MAP", value: patientValues.map, values: centiles.map }
  ].filter(item => item.value !== null);
  comparison.hidden = pressures.length === 0;
  grid.replaceChildren();
  pressures.forEach(item => {
    const status = classifyHypertension(item.value, item.values[1], item.values[2]);
    const statusText = status === "markedly-elevated" ? "At or above 99th" : status === "elevated" ? "At or above 95th" : "Below 95th";
    const card = document.createElement("article");
    card.className = `comparison-card ${status}`;
    card.innerHTML = `<div class="status-icon" aria-hidden="true">${status === "below-95" ? "✓" : "!"}</div><div><p class="comparison-name">${item.label} (${item.short})</p><p class="comparison-value"><strong>${item.value}</strong> mmHg</p><p class="comparison-status">${statusText}</p><p class="comparison-threshold">95th: ${item.values[1]} · 99th: ${item.values[2]} mmHg</p></div>`;
    grid.append(card);
  });
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function validateInteger(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  errorBox.hidden = true;

  const gaWeeks = Number(document.querySelector("#ga-weeks").value);
  const gaDays = Number(document.querySelector("#ga-days").value);
  const dol = Number(document.querySelector("#dol").value);
  const readOptionalPressure = id => {
    const raw = document.querySelector(id).value.trim();
    return raw === "" ? null : Number(raw);
  };
  const patientValues = {
    sbp: readOptionalPressure("#patient-sbp"),
    dbp: readOptionalPressure("#patient-dbp"),
    map: readOptionalPressure("#patient-map")
  };

  if (!validateInteger(gaWeeks, 22, 42)) return showError("Enter birth gestation from 22 to 42 completed weeks.");
  if (!validateInteger(gaDays, 0, 6)) return showError("Enter 0 to 6 additional gestational days.");
  if (!validateInteger(dol, 0, 154)) return showError("Enter an integer day of life from 0 to 154.");
  if (Object.values(patientValues).some(value => value !== null && (!Number.isFinite(value) || value < 1 || value > 200))) {
    return showError("Enter blood pressure values from 1 to 200 mmHg, or leave the fields blank.");
  }

  const cga = calculateCga(gaWeeks, gaDays, dol);
  const gaDecimal = gaWeeks + gaDays / 7;
  document.querySelector("#cga-display").innerHTML = `<strong>${cga.weeks}</strong> weeks <strong>${cga.days}</strong> days`;
  transitionWarning.hidden = dol >= 14;

  const centiles = referenceValues(gaDecimal, cga.decimalWeeks, dol);
  results.hidden = false;

  if (!centiles) {
    centileContent.hidden = true;
    rangeWarning.hidden = false;
    rangeWarning.textContent = dol <= 1
      ? `Birth gestation is outside the 22+0 to 42+0 week day-one reference. No value has been extrapolated.`
      : `Corrected gestational age is ${cga.weeks}+${cga.days} weeks. The corrected-age reference covers 24+0 to 46+0 weeks. No value has been extrapolated.`;
  } else {
    centileContent.hidden = false;
    rangeWarning.hidden = true;
    renderPressureValues("#sbp-values", centiles.sbp);
    renderPressureValues("#dbp-values", centiles.dbp);
    renderPressureValues("#map-values", centiles.map);
    renderPatientComparison(centiles, patientValues);
    const ageBasis = centiles.model === "day-one" ? "birth-gestation" : "corrected-gestation";
    document.querySelector("#interpolation-note").textContent = centiles.interpolated
      ? `Calculated by linear interpolation between the published ${centiles.lower}- and ${centiles.upper}-week ${ageBasis} rows.`
      : `Matches the published ${centiles.lower}-week ${ageBasis} row without interpolation.`;
  }

  results.scrollIntoView({ behavior: "smooth", block: "start" });
});

resetButton.addEventListener("click", () => {
  form.reset();
  document.querySelector("#ga-days").value = "0";
  results.hidden = true;
  errorBox.hidden = true;
  document.querySelector("#ga-weeks").focus();
});

document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => {
    const selected = button.dataset.tab;
    document.querySelectorAll(".tab-button").forEach(tab => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-panel]").forEach(panel => { panel.classList.toggle("tab-panel-hidden", panel.dataset.panel !== selected); });
  });
});

const htnForm = document.querySelector("#htn-form");
const htnError = document.querySelector("#htn-form-error");
const htnResults = document.querySelector("#htn-results");
htnForm.addEventListener("submit", event => {
  event.preventDefault();
  htnError.hidden = true;
  const gaWeeks = Number(document.querySelector("#htn-ga-weeks").value);
  const gaDays = Number(document.querySelector("#htn-ga-days").value);
  const dol = Number(document.querySelector("#htn-dol").value);
  const readHtnPressure = id => { const raw = document.querySelector(id).value.trim(); return raw === "" ? null : Number(raw); };
  const patientValues = { sbp: readHtnPressure("#htn-patient-sbp"), dbp: readHtnPressure("#htn-patient-dbp"), map: readHtnPressure("#htn-patient-map") };
  const showHtnError = message => { htnError.textContent = message; htnError.hidden = false; };
  if (!validateInteger(gaWeeks, 22, 42)) return showHtnError("Enter birth gestation from 22 to 42 completed weeks.");
  if (!validateInteger(gaDays, 0, 6)) return showHtnError("Enter 0 to 6 additional gestational days.");
  if (!validateInteger(dol, 14, 154)) return showHtnError("This hypertension reference applies from day 14. Enter a day of life from 14 to 154.");
  if (Object.values(patientValues).some(value => value !== null && (!Number.isFinite(value) || value < 1 || value > 200))) return showHtnError("Enter blood pressure values from 1 to 200 mmHg, or leave the fields blank.");

  const cga = calculateCga(gaWeeks, gaDays, dol);
  const centiles = interpolateTable(HYPERTENSION_BP, cga.decimalWeeks);
  document.querySelector("#htn-cga-display").innerHTML = `<strong>${cga.weeks}</strong> weeks <strong>${cga.days}</strong> days`;
  htnResults.hidden = false;
  if (!centiles) {
    document.querySelector("#htn-centile-content").hidden = true;
    const warning = document.querySelector("#htn-range-warning");
    warning.hidden = false;
    warning.textContent = `Corrected gestational age is ${cga.weeks}+${cga.days} weeks. The hypertension reference covers 26+0 to 44+0 weeks. No value has been extrapolated.`;
  } else {
    document.querySelector("#htn-centile-content").hidden = false;
    document.querySelector("#htn-range-warning").hidden = true;
    renderHypertensionValues("#htn-sbp-values", centiles.sbp);
    renderHypertensionValues("#htn-dbp-values", centiles.dbp);
    renderHypertensionValues("#htn-map-values", centiles.map);
    renderHypertensionComparison(centiles, patientValues);
    document.querySelector("#htn-interpolation-note").textContent = centiles.interpolated ? `Linear interpolation between the ${centiles.lower}- and ${centiles.upper}-week PMA rows.` : `Published ${centiles.lower}-week PMA row.`;
  }
  htnResults.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#htn-reset-button").addEventListener("click", () => {
  htnForm.reset();
  document.querySelector("#htn-ga-days").value = "0";
  htnResults.hidden = true;
  htnError.hidden = true;
  document.querySelector("#htn-ga-weeks").focus();
});

if (typeof module !== "undefined") module.exports = { calculateCga, interpolateTable, referenceValues, classifyPressure, classifyHypertension };
