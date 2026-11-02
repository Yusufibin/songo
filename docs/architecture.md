# Architecture

## Choix

Cette application est un client statique React/TypeScript. Le calcul et les données d’une partie appartiennent à l’appareil du joueur. Un CDN peut servir les mêmes fichiers à de nombreux utilisateurs, sans session serveur, socket permanente ou coût de calcul côté hébergeur. Cela ne constitue pas un test de charge : aucune capacité chiffrée n’a été mesurée.

Le moteur utilise quatorze cases et deux greniers hors circuit. Ses transitions sont déterministes et indépendantes de la présentation. Une recherche IA utilise les mêmes transitions que le joueur, avec un budget de temps et une profondeur plafonnée. Le worker est arrêté lorsque la session change, que l’utilisateur relit un coup ou ouvre une autre vue. Un résultat périmé ne peut pas remplacer une nouvelle session.

## Présentation et interactions

`presentation.ts` produit une suite d’instantanés visuels à partir d’une transition du moteur : ramassage, dépôts, captures, dons et collecte de fin de partie. Chaque instantané conserve les 70 graines en comptant celles encore en main. Les captures spéciales d’une seule graine gardent les autres dans la case.

`useMoveAnimation` orchestre cette suite sans modifier la session. Le coup légal est sauvegardé immédiatement ; seuls le plateau affiché et le score suivent l’animation. Le joueur et le worker IA attendent la fin du semis. Ouvrir un dialogue, changer de session/vue, relire un coup ou masquer l’onglet annule les minuteries et rejoint l’état validé. La préférence locale et `prefers-reduced-motion` permettent de passer directement au résultat.

La première pression sélectionne une case et prévisualise le parcours ; une seconde pression sur la même case, ou le bouton « Semer », confirme le coup. Le survol et le focus ne déclenchent aucun coup ni sélection persistante. `Board` affiche le même circuit de quatorze cases dans les deux orientations : deux colonnes en portrait, deux rangées en paysage. Les indices du moteur restent identiques. Les vols de graines utilisent les positions réelles des cases et des scores dans le DOM.

`styles.css` conserve les structures communes et les vues secondaires ; `arena.css` porte le thème de jeu, les états tactiles, les orientations et le mode immersif, activé initialement sur un écran de 700 px ou moins.

## Données

La clé `songo.session.v2` contient une session : identifiant, mode, noms, difficulté, date et liste de coups. Les limites sont de 600 coups, 24 caractères par prénom et 50 Ko par fichier importé. Le moteur reconstruit et valide chaque état. Un import incorrect laisse le plateau actuel intact.

Les préférences et les 500 derniers résultats utilisent des clés séparées. Les résultats sont enregistrés une fois par identifiant de session. L’historique complet d’une ancienne partie n’est conservé que dans son export. L’effacement des données navigateur supprime la sauvegarde : le JSON sert à l’archivage et au transfert manuel.

Le navigateur émet un événement lorsqu’un autre onglet remplace la session : le jeu se met en pause et demande quelle version garder. Il n’y a pas de fusion automatique des coups. Si le stockage est bloqué ou saturé, un avertissement s’affiche et l’export reste disponible.

## Hors ligne et mise à jour

Workbox précache le HTML, le JavaScript, le worker IA, les styles, les polices et les icônes. Aucun CDN tiers n’est appelé au moment de jouer. Le premier téléchargement nécessite une connexion ; les visites suivantes peuvent fonctionner sans réseau tant que le navigateur conserve son cache. Une bannière propose l’activation d’un nouveau service worker.

## Extension vers le multijoueur distant

Le moteur pur peut être réutilisé côté serveur, mais le client actuel ne fournit pas ce service. Pour un duel distant, ajouter :

1. Une identité et une table de joueurs, séparées de la présentation.
2. Un acteur autoritaire par partie qui appelle `legalMoves`/`playMove` et valide le joueur, la version et l’ordre des coups.
3. Un journal durable de coups, des commandes idempotentes et des instantanés versionnés.
4. Un transport temps réel avec reconnexion, reprise depuis une version et diffusion des événements validés.
5. Une limite de commandes par joueur, des métriques de latence/erreurs et des tests de concurrence.

Les résultats du navigateur ne doivent jamais servir à alimenter un classement public : ils ne sont pas signés par un serveur.

## Vérifications

Les tests de présentation vérifient aussi les instantanés de 12 parties complètes, les captures en chaîne, les dons et les captures spéciales. Les tests navigateur ajoutent la sélection tactile, sa confirmation/annulation, l’interruption du semis, la réduction des mouvements, les cibles tactiles et six dimensions portrait/paysage (320 à 844 px).

Les tests unitaires couvrent les cas spécifiques de semailles/captures/solidarité et simulent 60 parties reproductibles. Les tests navigateur couvrent les parcours sur desktop et mobile, le rejeu, la persistance, l’import/export, l’IA, le mode hors ligne et les règles axe WCAG A/AA. Ces contrôles automatisés ne remplacent pas un audit complet avec lecteurs d’écran ni des essais sur tous les appareils.
