# Commentaires — Cahier des charges unifié

Fusion du prompt initial et du document « Application pour commentaires » (Word).
En cas de divergence, c'est le document Word (plus récent) qui fait foi ; chaque arbitrage est signalé par **⚖**.

## 1. Objet

Application web interne nommée **Commentaires**, hébergée sur GitHub (dépôt `Lemoa869121/Commentaires`, publication GitHub Pages).
Environ 6 utilisateurs réguliers, 16 occasionnels.

L'utilisateur décrit une configuration de menuiserie (fenêtres, portes, façades aluminium/acier) dans un formulaire structuré ;
l'application rédige en temps réel un commentaire technique formaté, prêt à être copié dans un e-mail ou un document Word
(Arial 14, titres en gras, puces conservées).

⚖ Le Word parle d'« application de bureau » ; le prompt de GitHub Pages. Retenu : application web (fonctionne dans tout navigateur, rien à installer).

## 2. Écran

- **En-tête** : titre, boutons *Réinitialiser* (avec confirmation), *Copier le commentaire*, lien *Panneau de contrôle*.
- **Colonne gauche** (≈ 60 %, défilante) : formulaire en blocs numérotés. Police de l’interface : 14 pt.
- **Colonne droite** (≈ 40 %, fixe) : aperçu en Arial 14, défilement vertical.
- La saisie est sauvegardée automatiquement dans le navigateur (onglet fermé par erreur = rien de perdu). *Réinitialiser* efface tout.

## 3. Formulaire

### Bloc 1 — Gamme et série (côte à côte)
- Gamme : Presto, Unico, Fuego light, Thermfix Vario, Thermfix Light, Norm.
- Série (dépend de la gamme) : Presto 50/60/XS · Unico Standard/XS · Fuego light (aucune) · Thermfix Vario Vertical · Thermfix Light Vertical/Oblique · Norm 34/40/50/60.

### Bloc 2 — Conditions (cumulables, deux colonnes)
- Par balle **FB** 4/5/6/7 · Retardateur effraction **RC** 1/2/3/4 · Pare-flamme **E** 30/60/90/120 · Coupe-feu **EI** 30/60/90/120.
- ⚖ Plusieurs niveaux d'une même condition sont cumulables (ex. EI30 + EI60) : chaque condition cochée affiche ses niveaux sous forme de cases.
- FB ou RC coché → champ **N° rapport d'essai**. E ou EI coché → champ **N° PV**.
- **Blocage EI120** : tous les types du bloc 3 sauf *Fixe* sont grisés (pas décochés) avec un avertissement ; ils sont ignorés dans le texte tant qu'EI120 est actif.

