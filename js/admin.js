/* Panneau de contrôle : édition de data/config.json et data/textes.json,
   enregistrés dans le dépôt GitHub via l'API (clé d'accès = jeton GitHub). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const CLE_JETON = 'commentaires.admin.cle';
  const CLE_DEPOT = 'commentaires.admin.depot';

  let cfg, txt;              // copies de travail
  let origine = {};          // JSON d'origine (pour détecter les modifications)
  let sha = {};              // empreinte GitHub des fichiers chargés
  let acces = null;          // { depot, branche, cle }

  // ---------- stockage ----------
  const lireStock = (k, session) => { try { return (session ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  const ecrireStock = (k, v, session) => { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* rien */ } };
  const effacerStock = k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* rien */ } };

  // ---------- GitHub ----------
  function enB64(texte) {
    const octets = new TextEncoder().encode(texte);
    let bin = '';
    for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function deB64(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }
  async function gh(chemin, options = {}) {
    const rep = await fetch('https://api.github.com/repos/' + acces.depot + chemin, Object.assign({}, options, {
      headers: Object.assign({
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + acces.cle,
        'X-GitHub-Api-Version': '2022-11-28'
      }, options.headers || {})
    }));
    if (!rep.ok) {
      let detail = '';
      try { detail = (await rep.json()).message || ''; } catch (e) { /* rien */ }
      const err = new Error(detail || ('HTTP ' + rep.status));
      err.status = rep.status;
      throw err;
    }
    return rep.json();
  }
  async function lireFichier(nom) {
    const r = await gh('/contents/data/' + nom + '.json?ref=' + encodeURIComponent(acces.branche));
    return { json: JSON.parse(deB64(r.content)), sha: r.sha };
  }
  async function ecrireFichier(nom, objet, ancienSha) {
    const corps = {
      message: 'Panneau de contrôle : mise à jour de ' + nom + '.json',
      content: enB64(JSON.stringify(objet, null, 2) + '\n'),
      sha: ancienSha,
      branch: acces.branche
    };
    const r = await gh('/contents/data/' + nom + '.json', { method: 'PUT', body: JSON.stringify(corps) });
    return r.content.sha;
  }

  function messageErreur(e) {
    if (e.status === 401) return 'Clé refusée par GitHub (invalide ou expirée).';
    if (e.status === 403) return "La clé n'a pas le droit d'écrire : vérifiez « Contents : Read and write » sur ce dépôt.";
    if (e.status === 404) return 'Dépôt, branche ou fichier introuvable — ou la clé ne donne pas accès à ce dépôt.';
    if (e.status === 409) return 'Conflit : le fichier a changé entre-temps. Rechargez la page.';
    return 'Erreur : ' + (e.message || e);
  }

  // ---------- connexion ----------
  async function connecter() {
    const msg = $('#msg-connexion');
    acces = { depot: $('#depot').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, ''), branche: $('#branche').value.trim() || 'main', cle: $('#cle').value.trim() };
    if (!acces.cle) { msg.textContent = 'Saisissez la clé d’accès.'; return; }
    msg.textContent = 'Vérification…';
    try {
      const [c, t] = await Promise.all([lireFichier('config'), lireFichier('textes')]);
      cfg = c.json; txt = t.json; sha = { config: c.sha, textes: t.sha };
      origine = { config: JSON.stringify(cfg), textes: JSON.stringify(txt) };
      const memo = $('#memoriser').checked;
      effacerStock(CLE_JETON);
      ecrireStock(CLE_JETON, acces.cle, !memo);
      ecrireStock(CLE_DEPOT, JSON.stringify({ depot: acces.depot, branche: acces.branche }));
      msg.textContent = '';
      $('#connexion').hidden = true;
      $('#editeur').hidden = false;
      $('#btn-enregistrer').hidden = false;
      $('#btn-deconnexion').hidden = false;
      toutAfficher();
    } catch (e) {
      msg.textContent = messageErreur(e);
    }
  }

  function deconnecter() {
    if (modifie() && !confirm('Des modifications ne sont pas enregistrées. Se déconnecter quand même ?')) return;
    effacerStock(CLE_JETON);
    location.reload();
  }

  // ---------- état des modifications ----------
  function modifie() {
    return cfg && (JSON.stringify(cfg) !== origine.config || JSON.stringify(txt) !== origine.textes);
  }
  function majEtat() {
    const m = modifie();
    $('#etat-modif').textContent = m ? 'Modifications non enregistrées.' : 'Tout est enregistré.';
    $('#etat-modif').classList.toggle('a-faire', m);
  }

  // ---------- petites fabriques ----------
  function h(tag, attrs, ...enfants) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    enfants.flat(Infinity).forEach(e => { if (e != null && e !== false) el.appendChild(typeof e === 'string' ? document.createTextNode(e) : e); });
    return el;
  }
  const lignes = v => v.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  function zoneListe(valeurs, surChange, rows) {
    return h('textarea', { rows: String(rows || Math.max(3, valeurs.length + 1)), value: valeurs.join('\n'),
      oninput: e => { surChange(lignes(e.target.value)); majEtat(); } });
  }
  function texte(valeur, surChange, attrs) {
    return h('input', Object.assign({ type: 'text', value: valeur, oninput: e => { surChange(e.target.value); majEtat(); } }, attrs || {}));
  }
  function caseA(libelle, coche, surChange) {
    return h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: coche, onchange: e => { surChange(e.target.checked); majEtat(); } }), h('span', {}, libelle));
  }
  function slug(nom) {
    let base = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'gamme';
    let id = base, i = 2;
    while (cfg.gammes.some(g => g.id === id)) id = base + '-' + i++;
    return id;
  }
  const SPECIALES = { unico: 'textes Unico', vario: 'raccord de traverse, sans quincaillerie', light: '« Sur structure » + à votre charge', fuego: 'texte feu' };

  // ---------- onglet Gammes ----------
  function afficherGammes() {
    const p = $('#p-gammes'); p.innerHTML = '';
    p.appendChild(h('p', { class: 'note' }, 'Une série par ligne. Les gammes marquées d’une règle sont utilisées par l’application : vous pouvez les renommer, mais évitez de les supprimer.'));
    cfg.gammes.forEach((g, i) => {
      p.appendChild(h('div', { class: 'carte-admin' },
        h('div', { class: 'rangee' },
          h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Nom de la gamme'), texte(g.nom, v => { g.nom = v; })),
          SPECIALES[g.id] ? h('span', { class: 'etiquette' }, 'Règle : ' + SPECIALES[g.id]) : null,
          h('span', { class: 'id' }, 'id : ' + g.id),
          h('span', { class: 'espace' }),
          h('button', { type: 'button', class: 'btn petit', title: 'Monter', onclick: () => deplacer(cfg.gammes, i, -1, afficherGammes) }, '↑'),
          h('button', { type: 'button', class: 'btn petit', title: 'Descendre', onclick: () => deplacer(cfg.gammes, i, 1, afficherGammes) }, '↓'),
          h('button', { type: 'button', class: 'btn petit danger', onclick: () => {
            const msg = SPECIALES[g.id] ? 'Cette gamme porte une règle (' + SPECIALES[g.id] + '). Supprimer « ' + g.nom + ' » quand même ?' : 'Supprimer la gamme « ' + g.nom + ' » ?';
            if (confirm(msg)) { cfg.gammes.splice(i, 1); afficherGammes(); majEtat(); }
          } }, 'Supprimer')),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Séries (une par ligne)'), zoneListe(g.series, v => { g.series = v; }))));
    });
    p.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => {
      const nom = prompt('Nom de la nouvelle gamme :');
      if (!nom || !nom.trim()) return;
      cfg.gammes.push({ id: slug(nom), nom: nom.trim(), series: [] });
      afficherGammes(); majEtat();
    } }, '+ Ajouter une gamme'));
    p.appendChild(h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Séries non écrites dans le titre du commentaire (une par ligne)'),
      zoneListe(cfg.seriesMasqueesDansTitre || [], v => { cfg.seriesMasqueesDansTitre = v; }, 2)));
  }
  function deplacer(tab, i, d, rafraichir) {
    const j = i + d; if (j < 0 || j >= tab.length) return;
    [tab[i], tab[j]] = [tab[j], tab[i]]; rafraichir(); majEtat();
  }

  // ---------- onglet Conditions et types ----------
  function afficherConditions() {
    const p = $('#p-conditions'); p.innerHTML = '';
    p.appendChild(h('h3', {}, 'Conditions'));
    p.appendChild(h('p', { class: 'note' }, 'Niveaux : un par ligne. Les codes (FB, RC, E, EI) sont fixes car utilisés par les règles.'));
    cfg.conditions.forEach(c => p.appendChild(h('div', { class: 'carte-admin' },
      h('div', { class: 'rangee' }, h('span', { class: 'code' }, c.id),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Libellé'), texte(c.nom, v => { c.nom = v; }))),
      h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Niveaux'), zoneListe(c.niveaux, v => { c.niveaux = v; }, 4)))));
    p.appendChild(h('h3', {}, "Types d'ouvrage"));
    p.appendChild(h('p', { class: 'note' }, 'Sous-options : une par ligne (laisser vide si aucune).'));
    cfg.types.forEach(t => p.appendChild(h('div', { class: 'carte-admin' },
      h('div', { class: 'rangee' }, h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Libellé'), texte(t.nom, v => { t.nom = v; })), h('span', { class: 'id' }, 'id : ' + t.id),
        caseA('Afficher dans le formulaire', !t.masque, v => { if (v) delete t.masque; else t.masque = true; })),
      h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Sous-options'), zoneListe(t.sousOptions || [], v => { t.sousOptions = v; }, 3)))));
  }

  // ---------- onglet Listes ----------
  function afficherListes() {
    const p = $('#p-listes'); p.innerHTML = '';
    p.appendChild(h('p', { class: 'note' }, 'Une valeur par ligne. Attention : « Rien » (anti-pince), « Encastrée » / « En applique » et les valeurs de push barre sont reconnues par le texte ; les renommer change leur effet.'));
    const grille = h('div', { class: 'grille-listes' });
    Object.entries(cfg.listes).forEach(([id, l]) => grille.appendChild(h('div', { class: 'carte-admin' },
      h('div', { class: 'champ' }, h('span', { class: 'lbl' }, l.libelle), zoneListe(l.valeurs, v => { l.valeurs = v; })))));
    p.appendChild(grille);

    // --- Cases à cocher en place ---
    casesEnPlace(p);

    // --- Listes déroulantes et cases à cocher ajoutées ---
    blocPerso(p, 'listesPerso', {
      titre: 'Listes déroulantes ajoutées',
      note: 'Chaque liste ajoutée apparaît dans le bloc choisi du formulaire. La valeur sélectionnée s’écrit dans la section choisie du commentaire, sous la forme « Libellé : valeur ».',
      mot: 'la liste', bouton: '+ Ajouter une liste déroulante',
      question: 'Libellé de la nouvelle liste déroulante (ex. Couleur, Poignée…) :', prefixe: 'perso-', valeurs: 'Valeurs (une par ligne)'
    });
    blocPerso(p, 'casesPerso', {
      titre: 'Cases à cocher ajoutées',
      note: 'Chaque groupe apparaît dans le bloc choisi du formulaire, avec une case par ligne. Les cases cochées s’écrivent dans la section choisie : une puce par case, ou une seule ligne « Libellé : a, b ».',
      mot: 'le groupe de cases', bouton: '+ Ajouter des cases à cocher',
      question: 'Libellé du nouveau groupe de cases à cocher (ex. Options, Accessoires…) :', prefixe: 'cases-', valeurs: 'Cases (une par ligne)', format: true
    });
  }

  function casesEnPlace(p) {
    cfg.cases = cfg.cases || {};
    p.appendChild(h('h3', {}, 'Cases à cocher en place'));
    p.appendChild(h('p', { class: 'note' }, 'Libellé = ce qui s’affiche dans le formulaire. Texte = ce qui s’écrit dans le commentaire quand la case est cochée. ' +
      'Décochez « Afficher » pour retirer une case du formulaire : elle n’apparaîtra plus dans le commentaire. Les types d’ouvrage se règlent dans l’onglet « Conditions et types », les cases « À la charge du métallier » dans la liste ci-dessus.'));
    const parBloc = {};
    window.Regles.CASES.forEach(c => { (parBloc[c.bloc] = parBloc[c.bloc] || []).push(c); });
    Object.keys(parBloc).sort((a, b) => a - b).forEach(b => {
      const tableau = h('div', { class: 'cases-place' },
        h('div', { class: 'cp-entete' }, h('span', {}, 'Libellé (formulaire)'), h('span', {}, 'Texte (commentaire)'), h('span', {}, 'Afficher')));
      parBloc[b].forEach(c => {
        const reg = () => (cfg.cases[c.cle] = cfg.cases[c.cle] || {});
        const actuel = cfg.cases[c.cle] || {};
        const sansTexte = c.texte === '';
        tableau.appendChild(h('div', { class: 'cp-ligne' + (actuel.visible === false ? ' masquee' : '') },
          h('div', { class: 'champ' },
            texte(actuel.libelle || c.libelle, v => { reg().libelle = v; }, { 'aria-label': 'Libellé ' + c.libelle }),
            c.aide ? h('span', { class: 'unite' }, c.aide) : null),
          sansTexte ? h('span', { class: 'unite' }, '— (pas de texte)') :
            texte(actuel.texte != null ? actuel.texte : c.texte, v => { reg().texte = v; }, { 'aria-label': 'Texte ' + c.libelle }),
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: actuel.visible !== false, 'aria-label': 'Afficher ' + c.libelle,
            onchange: e => { reg().visible = e.target.checked; e.target.closest('.cp-ligne').classList.toggle('masquee', !e.target.checked); majEtat(); } }))));
      });
      p.appendChild(h('div', { class: 'carte-admin' }, h('strong', {}, 'Bloc ' + b + ' — ' + BLOCS[b - 1]), tableau));
    });
  }

  function blocPerso(p, cle, o) {
    const tab = cfg[cle] = cfg[cle] || [];
    p.appendChild(h('h3', {}, o.titre));
    p.appendChild(h('p', { class: 'note' }, o.note));
    tab.forEach((l, i) => p.appendChild(h('div', { class: 'carte-admin' },
      h('div', { class: 'rangee' },
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Libellé'), texte(l.libelle, v => { l.libelle = v; })),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Placée dans le bloc'),
          h('select', { onchange: e => { l.bloc = Number(e.target.value); majEtat(); } },
            BLOCS.map((nom, k) => h('option', { value: String(k + 1), selected: Number(l.bloc) === k + 1 ? 'selected' : null }, (k + 1) + ' — ' + nom)))),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Écrite dans la section'),
          h('select', { onchange: e => { l.section = e.target.value; majEtat(); } },
            SECTIONS_PERSO.map(([v, nom]) => h('option', { value: v, selected: l.section === v ? 'selected' : null }, nom)))),
        o.format ? h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Écriture'),
          h('select', { onchange: e => { l.format = e.target.value; majEtat(); } },
            [['puces', 'Une puce par case cochée'], ['ligne', 'Une ligne « Libellé : a, b »']].map(([v, nom]) =>
              h('option', { value: v, selected: (l.format || 'puces') === v ? 'selected' : null }, nom)))) : null,
        h('span', { class: 'espace' }),
        h('button', { type: 'button', class: 'btn petit', title: 'Monter', onclick: () => deplacer(tab, i, -1, afficherListes) }, '↑'),
        h('button', { type: 'button', class: 'btn petit', title: 'Descendre', onclick: () => deplacer(tab, i, 1, afficherListes) }, '↓'),
        h('button', { type: 'button', class: 'btn petit danger', onclick: () => {
          if (confirm('Supprimer ' + o.mot + ' « ' + l.libelle + ' » ?')) { tab.splice(i, 1); afficherListes(); majEtat(); }
        } }, 'Supprimer')),
      h('div', { class: 'champ' }, h('span', { class: 'lbl' }, o.valeurs), zoneListe(l.valeurs, v => { l.valeurs = v; })))));
    p.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => {
      const nom = prompt(o.question);
      if (!nom || !nom.trim()) return;
      const base = o.prefixe + (nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'liste');
      let id = base, n = 2;
      while (tab.some(x => x.id === id)) id = base + '-' + n++;
      const nouveau = { id, libelle: nom.trim(), bloc: 5, section: 'configurations', valeurs: [] };
      if (o.format) nouveau.format = 'puces';
      tab.push(nouveau);
      afficherListes(); majEtat();
      const carte = [...p.querySelectorAll('.carte-admin')].find(c => c.querySelector('input') && c.querySelector('input').value === nouveau.libelle);
      if (carte) carte.querySelector('textarea').focus();
    } }, o.bouton));
  }
  const BLOCS = ['Gamme et série', 'Conditions', "Type d'ouvrage", 'Environnement', 'Configuration', 'Remplissage', 'Ferrage',
    'Quincaillerie — vantail principal', 'Quincaillerie — vantail secondaire', 'À la charge du métallier', 'Avis de chantier'];
  const SECTIONS_PERSO = [
    ['configurations', 'Configurations'],
    ['inclus', "Inclus dans l'offre"],
    ['vp', "Inclus dans l'offre → Vantail principal"],
    ['vs', "Inclus dans l'offre → Vantail secondaire"],
    ['horsGamme', 'Hors gamme Forster'],
    ['charge', 'À la charge du métallier'],
    ['propre', 'Sa propre section (titre = libellé)']
  ];

  // ---------- onglet Textes ----------
  const EMPLACEMENTS = [
    ['conditions', 'Section « Conditions »'],
    ['configurations-debut', 'Section « Configurations » (en tête)'],
    ['configurations', 'Section « Configurations »'],
    ['inclus', "Section « Inclus dans l'offre »"],
    ['fin', "Fin du commentaire (avant l'avis de chantier)"]
  ];
  function elementsPossibles() {
    return cfg.types.map(t => [t.id, t.nom]).concat([['imposte', 'Imposte (environnement)']]);
  }
  function afficherTextes() {
    const p = $('#p-textes'); p.innerHTML = '';
    p.appendChild(h('p', { class: 'note' }, 'Mise en forme : une ligne commençant par « - » devient une puce ; deux espaces avant le « - » = un niveau de retrait. **texte** = gras. ' +
      'Un texte s’affiche si TOUTES les familles de déclencheurs cochées sont remplies (gamme, conditions, éléments). Aucune case cochée dans une famille = pas de contrainte.'));
    txt.textes.forEach((t, i) => p.appendChild(carteTexte(t, i)));
    p.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => {
      txt.textes.push({ id: 'texte-' + Date.now(), titre: 'Nouveau texte', emplacement: 'conditions', gammes: [], gammesExclues: [], conditions: {}, elements: [], gras: false, texte: '- ' });
      afficherTextes(); majEtat();
      p.querySelector('.carte-admin:last-of-type details').open = true;
    } }, '+ Ajouter un texte'));
  }
  function cases(liste, options, nom) {
    return h('div', { class: 'groupe' }, options.map(([v, l]) => caseA(l, liste.includes(v), c => {
      const k = liste.indexOf(v);
      if (c && k < 0) liste.push(v); else if (!c && k >= 0) liste.splice(k, 1);
    })));
  }
  function carteTexte(t, i) {
    t.gammes = t.gammes || []; t.gammesExclues = t.gammesExclues || []; t.conditions = t.conditions || {}; t.elements = t.elements || [];
    const gammes = cfg.gammes.map(g => [g.id, g.nom]);
    const resume = h('span', { class: 'resume-texte' }, resumeTexte(t));
    const maj = () => { resume.textContent = resumeTexte(t); };
    const conds = h('div', { class: 'conds' }, cfg.conditions.map(c => {
      const actif = Object.prototype.hasOwnProperty.call(t.conditions, c.id);
      const niveaux = h('div', { class: 'groupe niveaux' + (actif ? '' : ' inactif') }, c.niveaux.map(n => caseA(c.id + n, actif && t.conditions[c.id].includes(n), coche => {
        const l = t.conditions[c.id] || (t.conditions[c.id] = []);
        const k = l.indexOf(n);
        if (coche && k < 0) l.push(n); else if (!coche && k >= 0) l.splice(k, 1);
        maj();
      })));
      return h('div', { class: 'cond-ligne' },
        caseA(c.id + ' (au moins un niveau)', actif, coche => {
          if (coche) t.conditions[c.id] = []; else delete t.conditions[c.id];
          niveaux.classList.toggle('inactif', !coche);
          niveaux.querySelectorAll('input').forEach(x => { x.checked = false; });
          maj();
        }),
        niveaux);
    }));
    return h('div', { class: 'carte-admin' }, h('details', {},
      h('summary', {}, h('strong', {}, t.titre || '(sans titre)'), ' ', resume),
      h('div', { class: 'details-texte' },
        h('div', { class: 'rangee' },
          h('div', { class: 'champ large' }, h('span', { class: 'lbl' }, 'Titre (affiché en gras si plusieurs textes se suivent)'), texte(t.titre, v => { t.titre = v; })),
          h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Emplacement'),
            h('select', { onchange: e => { t.emplacement = e.target.value; majEtat(); maj(); } },
              EMPLACEMENTS.map(([v, l]) => h('option', { value: v, selected: t.emplacement === v ? 'selected' : null }, l))))),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Gammes concernées (aucune = toutes)'), cases(t.gammes, gammes)),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Sauf pour les gammes'), cases(t.gammesExclues, gammes)),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Conditions (au moins une doit être remplie ; aucun niveau coché = tous les niveaux)'), conds),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Éléments présents (au moins un ; aucun = toujours)'), cases(t.elements, elementsPossibles())),
        caseA('Tout le texte en gras', t.gras, v => { t.gras = v; }),
        h('div', { class: 'champ' }, h('span', { class: 'lbl' }, 'Texte'),
          h('textarea', { class: 'texte-long', rows: String(Math.min(22, Math.max(4, t.texte.split('\n').length + 1))), value: t.texte, oninput: e => { t.texte = e.target.value; majEtat(); } })),
        h('div', { class: 'rangee' }, h('span', { class: 'espace' }),
          h('button', { type: 'button', class: 'btn petit danger', onclick: () => {
            if (confirm('Supprimer le texte « ' + t.titre + ' » ?')) { txt.textes.splice(i, 1); afficherTextes(); majEtat(); }
          } }, 'Supprimer ce texte')))));
  }
  function resumeTexte(t) {
    const nomG = id => (cfg.gammes.find(g => g.id === id) || { nom: id }).nom;
    const parts = [];
    if (t.gammes.length) parts.push(t.gammes.map(nomG).join('/'));
    if (t.gammesExclues.length) parts.push('sauf ' + t.gammesExclues.map(nomG).join('/'));
    const c = Object.entries(t.conditions).map(([id, n]) => n.length ? n.map(x => id + x).join('/') : id);
    if (c.length) parts.push(c.join(' ou '));
    if (t.elements.length) parts.push(t.elements.join('/'));
    const emp = (EMPLACEMENTS.find(e => e[0] === t.emplacement) || ['', ''])[1];
    return '— ' + (parts.join(' + ') || 'toujours') + ' → ' + emp;
  }

  function toutAfficher() {
    afficherGammes(); afficherConditions(); afficherListes(); afficherTextes(); majEtat();
  }

  // ---------- enregistrement ----------
  function verifier() {
    if (cfg.gammes.some(g => !g.nom.trim())) return 'Une gamme n’a pas de nom.';
    if (cfg.conditions.some(c => !c.niveaux.length)) return 'Chaque condition doit avoir au moins un niveau.';
    if (txt.textes.some(t => !t.titre.trim())) return 'Un texte automatique n’a pas de titre.';
    if ((cfg.listesPerso || []).some(l => !l.libelle.trim())) return 'Une liste ajoutée n’a pas de libellé.';
    if ((cfg.casesPerso || []).some(c => !c.libelle.trim())) return 'Un groupe de cases ajouté n’a pas de libellé.';
    return '';
  }
  async function enregistrer() {
    const pb = verifier();
    if (pb) { toast(pb, true); return; }
    if (!modifie()) { toast('Rien à enregistrer'); return; }
    const btn = $('#btn-enregistrer');
    btn.disabled = true; btn.textContent = 'Enregistrement…';
    try {
      for (const [nom, obj] of [['config', cfg], ['textes', txt]]) {
        if (JSON.stringify(obj) === origine[nom]) continue;
        const actuel = await lireFichier(nom);
        if (actuel.sha !== sha[nom]) throw Object.assign(new Error(nom + '.json a été modifié par quelqu’un d’autre depuis l’ouverture. Rechargez la page pour repartir de la dernière version.'), { status: 0 });
        obj.version = (actuel.json.version || 0) + 1;
        sha[nom] = await ecrireFichier(nom, obj, actuel.sha);
        origine[nom] = JSON.stringify(obj);
        window.Donnees.memoriserLocal(nom, obj); // visible tout de suite dans ce navigateur
      }
      majEtat();
      toast('Enregistré. Visible tout de suite ici, et pour tous d’ici une minute environ.');
    } catch (e) {
      toast(e.status === 0 ? e.message : messageErreur(e), true);
    } finally {
      btn.disabled = false; btn.textContent = 'Enregistrer';
    }
  }

  function telecharger(nom, obj) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2) + '\n'], { type: 'application/json' }));
    a.download = nom + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  let minuteur;
  function toast(msg, erreur) {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('erreur', !!erreur); t.classList.add('visible');
    clearTimeout(minuteur); minuteur = setTimeout(() => t.classList.remove('visible'), erreur ? 6000 : 3500);
  }

  // ---------- démarrage ----------
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const d = JSON.parse(lireStock(CLE_DEPOT) || 'null');
      if (d) { $('#depot').value = d.depot; $('#branche').value = d.branche; }
    } catch (e) { /* rien */ }
    const cleLocale = lireStock(CLE_JETON), cleSession = lireStock(CLE_JETON, true);
    if (cleLocale || cleSession) { $('#cle').value = cleLocale || cleSession; $('#memoriser').checked = !!cleLocale; }

    $('#btn-connexion').addEventListener('click', connecter);
    $('#cle').addEventListener('keydown', e => { if (e.key === 'Enter') connecter(); });
    $('#lien-aide').addEventListener('click', e => { e.preventDefault(); $('#aide-cle').hidden = !$('#aide-cle').hidden; });
    $('#btn-enregistrer').addEventListener('click', enregistrer);
    $('#btn-deconnexion').addEventListener('click', deconnecter);
    $('#dl-config').addEventListener('click', e => { e.preventDefault(); telecharger('config', cfg); });
    $('#dl-textes').addEventListener('click', e => { e.preventDefault(); telecharger('textes', txt); });
    document.querySelectorAll('[data-onglet]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-onglet]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      document.querySelectorAll('.panneau').forEach(pn => { pn.hidden = pn.id !== 'p-' + b.dataset.onglet; });
    }));
    window.addEventListener('beforeunload', e => { if (modifie()) { e.preventDefault(); e.returnValue = ''; } });
    if ($('#cle').value) connecter();
  });
})();
