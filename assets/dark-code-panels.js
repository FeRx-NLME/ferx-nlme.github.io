(function () {
  var HEAD = '<div class="panel-head"><span class="dots"><i></i><i></i><i></i></span><span class="file"><span class="br">[</span>warfarin_pk.ferx<span class="br">]</span></span></div>';

  function apply() {
    var dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    document.querySelectorAll('div.sourceCode').forEach(function (el) {
      // Skip blocks already nested inside a .code-panel (homepage panels)
      if (el.parentElement && el.parentElement.closest('.code-panel')) return;
      if (dark) {
        if (!el.classList.contains('code-panel')) {
          el.classList.add('code-panel');
          el.insertAdjacentHTML('afterbegin', HEAD);
        }
      } else {
        el.classList.remove('code-panel');
        var h = el.querySelector(':scope > .panel-head');
        if (h) h.remove();
      }
    });
  }

  if (document.body) apply();
  document.addEventListener('DOMContentLoaded', apply);
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { if (m.attributeName === 'data-bs-theme') apply(); });
  }).observe(document.documentElement, { attributes: true });
}());
