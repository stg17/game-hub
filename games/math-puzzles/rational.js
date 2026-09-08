// Exact fraction arithmetic, used only by make24.js so combine results are
// never floating-point-approximate (e.g. 8/(3-8/3) must equal exactly 24).
var Rational = (function () {
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a || 1;
  }

  // Canonical form: denominator always positive, fully reduced, 0 normalized to 0/1.
  function make(n, d) {
    if (d < 0) { n = -n; d = -d; }
    if (n === 0) return { n: 0, d: 1 };
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function fromInt(i) { return { n: i, d: 1 }; }

  function add(a, b) { return make(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return make(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return make(a.n * b.n, a.d * b.d); }
  function div(a, b) {
    if (b.n === 0) return null;
    return make(a.n * b.d, a.d * b.n);
  }

  // Safe: both sides are always already reduced canonical values.
  function equals(a, b) { return a.n === b.n && a.d === b.d; }

  function toDisplayString(a) {
    return a.d === 1 ? String(a.n) : (a.n + '/' + a.d);
  }

  return {
    make: make,
    fromInt: fromInt,
    add: add,
    sub: sub,
    mul: mul,
    div: div,
    equals: equals,
    toDisplayString: toDisplayString,
  };
})();
