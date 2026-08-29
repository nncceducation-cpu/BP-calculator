# Neonatal Blood Pressure Centile Calculator

A dependency-free static web calculator for corrected gestational age and neonatal blood pressure reference centiles.

The repository also contains Capacitor and Codemagic configuration for signed iOS and Android store builds. The mobile package identifier is `ca.nncceducation.neonatalbp`.

Mobile release 1.1 packages the contemporary model and coefficient files with the offline calculator. Both platform workflows verify that every required web asset is present before generating the native project.

## What it calculates

- Corrected gestational age from gestational age at birth plus completed postnatal days and hours
- Zubrow et al. 1995 historical Philadelphia chart as the default selection
- Optional van Zadelhoff et al. 2023 non-invasive first-week model
- Optional Elsayed and Ahmed 2024 invasive UAC day-specific reference for stable infants born at 23 to 28 weeks
- Optional Hillman et al. 2025 mixed-acuity oscillometric P5/P50/P95 tables indexed by completed birth and corrected gestational weeks
- Optional Kiss et al. 2023 stable-neonate oscillometric P10/P50/P90 tables for published days 1, 3, and 5
- Systolic, diastolic, and mean arterial pressure as source-specific historical limits or P5, P50, and P95 centiles
- No automatic joining between datasets
- Linear interpolation between published whole-week rows
- Optional patient SBP, DBP, and MAP comparison with the selected reference
- Red below the 5th centile, green from the 5th through 95th, and amber above the 95th
- Separate hypertension tab for infants aged 14 days or older
- Dionne 50th, 95th, and 99th postmenstrual-age references with patient BP comparison
- A prominent warning for infants younger than 14 days because early transitional BP changes rapidly
- No extrapolation outside the source table

## Evidence basis

The default selection is the Zubrow et al. 1995 Philadelphia historical chart. Its lower and upper limits are labelled as historical limits rather than true P5 and P95. Historical MAP is derived from SBP and DBP.

For birth GA 24+0 to 41+6 weeks and completed postnatal age 1 to 168 hours, the optional van Zadelhoff model uses the open tensor-product spline coefficients. P5 and P95 are evaluated at normal scores -1.6448536269514722 and +1.6448536269514722. The implementation is reconciled against outputs from the authors' live calculator.

van Zadelhoff AC, et al. Age-dependent changes in arterial blood pressure in neonates during the first week of life: reference values and development of a model. Br J Anaesth. 2023;130:585-594. https://doi.org/10.1016/j.bja.2023.01.024

The Elsayed option uses published invasive UAC P5, P50, and P95 values for stable infants born at 23 to 28 completed weeks during postnatal days 1 to 3. It performs no hourly or gestational-day interpolation.

Elsayed Y, Ahmed F. Blood pressure normative values in preterm infants during postnatal transition. Pediatr Res. 2024;95:698-704. https://doi.org/10.1038/s41390-023-02788-8

The Hillman option uses the published P5, P50, and P95 cells for completed birth-GA weeks 22 to 40 and completed corrected-GA weeks through 40. It performs no interpolation. The data represent a mixed-acuity oscillometric cohort and are not treatment thresholds.

Hillman NH, Williams HL, Petersen RY. Oscillatory blood pressure values in newborn infants: observational data over gestational ages. Neonatology. 2025;122:138-145. https://doi.org/10.1159/000542375

The Kiss option uses the published P10, P50, and P90 values for birth-GA groups 25 to 42 weeks on postnatal days 1, 3, and 5. It performs no interpolation and does not convert P10/P90 into P5/P95.

Kiss JK, Gajda A, Mari J, Nemeth J, Bereczki C. Oscillometric arterial blood pressure in haemodynamically stable neonates in the first 2 weeks of life. Pediatr Nephrol. 2023;38:3369-3378. https://doi.org/10.1007/s00467-023-05979-x

The Philadelphia Neonatal Blood Pressure Study chart is from:

Zubrow AB, et al. Determinants of blood pressure in infants admitted to neonatal intensive care units: a prospective multicenter study. J Perinatol. 1995;15:470-479.

The historical chart's day-one and corrected-age regressions are separate. No model silently falls back to or joins another dataset.

Recent larger and age-specific studies are prioritized for interpretation and caveats. The Dionne upper-centile table is treated as a hypertension reference, not the default normative distribution. Full citations are displayed in the app.

## Run locally

Open `index.html` in a browser. No build step or external package is required.

Run the calculation checks with:

```bash
node tests.js
```

The verification suite performs more than 75,000 checks, including independent reconciliation with the authors' contemporary model, every Philadelphia and Dionne source row, interpolation points, supported age combinations, and classification boundaries.

## GitHub Pages

In the repository settings, select **Pages**, choose **Deploy from a branch**, and publish the root of the `main` branch.

## Scope

This is an educational reference, not a diagnostic or treatment tool. BP centiles are statistical reference values. They are not validated thresholds for systemic blood flow, cerebral perfusion, or vasoactive treatment.
