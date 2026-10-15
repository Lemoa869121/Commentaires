/* Chargement des listes (data/config.json) et des textes (data/textes.json).
   Après un enregistrement depuis le panneau de contrôle, une copie locale
   plus récente est utilisée tout de suite dans ce navigateur, en attendant
   que GitHub Pages republie le site. */
(function () {
  'use strict';
  const CLES = { config: 'commentaires.local.config', textes: 'commentaires.local.textes' };

  function lireLocal(cle) {
    try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function ecrireLocal(cle, val) {
    try { localStorage.setItem(cle, JSON.stringify(val)); } catch (e) { /* stockage indisponible */ }
  }
  function effacerLocal(cle) {
    try { localStorage.removeItem(cle); } catch (e) { /* rien */ }
  }

  async function chargerFichier(nom) {
    const rep = await fetch('data/' + nom + '.json?t=' + Date.now(), { cache: 'no-store' });
    if (!rep.ok) throw new Error('Impossible de charger data/' + nom + '.json (' + rep.status + ')');
    const distant = await rep.json();
    const local = lireLocal(CLES[nom]);
    if (local && (local.version || 0) > (distant.version || 0)) return local;
    if (local) effacerLocal(CLES[nom]); // le site publié a rattrapé la copie locale
    return distant;
  }

  async function charger() {
    const [config, textes] = await Promise.all([chargerFichier('config'), chargerFichier('textes')]);
    return { config, textes };
  }

  window.Donnees = {
    charger,
    memoriserLocal(nom, val) { ecrireLocal(CLES[nom], val); },
    lireLocal, ecrireLocal, effacerLocal
  };
})();
