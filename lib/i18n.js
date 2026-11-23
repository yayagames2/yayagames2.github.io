/* Offline Arcade – language picker + runtime translation.
   Games call T(he, en); for languages other than Hebrew/English the English text is looked up here. */
(function () {
  var LANGS = ['he', 'en', 'es', 'pt', 'de', 'fr', 'it', 'tr', 'ru', 'id', 'pl', 'ar', 'hi'];
  var l = null; try { l = localStorage.getItem('oa-lang'); } catch (e) { }
  if (LANGS.indexOf(l) < 0) {
    var nl = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    l = 'en';
    for (var i = 0; i < nl.length; i++) { var c = String(nl[i] || '').toLowerCase().slice(0, 2); if (c === 'iw') c = 'he'; if (c === 'in') c = 'id'; if (LANGS.indexOf(c) >= 0) { l = c; break; } }
  }
  var D = {}, P = null, M = {};
  function pats() {
    P = [];
    for (var k in D) if (k.indexOf('{0}') >= 0) {
      var parts = k.split(/\{(\d)\}/), re = '^', ord = [];
      for (var j = 0; j < parts.length; j++) { if (j % 2) { re += '([\\s\\S]*?)'; ord.push(+parts[j]); } else re += parts[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
      try { P.push([new RegExp(re + '$'), ord, D[k]]); } catch (e) { }
    }
  }
  function tr(en) {
    if (l === 'en' || l === 'he' || typeof en !== 'string') return en;
    var v = D[en]; if (v != null) return v;
    if (en in M) return M[en];
    if (!P) pats();
    var out = en;
    for (var j = 0; j < P.length; j++) {
      var m = P[j][0].exec(en);
      if (m) { var o = P[j][1]; out = P[j][2].replace(/\{(\d)\}/g, function (_, d) { var x = o.indexOf(+d); return x < 0 ? '' : tr(m[x + 1]); }); break; }
    }
    M[en] = out; return out;
  }
  window.OA_LANGS = LANGS;
  window.OA_LANG = l;
  window.OA_RTL = l === 'he' || l === 'ar';
  window.OA_TR = tr;
  window.OA_DICT = function (d) { D = d || {}; P = null; M = {}; };
  window.OA_NAMES = { he: 'עברית', en: 'English', es: 'Español', pt: 'Português', de: 'Deutsch', fr: 'Français', it: 'Italiano', tr: 'Türkçe', ru: 'Русский', id: 'Bahasa Indonesia', pl: 'Polski', ar: 'العربية', hi: 'हिन्दी' };
  document.documentElement.lang = l; document.documentElement.dir = window.OA_RTL ? 'rtl' : 'ltr';
  if (l !== 'he' && l !== 'en') {
    var me = document.currentScript && document.currentScript.src || 'lib/i18n.js';
    document.write('<script src="' + me.replace(/i18n\.js(\?.*)?$/, 'lang/' + l + '.js') + '"><\/script>');
  }
})();
