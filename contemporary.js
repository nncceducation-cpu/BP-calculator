// Independent implementation of the open van Zadelhoff et al. 2023
// tensor-product spline model. The published model uses a normal-score
// percentile axis. P5 and P95 therefore use z = +/-1.6448536269514722.

const NORMAL_Z_05 = -1.6448536269514722;
const NORMAL_Z_50 = 0;
const NORMAL_Z_95 = 1.6448536269514722;

function splineBasis(value, lowerLimit, upperLimit, intervals = 8) {
  const degree = 3;
  const width = (upperLimit - lowerLimit) / intervals;
  const knots = [];
  for (let knot = lowerLimit - degree * width; knot <= upperLimit + degree * width + 0.001 * width; knot += width) {
    knots.push(knot);
  }

  const positiveCubes = knots.map(knot => value > knot ? (value - knot) ** degree : 0);
  const basis = [];
  for (let index = 0; index < positiveCubes.length - 4; index += 1) {
    basis.push((
      positiveCubes[index]
      - 4 * positiveCubes[index + 1]
      + 6 * positiveCubes[index + 2]
      - 4 * positiveCubes[index + 3]
      + positiveCubes[index + 4]
    ) / (6 * width ** 3));
  }
  return basis;
}

function tensorProduct3(first, second, third) {
  const result = [];
  first.forEach(firstValue => {
    second.forEach(secondValue => {
      third.forEach(thirdValue => result.push(firstValue * secondValue * thirdValue));
    });
  });
  return result;
}

function erasmusEstimateAtZ(birthGaDecimal, postnatalHours, zScore) {
  if (birthGaDecimal < 24 || birthGaDecimal > 41 + 6 / 7) return null;
  if (postnatalHours < 1 || postnatalHours > 168) return null;

  const gaBasis = splineBasis(birthGaDecimal * 7, 168, 293, 8);
  const ageBasis = splineBasis(Math.sqrt(postnatalHours), 1, 12.96148, 8);
  const percentileBasis = splineBasis(zScore, -4, 4, 8);
  const tensor = tensorProduct3(gaBasis, ageBasis, percentileBasis);

  return ERASMUS_COEFFICIENTS[0].map((_, outputIndex) => tensor.reduce(
    (sum, weight, index) => sum + weight * ERASMUS_COEFFICIENTS[index][outputIndex],
    0
  ));
}

function contemporaryReferenceValues(birthGaDecimal, postnatalHours) {
  const estimates = [NORMAL_Z_05, NORMAL_Z_50, NORMAL_Z_95]
    .map(zScore => erasmusEstimateAtZ(birthGaDecimal, postnatalHours, zScore));
  if (estimates.some(value => value === null)) return null;

  // Published model output order is MAP, SBP, DBP.
  return {
    age: postnatalHours,
    sbp: estimates.map(value => roundOne(value[1])),
    dbp: estimates.map(value => roundOne(value[2])),
    map: estimates.map(value => roundOne(value[0])),
    model: "contemporary-first-week",
    interpolated: false,
    lower: null,
    upper: null
  };
}
