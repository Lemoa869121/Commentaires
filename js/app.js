/* Démarrage : chargement des données, écouteurs, aperçu, copie, réinitialisation. */
(function () {
  'use strict';
  const F = window.Formulaire, G = window.Generateur;
  const CLE_SAISIE = 'commentaires.saisie';

  let cfg, textes, etat;
  const $ = sel => document.querySelector(sel);
  const form = () => $('#formulaire');

  function sauver() {
    try { localStorage.setItem(CLE_SAISIE, JSON.stringify(etat)); } catch (e) { /* navigation privée */ }
  }
  function restaurer() {
    try { const v = localStorage.getItem(CLE_SAISIE); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }

  function rafraichir() {
    F.actualiser(form(), etat, cfg);
    const m = G.generer(etat, cfg, textes);
    const ap = $('#apercu');
    if (G.estVide(m)) {
      ap.innerHTML = '<p class="apercu-vide">Le commentaire apparaîtra ici au fur et à mesure de la saisie.</p>';
      $('#btn-copier').disabled = true;
    } else {
      ap.innerHTML = G.enHTML(m);
      $('#btn-copier').disabled = false;
    }
    sauver();
  }

  function surSaisie(e) {
    const el = e.target;
    const chemin = el.dataset && el.dataset.path;
    if (!chemin) return;
    if (el.type === 'checkbox' && el.dataset.val !== undefined) {
      const liste = (F.lire(etat, chemin) || []).filter(v => v !== el.dataset.val);
      if (el.checked) liste.push(el.dataset.val);
      F.ecrire(etat, chemin, liste);
    } else if (el.type === 'checkbox') {
      F.ecrire(etat, chemin, el.checked);
    } else {
      F.ecrire(etat, chemin, el.value);
    }
    // Thermfix Light : « Sur structure » présélectionné au choix de la gamme.
    if (chemin === 'gamme' && el.value === 'light' && !etat.env.structure.on) {
      etat.env.structure.on = true;
      F.synchroniser(form(), etat, cfg);
    }
    rafraichir();
  }

  function reinitialiser() {
    if (!confirm('Vider tous les champs du formulaire ?')) return;
    etat = G.etatInitial(cfg);
    F.synchroniser(form(), etat, cfg);
    rafraichir();
    form().parentElement.scrollTop = 0;
    window.scrollTo(0, 0);
    toast('Formulaire vidé');
  }

  async function copier() {
    const m = G.generer(etat, cfg, textes);
    if (G.estVide(m)) return;
    const html = G.enHTML(m), texte = G.enTexte(m);
    try {
      if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error('API absente');
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([texte], { type: 'text/plain' })
      })]);
      toast('Commentaire copié — collez-le dans Word ou Outlook');
    } catch (err) {
      // Repli : sélection d'une copie invisible du rendu enrichi.
      const zone = document.createElement('div');
      zone.innerHTML = html;
      zone.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(zone);
      const r = document.createRange(); r.selectNodeContents(zone);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      sel.removeAllRanges(); zone.remove();
      toast(ok ? 'Commentaire copié' : 'Copie impossible : sélectionnez le texte de l\'aperçu et faites Ctrl+C', !ok);
    }
  }

  let minuteur;
  function toast(msg, erreur) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('erreur', !!erreur);
    t.classList.add('visible');
    clearTimeout(minuteur);
    minuteur = setTimeout(() => t.classList.remove('visible'), 2600);
  }

  function ouvrirVentouses() {
    const dlg = $('#dlg-ventouses');
    const ta = dlg.querySelector('textarea');
    ta.value = etat.vp.ventouses.texte || '';
    dlg.showModal();
    ta.focus();
  }

  async function demarrer() {
    try {
      ({ config: cfg, textes } = await window.Donnees.charger());
    } catch (e) {
      $('#formulaire').innerHTML = '<div class="alerte"><strong>Chargement impossible.</strong> ' +
        'Ouvrez l\'application par son adresse web (GitHub Pages) ou un serveur local, pas en double-cliquant sur le fichier.<br><small>' +
        String(e.message || e) + '</small></div>';
      return;
    }
    etat = G.fusionner(G.etatInitial(cfg), restaurer());
    F.construire(form(), cfg);
    F.synchroniser(form(), etat, cfg);

    form().addEventListener('input', surSaisie);
    form().addEventListener('click', e => {
      const b = e.target.closest('[data-action="ventouses"]');
      if (b) ouvrirVentouses();
    });
    $('#btn-reinit').addEventListener('click', reinitialiser);
    $('#btn-copier').addEventListener('click', copier);

    const dlg = $('#dlg-ventouses');
    dlg.querySelector('form').addEventListener('submit', e => {
      if (e.submitter && e.submitter.value === 'ok') {
        etat.vp.ventouses.texte = dlg.querySelector('textarea').value;
        rafraichir();
      }
    });

    rafraichir();
  }

  document.addEventListener('DOMContentLoaded', demarrer);
})();
