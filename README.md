# MindBenin — Think & Go

Démo de la plateforme qui supprime la file d'attente administrative au Bénin : le citoyen scanne son visage, parle ou choisit un service, l'app remplit le formulaire avec son NPI, paie par mobile money et suit le dossier jusqu'au retrait.

> Phase 1 : identité ANIP et administration simulées. Le paiement passe par FedaPay s'il est configuré, sinon il est simulé. Aucune donnée réelle, aucun débit réel sans clés de production.

## Stack

| Partie   | Technologie                                                  |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Backend  | NestJS 11, JWT, Prisma 6, FedaPay                            |
| Base     | PostgreSQL 16 (Docker)                                       |
| Monorepo | Turborepo + npm workspaces                                   |

## Structure

```text
apps/
  api/                 API NestJS (port 4001)
    prisma/            schéma + seed des services
    src/
      auth/            garde JWT
      identity/        scan ANIP simulé + session
      services/        catalogue des démarches
      dossiers/        création, suivi, paiement
      fedapay/         client API FedaPay
      payments/        callback + webhook FedaPay
      prisma/          client Prisma
  web/                 Front Next.js (port 3000)
    app/               landing, scan, /app, services, dossiers
    components/
    lib/               client API, session, server actions, statuts
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

Lance PostgreSQL, l'API (4001), le front (3000) et le service facial (8000). Les données Postgres sont conservées dans le volume `mindbenin_pgdata`. Les clés et codes se passent par un fichier `.env` à la racine (variables `FEDAPAY_SECRET_KEY`, `ADMIN_ACCESS_CODE`, `JWT_SECRET`, etc.) ; sans clé FedaPay le paiement reste simulé.

Parcours de démo : **Scanner mon visage** → choisir un service → créer le dossier → payer (numéro `01 XX XX XX XX`) → regarder le statut avancer.

## Variables d'environnement

Pour Docker, créer un fichier `.env` à la racine avec les mêmes variables (`FEDAPAY_*`, `ADMIN_ACCESS_CODE`, `JWT_SECRET`, `WEB_ORIGIN`, …). La compose les transmet à l'API.

`apps/api/.env` (fourni pour le développement local) :

```bash
DATABASE_URL="postgresql://mindbenin:mindbenin@localhost:5433/mindbenin?schema=public"
JWT_SECRET="mindbenin-dev-secret-change-me"
PORT=4001
WEB_ORIGIN="http://localhost:3000"
ADMIN_ACCESS_CODE="mindbenin-admin"        # accès au back-office /admin
FACE_SERVICE_URL="http://localhost:8000"    # service facial Python (scan reel)

FEDAPAY_SECRET_KEY=""                     # clé sk_sandbox_… / sk_live_…
FEDAPAY_BASE_URL="https://sandbox-api.fedapay.com/v1"
FEDAPAY_CALLBACK_URL="http://localhost:4001/payments/fedapay/callback"
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
| GET     | `/payments/fedapay/callback`    | —    | retour FedaPay, vérification + redirection     |
| POST    | `/payments/fedapay/webhook`     | —    | notifications FedaPay                          |
| POST    | `/admin/login`                  | —    | connexion agent (code admin)                   |
| GET     | `/admin/session`                | admin | vérifier la session agent                      |
| GET     | `/admin/stats`                  | admin | statistiques du back-office                    |
| GET     | `/admin/dossiers`               | admin | file de dossiers (`status`, `q`)               |
| GET     | `/admin/dossiers/:reference`    | admin | détail d'un dossier                            |
| POST    | `/admin/dossiers/:reference/status` | admin | changer le statut                         |

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
