/* Règles métier : qui est visible, qui est actif.
   Le formulaire (affichage/masquage) ET le générateur (texte) utilisent
   exactement ces fonctions, pour que « masqué » veuille toujours dire
   « absent du texte ». */
(function () {
  'use strict';

  // Types qui ont un ouvrant (tout sauf Fixe, Mur rideau, Verrière).
  const OUVRANTS = ['fenetre', 'soufflet', 'projection', 'porte', 'coulissant', 'repliable', 'pivot'];

  const R = {
    OUVRANTS,

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
