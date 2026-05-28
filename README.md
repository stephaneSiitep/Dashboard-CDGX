# Cibest — Dashboard de Supervision des Equipements

Cibest est un tableau de bord de supervision en temps réel conçu pour surveiller l'état des équipements réseau déployés sur les lignes de transport. Il centralise les remontées d'information issues du serveur MDR6, du serveur IA, et des périphériques réseau (caméras, switches, NVR), tout en offrant un panneau d'administration pour la gestion des équipements et des utilisateurs.

---

## Contexte

Le système répond à un besoin opérationnel précis : disposer d'une vue unifiée sur l'état de santé des équipements embarqués dans les trains et dans les infrastructures fixes. Trois sources d'information convergent vers ce dashboard :

- **Le serveur MDR6**, qui remonte les données de présence et d'état des trains.
- **Le serveur IA**, qui remonte les données de comptage de passagers issues des caméras intelligentes.
- **La supervision réseau directe**, via un service de ping continu qui sonde les équipements toutes les cinq minutes et enregistre leur disponibilité et leur latence.

Le client a également souhaité disposer d'un panneau d'administration permettant de gérer les utilisateurs ayant accès à la plateforme, ainsi que le référentiel des équipements supervisés.

---

## Architecture générale

```
Cibest/
├── backend/          # Serveur API REST (Node.js / Express)
├── frontend/         # Interface utilisateur (React / Vite)
├── pinger/           # Service de ping continu (Python)
├── init.sql          # Schéma et données initiales PostgreSQL
└── docker-compose.yml
```

L'application repose sur trois services distincts :

| Service | Technologie | Rôle |
|---------|-------------|------|
| Base de données | PostgreSQL 15 | Stockage des résultats de ping, des équipements et des utilisateurs |
| API backend | Node.js / Express | Expose les données à l'interface et gère l'authentification |
| Interface frontend | React 19 / Vite | Dashboard de visualisation et panneau d'administration |
| Pinger | Python 3.11 | Sonde périodiquement les équipements par ICMP et alimente la base |

---

## Fonctionnalités

### Dashboard de supervision (`/cibest`)

La page principale offre une vue consolidée de l'état du parc d'équipements.

**Indicateurs clés (KPI)**
Quatre cartes affichent en temps réel le nombre total d'équipements, le nombre d'équipements en ligne, le nombre d'équipements hors ligne, et le taux de disponibilité global exprimé en pourcentage.

**Visualisations graphiques**
- Un graphique en anneau (donut) montre la répartition entre équipements accessibles et inaccessibles.
- Un graphique en barres compare les temps de réponse (RTT) des dix équipements les plus surveillés.
- Un graphique de performance temporelle (TimelinePerformance) permet d'explorer l'historique de latence sur les dernières 1h, 6h ou 24h pour chaque équipement.

**Topologie réseau (NetworkTopology)**
Ce composant propose deux modes de visualisation : une vue en grille qui présente tous les équipements sous forme de tuiles colorées selon leur état, et une vue par sous-réseau qui regroupe les équipements par plage IP. Les nœuds peuvent être animés pour signaler visuellement les équipements actifs. Un panneau latéral affiche les détails d'un équipement sélectionné (IP, RTT, TTL, dernière vérification).

**Tableau de données**
Un tableau complet liste tous les équipements avec leur adresse IP, leur statut, leur temps de réponse, leur TTL, les éventuels messages d'erreur, et l'horodatage de la dernière vérification.

**Actualisation automatique**
Les données sont rechargées toutes les dix secondes sans intervention de l'utilisateur.

**Mode sombre**
Toute l'interface prend en charge un mode sombre, activable depuis l'en-tête, avec persistance de la préférence dans le navigateur.

---

### Panneau d'administration (`/admin`)

Accessible uniquement aux utilisateurs ayant le rôle `admin`, ce panneau permet de gérer les deux référentiels centraux de l'application.

**Onglet Utilisateurs**
- Vue d'ensemble avec des compteurs : nombre total d'utilisateurs, nombre d'administrateurs, nombre d'équipements, équipements actifs.
- Tableau des utilisateurs avec recherche par nom ou e-mail.
- Création, modification et suppression de comptes utilisateurs.
- Pour chaque utilisateur : nom, e-mail, rôle (`admin` ou `operator`), statut actif/inactif, date de dernière connexion.

