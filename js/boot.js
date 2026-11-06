/*
 * Tiny progressive-enhancement gate.
 *
 * • Adds the `js` class before first paint so the envelope is only shown when
 *   JavaScript is actually available.
 * • If the main module fails to initialise (old browser, blocked module,
 *   network hiccup), the page gracefully falls back to a readable summary
 *   instead of trapping the visitor behind the opening scene.
 */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  window.setTimeout(function () {
    if (root.hasAttribute('data-ready')) return;
    root.classList.add('boot-failed');
    root.classList.remove('is-locked');
    var inertElements = document.querySelectorAll('[inert]');
    for (var i = 0; i < inertElements.length; i += 1) {
      inertElements[i].removeAttribute('inert');
    }
    var fallback = document.getElementById('fallback');
    if (fallback) fallback.focus({ preventScroll: true });
  }, 5000);
})();
