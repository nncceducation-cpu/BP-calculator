# Neonatal Blood Pressure Centile Calculator

A dependency-free static web calculator for corrected gestational age and neonatal blood pressure reference centiles.

## What it calculates

- Corrected gestational age from gestational age at birth plus day of life
- Systolic, diastolic, and mean arterial pressure at the 5th, 50th, and 95th centiles
- Day 0–1 values indexed by birth gestation (22–42 weeks)
- Values after day 1 indexed by corrected gestational age (24–46 weeks)
- Linear interpolation between published whole-week rows
- A prominent warning for infants younger than 14 days because early transitional BP changes rapidly
- No extrapolation outside the source table

## Evidence basis

The numerical values reproduce the Philadelphia Neonatal Blood Pressure Study tables from:

Zubrow AB, et al. Determinants of blood pressure in infants admitted to neonatal intensive care units: a prospective multicenter study. J Perinatol. 1995;15:470-479.

Recent larger and age-specific studies are prioritized for interpretation and caveats. The Dionne upper-centile table is treated as a hypertension reference, not the default normative distribution. Full citations are displayed in the app.

## Run locally

Open `index.html` in a browser. No build step or external package is required.

Run the calculation checks with:

```bash
node tests.js
```

## GitHub Pages

In the repository settings, select **Pages**, choose **Deploy from a branch**, and publish the root of the `main` branch.

## Scope

This is an educational reference, not a diagnostic or treatment tool. BP centiles are statistical reference values. They are not validated thresholds for systemic blood flow, cerebral perfusion, or vasoactive treatment.
