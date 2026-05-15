// Inject ferx panel headers into all sourceCode blocks when dark mode is active.
// Mirrors the .code-panel / .panel-head structure used on the homepage.
(function () {
  function injectHeaders() {
    var dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    document.querySelectorAll('div.sourceCode').forEach(function (block) {
      // Skip blocks already inside a .code-panel (homepage styled blocks)
      if (block.closest('.code-panel')) return;

      var existing = block.querySelector(':scope > .ferx-panel-head');
      if (dark && !existing) {
        var head = document.createElement('div');
        head.className = 'ferx-panel-head';
        head.innerHTML =
          '<span class="ph-dots"><i></i><i></i><i></i></span>' +
          '<span class="ph-br">[</span>' +
          '<span class="ph-file">warfarin_pk.ferx</span>' +
          '<span class="ph-br">]</span>';
        block.insertBefore(head, block.firstChild);
      } else if (!dark && existing) {
        existing.remove();
      }
    });
  }

  // Run on load and whenever the theme toggles
  document.addEventListener('DOMContentLoaded', injectHeaders);

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === 'data-bs-theme') injectHeaders();
    });
  });
  observer.observe(document.documentElement, { attributes: true });
}());
