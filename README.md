# Neonatal Blood Pressure Centile Calculator

A dependency-free static web calculator for corrected gestational age and neonatal blood pressure reference centiles.

The repository also contains Capacitor and Codemagic configuration for signed iOS and Android store builds. The mobile package identifier is `ca.nncceducation.neonatalbp`.

## What it calculates

- Corrected gestational age from gestational age at birth plus completed postnatal days and hours
- Automatic use of the van Zadelhoff et al. 2023 first-week model when the input is within its published range
- Systolic, diastolic, and mean arterial pressure at the 5th, 50th, and 95th centiles
- Optional Philadelphia historical-chart mode with no automatic dataset join
- Linear interpolation between published whole-week rows
- Optional patient SBP, DBP, and MAP comparison with the selected reference
- Red below the 5th centile, green from the 5th through 95th, and amber above the 95th
- Separate hypertension tab for infants aged 14 days or older
- Dionne 50th, 95th, and 99th postmenstrual-age references with patient BP comparison
- A prominent warning for infants younger than 14 days because early transitional BP changes rapidly
- No extrapolation outside the source table

## Evidence basis

For birth GA 24+0 to 41+6 weeks and completed postnatal age 1 to 168 hours, automatic mode uses the open van Zadelhoff et al. tensor-product spline model. P5 and P95 are evaluated at normal scores -1.6448536269514722 and +1.6448536269514722. The implementation is reconciled against outputs from the authors' live calculator.

van Zadelhoff AC, et al. Age-dependent changes in arterial blood pressure in neonates during the first week of life: reference values and development of a model. Br J Anaesth. 2023;130:585-594. https://doi.org/10.1016/j.bja.2023.01.024

Outside that range, automatic mode returns no result rather than joining a different dataset. Users may explicitly select the Philadelphia Neonatal Blood Pressure Study chart from:

Zubrow AB, et al. Determinants of blood pressure in infants admitted to neonatal intensive care units: a prospective multicenter study. J Perinatol. 1995;15:470-479.

The historical chart is labelled with lower, midline, and upper limits rather than 5th, 50th, and 95th centiles. Its day-one and corrected-age regressions are separate, and its MAP values are derived from SBP and DBP.

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
