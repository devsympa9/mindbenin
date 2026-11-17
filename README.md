# MindBenin — Think & Go

Démo de la plateforme qui supprime la file d'attente administrative au Bénin : le citoyen scanne son visage, parle ou choisit un service, l'app remplit le formulaire avec son NPI, paie par mobile money et suit le dossier jusqu'au retrait.

> Phase 1 : identité ANIP et administration simulées. Le paiement passe par FedaPay s'il est configuré, sinon il est simulé. Aucune donnée réelle, aucun débit réel sans clés de production.

## Stack

| Partie   | Technologie                                                  |
| -------- | ------------------------------------------------------------ |
| Frontend      | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Backend       | NestJS 11, JWT, Prisma 6, FedaPay                            |
| Base          | PostgreSQL 16 (Docker)                                       |
| Stockage      | MinIO / tout S3 compatible, sinon disque local               |
| Notifications | Twilio (SMS), WhatsApp Cloud API, webhook SMS ou journal simulé |
| Documents     | Reçu PDF généré par l'API, QR de retrait, pièces justificatives |
| Monorepo      | Turborepo + npm workspaces                                   |

## Structure

```text
apps/
  api/                 API NestJS (port 4001)
    prisma/            schéma + seed des services
    src/
      auth/            garde JWT
      identity/        scan ANIP simulé + session
      services/        catalogue des démarches
      dossiers/        création, suivi, paiement, pièces, retrait, flux SSE
      fedapay/         client API FedaPay
      payments/        callback + webhook FedaPay
      notifications/   SMS, WhatsApp, journal des envois
      storage/         pièces justificatives (S3/MinIO ou disque)
      common/          reçu PDF, sérialisation des dossiers
      admin/           back-office, rôles, audit, export CSV
      prisma/          client Prisma
  web/                 Front Next.js (port 3000)
    app/               landing, scan, /app, services, dossiers, admin, offline
    app/api/           relais same-origin : reçu PDF, pièces, SSE, export CSV
    components/
    lib/               client API, session, server actions, statuts, i18n, voix
    public/sw.js       service worker (coquille hors-ligne)
  face/                Service Python de détection faciale (port 8000)
packages/              design system et configs partagées
docker-compose.yml     Stack complète (Postgres, API, web, service facial)
tasks.md               état d'avancement et suite
project.md             note produit
```

## Démarrage

Prérequis : Node.js ≥ 20.9, Docker.

```bash
# 1. Dépendances
npm install

# 2. Base PostgreSQL (port 5433 pour ne pas toucher un Postgres existant)
docker compose up -d db

# 3. Schéma + données de démonstration
cd apps/api
npm run db:push
npm run db:seed
cd ../..

# 4. Lancer les deux applications (API + web)
npm run dev
```

- Front : http://localhost:3000
- API : http://localhost:4001 (4000 est souvent pris par un autre service local)
- Santé API : http://localhost:4001/health
- Service facial : http://localhost:8000/health (optionnel, pour le scan réel)

## Docker (tout le projet)

```bash
docker compose up -d --build
```

Lance PostgreSQL, l'API (4001), le front (3000) et le service facial (8000). Les données Postgres sont conservées dans le volume `mindbenin_pgdata`, les pièces justificatives dans `mindbenin_storage`. Les clés et codes se passent par un fichier `.env` à la racine (copier `.env.example`) ; sans clé FedaPay le paiement reste simulé.

Stockage objet (optionnel) :

```bash
docker compose --profile minio up -d   # MinIO sur 9000 (console 9001)
# puis dans .env : S3_ENDPOINT=http://minio:9000, S3_ACCESS_KEY=…, S3_SECRET_KEY=…
```

MinIO a retiré ses images de Docker Hub : le compose utilise le build Bitnami legacy (`bitnamilegacy/minio`), qui expose la même API S3, le même port 9000 et les mêmes variables `MINIO_ROOT_*`. Le bucket `mindbenin` est créé au démarrage, et l'API le recrée au besoin.

Sans `S3_ENDPOINT`, les pièces sont écrites sur disque (`STORAGE_DIR`, volume `mindbenin_storage`) : la démo reste utilisable sans MinIO.

Parcours de démo : **Scanner mon visage** → choisir un service → créer le dossier → payer (numéro `01 XX XX XX XX`) → regarder le statut avancer.

