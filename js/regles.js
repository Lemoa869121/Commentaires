/* Règles métier : qui est visible, qui est actif.
   Le formulaire (affichage/masquage) ET le générateur (texte) utilisent
   exactement ces fonctions, pour que « masqué » veuille toujours dire
   « absent du texte ». */
(function () {
  'use strict';

  // Types qui ont un ouvrant (tout sauf Fixe, Mur rideau, Verrière).
  const OUVRANTS = ['fenetre', 'soufflet', 'projection', 'porte', 'coulissant', 'repliable', 'pivot'];

  // Cases à cocher « en place » : libellé du formulaire, texte du commentaire,
  // et chemins de l'état concernés (pour pouvoir les masquer depuis le panneau).
  const CASES = [
    // bloc, clé, libellé formulaire, texte commentaire, chemins
    [4, 'env.imposte', 'Imposte', 'Imposte', ['env.imposte.on']],
    [4, 'env.fixe', 'Fixe', 'Fixe', ['env.fixe.on']],
    [4, 'env.murRideau', 'Dans un mur rideau', 'dans un mur rideau', ['env.murRideau.on']],
    [4, 'env.structure', 'Sur structure', 'sur structure', ['env.structure.on']],
    [6, 'remp.ensemble', "Un seul remplissage pour l'ensemble du châssis", '', ['remp.ensemble']],
    [6, 'remp.vitrage', 'Vitrage', 'Vitrage', ['remp.*.vitrage.on']],
    [6, 'remp.panneau', 'Panneau', 'Panneau', ['remp.*.panneau.on']],
    [6, 'remp.aConfirmer', 'à confirmer', 'par défaut à confirmer avec le verrier', ['remp.aConfirmer']],
    [6, 'remp.selonPV', 'à valider selon le PV', 'composition à valider suivant le PV', ['remp.selonPV']],
    [8, 'vp.serrure', 'Serrure', 'Serrure', ['vp.serrure.on']],
    [8, 'vp.fermePorte', 'Ferme-porte', 'Ferme-porte', ['vp.fermePorte.on']],
    [8, 'vp.bequille', 'Béquille', 'Béquille', ['vp.bequille.on']],
    [8, 'vp.baton', 'Bâton de maréchal', 'Bâton de maréchal', ['vp.baton.on']],
    [8, 'vp.push', 'Push barre', 'Push barre', ['vp.push.on']],
    [8, 'vp.rosaces', 'Rosaces', 'Rosaces', ['vp.rosaces.on']],
    [8, 'vp.pions', 'Pions anti-dégondage', 'Pions anti-dégondage', ['vp.pions.on']],
    [8, 'vp.goujons', 'Goujons thermiques', 'Goujons thermiques', ['vp.goujons.on']],
    [8, 'vp.profil', 'Profil préentaillé', 'Profil préentaillé', ['vp.profil.on']],
    [8, 'vp.profil.serrure', 'Serrure', 'serrure', ['vp.profil.serrure'], 'profil préentaillé'],
    [8, 'vp.profil.fermePorte', 'Ferme-porte', 'ferme-porte', ['vp.profil.fermePorte'], 'profil préentaillé'],
    [8, 'vp.ventouses', 'Ventouses', 'Ventouses', ['vp.ventouses.on']],
    [8, 'cote.int', 'Intérieur', 'intérieur', ['vp.bequille.int', 'vp.baton.int', 'vp.rosaces.int', 'vs.rosaces.int'], 'béquille, bâton, rosaces'],
    [8, 'cote.ext', 'Extérieur', 'extérieur', ['vp.bequille.ext', 'vp.baton.ext', 'vp.rosaces.ext', 'vs.rosaces.ext'], 'béquille, bâton, rosaces'],
    [8, 'rosace.securite', 'Sécurité', 'sécurité', ['vp.rosaces.securite', 'vs.rosaces.securite'], 'rosaces'],
    [9, 'vs.rosaces', 'Rosaces', 'Rosaces', ['vs.rosaces.on']],
    [9, 'vs.cremone', 'Crémone', 'Crémone', ['vs.cremone.on']],
    [9, 'vs.cremone.auto', 'Automatique', 'automatique', ['vs.cremone.auto'], 'crémone'],
    [9, 'vs.cremone.antipanique', 'Antipanique', 'antipanique', ['vs.cremone.antipanique'], 'crémone'],
    [9, 'vs.verrou', 'Verrouillage fin', 'Verrouillage fin', ['vs.verrou.on']],
    [9, 'haut', 'Haut', 'haut', ['vs.cremone.haut', 'vs.verrou.haut'], 'crémone à bascule, verrouillage fin'],
    [9, 'bas', 'Bas', 'bas', ['vs.cremone.bas', 'vs.verrou.bas'], 'crémone à bascule, verrouillage fin'],
    [9, 'vs.gache', 'Gâche électrique', 'Gâche électrique', ['vs.gache.on']],
    [9, 'vs.fermePorte', 'Ferme-porte', 'Ferme-porte', ['vs.fermePorte.on']],
    [11, 'avis.on', 'Ajouter un avis de chantier', '', ['avis.on']],
    [11, 'avis.cintrage', 'Cintrage', 'Cintrage', ['avis.cintrage']],
    [11, 'avis.serrure', 'Serrure', 'Serrure', ['avis.serrure']]
  ].map(([bloc, cle, libelle, texte, chemins, aide]) => ({ bloc, cle, libelle, texte, chemins, aide: aide || '' }));
  const PAR_CLE = {};
  CASES.forEach(c => { PAR_CLE[c.cle] = c; });

  function reglage(cfg, cle) {
    const def = PAR_CLE[cle] || { libelle: cle, texte: cle };
    const o = (cfg && cfg.cases && cfg.cases[cle]) || {};
    return {
      libelle: o.libelle != null && String(o.libelle).trim() ? o.libelle : def.libelle,
      texte: o.texte != null ? o.texte : def.texte,
      visible: o.visible !== false
    };
  }

  // Met à « non coché » les chemins d'une case masquée (sans toucher à la saisie).
  function decocher(obj, morceaux) {
    if (!obj || typeof obj !== 'object') return;
    const [k, ...reste] = morceaux;
    const cles = k === '*' ? Object.keys(obj) : [k];
    cles.forEach(c => {
      if (!(c in obj)) return;
      if (!reste.length) { if (typeof obj[c] === 'boolean') obj[c] = false; }
      else decocher(obj[c], reste);
    });
  }

  const R = {
    OUVRANTS,
    CASES,
    caseLibelle: (cfg, cle) => reglage(cfg, cle).libelle,
    caseTexte: (cfg, cle) => reglage(cfg, cle).texte,
    caseVisible: (cfg, cle) => reglage(cfg, cle).visible,

    // Copie de l'état où les cases masquées (et types masqués) comptent comme non cochées.
    appliquerMasques(s, cfg) {
      const c = JSON.parse(JSON.stringify(s));
      CASES.forEach(x => { if (!reglage(cfg, x.cle).visible) x.chemins.forEach(ch => decocher(c, ch.split('.'))); });
      (cfg.types || []).forEach(t => { if (t.masque && c.types[t.id]) c.types[t.id].on = false; });
      return c;
    },

    gamme(s, cfg) {
      return cfg.gammes.find(g => g.id === s.gamme) || null;
    },

    serieValide(s, cfg) {
      const g = R.gamme(s, cfg);
      return g && g.series.includes(s.serie) ? s.serie : '';
    },

    condCochee(s, id) {
      return !!(s.cond[id] && s.cond[id].on);
    },

    niveaux(s, id, cfg) {
      if (!R.condCochee(s, id)) return [];
      const c = cfg.conditions.find(x => x.id === id);
      const ordre = c ? c.niveaux : [];
      return s.cond[id].niveaux.filter(n => ordre.includes(n))
        .sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));
    },

    condActive(s, id, cfg) {
      return R.niveaux(s, id, cfg).length > 0;
    },

    ei120(s, cfg) {
      return R.niveaux(s, 'EI', cfg).includes('120');
    },

    feu(s, cfg) {
      return R.condActive(s, 'E', cfg) || R.condActive(s, 'EI', cfg);
    },

    essai(s, cfg) {
      return R.condActive(s, 'FB', cfg) || R.condActive(s, 'RC', cfg);
    },

    // Un type compte s'il est coché et non bloqué par EI120.
    typeActif(s, id, cfg) {
      if (!s.types[id] || !s.types[id].on) return false;
      if (id !== 'fixe' && R.ei120(s, cfg)) return false;
      return true;
    },

    typesActifs(s, cfg) {
      return cfg.types.filter(t => R.typeActif(s, t.id, cfg));
    },

    ouvrant(s, cfg) {
      return OUVRANTS.some(id => R.typeActif(s, id, cfg));
    },

    vario(s) { return s.gamme === 'vario'; },
    light(s) { return s.gamme === 'light'; },

    vantauxVisible(s, cfg) {
      return R.typeActif(s, 'fenetre', cfg) || R.typeActif(s, 'porte', cfg);
    },

    repliable(s, cfg) { return R.typeActif(s, 'repliable', cfg); },

    // Paumelles, anti-pince : tout ouvrant, sauf Thermfix Vario.
    ferrageVisible(s, cfg) {
      return R.ouvrant(s, cfg) && !R.vario(s);
    },

    quincFenetreVisible(s, cfg) {
      return (R.typeActif(s, 'fenetre', cfg) || R.typeActif(s, 'soufflet', cfg)) && !R.vario(s);
    },

    // Quincaillerie vantail principal : Porte, Fenêtre ou Soufflet ;
    // jamais avec EI120 ni Thermfix Vario.
    quincVisible(s, cfg) {
      if (R.ei120(s, cfg) || R.vario(s)) return false;
      return ['porte', 'fenetre', 'soufflet'].some(id => R.typeActif(s, id, cfg));
    },

    vsVisible(s, cfg) {
      return R.quincVisible(s, cfg) && R.vantauxVisible(s, cfg) && s.vantaux === '2';
    },

    // Éléments physiques présents (servent aux remplissages et aux textes).
    elementPresent(s, el, cfg) {
      switch (el) {
        case 'fixe': return R.typeActif(s, 'fixe', cfg) || s.env.fixe.on;
        case 'imposte': return s.env.imposte.on;
        default: return R.typeActif(s, el, cfg);
      }
    },

    sectionsRemplissage(s, cfg) {
      if (s.remp.ensemble) return ['chassis'];
      return ['porte', 'fixe', 'imposte', 'murRideau'].filter(el => R.elementPresent(s, el, cfg));
    },

    typesPaumelles(s, cfg) {
      const base = cfg.listes.paumelles.valeurs.slice();
      return R.repliable(s, cfg) ? base.concat(cfg.listes.paumellesRepliable.valeurs) : base;
    },

    // Un texte de la bibliothèque s'applique-t-il ?
    texteApplicable(t, s, cfg) {
      if (t.gammes && t.gammes.length && !t.gammes.includes(s.gamme)) return false;
      if (t.gammesExclues && t.gammesExclues.includes(s.gamme)) return false;
      const conds = t.conditions || {};
      const ids = Object.keys(conds);
      if (ids.length) {
        const ok = ids.some(id => {
          const nv = R.niveaux(s, id, cfg);
          if (!nv.length) return false;
          return !conds[id].length || conds[id].some(n => nv.includes(n));
        });
        if (!ok) return false;
      }
      if (t.elements && t.elements.length && !t.elements.some(el => R.elementPresent(s, el, cfg))) return false;
      return true;
    }
  };

  window.Regles = R;
})();
