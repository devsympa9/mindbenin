# MindBenin — Tasks

Suivi de l'implémentation de la démo (Phase 1 du document `project.md`).

## Fait

### Backend — NestJS + Prisma + PostgreSQL

- [x] Application NestJS `apps/api` (port 4001) découplée du front Next.js.
- [x] Schéma Prisma : `User`, `Service`, `Dossier`, `DossierEvent`, `Payment` + enums de statut.
- [x] Base PostgreSQL locale via `docker-compose.yml` (port 5433, volume persistant).
- [x] Seed des 12 services : passeport, acte de naissance, casier judiciaire, acte de célibat, attestation de résidence, impôts, TVM, visite technique, factures SONEB et SBEE, suivi de cotisation CNSS, pension de retraite (prix officiel ou montant de facture variable, commission, délais, lieu de retrait, champs de formulaire).
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
- [x] Accueil app : identité ANIP, commande vocale (Web Speech API + saisie texte), 12 services, dossiers récents.
- [x] Commande vocale : extraction du numéro de compteur, du montant et de la plaque, pré-remplissage du formulaire de service.
- [x] Commandes vocales étendues à l'acte de célibat, l'attestation de résidence, la cotisation CNSS et la pension de retraite.
- [x] Extraction vocale des nouveaux champs : motif, copies, adresse, durée de résidence, numéro CNSS, période de cotisation, numéro et type de pension.
- [x] Matching par mot-clé le plus spécifique (« visite technique » ne tombe plus sur TVM à cause de « voiture »).
- [x] Réponses vocales (synthèse Web Speech, français) : compréhension de la demande, dossier créé, paiement, changement de statut ; interrupteur « Voix activée » et bouton « Écouter le statut ».
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
- [x] Services et paiement simulé validés (12 services, TVM, factures variables, admin).

### Base de données

- [x] `prisma db push` appliqué, seed exécuté (12 services).
- [x] Montant variable pour SONEB/SBEE : validation côté serveur (500 à 1 000 000 FCFA), total = montant + commission.
- [x] Services TVM et visite technique : prix fixes avec champs véhicule (catégorie, puissance, immatriculation, centre).
- [x] État civil : acte de célibat (motif, copies) et attestation de résidence (adresse, durée, motif).
- [x] CNSS : suivi de cotisation (numéro CNSS, période) et pension de retraite (numéro de dossier, type de demande).
- [x] Configuration locale documentée dans `README.md`.

### Lot 1 — Pièces justificatives, retrait QR, notifications

- [x] Modèles Prisma `Document`, `Notification`, `Procuration`, `AdminAudit` + champs `pickupCode`, `collectedAt`, `reminderSentAt`.
- [x] Upload de pièces (PDF, JPEG, PNG, WebP ; 4 Mo max, 8 pièces par dossier) avec validation du type et du contenu, stockage S3/MinIO ou disque local.
- [x] Téléchargement et suppression des pièces, côté citoyen et côté agent (jamais d'URL publique : l'API relaie le fichier).
- [x] QR de retrait généré côté API (`qrcode`, SVG) avec payload `MINDBN|<référence>|<code 6 chiffres>` ; le code et le QR ne sont révélés qu'au statut « prêt à récupérer ».
- [x] Procuration : une personne de confiance reçoit son propre code de retrait à 6 chiffres.
- [x] Journal `Notification` : un envoi est écrit avant livraison (canal, destinataire, statut `SIMULE` / `ENVOYE` / `ECHEC`, message).
- [x] Canaux : Twilio (SMS), WhatsApp Cloud API, webhook SMS générique (`SMS_WEBHOOK_URL`) ; sans clé, statut `SIMULE` et message lisible dans l'app.
- [x] Notifications au paiement confirmé, au changement de statut et à la mise à disposition.

### Lot 2 — Paiement réel, reçu PDF, relances

