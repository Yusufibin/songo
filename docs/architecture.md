# Architecture

## Choix

Cette application est un client statique React/TypeScript. Le calcul et les données d’une partie appartiennent à l’appareil du joueur. Un CDN peut servir les mêmes fichiers à de nombreux utilisateurs, sans session serveur, socket permanente ou coût de calcul côté hébergeur. Cela ne constitue pas un test de charge : aucune capacité chiffrée n’a été mesurée.

Le moteur utilise quatorze cases et deux greniers hors circuit. Ses transitions sont déterministes et indépendantes de la présentation. Une recherche IA utilise les mêmes transitions que le joueur, avec un budget de temps et une profondeur plafonnée. Le worker est arrêté lorsque la session change, que l’utilisateur relit un coup ou ouvre une autre vue. Un résultat périmé ne peut pas remplacer une nouvelle session.

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

Les tests unitaires couvrent les cas spécifiques de semailles/captures/solidarité et simulent 60 parties reproductibles. Les tests navigateur couvrent les parcours sur desktop et mobile, le rejeu, la persistance, l’import/export, l’IA, le mode hors ligne et les règles axe WCAG A/AA. Ces contrôles automatisés ne remplacent pas un audit complet avec lecteurs d’écran ni des essais sur tous les appareils.
