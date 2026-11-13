# MindBenin — Tasks

Suivi de l'implémentation de la démo (Phase 1 du document `project.md`).

## Fait

### Backend — NestJS + Prisma + PostgreSQL

- [x] Application NestJS `apps/api` (port 4001) découplée du front Next.js.
- [x] Schéma Prisma : `User`, `Service`, `Dossier`, `DossierEvent`, `Payment` + enums de statut.
- [x] Base PostgreSQL locale via `docker-compose.yml` (port 5433, volume persistant).
- [x] Seed des 8 services : passeport, acte de naissance, casier judiciaire, impôts, TVM, visite technique, factures SONEB et SBEE (prix officiel ou montant de facture variable, commission, délais, lieu de retrait, champs de formulaire).
- [x] `POST /identity/scan` : scan facial + ANIP simulés, création de l'utilisateur, JWT 30 jours.
- [x] `GET /identity/me` : identité courante (protégé par `AuthGuard`).
- [x] `GET /services` et `GET /services/:slug` : catalogue public.
- [x] `POST /dossiers` : création du dossier, formulaire pré-rempli depuis le NPI, validation des champs (comparaison Unicode normalisée), référence `BJ-AAAA-XXXXX`.
- [x] `GET /dossiers` : liste des dossiers de l'utilisateur.
- [x] `GET /dossiers/:reference` : détail + avancement automatique du dossier.
- [x] `POST /dossiers/:reference/pay` : création du paiement, opérateur MTN MoMo / Moov Money.
- [x] `GET /payments/fedapay/callback` : retour du checkout, vérification serveur du statut, redirection vers le dossier.
- [x] `POST /payments/fedapay/webhook` : notifications FedaPay, vérification serveur puis mise à jour.
- [x] Machine à états : `DEMANDE_ENVOYEE → IDENTITE_VERIFIEE → EN_COURS_TRAITEMENT → PRET_A_RECUPERER` (avancement à 0 s / 10 s / 25 s après paiement, journalisé dans `DossierEvent`).

### Paiements — FedaPay

- [x] Client API FedaPay : création de la collecte (`POST /transactions`) + lien de paiement (`POST /transactions/{id}/token`).
- [x] Redirection du navigateur vers la page sécurisée FedaPay.
- [x] Confirmation serveur via `GET /transactions/{id}` : le statut de l'URL de retour n'est jamais pris comme preuve.
- [x] Gestion des statuts `approved`, `declined`, `canceled`, `expired`, avec paiement idempotent.
- [x] Webhook FedaPay (`transaction.approved` et suivants) re-vérifié côté API.
- [x] Mode simulé automatique si `FEDAPAY_SECRET_KEY` est vide (démo hors ligne, reçu `MB-…`).
- [x] Écran « Paiement en attente » avec reprise du checkout et vérification manuelle.

### Scan facial réel (Python)

- [x] Microservice Python `apps/face` (FastAPI + MediaPipe) : détection de visage réelle sur la photo capturée.
- [x] Modèle MediaPipe `blaze_face_short_range` embarqué dans `apps/face/models`.
- [x] Endpoint `POST /detect` (multipart ou JSON base64) + `GET /health`.
- [x] Service NestJS `FaceVerificationService` qui appelle le service Python (variable `FACE_SERVICE_URL`).
- [x] `POST /identity/scan` accepte une image et rejette si aucun visage n'est détecté (quand le service est actif).
- [x] Front : capture réelle depuis la caméra (canvas) et envoi de la photo, retour `faceVerified` / `simulated`.
- [x] Fallback automatique en mode simulé si le service Python est indisponible ou si aucune image n'est fournie.

### Frontend — Next.js 16 + Tailwind 4 + shadcn/ui

- [x] Landing page : problème, parcours en 5 étapes, transparence des prix, 3 technologies, 3 phases.
- [x] Scan d'identité avec capture réelle depuis la caméra, détection de visage (service Python) ou mode simulé, étapes animées, carte d'identité NPI.
- [x] Session httpOnly : le front stocke le JWT et relaie les appels à l'API via des server actions.
- [x] Accueil app : identité ANIP, commande vocale (Web Speech API + saisie texte), 8 services, dossiers récents.
- [x] Commande vocale : extraction du numéro de compteur, du montant et de la plaque, pré-remplissage du formulaire de service.
- [x] Page service : pré-requis, formulaire pré-rempli, détail officiel + commission, création du dossier.
- [x] Page dossier : paiement FedaPay, suivi « en attente », barre de progression, timeline, lieu de retrait, reçu, historique.
- [x] Suivi en direct par polling (3 s) jusqu'au statut « Prêt à récupérer ».
- [x] Liste des dossiers + état vide.
- [x] Thème clair/sombre (raccourci `d`).

### Back-office administration

- [x] Connexion agent par code (`ADMIN_ACCESS_CODE`), JWT admin 12 h et cookie `httpOnly` séparé.
- [x] `AdminGuard` : les tokens citoyens ne donnent pas accès aux routes admin.
- [x] Statistiques : total, dossiers du jour, à traiter, prêts au retrait, encaissements confirmés.
- [x] File de dossiers : filtres par statut, recherche par référence / NPI / nom.
- [x] Détail dossier : identité, formulaire, paiement, retrait, historique.
- [x] Changement de statut avec note pour le citoyen et journalisation dans `DossierEvent`.
- [x] Transitions contrôlées et paiement obligatoire avant « prêt » / « récupéré ».
- [x] `manualOverride` : l'avancement automatique de la démo s'arrête dès qu'un agent intervient.

### Dockerisation

- [x] `apps/api/Dockerfile`, `apps/web/Dockerfile` (output standalone) et `apps/face/Dockerfile`.
- [x] `docker-compose.yml` : Postgres, API, web et service facial, healthchecks, volume persistant.
- [x] Scan réel validé de bout en bout dans Docker (photo avec visage → `faceVerified: true`).
- [x] Services et paiement simulé validés dans Docker (8 services, TVM, factures variables, admin).

### Base de données

- [x] `prisma db push` appliqué, seed exécuté (8 services).
- [x] Montant variable pour SONEB/SBEE : validation côté serveur (500 à 1 000 000 FCFA), total = montant + commission.
- [x] Services TVM et visite technique : prix fixes avec champs véhicule (catégorie, puissance, immatriculation, centre).
- [x] Configuration locale documentée dans `README.md`.

## Prochaines étapes (Phase 2 — V1 réelle)

- [ ] Fournir une clé sandbox FedaPay puis une clé live, tester le parcours complet dans le dashboard.
- [ ] Exposer l'API (tunnel) et déclarer le webhook FedaPay `https://…/payments/fedapay/webhook`.
- [ ] Remplacer le simulateur ANIP par l'API officielle (accord d'accès + gestion des consentements).
- [ ] Choisir un seul service réel pour la V1 : acte de naissance.
- [ ] Notifications push/SMS réelles au changement de statut.
- [ ] Stockage chiffré et politique de conservation des données biométriques.
- [ ] Cadre légal de la commission de confort sur des frais publics.
- [ ] Authentification renforcée (OTP téléphone, rate limiting).

## Phase 3 — Vision 2050

- [ ] Santé, école, permis de conduire, impôts, toutes les administrations.
- [x] Tableau de bord administration (traitement des dossiers, statistiques).
- [ ] Multilingue complet : français, fon, yoruba.
- [ ] Application mobile native (React Native / Expo) réutilisant l'API NestJS.

## Démo — rappel

Identité et administration simulées. Paiement FedaPay réel uniquement si `FEDAPAY_SECRET_KEY` est renseignée ; sinon succès simulé, sans débit.