- [x] Webhook FedaPay vérifié par HMAC (`FEDAPAY_WEBHOOK_SECRET`, header `x-fedapay-signature`), en plus de la re-vérification serveur `GET /transactions/{id}`.
- [x] Reçu PDF généré par l'API sans dépendance (A4, Helvetica, WinAnsi) : référence, identité, service, montant officiel + commission, moyen de paiement, date.
- [x] Route web `/api/receipt/[reference]` : le PDF est servi same-origin avec le cookie httpOnly, jamais exposé publiquement.
- [x] Relances automatiques des dossiers prêts et non retirés (`reminderSentAt`), déclenchées par l'agent ou le cron.
- [x] Renvoi manuel des notifications en échec depuis le back-office.

### Lot 3 — Temps réel, voix, back-office

- [x] SSE `GET /dossiers/:reference/stream` (auth par Bearer ou `?token=`) relayé par `/api/dossiers/[reference]/stream` ; le front bascule en polling si `EventSource` échoue.
- [x] Annonces vocales localisées fr/fon/yoruba (`lib/i18n.ts`, `speak(..., { lang })`) et question « où est mon dossier ? » qui lit le dernier dossier.
- [x] Back-office : scan du QR de retrait, validation par code, journal des notifications, relances, audit des actions, export CSV (BOM + `;` pour Excel FR).
- [x] Rôles admin (`ADMIN_ACCESS_CODE` = admin, `ADMIN_AGENT_CODE` = agent) : annulation et audit réservés à l'admin.

### Lot 4 — Liveness, multilingue, PWA, sécurité

- [x] Contrôle de présence (`POST /liveness`, `apps/face`) : trois prises espacées, mouvement entre les frames, netteté (Laplacien) et ratio du visage ; une photo statique est refusée.
- [x] `identity.scan` accepte un lot de frames et refuse un visage figé.
- [x] i18n fr/fon/yoruba : libellés de statut et phrases vocales (traductions communautaires à valider).
- [x] PWA : `manifest.webmanifest`, service worker (coquille hors-ligne, aucune donnée de dossier en cache), page `/offline`.
- [x] Sécurité : headers (CSP, X-Frame-Options, Referrer-Policy), `Permissions-Policy` caméra/micro, rate limiting sur scan, upload, paiement et admin, `rawBody` conservé pour les signatures.

## Prochaines étapes (Phase 2 — V1 réelle)

- [x] Clé sandbox FedaPay : création de transaction et lien de checkout validés (réponse JSON:API `v1/transaction` désormais déballée).
- [x] Parcours décliné validé de bout en bout (sandbox) : statut `declined` → paiement `ECHOUE`, événement et notification journalisés ; callback renvoie 302 et webhook vérifie la signature au format FedaPay (`t=...,s=HMAC(timestamp.corps)`) et extrait `entity.id`.
- [ ] Clé live FedaPay et validation d'un paiement approuvé de bout en bout (retour + webhook).
- [ ] Exposer l'API (tunnel) et déclarer le webhook FedaPay `https://…/payments/fedapay/webhook`.
- [ ] Remplacer le simulateur ANIP par l'API officielle (accord d'accès + gestion des consentements).
- [ ] Choisir un seul service réel pour la V1 : acte de naissance.
- [ ] Livraison SMS/WhatsApp réelle : brancher une clé Twilio ou WhatsApp Cloud API et relancer une notification depuis le back-office.
- [x] Stockage objet validé de bout en bout : upload, lecture et suppression d'une pièce dans le bucket `mindbenin` (profil `minio`).
- [ ] Chiffrement au repos des pièces et politique de conservation des données faciales.
- [ ] Antispoofing biométrique sérieux (le contrôle actuel est heuristique).
- [ ] Cadre légal de la commission de confort sur des frais publics.
- [ ] Authentification renforcée (OTP téléphone).

## Phase 3 — Vision 2050

- [ ] Santé, école, permis de conduire, impôts, toutes les administrations.
- [x] Tableau de bord administration (traitement des dossiers, statistiques).
- [x] Multilingue fr/fon/yoruba sur les statuts et les annonces vocales.
- [ ] Multilingue complet de l'interface (formulaires, pages, back-office).
- [ ] Application mobile native (React Native / Expo) réutilisant l'API NestJS.

## Démo — rappel

Identité et administration simulées. Paiement FedaPay réel uniquement si `FEDAPAY_SECRET_KEY` est renseignée ; sinon succès simulé, sans débit.