**Onglet Equipements**
- Tableau des équipements supervisés avec recherche par nom ou IP.
- Création, modification et suppression d'équipements.
- Import en masse depuis un fichier Excel (`.xlsx`) : un bouton permet de télécharger le modèle vierge, un autre d'importer un fichier rempli avec un retour détaillé (lignes ajoutées, ignorées, erreurs).
- Export de l'ensemble du référentiel vers un fichier Excel.

---

## Stack technique

### Backend
- **Node.js** avec **Express.js** pour l'API REST
- **PostgreSQL** pour le stockage persistant
- **JWT** (`jsonwebtoken`) pour l'authentification sans état
- **bcryptjs** pour le hachage des mots de passe
- **Multer** pour la réception des fichiers uploadés
- **XLSX** pour la lecture et la génération de fichiers Excel

### Frontend
- **React 19** avec **React Router 7**
- **Vite** comme outil de build
- **Tailwind CSS 4** pour le style
- **ApexCharts** (via `react-apexcharts`) pour tous les graphiques
- **FontAwesome** pour les icônes

### Service de ping
- **Python 3.11** avec `subprocess` pour l'exécution des commandes ping système
- **psycopg2** pour l'écriture des résultats en base PostgreSQL
- Compatible Windows et Linux

---

## Schéma de base de données

### `equipements`
Référentiel des équipements supervisés.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique |
| name | VARCHAR(100) | Nom de l'équipement |
| ip | VARCHAR(15) | Adresse IP (unique) |
| type | VARCHAR(50) | Type : Camera, Server, Switch, Router, NVR... |
| location | VARCHAR(100) | Emplacement physique |
| description | TEXT | Description libre |
| active | BOOLEAN | Equipement actif ou non |
| created_at | TIMESTAMP | Date de création |

### `ping_results`
Historique des résultats de sondage ICMP.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique |
| ip | VARCHAR(15) | Adresse IP sondée |
| name | VARCHAR(100) | Nom associé |
| reachable | VARCHAR(100) | `'true'` ou `'false'` |
| rtt_ms | REAL | Temps de réponse en millisecondes |
| ttl | INTEGER | Valeur TTL retournée |
| timestamp | TIMESTAMP | Horodatage de la mesure |
| error | TEXT | Message d'erreur éventuel |

### `users`
Comptes utilisateurs de la plateforme.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique |
| username | VARCHAR(50) | Nom d'utilisateur (unique) |
| email | VARCHAR(100) | Adresse e-mail (unique) |
| password_hash | VARCHAR(255) | Mot de passe haché (bcrypt) |
| role | VARCHAR(20) | `'admin'` ou `'operator'` |
| is_active | BOOLEAN | Compte actif ou non |
| created_at | TIMESTAMP | Date de création |
| last_login | TIMESTAMP | Dernière connexion |

---

## API REST

### Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion (retourne un JWT) |
| GET | `/api/auth/me` | Profil de l'utilisateur connecté |

### Supervision (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/cibest/equipements` | Statut actuel de tous les équipements |
| GET | `/api/cibest/equipements/status` | Résumé statistique (total, online, offline, uptime) |
| GET | `/api/cibest/equipements/:id` | Détail d'un équipement par son identifiant |
| GET | `/api/health` | Santé de l'API |

### Administration (JWT requis + rôle admin)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/admin/users` | Liste des utilisateurs |
| POST | `/api/admin/users` | Créer un utilisateur |
| PUT | `/api/admin/users/:id` | Modifier un utilisateur |
| DELETE | `/api/admin/users/:id` | Supprimer un utilisateur |
| GET | `/api/admin/equipements` | Liste des équipements |
| POST | `/api/admin/equipements` | Créer un équipement |
| PUT | `/api/admin/equipements/:id` | Modifier un équipement |
| DELETE | `/api/admin/equipements/:id` | Supprimer un équipement |
| GET | `/api/admin/equipements/template` | Télécharger le modèle Excel |
| GET | `/api/admin/equipements/export` | Exporter tous les équipements en Excel |
| POST | `/api/admin/equipements/import` | Importer des équipements depuis un fichier Excel |

