/* Construction du formulaire à partir de la configuration.
   Chaque champ porte data-path (chemin dans l'état) ; les zones
   conditionnelles portent data-when (nom d'une règle d'affichage). */
(function () {
  'use strict';
  const R = window.Regles;

  // ---------- accès à l'état par chemin « a.b.c » ----------
  function lire(obj, chemin) {
    return chemin.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function ecrire(obj, chemin, val) {
    const ks = chemin.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  }

  // ---------- fabrique DOM ----------
  function h(tag, attrs, ...enfants) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    enfants.flat(Infinity).forEach(e => {
      if (e === null || e === undefined || e === false) return;
      el.appendChild(typeof e === 'string' ? document.createTextNode(e) : e);
    });
    return el;
  }

  const opt = v => (typeof v === 'object' ? v : { v, l: v });

  function sel(chemin, valeurs, o = {}) {
    const s = h('select', { 'data-path': chemin, 'data-opts': o.dyn || null, 'aria-label': o.label || null });
    if (o.vide) s.dataset.vide = o.vide;
    remplirOptions(s, valeurs || []);
    return s;
  }
  function remplirOptions(s, valeurs) {
    s.innerHTML = '';
    s.appendChild(h('option', { value: '' }, valeurs.length ? (s.dataset.vide || '— choisir —') : '— aucune —'));
    valeurs.map(opt).forEach(o => s.appendChild(h('option', { value: o.v }, o.l)));
    s.disabled = !valeurs.length;
    s.dataset.sig = valeurs.map(o => opt(o).v).join('|');
  }
  function chk(chemin, libelle, o = {}) {
    return h('label', { class: 'chk' + (o.fort ? ' fort' : ''), 'data-type': o.type || null },
      h('input', { type: 'checkbox', 'data-path': chemin, 'data-val': o.val }), h('span', {}, libelle));
  }
  const multi = (chemin, val, libelle) => chk(chemin, libelle, { val });
  function txt(chemin, o = {}) {
    const i = h('input', {
      type: o.type || 'text', 'data-path': chemin, placeholder: o.ph || '',
      class: o.court ? 'court' : null, min: o.type === 'number' ? '0' : null, inputmode: o.type === 'number' ? 'numeric' : null,
      'aria-label': o.label || o.ph || null
    });
    return o.unite ? h('span', { class: 'avec-unite' }, i, h('span', { class: 'unite' }, o.unite)) : i;
  }
  function champ(libelle, ...ctrl) {
    return h('div', { class: 'champ' }, h('span', { class: 'lbl' }, libelle), ...ctrl);
  }
  function quand(regle, ...enfants) {
    return h('div', { class: 'cond', 'data-when': regle }, ...enfants);
  }
  function rangee(...enfants) { return h('div', { class: 'rangee' }, ...enfants); }
  function cols(a, b) { return h('div', { class: 'deux-col' }, h('div', {}, a), h('div', {}, b)); }
  function note(t, cls) { return h('p', { class: 'note ' + (cls || '') }, t); }
  function bloc(num, titre, ...corps) {
    return h('section', { class: 'bloc', id: 'bloc-' + num },
      h('h2', {}, h('span', { class: 'num' }, String(num)), titre),
      h('div', { class: 'corps' }, ...corps));
  }
  // Élément cochable avec ses détails, affichés seulement s'il est coché.
  function element(chemin, libelle, ...details) {
    return h('div', { class: 'element' },
      chk(chemin + '.on', libelle, { fort: true }),
      details.length ? quand('on:' + chemin, h('div', { class: 'details' }, ...details)) : null);
  }

  // ---------- règles d'affichage ----------
  const REGLES = {
    essaiCoche: s => R.condCochee(s, 'FB') || R.condCochee(s, 'RC'),
    feuCoche: s => R.condCochee(s, 'E') || R.condCochee(s, 'EI'),
    ei120: (s, c) => R.ei120(s, c),
    vantaux: (s, c) => R.vantauxVisible(s, c),
    repliable: (s, c) => R.repliable(s, c),
    light: s => R.light(s),
    ouvrant: (s, c) => R.ouvrant(s, c),
    vario: (s, c) => R.raccordVisible(s, c),
    zoneFI: s => R.zoneCochee(s, 'fi'),
    ferrage: (s, c) => R.ferrageVisible(s, c),
    pasFerrage: (s, c) => !R.ferrageVisible(s, c),
    quincFen: (s, c) => R.quincFenetreVisible(s, c),
    cremRep: (s, c) => R.repliable(s, c) && !R.vario(s),
    quinc: (s, c) => R.quincVisible(s, c),
    pasQuinc: (s, c) => !R.quincVisible(s, c),
    vs: (s, c) => R.vsVisible(s, c),
    pasVs: (s, c) => !R.vsVisible(s, c),
    rempAucun: (s, c) => !R.sectionsRemplissage(s, c).length,
    cremEnc: s => s.vs.cremone.type === 'Encastrée',
    cremApp: s => s.vs.cremone.type === 'En applique',
    seriesVides: (s, c) => { const g = R.gamme(s, c); return !!g && !g.series.length; }
  };
  ['chassis', 'porte', 'fixe', 'imposte', 'murRideau'].forEach(k => {
    REGLES['remp_' + k] = (s, c) => R.sectionsRemplissage(s, c).includes(k);
  });

  function evaluer(regle, s, cfg) {
    if (regle.startsWith('on:')) { const v = lire(s, regle.slice(3)); return !!(v && v.on); }
    if (regle.startsWith('type:')) return R.typeActif(s, regle.slice(5), cfg);
    if (regle.startsWith('cond:')) return R.condCochee(s, regle.slice(5));
    const f = REGLES[regle];
    return f ? !!f(s, cfg) : true;
  }

  const LISTES_DYN = {
    series: (s, c) => { const g = R.gamme(s, c); return g ? g.series : []; },
    paumelles: (s, c) => R.typesPaumelles(s, c)
  };

  // ---------- construction ----------
  function construire(racine, cfg) {
    const L = id => (cfg.listes[id] ? cfg.listes[id].valeurs : []);
    // Cases « en place » : libellé et affichage réglables depuis le panneau de contrôle.
    const C = cle => R.caseLibelle(cfg, cle);
    const vis = cle => R.caseVisible(cfg, cle);
    const ck = (cle, chemin, o) => (vis(cle) ? chk(chemin, C(cle), o) : null);
    const el = (cle, ...details) => (vis(cle) ? element(cle, C(cle), ...details) : null);
    // Gamme, degré feu et N° PV propres au Fixe / Imposte (fi) ou au Mur rideau (mr).
    const zone = (cle, titre) => h('div', { class: 'sous-bloc' },
      h('h3', {}, titre + ' — si différent de l’ouvrage'),
      rangee(
        champ('Gamme', sel('env.' + cle + '.gamme', cfg.gammes.map(g => ({ v: g.id, l: g.nom })), { label: 'Gamme ' + titre, vide: '— même gamme —' })),
        champ('Degré feu', sel('env.' + cle + '.degre', R.degresFeu(cfg), { label: 'Degré feu ' + titre, vide: '— aucun —' })),
        champ('N° PV', txt('env.' + cle + '.pv', { ph: 'ex. EFR-…', label: 'N° PV ' + titre }))));
    const avert = () => quand('ei120', h('div', { class: 'alerte', role: 'alert' },
      h('strong', {}, 'EI 120 sélectionné : '), 'seul le type « Fixe » est possible. Les autres types sont grisés et ne figurent pas dans le commentaire.'));

    const condition = c => h('div', { class: 'condition' },
      chk('cond.' + c.id + '.on', c.nom, { fort: true }),
      quand('cond:' + c.id, h('div', { class: 'puces-niveaux' },
        c.niveaux.map(n => multi('cond.' + c.id + '.niveaux', n, c.id + ' ' + n)))));
    const moitie = Math.ceil(cfg.conditions.length / 2);

    const remplissage = (k, titre) => quand('remp_' + k, h('div', { class: 'sous-bloc' },
      h('h3', {}, titre),
      rangee(
        h('div', { class: 'groupe' }, ck('remp.vitrage', 'remp.' + k + '.vitrage.on'),
          quand('on:remp.' + k + '.vitrage', txt('remp.' + k + '.vitrage.ep', { type: 'number', court: true, unite: 'mm', label: 'Épaisseur vitrage' }))),
        h('div', { class: 'groupe' }, ck('remp.panneau', 'remp.' + k + '.panneau.on'),
          quand('on:remp.' + k + '.panneau', txt('remp.' + k + '.panneau.ep', { type: 'number', court: true, unite: 'mm', label: 'Épaisseur panneau' })))
      )));

    const cotesFinition = (base, avecSecurite) => [
      rangee(ck('cote.int', base + '.int'), ck('cote.ext', base + '.ext'),
        sel(base + '.finition', L('finition'), { label: 'Finition' }),
        avecSecurite ? ck('rosace.securite', base + '.securite') : null)
    ];
    const fermePorte = base => rangee(
      sel(base + '.type', L('fermePorteType'), { label: 'Pose du ferme-porte' }),
      sel(base + '.modele', L('fermePorteModele'), { label: 'Modèle de ferme-porte' }));

    const formulaire = [
      bloc(1, 'Gamme et série',
        rangee(champ('Gamme', sel('gamme', cfg.gammes.map(g => ({ v: g.id, l: g.nom })), { label: 'Gamme' })),
          champ('Série', sel('serie', [], { dyn: 'series', label: 'Série' })))),

      bloc(2, 'Conditions',
        cols(cfg.conditions.slice(0, moitie).map(condition), cfg.conditions.slice(moitie).map(condition)),
        rangee(
          quand('essaiCoche', champ("N° rapport d'essai", txt('numRapport', { ph: 'ex. MD 21 00 28 A' }))),
          quand('feuCoche', champ('N° PV', txt('numPV', { ph: 'ex. EFR-…' })))),
        avert()),

      bloc(3, "Type d'ouvrage",
        avert(),
        h('div', { class: 'grille-types' }, cfg.types.filter(t => !t.masque).map(t => chk('types.' + t.id + '.on', t.nom, { type: t.id }))),
        cfg.types.filter(t => !t.masque && (t.sousOptions || []).length).map(t =>
          quand('type:' + t.id, h('div', { class: 'sous-bloc' }, champ(t.nom, sel('types.' + t.id + '.sous', t.sousOptions, { label: t.nom }))))),
        rangee(
          quand('vantaux', champ('Nombre de vantaux', sel('vantaux', ['1', '2'], { label: 'Nombre de vantaux' }))),
          quand('repliable', champ('Repliable — vantaux à gauche', txt('vantauxGauche', { type: 'number', court: true }))),
          quand('repliable', champ('Repliable — vantaux à droite', txt('vantauxDroite', { type: 'number', court: true }))))),

      bloc(4, 'Environnement',
        note('Plusieurs choix possibles (ex. Fixe + Imposte).'),
        h('div', { class: 'liste-env' },
          ck('env.imposte', 'env.imposte.on', { fort: true }),
          vis('env.fixe') && h('div', { class: 'groupe' }, chk('env.fixe.on', C('env.fixe'), { fort: true }),
            quand('on:env.fixe', sel('env.fixe.pos', L('environnementFixe'), { label: 'Position du fixe' }))),
          quand('zoneFI', zone('fi', 'Fixe / Imposte')),
          ck('env.murRideau', 'env.murRideau.on', { fort: true }),
          vis('env.murRideau') && quand('on:env.murRideau', zone('mr', 'Mur rideau')),
          vis('env.structure') && h('div', { class: 'groupe' }, chk('env.structure.on', C('env.structure'), { fort: true }),
            quand('on:env.structure', sel('env.structure.mat', L('structure'), { label: 'Structure' })),
            quand('light', quand('on:env.structure', h('span', { class: 'etiquette' }, '« à votre charge »')))))),

      bloc(5, 'Configuration',
        cols([
          champ('Seuil', sel('conf.seuil', L('seuil'))),
          champ('Pose', sel('conf.pose', L('pose'))),
          quand('ouvrant', champ('Ouverture', sel('conf.ouverture', L('ouverture')))),
          quand('ouvrant', champ("Sens d'ouverture", sel('conf.sens', L('sens'))))
        ], [
          champ('Parclose', sel('conf.parclose', L('parclose'))),
          champ('Joint', sel('conf.joint', L('joint'))),
          quand('vario', champ('Raccord de traverse', sel('conf.raccord', L('raccordTraverse'))))
        ])),

      bloc(6, 'Remplissage',
        ck('remp.ensemble', 'remp.ensemble'),
        remplissage('chassis', 'Ensemble du châssis'),
        remplissage('porte', 'Porte'),
        remplissage('fixe', 'Fixe'),
        remplissage('imposte', 'Imposte'),
        remplissage('murRideau', 'Mur rideau'),
        quand('rempAucun', note('Cochez Porte, Fixe ou Mur rideau (bloc 3), ou Fixe / Imposte (bloc 4), pour renseigner les remplissages.', 'vide')),
        note('Avec une condition E ou EI, « Panneau » devient « Panneau feu » dans le texte.'),
        rangee(ck('remp.aConfirmer', 'remp.aConfirmer'), ck('remp.selonPV', 'remp.selonPV'))),

      bloc(7, 'Ferrage',
        quand('ferrage',
          rangee(champ('Paumelles', sel('ferr.paumType', [], { dyn: 'paumelles', label: 'Type de paumelles' })),
            champ('Quantité par vantail', txt('ferr.paumQte', { type: 'number', court: true }))),
          champ('Anti-pince doigts', sel('ferr.antiPince', L('antiPince'))),
          quand('quincFen', champ('Quincaillerie fenêtre / soufflet', sel('ferr.quincFen', L('quincaillerieFenetre')))),
          quand('cremRep', rangee(champ('Crémone de repliable', sel('ferr.cremRepType', L('cremoneRepliable'))),
            champ('Quantité', txt('ferr.cremRepQte', { type: 'number', court: true }))))),
        quand('pasFerrage', note('Non applicable : cochez un type ouvrant (hors Thermfix Vario).', 'vide'))),

      bloc(8, 'Quincaillerie — vantail principal',
        quand('quinc',
          note('Cochez les éléments à inclure dans le texte.'),
          el('vp.serrure', rangee(
            sel('vp.serrure.points', L('serrurePoints').map(v => ({ v, l: v + (v === '1' ? ' point' : ' points') })), { label: 'Nombre de points' }),
            sel('vp.serrure.pene', L('serrurePene'), { label: 'Pêne' }),
            sel('vp.serrure.fonct', L('serrureFonctionnement'), { label: 'Fonctionnement' }),
            sel('vp.serrure.antipanique', L('antipanique').map(v => ({ v, l: 'Antipanique ' + v })), { label: 'Antipanique' }))),
          el('vp.fermePorte', fermePorte('vp.fermePorte'),
            champ('Précision (complète le choix)', txt('vp.fermePorte.precision', { ph: 'ex. avec bras à glissière, arrêt en ouverture…', label: 'Précision ferme-porte' }))),
          el('vp.bequille', ...cotesFinition('vp.bequille', false),
            rangee(champ('Hauteur', txt('vp.bequille.hauteur', { type: 'number', court: true, unite: 'mm' })),
              champ('Mesurée', sel('vp.bequille.hauteurRef', L('hauteurPoigneeRef'))))),
          el('vp.baton', rangee(ck('cote.int', 'vp.baton.int'), ck('cote.ext', 'vp.baton.ext'),
            h('span', { class: 'etiquette' }, '→ Hors gamme Forster'))),
          el('vp.push', sel('vp.push.mode', [{ v: 'inclus', l: "Inclus dans l'offre" }, { v: 'hors', l: 'Hors gamme Forster' }], { label: 'Push barre' })),
          el('vp.rosaces', ...cotesFinition('vp.rosaces', true)),
          el('vp.pions'),
          el('vp.goujons', sel('vp.goujons.nb', L('goujons'), { label: 'Nombre de goujons' })),
          el('vp.profil', rangee(ck('vp.profil.serrure', 'vp.profil.serrure'), ck('vp.profil.fermePorte', 'vp.profil.fermePorte'))),
          el('vp.ventouses', rangee(
            h('button', { type: 'button', class: 'btn petit', 'data-action': 'ventouses' }, 'Écrire…'),
            h('span', { class: 'resume', 'data-resume': 'vp.ventouses.texte' })))),
        quand('pasQuinc', note('Non applicable : visible avec Porte, Fenêtre ou Soufflet (hors EI 120 et Thermfix Vario).', 'vide'))),

      bloc(9, 'Quincaillerie — vantail secondaire',
        quand('vs',
          el('vs.rosaces', ...cotesFinition('vs.rosaces', true)),
          el('vs.cremone',
            sel('vs.cremone.type', ['Encastrée', 'En applique'], { label: 'Type de crémone' }),
            quand('cremEnc', rangee(h('span', { class: 'lbl-inline' }, 'À bascule :'), ck('haut', 'vs.cremone.haut'), ck('bas', 'vs.cremone.bas'))),
            rangee(ck('vs.cremone.auto', 'vs.cremone.auto'), ck('vs.cremone.antipanique', 'vs.cremone.antipanique')),
            quand('cremApp', h('span', { class: 'etiquette' }, '→ Hors gamme Forster'))),
          el('vs.verrou', rangee(ck('haut', 'vs.verrou.haut'), ck('bas', 'vs.verrou.bas'))),
          el('vs.gache'),
          el('vs.fermePorte', fermePorte('vs.fermePorte'),
            champ('Précision (complète le choix)', txt('vs.fermePorte.precision', { ph: 'ex. avec bras à glissière, arrêt en ouverture…', label: 'Précision ferme-porte' })))),
        quand('pasVs', note('Non applicable : visible quand la quincaillerie principale l\'est et que le nombre de vantaux est 2.', 'vide'))),

      bloc(10, 'À la charge du métallier',
        h('div', { class: 'grille-types' }, L('chargeMetallier').map(v => multi('charge', v, v)))),

      bloc(11, 'Avis de chantier',
        ck('avis.on', 'avis.on', { fort: true }),
        quand('on:avis',
          rangee(champ('Hauteur', txt('avis.hauteur', { type: 'number', court: true, unite: 'mm' })),
            champ('Largeur', txt('avis.largeur', { type: 'number', court: true, unite: 'mm' }))),
          rangee(ck('avis.cintrage', 'avis.cintrage'), ck('avis.serrure', 'avis.serrure')),
          champ('Texte libre (une ligne = une puce)', h('textarea', { 'data-path': 'avis.texte', rows: '5' }))))
    ];

    // Listes déroulantes ajoutées depuis le panneau de contrôle, placées dans le bloc choisi.
    (cfg.listesPerso || []).forEach(l => {
      const b = formulaire[(Number(l.bloc) || 5) - 1] || formulaire[4];
      b.querySelector('.corps').appendChild(champ(l.libelle, sel('perso.' + l.id, l.valeurs || [], { label: l.libelle })));
    });
    (cfg.casesPerso || []).forEach(c => {
      const b = formulaire[(Number(c.bloc) || 5) - 1] || formulaire[4];
      b.querySelector('.corps').appendChild(champ(c.libelle,
        h('div', { class: 'groupe' }, (c.valeurs || []).map(v => multi('cases.' + c.id, v, v)))));
    });

    racine.innerHTML = '';
    formulaire.forEach(b => racine.appendChild(b));
  }

  // ---------- état → écran ----------
  function synchroniser(racine, s, cfg) {
    actualiserListes(racine, s, cfg);
    racine.querySelectorAll('[data-path]').forEach(el => {
      const v = lire(s, el.dataset.path);
      if (el.type === 'checkbox') {
        el.checked = el.dataset.val !== undefined ? Array.isArray(v) && v.includes(el.dataset.val) : !!v;
      } else {
        el.value = v == null ? '' : v;
        if (el.tagName === 'SELECT' && el.value !== String(v || '')) el.value = '';
      }
    });
  }

  function actualiserListes(racine, s, cfg) {
    racine.querySelectorAll('select[data-opts]').forEach(sl => {
      const liste = (LISTES_DYN[sl.dataset.opts] || (() => []))(s, cfg);
      if (sl.dataset.sig !== liste.join('|')) {
        remplirOptions(sl, liste);
        const v = lire(s, sl.dataset.path);
        sl.value = liste.includes(v) ? v : ''; // la valeur reste dans l'état même si elle n'est plus proposée
      }
    });
  }

  function actualiser(racine, s, cfg) {
    actualiserListes(racine, s, cfg);
    racine.querySelectorAll('[data-when]').forEach(el => { el.hidden = !evaluer(el.dataset.when, s, cfg); });
    const bloque = R.ei120(s, cfg);
    racine.querySelectorAll('[data-type]').forEach(lbl => {
      const grise = bloque && lbl.dataset.type !== 'fixe';
      lbl.classList.toggle('grise', grise);
      lbl.querySelector('input').disabled = grise;
    });
    racine.querySelectorAll('[data-resume]').forEach(sp => {
      const t = String(lire(s, sp.dataset.resume) || '').trim();
      sp.textContent = t ? t.split(/\r?\n/)[0] + (t.includes('\n') ? ' …' : '') : '(aucun texte : « Ventouses » sera écrit)';
    });
  }

  window.Formulaire = { construire, synchroniser, actualiser, lire, ecrire };
})();
