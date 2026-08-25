# Neonatal Blood Pressure Centile Calculator

A dependency-free static web calculator for corrected gestational age and post-transitional neonatal blood pressure reference centiles.

## What it calculates

- Corrected gestational age from gestational age at birth plus day of life
- Systolic, diastolic, and mean arterial pressure at the 50th, 95th, and 99th percentiles
- Linear interpolation between the published 2-week PMA rows from 26 to 44 weeks
- A prominent warning for infants younger than 14 days because early transitional BP changes rapidly
- No extrapolation outside the source table

## Evidence basis

The numerical table is the commonly cited postmenstrual-age compilation from:

Dionne JM, Abitbol CL, Flynn JT. Hypertension in infancy: diagnosis, management and outcome. Pediatr Nephrol. 2012;27:17-32. doi:10.1007/s00467-011-1921-z.

The clinical caveats and first-week warning reflect contemporary neonatal BP studies and measurement reviews cited in the app.

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