## Variables d'environnement

Pour Docker, créer un fichier `.env` à la racine avec les mêmes variables (`FEDAPAY_*`, `ADMIN_ACCESS_CODE`, `JWT_SECRET`, `WEB_ORIGIN`, …). La compose les transmet à l'API.

`apps/api/.env` (fourni pour le développement local) :

```bash
DATABASE_URL="postgresql://mindbenin:mindbenin@localhost:5433/mindbenin?schema=public"
JWT_SECRET="mindbenin-dev-secret-change-me"
PORT=4001
WEB_ORIGIN="http://localhost:3000"
ADMIN_ACCESS_CODE="mindbenin-admin"        # accès complet au back-office /admin
ADMIN_AGENT_CODE=""                        # rôle agent (lecture, pas d'annulation ni d'audit)
FACE_SERVICE_URL="http://localhost:8000"    # service facial Python (scan réel)

STORAGE_DIR="storage"                      # fallback disque des pièces justificatives
S3_ENDPOINT=""                             # http://localhost:9000 si MinIO
S3_BUCKET="mindbenin"
S3_ACCESS_KEY=""
S3_SECRET_KEY=""

TWILIO_ACCOUNT_SID=""                      # envoi SMS réel
TWILIO_AUTH_TOKEN=""
TWILIO_FROM=""
WHATSAPP_TOKEN=""                          # WhatsApp Cloud API
WHATSAPP_PHONE_ID=""
SMS_WEBHOOK_URL=""                         # passerelle SMS maison (POST JSON)

FEDAPAY_SECRET_KEY=""                     # clé sk_sandbox_… / sk_live_…
FEDAPAY_BASE_URL="https://sandbox-api.fedapay.com/v1"
FEDAPAY_CALLBACK_URL="http://localhost:4001/payments/fedapay/callback"
FEDAPAY_WEBHOOK_SECRET=""                  # secret HMAC du webhook (header x-fedapay-signature)
```

`apps/web/.env` :

```bash
API_INTERNAL_URL="http://localhost:4001"
```

## Paiements FedaPay

Le parcours est celui de FedaPay :

1. `POST /transactions` avec le montant en XOF, le client (nom, téléphone) et `merchant_reference` = référence du dossier.
2. `POST /transactions/{id}/token` pour obtenir le lien de paiement sécurisé.
3. Redirection du navigateur vers ce lien (`transaction.payment_url`).
4. Retour sur `FEDAPAY_CALLBACK_URL?id=…&status=…` : **le statut de l'URL n'est jamais utilisé comme preuve**, l'API refait un `GET /transactions/{id}` avec la clé secrète.
5. Webhook `POST /payments/fedapay/webhook` (événements `transaction.approved`, `declined`, `canceled`) : même vérification serveur, puis mise à jour du dossier.

Sans `FEDAPAY_SECRET_KEY`, le paiement est simulé immédiatement (reçu `MB-…`) pour que la démo reste utilisable hors ligne.

Pour tester en sandbox :

- renseigner une clé `sk_sandbox_…` dans `apps/api/.env` ;
- exposer l'API publiquement (ngrok ou tunnel) etpointer `FEDAPAY_CALLBACK_URL` vers `https://<tunnel>/payments/fedapay/callback` ;
- déclarer un webhook dans le dashboard FedaPay vers `https://<tunnel>/payments/fedapay/webhook` (événements transaction approuvée/annulée) ;
- les retours FedaPay arrivent sur le front via `WEB_ORIGIN`.

## Back-office administration

L'espace agents est disponible sur http://localhost:3000/admin. Il permet de :

- consulter les statistiques (dossiers, à traiter, prêts, encaissements) ;
- filtrer et rechercher les dossiers (référence, NPI, nom) ;
- ouvrir un dossier et faire avancer son statut avec une note pour le citoyen.

La connexion se fait avec le code défini par `ADMIN_ACCESS_CODE` (par défaut `mindbenin-admin` en développement). **Change-le avant toute mise en ligne.** La session admin est un JWT de 12 h stocké dans un cookie `httpOnly` séparé (`mb_admin`) et vérifié à chaque appel de l'API.

