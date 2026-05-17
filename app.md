# Application Mobile — Détection du risque gluten via scan de code-barres

## Objectif

Créer une application mobile permettant à une personne intolérante au gluten ou atteinte de la maladie cœliaque de scanner un produit alimentaire afin d’obtenir :

- une estimation du risque lié au gluten
- une analyse des ingrédients
- un niveau de confiance
- une aide à la décision rapide

L’objectif n’est PAS de garantir qu’un produit est 100% sans gluten.

L’application doit être présentée comme un assistant d’analyse et non comme un outil médical certifié.

---

# Fonctionnement global

## 1. Scan du code-barres

L’utilisateur scanne un produit via l’appareil photo du téléphone.

Exemple :
- chips
- sauces
- bonbons
- plats préparés
- boissons
- produits industriels

---

## 2. Récupération des données produit

Utiliser une base de données alimentaire publique.

## APIs possibles

### Principale

- OpenFoodFacts

Site :
https://world.openfoodfacts.org/

API :
https://world.openfoodfacts.org/data

Données récupérables :
- nom du produit
- ingrédients
- allergènes
- traces éventuelles
- labels
- nutrition
- marque
- pays

---

# Architecture recommandée

## Front mobile

Technologie recommandée :
- Flutter
ou
- React Native

Flutter :
- performant
- rapide à développer
- Android + iOS
- bon support caméra

---

## Backend

Node.js + Express

Rôle :
- appeler OpenFoodFacts
- envoyer les ingrédients à l’IA
- calculer le score de risque
- historiser les scans
- gérer les utilisateurs

---

# Fonctionnement IA

## Principe

Une IA analyse :
- la liste des ingrédients
- les allergènes
- les mentions "traces possibles"
- les termes suspects

Puis elle retourne :
- un score de risque
- une explication compréhensible
- un niveau de confiance

---

# Exemple de prompt IA

## Input

```json
{
  "ingredients": [
    "farine de blé",
    "amidon",
    "huile de tournesol",
    "arômes"
  ],
  "allergenes": [
    "gluten"
  ]
}