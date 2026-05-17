# GluGlu — Détecteur de risque gluten 🌾

Application mobile permettant de scanner un code-barres produit et d'obtenir une analyse du risque gluten via IA.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native (Expo) |
| Backend | Node.js + Express |
| Base de données | MySQL (o2switch) |
| Auth | JWT + bcrypt |
| IA | OpenAI GPT-4o-mini |
| API produit | OpenFoodFacts |

## Structure

```
GluGlu/
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── app.js           # Entry point
│   │   ├── db/
│   │   │   ├── index.js     # Pool MySQL
│   │   │   └── migrations.sql
│   │   ├── middleware/
│   │   │   └── auth.js      # Vérification JWT
│   │   └── routes/
│   │       ├── auth.js      # register / login
│   │       ├── products.js  # scan barcode
│   │       └── scans.js     # historique
│   ├── .env.example
│   └── package.json
├── mobile/                  # App React Native
│   ├── App.js
│   └── src/
│       ├── api/index.js
│       ├── context/AuthContext.js
│       ├── navigation/index.js
│       └── screens/
│           ├── LoginScreen.js
│           ├── RegisterScreen.js
│           ├── ScannerScreen.js
│           ├── ProductScreen.js
│           └── HistoryScreen.js
└── DEPLOIEMENT_O2SWITCH.md  # Guide de déploiement
```

## Démarrage rapide

### Backend (dev local)
```bash
cd backend
cp .env.example .env
# Remplis le .env
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## Déploiement
Voir [DEPLOIEMENT_O2SWITCH.md](./DEPLOIEMENT_O2SWITCH.md)