Dès qu'un agent change un statut, l'avancement automatique de la démo est désactivé pour ce dossier (`manualOverride`) : le dossier ne bouge plus que sur action humaine.

Outils ajoutés :

- **Retrait** (`/admin/scan`) — lecture du QR de retrait à la caméra (décodage navigateur) ou saisie du code à 6 chiffres, validation côté API ; un code de procuration remet le document à la personne mandatée.
- **Notifications** (`/admin/notifications`) — journal de tous les envois (canal, destinataire, statut, message), renvoi des envois en échec, lancement des relances des dossiers prêts non retirés.
- **Audit** (`/admin/audit`) — chaque action sensible est journalisée (agent, dossier, action, détail, date).
- **Export CSV** — file de dossiers filtrée, exportée avec BOM et séparateur `;` pour Excel FR.
- **Pièces justificatives** — téléchargement des pièces déposées par le citoyen, jamais d'URL publique.

Deux codes donnent deux rôles : `ADMIN_ACCESS_CODE` (admin, tout) et `ADMIN_AGENT_CODE` (agent : consultation, statuts, retrait, notifications ; l'annulation et l'audit restent réservés à l'admin).

## Pièces justificatives

Le citoyen peut joindre jusqu'à 8 pièces par dossier (PDF, JPEG, PNG, WebP, 4 Mo max). L'API vérifie le type MIME **et** la signature du fichier, puis écrit dans MinIO/S3 si configuré, sinon dans `STORAGE_DIR`. Le téléchargement passe toujours par l'API (`GET /dossiers/:reference/documents/:id`) et par un relais Next same-origin : aucune URL signée publique, aucun fichier exposé.

## Retrait : QR et code

À l'étape « Prêt à récupérer », l'API génère un code à 6 chiffres et son QR (`MINDBN|<référence>|<code>`), affichés dans le dossier. Le guichet scanne le QR ou saisit le code ; la validation est toujours faite côté API (`POST /admin/dossiers/:reference/pickup`), et le dossier passe à « Récupéré ». Une procuration peut désigner une autre personne : elle reçoit son propre code, décodé par le même écran.

## Paiement réel et reçu PDF

En plus de la re-vérification `GET /transactions/{id}`, le webhook FedaPay peut être protégé par HMAC : renseigner `FEDAPAY_WEBHOOK_SECRET`, l'API compare `x-fedapay-signature`. Chaque dossier payé expose un reçu PDF (`GET /dossiers/:reference/receipt` puis `/api/receipt/[reference]`), généré sans dépendance : référence, identité, service, montant officiel, commission, moyen de paiement et date.

## Notifications et relances

Chaque envoi est d'abord écrit dans la table `Notification`, puis livré :

1. webhook SMS (`SMS_WEBHOOK_URL`) si défini ;
2. sinon Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` ou `TWILIO_MESSAGING_SERVICE_SID`) ;
3. sinon WhatsApp Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`) ;
4. sinon statut `SIMULE` : le message reste lisible dans l'app et le back-office.

Déclencheurs : paiement confirmé, changement de statut, mise à disposition. Les échecs sont rejouables (`POST /admin/notifications/retry`) et les dossiers prêts non retirés peuvent recevoir une relance (`POST /admin/reminders/run`, une seule par dossier grâce à `reminderSentAt`).

## Temps réel, voix et multilingue

- Le dossier s'abonne à `GET /dossiers/:reference/stream` (SSE). Le cookie citoyen est `httpOnly` : le front relaie donc le flux par `/api/dossiers/[reference]/stream`, et retombe sur le polling si `EventSource` échoue.
- Trois langues pour les statuts et les annonces : français, fon, yoruba (`lib/i18n.ts`). Les traductions sont communautaires et à valider.
- « Où est mon dossier ? » (micro ou saisie) fait lire à voix haute le dernier dossier, son statut et son montant.

## Contrôle de présence (liveness)

`POST /liveness` (service `apps/face`) reçoit trois prises espacées et mesure le mouvement entre les frames, la netteté (variance du Laplacien) et le ratio du visage. Une photo statique tenue devant la caméra est refusée et `identity.scan` repasse en mode simulé. C'est un filtre anti-photo simple, pas un antispoofing par apprentissage : à remplacer avant toute production.

## PWA

