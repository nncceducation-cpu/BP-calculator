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

function interpolateValues(decimalPma) {
  if (decimalPma < BP_CENTILES[0].pma || decimalPma > BP_CENTILES.at(-1).pma) return null;
  const exact = BP_CENTILES.find(row => row.pma === decimalPma);
  if (exact) return { ...exact, interpolated: false, lower: exact.pma, upper: exact.pma };

  const upperIndex = BP_CENTILES.findIndex(row => row.pma > decimalPma);
  const lower = BP_CENTILES[upperIndex - 1];
  const upper = BP_CENTILES[upperIndex];
  const fraction = (decimalPma - lower.pma) / (upper.pma - lower.pma);
  const interpolateSeries = name => lower[name].map((value, index) =>
    roundOne(value + fraction * (upper[name][index] - value))
  );

  return {
    pma: decimalPma,
    sbp: interpolateSeries("sbp"),
    dbp: interpolateSeries("dbp"),
    map: interpolateSeries("map"),
    interpolated: true,
    lower: lower.pma,
    upper: upper.pma
  };
}

function renderPressureValues(elementId, values) {
  const list = document.querySelector(elementId);
  list.replaceChildren();
  values.forEach((value, index) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = CENTILE_LABELS[index];
    description.innerHTML = `<strong>${value}</strong> <span>mmHg</span>`;
    wrapper.append(term, description);
    list.append(wrapper);
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

  if (!validateInteger(gaWeeks, 22, 42)) return showError("Enter birth gestation from 22 to 42 completed weeks.");
  if (!validateInteger(gaDays, 0, 6)) return showError("Enter 0 to 6 additional gestational days.");
  if (!validateInteger(dol, 0, 154)) return showError("Enter an integer day of life from 0 to 154.");

  const cga = calculateCga(gaWeeks, gaDays, dol);
  document.querySelector("#cga-display").innerHTML = `<strong>${cga.weeks}</strong> weeks <strong>${cga.days}</strong> days`;
  transitionWarning.hidden = dol >= 14;

  const centiles = interpolateValues(cga.decimalWeeks);
  results.hidden = false;

  if (!centiles) {
    centileContent.hidden = true;
    rangeWarning.hidden = false;
    rangeWarning.textContent = `The corrected gestational age is ${cga.weeks}+${cga.days} weeks. The selected reference table covers 26+0 to 44+0 weeks only. No value has been extrapolated.`;
  } else {
    centileContent.hidden = false;
    rangeWarning.hidden = true;
    renderPressureValues("#sbp-values", centiles.sbp);
    renderPressureValues("#dbp-values", centiles.dbp);
    renderPressureValues("#map-values", centiles.map);
    document.querySelector("#interpolation-note").textContent = centiles.interpolated
      ? `Calculated by linear interpolation between the published ${centiles.lower}- and ${centiles.upper}-week PMA rows.`
      : `Matches the published ${centiles.lower}-week PMA row without interpolation.`;
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

if (typeof module !== "undefined") {
  module.exports = { calculateCga, interpolateValues };
}
