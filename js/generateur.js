/* Construction du commentaire à partir de l'état du formulaire.
   generer() produit un modèle neutre (titre, sections, lignes à puces),
   puis enHTML() / enTexte() le mettent en forme pour l'aperçu et la copie. */
(function () {
  'use strict';
  const R = window.Regles;

  const PUCES = ['-', 'o', '•', '▪'];

  // ---------- état vide ----------
  function remplissageVide() {
    return { vitrage: { on: false, ep: '' }, panneau: { on: false, ep: '' } };
  }
  function cotes() { return { on: false, int: false, ext: false }; }

  // Listes déroulantes ajoutées depuis le panneau de contrôle.
  function persoVide(cfg) {
    const o = {};
    (cfg.listesPerso || []).forEach(l => { o[l.id] = ''; });
    return o;
  }
  function lignesPerso(s, cfg, emplacement) {
    return (cfg.listesPerso || []).filter(l => l.section === emplacement).map(l => {
      const v = dans((s.perso || {})[l.id], l.valeurs || []);
      return v ? li(emplacement === 'propre' ? v : l.libelle + ' : ' + v) : null;
    }).filter(Boolean);
  }

  function etatInitial(cfg) {
    const cond = {};
    cfg.conditions.forEach(c => { cond[c.id] = { on: false, niveaux: [] }; });
    const types = {};
    cfg.types.forEach(t => { types[t.id] = { on: false, sous: '' }; });
    return {
      gamme: '', serie: '',
      cond, numRapport: '', numPV: '',
      types, vantaux: '', vantauxGauche: '', vantauxDroite: '',
      env: { imposte: { on: false }, fixe: { on: false, pos: '' }, murRideau: { on: false }, structure: { on: false, mat: '' } },
      conf: { seuil: '', pose: '', ouverture: '', sens: '', parclose: '', joint: '', raccord: '' },
      remp: {
        ensemble: false, chassis: remplissageVide(), porte: remplissageVide(), fixe: remplissageVide(),
        imposte: remplissageVide(), murRideau: remplissageVide(), aConfirmer: false, selonPV: false
      },
      ferr: { paumType: '', paumQte: '', antiPince: '', quincFen: '', cremRepType: '', cremRepQte: '' },
      vp: {
        serrure: { on: false, points: '', pene: '', fonct: '', antipanique: '' },
        fermePorte: { on: false, type: '', modele: '', precision: '' },
        bequille: Object.assign(cotes(), { finition: '', hauteur: '', hauteurRef: '' }),
        baton: cotes(),
        push: { on: false, mode: '' },
        rosaces: Object.assign(cotes(), { finition: '', securite: false }),
        pions: { on: false },
        goujons: { on: false, nb: '' },
        profil: { on: false, serrure: false, fermePorte: false },
        ventouses: { on: false, texte: '' }
      },
      vs: {
        rosaces: Object.assign(cotes(), { finition: '', securite: false }),
        cremone: { on: false, type: '', haut: false, bas: false, auto: false, antipanique: false },
        verrou: { on: false, haut: false, bas: false },
        gache: { on: false },
        fermePorte: { on: false, type: '', modele: '', precision: '' }
      },
      charge: [],
      perso: persoVide(cfg),
      avis: { on: false, hauteur: '', largeur: '', cintrage: false, serrure: false, texte: '' }
    };
  }

  // Fusionne une saisie sauvegardée dans un état neuf (les nouveaux champs gardent leur valeur par défaut).
  function fusionner(base, sauve) {
    if (!sauve || typeof sauve !== 'object') return base;
    Object.keys(base).forEach(k => {
      if (!(k in sauve)) return;
      const b = base[k], v = sauve[k];
      if (Array.isArray(b)) base[k] = Array.isArray(v) ? v.slice() : b;
      else if (b && typeof b === 'object') base[k] = fusionner(b, v);
      else if (typeof v === typeof b) base[k] = v;
    });
    // conserve aussi les clés inconnues de la base (ex. condition ajoutée puis retirée)
    return base;
  }

  // ---------- petites aides ----------
  const vide = v => v === undefined || v === null || String(v).trim() === '';
  const net = v => String(v || '').trim();
  // « Ouvrant à la française » → « ouvrant à la française », mais « FMF 150 », « 2D », « EPDM » restent intacts.
  function minus(v) {
    v = net(v);
    if (v.length > 1 && v[0] === v[0].toUpperCase() && v[1] === v[1].toLowerCase() && /[a-zà-ÿ]/.test(v[1])) {
      return v[0].toLowerCase() + v.slice(1);
    }
    return v;
  }
  const dans = (v, liste) => liste.includes(v) ? v : '';
  const L = (cfg, id) => (cfg.listes[id] ? cfg.listes[id].valeurs : []);
  const li = (t, niv = 0, gras = false) => ({ k: 'li', t, niv, gras });
  const p = (t, gras = false) => ({ k: 'p', t, gras });

  function cotesTexte(o) {
    return [o.int ? 'intérieur' : '', o.ext ? 'extérieur' : ''].filter(Boolean).join(' + ');
  }

  // Convertit un texte de bibliothèque (« - » / indentation de 2 espaces) en lignes.
  function lignesBibliotheque(texte, nivBase, gras) {
    const out = [];
    String(texte || '').split(/\r?\n/).forEach(l => {
      if (!l.trim()) return;
      const m = l.match(/^(\s*)[-•o]\s+(.*)$/);
      if (m) out.push(li(m[2].trim(), nivBase + Math.floor(m[1].replace(/\t/g, '  ').length / 2), gras));
      else out.push(p(l.trim(), gras));
    });
    return out;
  }

  function textesPour(emplacement, s, cfg, textes) {
    return (textes.textes || []).filter(t => t.emplacement === emplacement && R.texteApplicable(t, s, cfg));
  }

  // Ajoute des lignes en évitant les doublons exacts (ex. « Adhésif TESA ACX+ » porte + fixe).
  function ajouterSansDoublon(liste, lignes) {
    lignes.forEach(l => {
      if (!liste.some(x => x.k === l.k && x.t === l.t && x.niv === l.niv)) liste.push(l);
    });
  }

  // ---------- générateur ----------
  function generer(s, cfg, textes) {
    const g = R.gamme(s, cfg);
    const serie = R.serieValide(s, cfg);
    const types = R.typesActifs(s, cfg);
    const sections = [];
    const section = (titre, items) => { if (items.length) sections.push({ titre, items }); };

    const libType = t => {
      const sous = dans(s.types[t.id].sous, t.sousOptions || []);
      return t.nom + (sous ? ' ' + minus(sous) : '');
    };

    // --- Titre ---
    const tags = [];
    cfg.conditions.forEach(c => R.niveaux(s, c.id, cfg).forEach(n => tags.push(c.id + n)));
    const morceauxTitre = [];
    if (types.length) morceauxTitre.push(types.map(libType).join(' + '));
    if (g) morceauxTitre.push(g.nom);
    if (serie && !(cfg.seriesMasqueesDansTitre || []).includes(serie)) morceauxTitre.push(serie);
    if (tags.length) morceauxTitre.push(tags.join(' '));
    const titre = morceauxTitre.join(' ');

    // --- Type ---
    {
      const items = [];
      const nv = R.vantauxVisible(s, cfg) ? dans(s.vantaux, ['1', '2']) : '';
      const avec = [];
      if (s.env.fixe.on) {
        const pos = dans(s.env.fixe.pos, L(cfg, 'environnementFixe'));
        avec.push('Fixe' + (pos ? ' ' + minus(pos) : ''));
      }
      if (s.env.imposte.on) avec.push('Imposte');
      const suite = [];
      if (avec.length) suite.push('avec ' + avec.join(' + '));
      if (s.env.murRideau.on) suite.push('dans un mur rideau');
      if (s.env.structure.on) {
        const mat = dans(s.env.structure.mat, L(cfg, 'structure'));
        suite.push('sur structure' + (mat ? ' ' + minus(mat) : '') + (R.light(s) ? ' (à votre charge)' : ''));
      }
      if (types.length) {
        let l = 'Ensemble ' + types.map(libType).join(' + ');
        if (nv) l += ' ' + nv + (nv === '1' ? ' vantail' : ' vantaux');
        if (suite.length) l += ', ' + suite.join(', ');
        items.push(li(l));
      } else if (suite.length) {
        items.push(li('Environnement : ' + suite.join(', ')));
      }
      if (R.repliable(s, cfg)) {
        const parts = [];
        const nb = (v, cote) => net(v) + (Number(net(v)) > 1 ? ' vantaux ' : ' vantail ') + cote;
        if (!vide(s.vantauxGauche)) parts.push(nb(s.vantauxGauche, 'à gauche'));
        if (!vide(s.vantauxDroite)) parts.push(nb(s.vantauxDroite, 'à droite'));
        if (parts.length) items.push(li('Repliable : ' + parts.join(', ')));
      }
      section('Type :', items);
    }

    // --- Conditions (textes réglementaires) ---
    {
      const trouves = textesPour('conditions', s, cfg, textes);
      const items = [];
      trouves.forEach(t => {
        if (trouves.length > 1) items.push(p(t.titre + ' :', true));
        items.push(...lignesBibliotheque(t.texte, 0, t.gras));
      });
      section('Conditions :', items);
    }

    // --- Rapport d'essai / PV ---
    {
      const items = [];
      if (R.essai(s, cfg) && !vide(s.numRapport)) items.push(li("Rapport d'essai n° " + net(s.numRapport)));
      if (R.feu(s, cfg) && !vide(s.numPV)) items.push(li('PV n° ' + net(s.numPV)));
      section("Rapport d'essai / PV :", items);
    }

    // --- Configurations ---
    {
      const items = [];
      const c = s.conf;
      const v = (id, val) => dans(val, L(cfg, id));
      // Isolation : écrite automatiquement selon la gamme (textes « en tête de Configurations »).
      textesPour('configurations-debut', s, cfg, textes).forEach(t => ajouterSansDoublon(items, lignesBibliotheque(t.texte, 0, t.gras)));
      if (v('seuil', c.seuil)) items.push(li('Seuil : ' + c.seuil));
      if (v('pose', c.pose)) items.push(li('Pose : ' + c.pose));
      if (R.ouvrant(s, cfg)) {
        if (v('ouverture', c.ouverture)) items.push(li('Ouverture : ' + c.ouverture));
        if (v('sens', c.sens)) items.push(li('Sens : ' + c.sens));
      }
      if (v('parclose', c.parclose)) items.push(li('Parclose : ' + c.parclose));
      if (v('joint', c.joint)) items.push(li('Joints : ' + c.joint));
      if (R.vario(s) && v('raccordTraverse', c.raccord)) items.push(li('Raccord de traverse : ' + c.raccord));
      textesPour('configurations', s, cfg, textes).forEach(t => ajouterSansDoublon(items, lignesBibliotheque(t.texte, 0, t.gras)));
      items.push(...lignesPerso(s, cfg, 'configurations'));
      section('Configurations :', items);
    }

    // --- Remplissages ---
    {
      const items = [];
      const LIEU = {
        chassis: "pour l'ensemble du châssis", porte: 'dans la porte', fixe: 'dans le fixe',
        imposte: "dans l'imposte", murRideau: 'dans le mur rideau'
      };
      R.sectionsRemplissage(s, cfg).forEach(k => {
        const r = s.remp[k];
        [['vitrage', 'Vitrage'], ['panneau', R.feu(s, cfg) ? 'Panneau feu' : 'Panneau']].forEach(([cle, nom]) => {
          if (!r[cle].on) return;
          let l = nom + (vide(r[cle].ep) ? '' : ' ' + net(r[cle].ep) + ' mm') + ' ' + LIEU[k];
          if (s.remp.aConfirmer) l += cle === 'vitrage' ? ' — par défaut à confirmer avec le verrier' : ' — par défaut à confirmer';
          if (s.remp.selonPV) l += ' — composition à valider suivant le PV';
          items.push(li(l));
        });
      });
      section('Remplissages :', items);
    }

    // --- Inclus dans l'offre / Hors gamme ---
    const horsGamme = [];
    {
      const items = [];
      const f = s.ferr;
      if (R.ferrageVisible(s, cfg)) {
        const type = dans(f.paumType, R.typesPaumelles(s, cfg));
        const q = net(f.paumQte);
        if (type) {
          items.push(li(q
            ? q + ' paumelle' + (Number(q) > 1 ? 's' : '') + ' ' + minus(type) + ' par vantail'
            : 'Paumelles ' + minus(type)));
        }
        const ap = dans(f.antiPince, L(cfg, 'antiPince'));
        if (ap) items.push(li(ap === 'Rien' ? 'Sans anti-pince doigts' : 'Anti-pince doigts : ' + minus(ap)));
      }

      // Quincailleries
      const quinc = [];
      if (R.quincVisible(s, cfg)) {
        const vp = vantailPrincipal(s, cfg, horsGamme);
        if (vp.length) { quinc.push(li('Vantail principal :', 1)); vp.forEach(x => { x.niv += 2; quinc.push(x); }); }
      }
      if (R.vsVisible(s, cfg)) {
        const vs = vantailSecondaire(s, cfg, horsGamme);
        if (vs.length) { quinc.push(li('Vantail secondaire :', 1)); vs.forEach(x => { x.niv += 2; quinc.push(x); }); }
      }
      if (R.quincFenetreVisible(s, cfg)) {
        const qf = dans(f.quincFen, L(cfg, 'quincaillerieFenetre'));
        if (qf) quinc.push(li('Quincaillerie fenêtre : ' + qf, 1));
        const rcFen = R.niveaux(s, 'RC', cfg).filter(n => n === '2' || n === '3');
        if (rcFen.length && R.typeActif(s, 'fenetre', cfg)) {
          quinc.push(li('Ferrure fenêtre ' + rcFen.map(n => 'RC' + n).join(' / ') + ' avec poignée à clé', 1));
        }
      }
      if (R.repliable(s, cfg) && !R.vario(s)) {
        const cr = dans(f.cremRepType, L(cfg, 'cremoneRepliable'));
        if (cr) quinc.push(li('Crémone de repliable : ' + minus(cr) + (vide(f.cremRepQte) ? '' : ' (quantité : ' + net(f.cremRepQte) + ')'), 1));
      }
      if (quinc.length) { items.push(li('Quincailleries :')); items.push(...quinc); }

      textesPour('inclus', s, cfg, textes).forEach(t => ajouterSansDoublon(items, lignesBibliotheque(t.texte, 0, t.gras)));
      items.push(...lignesPerso(s, cfg, 'inclus'));
      section("Inclus dans l'offre :", items);
    }
    section('Hors gamme Forster :', horsGamme.map(t => li(t)).concat(lignesPerso(s, cfg, 'horsGamme')));

    // --- À la charge du métallier ---
    section('À la charge du métallier :', L(cfg, 'chargeMetallier').filter(v => s.charge.includes(v)).map(v => li(v))
      .concat(lignesPerso(s, cfg, 'charge')));

    // --- Listes ajoutées avec leur propre section ---
    (cfg.listesPerso || []).filter(l => l.section === 'propre').forEach(l => {
      const v = dans((s.perso || {})[l.id], l.valeurs || []);
      if (v) section(l.libelle + ' :', [li(v)]);
    });

    // --- Mise en œuvre (textes de fin) ---
    const fin = [];
    textesPour('fin', s, cfg, textes).forEach(t => fin.push(lignesBibliotheque(t.texte, 0, t.gras)));

    // --- Avis de chantier ---
    let avis = [];
    if (s.avis.on) {
      const a = s.avis;
      const dims = [];
      if (!vide(a.hauteur)) dims.push('hauteur ' + net(a.hauteur) + ' mm');
      if (!vide(a.largeur)) dims.push('largeur ' + net(a.largeur) + ' mm');
      if (dims.length) avis.push(li('Dimensions : ' + dims.join(' × ')));
      if (a.cintrage) avis.push(li('Cintrage'));
      if (a.serrure) avis.push(li('Serrure'));
      String(a.texte || '').split(/\r?\n/).forEach(l => {
        if (!l.trim()) return;
        const m = l.match(/^(\s*)(?:[-•o▪*]\s+)?(.*)$/);
        avis.push(li(m[2].trim(), m[1].length >= 2 ? 1 : 0));
      });
    }

    return { titre, sections, fin, avis };
  }

  function vantailPrincipal(s, cfg, horsGamme) {
    const v = s.vp, out = [];
    const d = (val, id) => dans(val, L(cfg, id));

    if (v.serrure.on) {
      const parts = [];
      const pts = d(v.serrure.points, 'serrurePoints');
      if (pts) parts.push(pts + (pts === '1' ? ' point' : ' points'));
      if (d(v.serrure.pene, 'serrurePene')) parts.push('pêne ' + minus(v.serrure.pene));
      if (d(v.serrure.fonct, 'serrureFonctionnement')) parts.push(minus(v.serrure.fonct));
      if (d(v.serrure.antipanique, 'antipanique')) parts.push('antipanique ' + v.serrure.antipanique);
      out.push(li('Serrure' + (parts.length ? ' ' + parts.join(', ') : '')));
    }
    if (v.fermePorte.on) out.push(li(fermePorte(v.fermePorte, cfg)));
    if (v.bequille.on) {
      const parts = [];
      const c = cotesTexte(v.bequille);
      if (c) parts.push(c);
      if (d(v.bequille.finition, 'finition')) parts.push(minus(v.bequille.finition));
      out.push(li('Béquille' + (parts.length ? ' ' + parts.join(', ') : '')));
      if (!vide(v.bequille.hauteur)) {
        const ref = d(v.bequille.hauteurRef, 'hauteurPoigneeRef');
        out.push(li('Hauteur de béquille : ' + net(v.bequille.hauteur) + ' mm' + (ref ? ' ' + ref : ''), 1));
      } else if (R.typeActif(s, 'fenetre', cfg)) {
        out.push(li("Attention, béquille au milieu de l'ouvrant par défaut", 1, true));
      }
      // Mentions en gras : uniquement quand Fenêtre est sélectionné.
      if (R.typeActif(s, 'fenetre', cfg)) out.push(li('Hauteur de la béquille à valider avant chaque commande.', 1, true));
    }
    if (v.baton.on) {
      const c = cotesTexte(v.baton);
      horsGamme.push('Bâton de maréchal' + (c ? ' ' + c : ''));
    }
    if (v.push.on) {
      if (v.push.mode === 'hors') horsGamme.push('Push barre');
      else out.push(li('Push barre'));
    }
    if (v.rosaces.on) out.push(li(rosaces(v.rosaces, cfg)));
    if (v.pions.on) out.push(li('Pions anti-dégondage'));
    if (v.goujons.on) {
      const nb = d(v.goujons.nb, 'goujons');
      out.push(li('Goujons thermiques' + (nb ? ' : ' + nb : '')));
    }
    if (v.profil.on) {
      const parts = [v.profil.serrure ? 'serrure' : '', v.profil.fermePorte ? 'ferme-porte' : ''].filter(Boolean);
      out.push(li('Profil préentaillé' + (parts.length ? ' : ' + parts.join(' + ') : '')));
    }
    if (v.ventouses.on) {
      const lignes = String(v.ventouses.texte || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      if (lignes.length) lignes.forEach(x => out.push(li(x.replace(/^[-•o▪*]\s+/, ''))));
      else out.push(li('Ventouses'));
    }
    return out;
  }

  function vantailSecondaire(s, cfg, horsGamme) {
    const v = s.vs, out = [];
    if (v.rosaces.on) out.push(li(rosaces(v.rosaces, cfg)));
    if (v.cremone.on) {
      const type = dans(v.cremone.type, ['Encastrée', 'En applique']);
      const parts = [];
      if (type === 'Encastrée') {
        const b = [v.cremone.haut ? 'haut' : '', v.cremone.bas ? 'bas' : ''].filter(Boolean);
        if (b.length) parts.push('à bascule ' + b.join(' + '));
      }
      if (v.cremone.auto) parts.push('automatique');
      if (v.cremone.antipanique) parts.push('antipanique');
      const det = parts.length ? (type === 'Encastrée' ? ' ' : ', ') + parts.join(', ') : '';
      if (type === 'En applique') horsGamme.push('Crémone en applique (vantail secondaire)' + det);
      else out.push(li('Crémone' + (type ? ' ' + minus(type) : '') + det));
    }
    if (v.verrou.on) {
      const b = [v.verrou.haut ? 'haut' : '', v.verrou.bas ? 'bas' : ''].filter(Boolean);
      out.push(li('Verrouillage fin' + (b.length ? ' ' + b.join(' + ') : '')));
    }
    if (v.gache.on) out.push(li('Gâche électrique'));
    if (v.fermePorte.on) out.push(li(fermePorte(v.fermePorte, cfg)));
    return out;
  }

  function fermePorte(fp, cfg) {
    const t = dans(fp.type, L(cfg, 'fermePorteType'));
    const m = dans(fp.modele, L(cfg, 'fermePorteModele'));
    const choix = [t, m].filter(Boolean).join(' ');
    const det = [choix, net(fp.precision)].filter(Boolean).join(', ');
    return 'Ferme-porte' + (det ? ' : ' + det : '');
  }

  function rosaces(r, cfg) {
    const parts = [];
    const c = cotesTexte(r);
    if (c) parts.push(c);
    if (dans(r.finition, L(cfg, 'finition'))) parts.push(minus(r.finition));
    if (r.securite) parts.push('sécurité');
    return 'Rosaces' + (parts.length ? ' ' + parts.join(', ') : '');
  }

  function estVide(m) {
    return !m.titre && !m.sections.length && !m.fin.length && !m.avis.length;
  }

  // ---------- mise en forme ----------
  function echap(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // **gras** à l'intérieur d'une ligne
  function enrichi(t) {
    return echap(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }
  function brut(t) { return String(t).replace(/\*\*(.+?)\*\*/g, '$1'); }

  const STYLE_P = 'margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14pt;line-height:1.35;';

  function ligneHTML(x) {
    const contenu = x.gras ? '<b>' + enrichi(x.t) + '</b>' : enrichi(x.t);
    if (x.k === 'p') return '<p style="' + STYLE_P + '">' + contenu + '</p>';
    const retrait = 18 + x.niv * 24;
    return '<p style="' + STYLE_P + 'margin-left:' + retrait + 'pt;text-indent:-14pt;">' +
      echap(PUCES[Math.min(x.niv, PUCES.length - 1)]) + '&nbsp;&nbsp;' + contenu + '</p>';
  }

  function enHTML(m) {
    const blocs = [];
    const espace = '<p style="' + STYLE_P + '">&nbsp;</p>';
    if (m.titre) blocs.push('<p style="' + STYLE_P + '"><b>' + echap(m.titre) + '</b></p>');
    m.sections.forEach(sec => {
      blocs.push('<p style="' + STYLE_P + '"><b>' + echap(sec.titre) + '</b></p>' + sec.items.map(ligneHTML).join(''));
    });
    m.fin.forEach(lignes => blocs.push(lignes.map(ligneHTML).join('')));
    if (m.avis.length) blocs.push('<p style="' + STYLE_P + '"><b>Avis de chantier :</b></p>' + m.avis.map(ligneHTML).join(''));
    return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14pt;">' + blocs.join(espace) + '</div>';
  }

  function ligneTexte(x) {
    if (x.k === 'p') return brut(x.t);
    return '    '.repeat(x.niv) + PUCES[Math.min(x.niv, PUCES.length - 1)] + ' ' + brut(x.t);
  }

  function enTexte(m) {
    const blocs = [];
    if (m.titre) blocs.push(m.titre);
    m.sections.forEach(sec => blocs.push([sec.titre].concat(sec.items.map(ligneTexte)).join('\n')));
    m.fin.forEach(lignes => blocs.push(lignes.map(ligneTexte).join('\n')));
    if (m.avis.length) blocs.push(['Avis de chantier :'].concat(m.avis.map(ligneTexte)).join('\n'));
    return blocs.join('\n\n');
  }

  window.Generateur = { etatInitial, fusionner, generer, enHTML, enTexte, estVide };
})();
