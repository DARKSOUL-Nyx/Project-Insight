// calculator.js
function efficientCalculator(a, b) {
  if (a > 5 && b > 5) {
    return a > b ? a * a + b : b * b + a;
  } else {
    return a + b;
  }
}