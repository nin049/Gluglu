0 tâches à faire créées

## Pour mettre à jour l'app

### Étape 1 — Incrémenter la version dans `app.json`

```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    },
    "android": {
      "versionCode": 2
    }
  }
}
```

### Étape 2 — Rebuilder

```bash
# iOS
eas build -p ios --profile production

# Android
eas build -p android --profile production

# Les deux en même temps
eas build --platform all --profile production
```

### Étape 3 — Soumettre

```bash
# iOS → TestFlight automatiquement
eas submit -p ios

# Android → Google Play (si tu y es)
eas submit -p android
```

---

## Astuce — Mises à jour sans rebuild (OTA)

Pour des petites modifs (texte, couleurs, logique JS) sans toucher au code natif, tu peux utiliser **EAS Update** — ça pousse la mise à jour directement sur les téléphones sans passer par l'App Store :

```bash
eas update --branch production --message "Fix bug scanner"
```

Les utilisateurs reçoivent la mise à jour au prochain lancement de l'app. **Pas besoin de revalider chez Apple.**

---

**En résumé :**
- Changement JS/UI → `eas update` (instantané)
- Nouvelle permission, lib native, icône → `eas build` + `eas submit`