### Bloc 3 — Type d'ouvrage (cumulables)
Fenêtre, Soufflet, Projection, Porte, Mur rideau, Verrière, Coulissant, Repliable, Pivot désaxé, Fixe.
- Sous-options : Fenêtre (Ouvrant à la française / à l'anglaise / Oscillo-battante) · Porte (Tôlée / Vitrée) · Fixe (Classique / Bord à bord).
- Nombre de vantaux 1/2 : visible si Fenêtre ou Porte.
- Repliable : nombre de vantaux à gauche / à droite (saisie libre), en plus du champ standard.

### Bloc 4 — Environnement (⚖ choix multiples, ex. Fixe + Imposte)
- Imposte · Fixe (Gauche / Droite / Bord à bord) · Dans un mur rideau · Sur structure (Acier / Bois / Autre).
- Gamme Thermfix Light : « Sur structure » est présélectionné au choix de la gamme (modifiable) et le texte ajoute « (à votre charge) ».

### Bloc 5 — Configuration
- Isolation (Série isolée – avec rupture de pont thermique / Série non isolée) · Seuil (Automatique, Suisse, Joint balais).
- Pose (Applique, Tunnel, Dans un mur rideau, Feuillure).
- Ouverture (Intérieur/Extérieur) et Sens (Din droite/Din gauche) : ⚖ visibles dès qu'un type ouvrant est coché (« sauf si fixe »).
- Parclose (Aluminium, Acier, Plats acier) · Joint (EPDM, Silicone).
- Raccord de traverse (Thermfix Vario uniquement) : Soudé, Pions x2 (936205), Pions x3 (936230/31/32/33), Pions x4 (936210), Manchonnage, Manchonnage et tube à souder.

### Bloc 6 — Remplissage
- Une sous-section par élément présent : Porte, Fixe (type ou environnement), Imposte, Mur rideau ; ou une seule pour **l'ensemble du châssis**.
- Chaque sous-section : Vitrage et/ou Panneau, chacun avec son épaisseur (mm). Avec une condition E/EI, le panneau s'écrit « Panneau feu ».
- Cases globales « à confirmer » (→ « par défaut à confirmer avec le verrier ») et « à valider selon le PV » (→ « composition à valider suivant le PV »).

### Bloc 7 — Ferrage (inclus dans l'offre)
- Paumelles : type (Soudées, Vissées, Caches, 2D, 3D ; FMF 150 / FMF 100 seulement si Repliable) + quantité par vantail.
- Anti-pince doigts : Côté rotation / Côté verrouillage / Rien.
- Quincaillerie fenêtre/soufflet (si Fenêtre ou Soufflet) : Caché, Royal, Visible, Tradition crémone applique hauteur max 2400 mm, Designo, Surposée.
- Crémone de repliable (si Repliable) : Encastrée / En feuillure + quantité.
- Fenêtre + RC2 ou RC3 → ligne automatique « Ferrure fenêtre RCx avec poignée à clé ».
- ⚖ Thermfix Vario : paumelles, quincaillerie, ferrage et manœuvre sont masqués.

### Bloc 8 — Quincaillerie vantail principal
Visible si Porte, Fenêtre ou Soufflet ; masqué si seul Fixe, si EI120 actif, si Thermfix Vario. Chaque élément se coche pour être inclus.
- Serrure : 1/2/3 points, pêne (Demi-tour, Rouleau), fonctionnement (Mécanique, Motorisée, À béquille contrôlée), antipanique (B, D, E).
- Ferme-porte : Applique / Encastré + modèle (ITS, TS, DC) + zone de texte « Précision » qui complète le choix.
- Manœuvre (cumulable) : Béquille (Intérieur/Extérieur, Inox/Alu) · Bâton de maréchal (→ « Hors gamme Forster » automatiquement) · Push-barre (Inclus dans l'offre / Hors gamme Forster).
- Hauteur de béquille : valeur en mm + référence (à partir du sol, GH, bas du dormant, bas de l'ouvrant). Avec béquille : mentions en gras « Attention, béquille au milieu de l'ouvrant par défaut » (si aucune hauteur) et « Hauteur de la béquille à valider avant chaque commande. »
- Rosaces (Intérieur/Extérieur, Alu/Inox, Sécurité) · Pions anti-dégondage · Goujons thermiques 1/3 · Profil préentaillé (Serrure, Ferme-porte) · Ventouses (bouton « Écrire… » → fenêtre de texte libre).

### Bloc 9 — Quincaillerie vantail secondaire
Mêmes conditions que le bloc 8 **et** nombre de vantaux = 2.
- Rosaces · Crémone Encastrée (à bascule haut/bas, automatique, antipanique) ou En applique (→ « Hors gamme Forster ») · Verrouillage fin Haut/Bas · Gâche électrique · Ferme-porte (+ modèle + zone « Précision »).

### Bloc 10 — À la charge du métallier
Cases : Bâton de maréchal, Cylindre, Crémone pompier, Cintrage, Pivot de sol, Push-barre, Ferme-porte, Serrure antipanique, Ventus pour soufflet, Sélecteur de fermeture, Manchonnage.

### Bloc 11 — Avis de chantier
Case « Ajouter un avis de chantier » → Dimensions (hauteur, largeur), Cintrage, Serrure, texte libre. Chaque ligne du texte libre devient une puce. Toujours en tout dernier.

## 4. Commentaire généré

```
**[Types] [Gamme] [Série] [Conditions]**          ex. Porte vitrée Unico RC4

**Type :**
- Ensemble [Types] [N] vantail/vantaux, avec [Fixe gauche + Imposte], dans un mur rideau, sur structure acier (à votre charge)

**Conditions :**                                  ← textes réglementaires (⚖ ici, comme le modèle Word)
**Rapport d'essai / PV :**
**Configurations :**                              ← isolation, seuil, pose, ouverture, sens, parclose, joints, raccord
**Remplissages :**
**Inclus dans l'offre :**                         ← paumelles, anti-pince, Quincailleries (o Vantail principal / • …), renforts
**Hors gamme Forster :**
**À la charge du métallier :**
[Mise en œuvre feu / effraction-pare-balle]
**Avis de chantier :**
```

- Puces : niveau 1 « - », niveau 2 « o », niveau 3 « • ».
- Jamais de valeur vide ni de titre sans contenu : une section sans ligne disparaît entièrement.
- Copie : format enrichi (Word/Outlook, Arial 14, gras) + texte brut.

## 5. Textes automatiques (bibliothèque séparée, `data/textes.json`)

Repris mot pour mot du document Word, modifiables depuis le panneau de contrôle.

| Texte | Déclencheur | Emplacement |
|---|---|---|
| Fuego light feu | Fuego light + E ou EI | Conditions |
| RC4 Unico Porte | Unico + RC4 + Porte | Conditions |
| RC4 Unico Fixe | Unico + RC4 + Fixe | Conditions |
| Thermfix Vario RC4 | Thermfix Vario + RC4 | Conditions |
| FB4 Unico Porte / Fixe | Unico + FB4 + Porte / Fixe | Conditions |
| FB6 Unico Porte / Fixe | Unico + FB6 + Porte / Fixe | Conditions |
| Thermfix Light | Thermfix Light | Conditions |
| Renfort alu (plats alu de renfort dans profilés) | FB4 ; FB6 sauf Thermfix Vario | Inclus dans l'offre |
| Particularité RC Unico Porte : plat acier usiné 120x12 + Adhésif TESA ACX+ | Unico + RC + Porte | Inclus dans l'offre |
| Particularité RC Unico Fixe : Adhésif TESA ACX+ | Unico + RC + Fixe | Inclus dans l'offre |
| Carré de 8 non chiffré | Unico + RC + Porte (serrure ISEO) | Configurations |
| Mise en œuvre châssis feu (EFECTIS), en gras | E ou EI | Fin |
| Mise en œuvre effraction / pare-balle (bureau de contrôle) | RC ou FB | Fin |

## 6. Panneau de contrôle

- Page `admin.html`, protégée par une **clé d'accès** : un jeton GitHub personnel limité à ce dépôt (droit « Contents : lecture et écriture »). Sans clé, on peut consulter mais pas enregistrer.
- Permet d'ajouter, modifier, supprimer : gammes et séries, niveaux de conditions, sous-options de types, toutes les listes déroulantes, et les textes automatiques (contenu et déclencheurs).
- Permet d'**ajouter de nouvelles listes déroulantes** : libellé, valeurs, bloc du formulaire où elle apparaît, section du commentaire où la valeur s'écrit (Configurations, Inclus dans l'offre, Hors gamme Forster, À la charge du métallier, ou sa propre section).
- Enregistrer = commit dans `data/config.json` / `data/textes.json`. Visible **immédiatement** dans le navigateur de l'administrateur, et pour tous dès que GitHub Pages a republié (≈ 1 min).

## 7. Règles générales

- Masquer un champ ne l'efface jamais ; il est seulement ignoré dans le texte tant qu'il est masqué.
- Les listes commencent sur « — choisir — » ; rien n'est écrit tant qu'on n'a pas choisi.
- Toutes les listes et tous les textes vivent dans `data/` ; la logique dans `js/`.