L'app est installable (`/manifest.webmanifest`) et affiche une page `/offline` claire quand le réseau tombe. Le service worker ne met **jamais** en cache les réponses `/api/` ni les pages de dossier : les données restent privées.

## Scan facial réel (service Python)

Le scan utilise une vraie caméra et une détection de visage réelle via un microservice Python `apps/face` (MediaPipe). L'API NestJS l'appelle pour valider qu'un visage est présent dans la photo capturée ; si le service est indisponible, le scan repasse automatiquement en mode simulé.

```bash
# Dans un troisième terminal
cd apps/face
python -m venv .venv
.venv\\Scripts\\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- Santé : http://localhost:8000/health
- Détection : `POST /detect` (image multipart ou JSON `{ "image": "data:image/jpeg;base64,..." }`)
- Variable `FACE_SERVICE_URL` dans `apps/api/.env` (vide = mode simulé).

## Commande et réponses vocales

Le parcours parlé fonctionne sans aucune clé API ni service payant :

- **Écoute** : Web Speech API (`SpeechRecognition`, `fr-FR`) via le bouton micro de l'accueil, avec une saisie texte de secours si le navigateur n'expose pas la reconnaissance.
- **Compréhension** : `apps/web/lib/voice-intent.ts` reconnaît le service (c'est le mot-clé le plus spécifique qui gagne, donc « visite technique » ne tombe plus sur TVM à cause de « voiture ») puis extrait les champs : compteur et montant d'une facture, plaque, catégorie et centre, motif, nombre de copies, adresse, durée de résidence, numéro CNSS et période, numéro et type de pension. Les valeurs sont passées au formulaire par l'URL, l'utilisateur confirme avant l'ouverture.
- **Réponses** : `apps/web/lib/speech.ts` lit les messages en français — compréhension de la demande, champs détectés, dossier créé, paiement confirmé ou refusé, changement de statut. Un interrupteur « Voix activée / Voix coupée » est présent sur l'accueil et sur le dossier, et un bouton « Écouter le statut » permet de réécouter le résumé à la demande.

Support : Chrome et Edge (voix Google) sont les plus complets ; Safari iOS lit bien mais la reconnaissance est capricieuse, Firefox n'expose pas la reconnaissance. Les voix disponibles dépendent du système. Pour une voix plus naturelle et homogène sur tous les appareils, il suffit de remplacer le corps de `speak()` par un service TTS (ElevenLabs, Azure Speech, Google Cloud TTS) : le reste du code ne change pas.

## Services disponibles

Tous passent par le même parcours : identité NPI, formulaire pré-rempli, paiement mobile money, suivi jusqu'au retrait.

| Service                     | Prix officiel        | Délai  | Champs demandés                                       |
| --------------------------- | -------------------- | ------ | ----------------------------------------------------- |
| Passeport biométrique       | 50 000 FCFA          | 10 j   | type de demande, type de passeport                    |
| Acte de naissance           | 2 000 FCFA           | 2 j    | nombre de copies, usage                               |
| Casier judiciaire           | 5 000 FCFA           | 3 j    | motif                                                 |
| Acte de célibat             | 2 000 FCFA           | 3 j    | motif, nombre de copies                               |
| Attestation de résidence    | 1 000 FCFA           | 2 j    | adresse, durée de résidence, motif                    |
| Déclaration d'impôts        | 2 000 FCFA           | 1 j    | type de déclaration, revenu annuel                    |
| TVM                         | 15 000 FCFA          | 1 j    | catégorie, puissance fiscale, immatriculation          |
| Visite technique            | 12 000 FCFA          | 1 j    | type de véhicule, immatriculation, centre             |
| Facture SONEB               | montant de la facture | 1 j    | numéro de facture/compteur, montant                   |
| Facture SBEE                | montant de la facture | 1 j    | numéro de facture/compteur, montant                   |
| Cotisation CNSS             | 3 000 FCFA           | 3 j    | numéro CNSS, période consultée                        |
| Pension de retraite         | 2 000 FCFA           | 5 j    | numéro de dossier, type de demande                    |

Les factures SONEB/SBEE ont un montant variable validé côté serveur (500 à 1 000 000 FCFA) ; les autres services ont un tarif fixe. La commission de confort reste affichée séparément. Le catalogue est défini dans `apps/api/prisma/seed.ts` : ajouter un service revient à ajouter une entrée puis à relancer `npm run db:seed`.

## API

| Méthode | Route                           | Auth | Description                                    |
| ------- | ------------------------------- | ---- | ---------------------------------------------- |
| GET     | `/health`                       | —    | état du service                                |
| POST    | `/identity/scan`                | —    | scan facial simulé, création user + JWT        |
| GET     | `/identity/me`                  | JWT  | identité courante                              |
| GET     | `/services`                     | —    | services actifs                                |
| GET     | `/services/:slug`               | —    | détail d'un service                            |
| POST    | `/dossiers`                     | JWT  | créer un dossier pré-rempli                    |
| GET     | `/dossiers`                     | JWT  | dossiers de l'utilisateur                      |
| GET     | `/dossiers/:reference`          | JWT  | détail + avancement automatique                |
| POST    | `/dossiers/:reference/pay`      | JWT  | crée le paiement FedaPay ou simule le paiement |
| GET     | `/dossiers/:reference/receipt`  | JWT  | reçu PDF du dossier payé                       |
| GET, POST | `/dossiers/:reference/documents` | JWT | lister / déposer une pièce justificative  |
| GET, DELETE | `/dossiers/:reference/documents/:id` | JWT | télécharger / supprimer une pièce    |
| GET     | `/dossiers/:reference/pickup`   | JWT  | code + QR de retrait (statut prêt)             |
| POST, DELETE | `/dossiers/:reference/procuration` | JWT | désigner / retirer une personne mandatée |
| GET     | `/dossiers/:reference/stream`   | JWT  | flux SSE des changements de statut             |
| GET     | `/notifications`                | JWT  | journal des envois du citoyen                  |
| POST    | `/notifications/read`           | JWT  | marquer les notifications comme lues           |
| POST    | `/liveness`                     | —    | contrôle de présence sur trois frames          |
| GET     | `/payments/fedapay/callback`    | —    | retour FedaPay, vérification + redirection     |
| POST    | `/payments/fedapay/webhook`     | —    | notifications FedaPay                          |
| POST    | `/admin/login`                  | —    | connexion agent (code admin)                   |
| GET     | `/admin/session`                | admin | vérifier la session agent                      |
| GET     | `/admin/stats`                  | admin | statistiques du back-office                    |
| GET     | `/admin/dossiers`               | admin | file de dossiers (`status`, `q`)               |
| GET     | `/admin/dossiers/:reference`    | admin | détail d'un dossier                            |
| POST    | `/admin/dossiers/:reference/status` | admin | changer le statut                         |
| POST    | `/admin/dossiers/:reference/pickup` | admin | valider un retrait par code ou QR         |
| GET     | `/admin/dossiers/:reference/documents/:id` | admin | télécharger une pièce             |
| GET     | `/admin/notifications`          | admin | journal global des notifications              |
| POST    | `/admin/notifications/retry`    | admin | renvoyer les notifications en échec           |
| POST    | `/admin/reminders/run`          | admin | relancer les dossiers prêts non retirés       |
| GET     | `/admin/audit`                  | admin | journal d'audit (admin uniquement)            |
| GET     | `/admin/export`                 | admin | export CSV de la file de dossiers             |

Authentification : `Authorization: Bearer <JWT>`. Le front conserve le JWT dans un cookie `httpOnly` et appelle l'API côté serveur (server actions).

## Scripts utiles

À la racine :

```bash
npm run dev        # API + web en parallèle
npm run build      # build des deux applications
npm run typecheck
npm run lint
```

Dans `apps/api` :

```bash
npm run db:push
npm run db:seed
npm run typecheck
npm run build
```

## Simulation

- **Identité** : nom, NPI (13 chiffres), date/lieu de naissance et téléphone générés aléatoirement à chaque scan.
- **Paiement** : FedaPay si une clé est configurée, sinon succès simulé immédiat ; tout numéro au format `01` + 8 chiffres est accepté.
- **Administration** : le dossier passe à « Identité vérifiée » au paiement confirmé, « En cours de traitement » à 10 s, « Prêt à récupérer » à 25 s. L'écran de suivi interroge l'API toutes les 3 s.
- **Prix** : frais officiels du service + 1 000 FCFA de commission de confort, affichés avant paiement.