---

## Authentification

Le système utilise des tokens JWT avec une durée de validité de 8 heures. A la connexion, le serveur vérifie les identifiants contre le hash bcrypt stocké en base, puis retourne un token signé. Ce token est conservé dans le `localStorage` du navigateur et transmis dans l'en-tête `Authorization` de chaque requête vers les routes protégées.

Le contrôle d'accès distingue deux rôles :
- **admin** : accès complet au dashboard et au panneau d'administration.
- **operator** : accès au dashboard de supervision uniquement.

Après connexion, l'utilisateur est redirigé automatiquement vers la page correspondant à son rôle.

---

## Service de ping

Le script `pinger/ping_api.py` tourne en continu et effectue un cycle de sondage toutes les cinq minutes. Il interroge l'ensemble des adresses IP définies dans sa configuration (par exemple la plage `10.136.115.60` à `10.136.115.79`, le serveur MDR6, et le serveur IA), puis écrit les résultats en base de données.

Pour chaque équipement sondé :
- Jusqu'à 3 tentatives de ping sont effectuées avant de déclarer l'équipement inaccessible.
- Le RTT moyen, la valeur TTL et un éventuel message d'erreur sont enregistrés.
- Le script s'adapte automatiquement à Windows (`-n`) et Linux (`-c`).

L'API backend lit systématiquement la dernière entrée de `ping_results` pour chaque IP afin de déterminer l'état courant affiché sur le dashboard.

---

## Déploiement avec Docker

L'application est containerisée via Docker Compose. Deux services sont définis dans `docker-compose.yml` : la base de données PostgreSQL et l'API backend.

```bash
docker-compose up -d
```

La base de données est initialisée automatiquement au premier démarrage à partir du fichier `init.sql`, qui crée les tables et insère le compte administrateur par défaut.

Le service de ping est packagé séparément (`pinger/Dockerfile`) et peut être lancé indépendamment en lui fournissant les variables de connexion à la base.

### Variables d'environnement (backend)

| Variable | Valeur par défaut | Description |
|----------|------------------|-------------|
| `POSTGRES_HOST` | `db` | Hôte PostgreSQL |
| `POSTGRES_PORT` | `5432` | Port PostgreSQL |
| `POSTGRES_DB` | `cdgxpress` | Nom de la base |
| `POSTGRES_USER` | `cdgxpress_user` | Utilisateur |
| `POSTGRES_PASSWORD` | `password` | Mot de passe |
| `PORT` | `3000` | Port d'écoute de l'API |
| `JWT_SECRET` | `cibest_secret_key_change_in_production` | Clé de signature JWT |

En production, la valeur de `JWT_SECRET` doit impérativement être remplacée par une clé forte et aléatoire.

---

## Lancement en développement

### Prérequis

- Node.js 18+
- Python 3.11+
- PostgreSQL 15 (ou Docker)

### Backend

```bash
cd backend
npm install
node index.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface est accessible sur `http://localhost:5173` et l'API sur `http://localhost:3000`.

### Service de ping

```bash
pip install -r requirements.txt
python pinger/ping_api.py
```

---

## Accès par défaut

A l'initialisation de la base, un compte administrateur est créé automatiquement :

| Champ | Valeur |
|-------|--------|
| Nom d'utilisateur | `admin` |
| Mot de passe | `Admin123!` |
| Rôle | `admin` |

Ce compte doit être modifié dès la première mise en service.

---

## Points d'attention pour la production

- Remplacer le `JWT_SECRET` par une valeur générée de façon sécurisée.
- Changer le mot de passe administrateur par défaut.
- Modifier le mot de passe de la base de données PostgreSQL dans `docker-compose.yml`.
- L'URL de l'API est actuellement en dur dans le frontend (`http://localhost:3000`) — la paramétrer via une variable d'environnement Vite (`VITE_API_URL`) avant tout déploiement distant.
- Le mode sombre et certaines préférences utilisateur sont stockés dans le `localStorage` du navigateur, ce qui signifie qu'ils ne sont pas partagés entre appareils.
