# Commentaires

Configurateur FORSTER de génération de commentaires techniques (menuiserie aluminium / acier).

Le formulaire de gauche décrit la configuration. L'aperçu de droite rédige le commentaire en temps réel
(Arial 14). Le bouton **Copier le commentaire** le colle avec sa mise en forme dans Word ou Outlook.

Cahier des charges complet : [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md).

## Mise en ligne (GitHub Pages)

1. Sur GitHub, ouvrez le dépôt → **Settings** → **Pages**.
2. *Build and deployment* → *Source* : **Deploy from a branch** ; *Branch* : **main** / **(root)** → **Save**.
3. Après une minute, l'adresse du site s'affiche en haut de cette page (du type `https://lemoa869121.github.io/Commentaires/`).

> GitHub Pages sur un dépôt **privé** demande un abonnement GitHub payant (Pro, Team ou Enterprise).
> Avec un compte gratuit, il faut rendre le dépôt public. Les listes et les textes réglementaires deviennent alors visibles par tous.

## Installer sur un poste Windows

Une fois le site en ligne, l'application s'installe comme un logiciel, sans droits administrateur :

1. Ouvrez l'adresse du site dans **Microsoft Edge** ou **Google Chrome**.
2. Cliquez sur le bouton **Installer l'application** en haut de la page. Vous pouvez aussi cliquer sur l'icône d'installation à droite de la barre d'adresse, ou passer par le menu **…** → *Applications* → *Installer Commentaires*.
3. Commentaires s'ouvre alors dans sa propre fenêtre et apparaît dans le menu Démarrer. Vous pouvez l'épingler à la barre des tâches.

L'application fonctionne aussi hors connexion, avec la dernière version consultée. Les mises à jour, y compris celles du Panneau de contrôle, arrivent automatiquement au lancement suivant quand le poste est connecté.
Pour la désinstaller : clic droit sur l'icône dans le menu Démarrer → *Désinstaller*.

## Modifier les listes et les textes

**Sans toucher au code :** dans l'application, ouvrez **Panneau de contrôle**, puis saisissez la clé d'accès. La marche à suivre pour créer la clé figure sur la page. Cliquez ensuite sur **Enregistrer**.
Les modifications apparaissent tout de suite dans votre navigateur, et pour tous les utilisateurs environ une minute plus tard.

**À la main :** modifiez les fichiers du dossier `data/` directement sur GitHub :

| Fichier | Contenu |
|---|---|
| `data/config.json` | gammes, séries, conditions, types, toutes les listes déroulantes (y compris celles ajoutées depuis le panneau) |
| `data/textes.json` | textes automatiques (réglementaires, mise en œuvre, renforts…) et leurs déclencheurs |

Dans un texte, une ligne qui commence par `- ` devient une puce. Deux espaces avant le `-` ajoutent un niveau de retrait. `**mot**` met le mot en gras.

## Organisation du code

```
index.html           application
admin.html           panneau de contrôle
css/style.css        mise en page (css/admin.css pour le panneau)
js/regles.js         règles d'affichage (EI120, Thermfix, vantaux…) — utilisées par le formulaire ET le texte
js/generateur.js     rédaction du commentaire + mise en forme HTML / texte brut
js/formulaire.js     construction du formulaire à partir de config.json
js/donnees.js        chargement des données
js/app.js            démarrage, aperçu, copie, réinitialisation
js/admin.js          panneau de contrôle (enregistrement via l'API GitHub)
js/pwa.js            installation sur le poste (bouton « Installer »)
sw.js                fonctionnement hors connexion et mises à jour
manifest.webmanifest nom, icônes et couleurs de l'application installée
```

Pour tester sur un poste : `python3 -m http.server` dans ce dossier, puis ouvrez http://localhost:8000.
Un double-clic sur `index.html` ne suffit pas, car le navigateur bloque alors la lecture des fichiers `data/`.
