const form = document.querySelector("#bp-form");
const resetButton = document.querySelector("#reset-button");
const results = document.querySelector("#results");
const errorBox = document.querySelector("#form-error");
const centileContent = document.querySelector("#centile-content");
const rangeWarning = document.querySelector("#range-warning");
const transitionWarning = document.querySelector("#transition-warning");
const referenceModelInput = document.querySelector("#reference-model");
const otherReferenceModel = document.querySelector("#other-reference-model");
const referenceModelTabs = [...document.querySelectorAll(".reference-model-tab")];

function selectReferenceModel(model) {
  referenceModelInput.value = model;
  referenceModelTabs.forEach(button => {
    const active = button.dataset.referenceModel === model;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const selectedFromDropdown = [...otherReferenceModel.options].some(option => option.value === model);
  otherReferenceModel.value = selectedFromDropdown ? model : "";
  otherReferenceModel.classList.toggle("active", selectedFromDropdown);
}

referenceModelTabs.forEach(button => {
  button.addEventListener("click", () => selectReferenceModel(button.dataset.referenceModel));
});

otherReferenceModel.addEventListener("change", () => {
  if (otherReferenceModel.value) selectReferenceModel(otherReferenceModel.value);
});

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function calculateCga(gaWeeks, gaDays, dol, postnatalHours = 0) {
  const totalHours = (gaWeeks * 7 + gaDays + dol) * 24 + postnatalHours;
  const totalDays = totalHours / 24;
  const remainderHours = totalHours % (7 * 24);
  return {
    totalHours,
    totalDays,
    weeks: Math.floor(totalDays / 7),
    days: Math.floor(remainderHours / 24),
    hours: remainderHours % 24,
    decimalWeeks: totalHours / (7 * 24)
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

function elsayedReferenceValues(gaDecimal, postnatalHours) {
  if (gaDecimal < 23 || gaDecimal >= 29 || postnatalHours < 0 || postnatalHours > 72) return null;
  const gaGroup = Math.floor(gaDecimal);
  const day = postnatalHours < 24 ? 1 : postnatalHours < 48 ? 2 : 3;
  const row = ELSAYED_UAC_BP.find(value => value.ga === gaGroup && value.day === day);
  return row ? { ...row, model: "elsayed-uac", interpolated: false, ageHours: postnatalHours } : null;
}

function hillmanReferenceValues(gaDecimal, cgaDecimal) {
  const ga = Math.floor(gaDecimal);
  const cga = Math.floor(cgaDecimal);
  if (ga < 22 || ga > 40 || cga < ga || cga > 40) return null;
  const row = HILLMAN_BP.find(value => value.ga === ga && value.cga === cga);
  return row ? { ...row, model: "hillman-weekly", interpolated: false } : null;
}

function kissReferenceValues(gaDecimal, postnatalHours) {
  if (gaDecimal < 25 || gaDecimal >= 43 || postnatalHours < 0) return null;
  const day = postnatalHours < 24 ? 1
    : postnatalHours >= 48 && postnatalHours < 72 ? 3
      : postnatalHours >= 96 && postnatalHours < 120 ? 5
        : null;
  if (!day) return null;
  const ga = Math.floor(gaDecimal);
  const row = KISS_BP.find(value => ga >= value.gaMin && ga <= value.gaMax && value.day === day);
  return row ? { ...row, model: "kiss-stable", interpolated: false } : null;
}

function referenceValues(gaDecimal, cgaDecimal, dol, postnatalHours = 0, selectedModel = "philadelphia") {
  const ageHours = dol * 24 + postnatalHours;
  if (selectedModel === "van-zadelhoff" || selectedModel === "automatic") {
    return contemporaryReferenceValues(gaDecimal, ageHours);
  }
  if (selectedModel === "elsayed-uac") return elsayedReferenceValues(gaDecimal, ageHours);
  if (selectedModel === "hillman-weekly") return hillmanReferenceValues(gaDecimal, cgaDecimal);
  if (selectedModel === "kiss-stable") return kissReferenceValues(gaDecimal, ageHours);

  const isDayOne = ageHours < 24;
  const values = interpolateTable(isDayOne ? DAY_ONE_BP : CORRECTED_AGE_BP, isDayOne ? gaDecimal : cgaDecimal);
  return values ? { ...values, model: isDayOne ? "philadelphia-day-one" : "philadelphia-corrected-age" } : null;
}

function classifyPressure(value, fifthCentile, ninetyFifthCentile) {
  if (value < fifthCentile) return "low";
  if (value > ninetyFifthCentile) return "high";
  return "acceptable";
}

function classifyHypertension(value, percentile95, percentile99) {
  if (value >= percentile99) return "markedly-elevated";
  if (value >= percentile95) return "elevated";
  return "below-95";
}

function renderPressureValues(elementId, values, labels = CENTILE_LABELS) {
  const list = document.querySelector(elementId);
  list.replaceChildren();
  values.forEach((value, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `centile-row centile-${index}`;
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = labels[index];
    description.innerHTML = `<strong>${value}</strong> <span>mmHg</span>`;
    wrapper.append(term, description);
    list.append(wrapper);
  });
}

function renderPatientComparison(centiles, patientValues) {
  const comparison = document.querySelector("#patient-comparison");
  const grid = document.querySelector("#comparison-grid");
  const pressures = [
    { label: "Systolic", short: "SBP", value: patientValues.sbp, fifth: centiles.sbp[0], ninetyFifth: centiles.sbp[2] },
    { label: "Diastolic", short: "DBP", value: patientValues.dbp, fifth: centiles.dbp[0], ninetyFifth: centiles.dbp[2] },
    { label: "Mean arterial", short: "MAP", value: patientValues.map, fifth: centiles.map[0], ninetyFifth: centiles.map[2] }
  ].filter(item => item.value !== null);

  comparison.hidden = pressures.length === 0;
  grid.replaceChildren();
  pressures.forEach(item => {
    const status = classifyPressure(item.value, item.fifth, item.ninetyFifth);
    const historical = centiles.model.startsWith("philadelphia-");
    const kiss = centiles.model === "kiss-stable";
    const statusText = historical
      ? status === "low" ? "Below historical lower limit" : status === "high" ? "Above historical upper limit" : "Within historical chart limits"
      : kiss
        ? status === "low" ? "Below 10th centile" : status === "high" ? "Above 90th centile" : "Within 10th-90th centiles"
        : status === "low" ? "Below 5th centile" : status === "high" ? "Above 95th centile" : "Within 5th-95th centiles";
    const card = document.createElement("article");
    card.className = `comparison-card ${status}`;
    card.innerHTML = `
      <div class="status-icon" aria-hidden="true">${status === "acceptable" ? "✓" : "!"}</div>
      <div>
        <p class="comparison-name">${item.label} (${item.short})</p>
        <p class="comparison-value"><strong>${item.value}</strong> mmHg</p>
        <p class="comparison-status">${statusText}</p>
        <p class="comparison-threshold">${historical ? "Lower" : kiss ? "10th" : "5th"}: ${item.fifth} · ${historical ? "Upper" : kiss ? "90th" : "95th"}: ${item.ninetyFifth} mmHg</p>
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
  const postnatalHours = Number(document.querySelector("#postnatal-hours").value);
  const selectedModel = referenceModelInput.value;
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
  if (!validateInteger(dol, 0, 154)) return showError("Enter completed postnatal days from 0 to 154.");
  if (!validateInteger(postnatalHours, 0, 23)) return showError("Enter 0 to 23 additional postnatal hours.");
  if (Object.values(patientValues).some(value => value !== null && (!Number.isFinite(value) || value < 1 || value > 200))) {
    return showError("Enter blood pressure values from 1 to 200 mmHg, or leave the fields blank.");
  }

  const cga = calculateCga(gaWeeks, gaDays, dol, postnatalHours);
  const gaDecimal = gaWeeks + gaDays / 7;
  document.querySelector("#cga-display").innerHTML = `<strong>${cga.weeks}</strong> weeks <strong>${cga.days}</strong> days${cga.hours ? ` <strong>${cga.hours}</strong> hours` : ""}`;
  transitionWarning.hidden = dol * 24 + postnatalHours >= 14 * 24;

  const centiles = referenceValues(gaDecimal, cga.decimalWeeks, dol, postnatalHours, selectedModel);
  results.hidden = false;

  if (!centiles) {
    centileContent.hidden = true;
    rangeWarning.hidden = false;
    if (selectedModel === "van-zadelhoff" || selectedModel === "automatic") {
      rangeWarning.textContent = "The contemporary model covers birth GA 24+0 to 41+6 weeks and postnatal age 1 to 168 hours. No different dataset has been joined automatically. Select the historical Philadelphia chart if you need its older extended-age reference.";
    } else if (selectedModel === "elsayed-uac") {
      rangeWarning.textContent = "The Elsayed invasive UAC table covers infants born at 23+0 to 28+6 weeks and postnatal age 0 to 72 hours. It applies only to invasive UAC measurements in hemodynamically stable infants. No value has been extrapolated.";
    } else if (selectedModel === "hillman-weekly") {
      rangeWarning.textContent = "The Hillman tables cover completed birth-GA weeks 22 to 40 and corrected gestational-age weeks from birth through 40 weeks. No value has been extrapolated or joined to another source.";
    } else if (selectedModel === "kiss-stable") {
      rangeWarning.textContent = "The Kiss stable-neonate tables provide P10, P50, and P90 only for postnatal days 1, 3, and 5 and birth-GA groups 25 to 42 weeks. Enter 0-23, 48-71, or 96-119 completed hours. No value has been interpolated.";
    } else {
      rangeWarning.textContent = dol * 24 + postnatalHours < 24
        ? `Birth gestation is outside the 22+0 to 42+0 week Philadelphia first-24-hour reference. No value has been extrapolated.`
        : `Corrected gestational age is ${cga.weeks}+${cga.days} weeks. The corrected-age reference covers 24+0 to 46+0 weeks. No value has been extrapolated.`;
    }
  } else {
    centileContent.hidden = false;
    rangeWarning.hidden = true;
    const historical = centiles.model.startsWith("philadelphia-");
    const labels = historical ? ["Lower", "Midline", "Upper"]
      : centiles.model === "kiss-stable" ? ["10th", "50th", "90th"] : CENTILE_LABELS;
    renderPressureValues("#sbp-values", centiles.sbp, labels);
    renderPressureValues("#dbp-values", centiles.dbp, labels);
    renderPressureValues("#map-values", centiles.map, labels);
    renderPatientComparison(centiles, patientValues);
    const badge = document.querySelector("#reference-badge");
    const modelNote = document.querySelector("#model-note");
    const interpolationNote = document.querySelector("#interpolation-note");
    const comparisonRule = document.querySelector("#comparison-rule");
    const comparisonCaution = document.querySelector("#comparison-caution");
    const derivedMapNote = document.querySelector("#derived-map-note");
    const mapDerivedMarker = document.querySelector("#map-derived-marker");
    if (centiles.model === "contemporary-first-week") {
      badge.textContent = "van Zadelhoff 2023 · P5 / P50 / P95";
      badge.classList.add("contemporary-badge");
      modelNote.textContent = "Contemporary first-week model: 607 NICU neonates and 5,885 non-invasive measurements. Values depend on both gestational age at birth and exact postnatal age.";
      interpolationNote.textContent = "P5 and P95 are evaluated from the published quantile-regression model at normal scores -1.64485 and +1.64485. No table interpolation is used.";
      comparisonRule.textContent = "Red <5th · Green 5th-95th · Amber >95th";
      comparisonCaution.textContent = "Green means the value lies from the 5th through the 95th centile in this reference. Amber identifies a value above the normative 95th centile and is not, by itself, a diagnosis of hypertension. A green result does not confirm adequate systemic or cerebral perfusion.";
      derivedMapNote.hidden = true;
      mapDerivedMarker.hidden = true;
    } else if (centiles.model === "elsayed-uac") {
      badge.textContent = "Elsayed 2024 · invasive UAC P5 / P50 / P95";
      badge.classList.add("contemporary-badge");
      modelNote.textContent = "Invasive UAC reference from 206 hemodynamically stable infants born before 29 weeks. Select this model only for an invasive arterial measurement.";
      interpolationNote.textContent = `Published day ${centiles.day} row for infants born at ${centiles.ga} completed weeks. No hourly or gestational-day interpolation is used.`;
      comparisonRule.textContent = "Red <5th · Green 5th-95th · Amber >95th";
      comparisonCaution.textContent = "This comparison applies to the selected invasive UAC reference population. A centile is not a treatment threshold and does not establish adequate systemic or cerebral perfusion.";
      derivedMapNote.hidden = true;
      mapDerivedMarker.hidden = true;
    } else if (centiles.model === "hillman-weekly") {
      badge.textContent = "Hillman 2025 · weekly P5 / P50 / P95";
      badge.classList.add("contemporary-badge");
      modelNote.textContent = "Large mixed-acuity oscillometric cohort: 29,323 infants and approximately 1.4 million measurements. Values depend on completed gestational week at birth and completed corrected gestational week.";
      interpolationNote.textContent = `Published birth-GA ${centiles.ga}-week row and corrected-GA ${centiles.cga}-week column. No interpolation is used.`;
      comparisonRule.textContent = "Red <5th · Green 5th-95th · Amber >95th";
      comparisonCaution.textContent = "These are mixed-acuity observational percentiles. Measurement frequency varied by gestation and clinical status. A centile is not a treatment threshold and does not establish adequate systemic or cerebral perfusion.";
      derivedMapNote.hidden = true;
      mapDerivedMarker.hidden = true;
    } else if (centiles.model === "kiss-stable") {
      badge.textContent = "Kiss 2023 · stable neonates P10 / P50 / P90";
      badge.classList.add("contemporary-badge");
      modelNote.textContent = "Oscillometric reference from 629 haemodynamically stable neonates and 134,938 measurements. Values are reported in grouped birth gestations.";
      interpolationNote.textContent = `Published day ${centiles.day} row for birth GA ${centiles.gaMin}-${centiles.gaMax} weeks. No age or gestational interpolation is used.`;
      comparisonRule.textContent = "Red <10th · Green 10th-90th · Amber >90th";
      comparisonCaution.textContent = "This source reports P10 and P90, not P5 and P95. The comparison applies only to the published stable-neonate group and day. It is not a treatment threshold.";
      derivedMapNote.hidden = true;
      mapDerivedMarker.hidden = true;
    } else {
      badge.textContent = "Philadelphia 1995 · historical chart limits";
      badge.classList.remove("contemporary-badge");
      modelNote.textContent = "Historical Philadelphia chart selected by the user. Its lower and upper plotted limits are not presented as true 5th and 95th centiles.";
      const ageBasis = centiles.model === "philadelphia-day-one" ? "birth-gestation" : "corrected-postconceptional-age";
      interpolationNote.textContent = centiles.interpolated
        ? `Calculated by linear interpolation between the published ${centiles.lower}- and ${centiles.upper}-week ${ageBasis} rows.`
        : `Matches the published ${centiles.lower}-week ${ageBasis} row without interpolation.`;
      comparisonRule.textContent = "Red <lower · Green within limits · Amber >upper";
      comparisonCaution.textContent = "The historical lower and upper chart limits are not true 5th and 95th centiles. This comparison is descriptive only and must not be used as a treatment threshold.";
      derivedMapNote.hidden = false;
      mapDerivedMarker.hidden = false;
    }
  }

  results.scrollIntoView({ behavior: "smooth", block: "start" });
});

resetButton.addEventListener("click", () => {
  form.reset();
  document.querySelector("#ga-days").value = "0";
  document.querySelector("#postnatal-hours").value = "0";
  selectReferenceModel("philadelphia");
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

if (typeof module !== "undefined") module.exports = { calculateCga, interpolateTable, elsayedReferenceValues, referenceValues, classifyPressure, classifyHypertension };
