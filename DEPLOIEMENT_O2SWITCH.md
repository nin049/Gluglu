# Guide de déploiement GluGlu sur o2switch

## Prérequis
- Un hébergement o2switch actif avec un domaine (ex: `mondomaine.com`)
- Accès au cPanel o2switch

---

## Étape 1 — Créer la base de données MySQL

1. Connecte-toi à **cPanel** (https://mondomaine.com/cpanel)
2. Va dans **Bases de données MySQL** (ou MySQL Database Wizard)
3. Crée une nouvelle BDD : ex `monsite_gluglu`
4. Crée un utilisateur : ex `monsite_gluglu_user` avec un mot de passe fort
5. Ajoute l'utilisateur à la BDD avec **tous les privilèges**
6. Note les infos :
   - DB_HOST : `localhost`
   - DB_NAME : `monsite_gluglu` (ou avec préfixe cPanel)
   - DB_USER : `monsite_gluglu_user`
   - DB_PASSWORD : ton mot de passe

### Créer les tables
7. Va dans **phpMyAdmin** (dans cPanel)
8. Sélectionne ta BDD
9. Clique sur **SQL**
10. Copie-colle le contenu de `backend/src/db/migrations.sql` et exécute

---

## Étape 2 — Déployer le backend Node.js

### 2.1 Uploader les fichiers
1. Via **cPanel > Gestionnaire de fichiers** ou FTP (FileZilla)
2. Va dans `public_html/` ou crée un sous-dossier ex `api/`
3. Uploade tout le contenu du dossier `backend/`
   - Ne pas uploader `node_modules/`
   - Ne pas uploader `.env` (tu vas le créer en ligne)

### 2.2 Configurer l'app Node.js
1. Dans cPanel, va dans **Setup Node.js App**
2. Clique **Create Application**
3. Configure :
   - **Node.js version** : 18+ (ou 20)
   - **Application mode** : Production
   - **Application root** : `api` (ou le dossier où tu as uploadé)
   - **Application URL** : `mondomaine.com/api` (ou sous-domaine)
   - **Application startup file** : `src/app.js`
4. Clique **Create**

### 2.3 Créer le fichier .env
1. Dans le Gestionnaire de fichiers cPanel, va dans ton dossier backend
2. Crée un fichier `.env` à la racine :

```
PORT=3000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_NAME=monsite_gluglu
DB_USER=monsite_gluglu_user
DB_PASSWORD=ton_mot_de_passe

JWT_SECRET=une_chaine_tres_longue_et_aleatoire_ici_minimum_32_caracteres
JWT_EXPIRES_IN=7d

OPENAI_API_KEY=sk-...
```

### 2.4 Installer les dépendances
1. Dans cPanel > **Setup Node.js App**, clique sur ton app
2. Clique **Run NPM Install** (ou via terminal SSH si disponible)

```bash
# Via SSH o2switch (si activé)
cd ~/public_html/api
npm install --production
```

### 2.5 Démarrer l'app
1. Dans **Setup Node.js App**, clique **Restart**
2. Teste : `https://mondomaine.com/api/health` doit retourner `{"status":"ok"}`

---

## Étape 3 — Configurer le mobile

1. Ouvre `mobile/src/api/index.js`
2. Remplace l'URL de production :

```js
const BASE_URL = __DEV__
  ? 'http://192.168.1.X:3000/api'      // Ton IP locale
  : 'https://mondomaine.com/api';       // ⬅️ Ton vrai domaine
```

---

## Étape 4 — Build et publication de l'app

### Développement (test local)
```bash
cd mobile
npm install
npx expo start
# Scanne le QR code avec l'app Expo Go sur ton téléphone
```

### Build production (APK Android)
```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer
cd mobile
eas build:configure

# Build APK
eas build --platform android --profile preview
```

### Build production (iOS)
```bash
eas build --platform ios
# Nécessite un compte Apple Developer (99€/an)
```

---

## Résumé des URLs

| Service | URL |
|---------|-----|
| Backend health | `https://mondomaine.com/api/health` |
| Register | `POST https://mondomaine.com/api/auth/register` |
| Login | `POST https://mondomaine.com/api/auth/login` |
| Scan | `POST https://mondomaine.com/api/products/scan` |
| Historique | `GET https://mondomaine.com/api/scans/history` |

---

## Variables d'environnement à avoir absolument

| Variable | Où l'obtenir |
|----------|-------------|
| `DB_*` | cPanel MySQL |
| `JWT_SECRET` | Génère avec : `openssl rand -hex 32` |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
