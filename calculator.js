// Add this function to test the bot
function inefficient_calculator(a, b) {
  let result = 0;
  if (a > 5) {
    if (b > 5) {
      if (a > b) {
        result = a * a + b;
      } else {
        result = b * b + a;
      }
    } else {
      result = a + b;
    }
  } else {
    result = a + b;
  }
  return result;
}