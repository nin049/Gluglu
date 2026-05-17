const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Analyse les ingrédients avec GPT-4o-mini
async function analyzeGluten(productName, ingredients, allergens, intoleranceLevel = 'sensitive') {
  const intoleranceContext = {
    strict: 'L\'utilisateur est cœliaque strict : même des traces infimes de gluten sont dangereuses. Sois très conservateur dans ton évaluation.',
    sensitive: 'L\'utilisateur a une sensibilité au gluten : les traces peuvent causer des symptômes. Sois modérément strict.',
    avoiding: 'L\'utilisateur évite le gluten par choix mais n\'est pas cœliaque. Signale les ingrédients évidents mais reste pragmatique.',
  };

  const prompt = `Tu es un expert en alimentation sans gluten. Analyse ce produit alimentaire et retourne UNIQUEMENT un JSON valide.

Profil utilisateur : ${intoleranceContext[intoleranceLevel] || intoleranceContext.sensitive}

Produit : ${productName || 'inconnu'}
Ingrédients : ${ingredients || 'non renseignés'}
Allergènes déclarés : ${allergens || 'aucun'}

Retourne ce JSON exact (sans markdown, sans explications) :
{
  "risk_level": "safe|low|medium|high|unknown",
  "risk_score": <entier 0-100>,
  "explanation": "<explication courte en français, 1-2 phrases>",
  "suspect_ingredients": ["liste", "des", "ingrédients", "suspects"]
}

Règles générales :
- safe (0-10) : aucun ingrédient suspect, pas d'allergène gluten
- low (11-30) : traces possibles, fabrication partagée
- medium (31-60) : ingrédients ambigus ou amidon non spécifié
- high (61-100) : blé, seigle, orge, épeautre, farine de blé, gluten explicite
- unknown : ingrédients non renseignés`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
  });

  return JSON.parse(response.choices[0].message.content.trim());
}

// POST /api/products/scan
router.post('/scan', authMiddleware, async (req, res) => {
  const { barcode } = req.body;
  if (!barcode) {
    return res.status(400).json({ error: 'Code-barres requis' });
  }

  try {
    // Récupérer le niveau d'intolérance de l'utilisateur
    const [userRows] = await db.query('SELECT intolerance_level FROM users WHERE id = ?', [req.userId]);
    const intoleranceLevel = userRows[0]?.intolerance_level || 'sensitive';
    // Appel OpenFoodFacts
    const offResponse = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { timeout: 8000 }
    );

    if (offResponse.data.status === 0) {
      return res.status(404).json({ error: 'Produit non trouvé dans la base OpenFoodFacts' });
    }

    const product = offResponse.data.product;
    const productName = product.product_name || product.product_name_fr || 'Produit inconnu';
    const brand = product.brands || '';
    const ingredients = product.ingredients_text || product.ingredients_text_fr || '';
    const allergens = product.allergens_tags?.join(', ') || product.allergens || '';
    const imageUrl = product.image_front_url || product.image_url || null;

    // Analyse IA
    const analysis = await analyzeGluten(productName, ingredients, allergens, intoleranceLevel);

    // Sauvegarde en BDD
    await db.query(
      `INSERT INTO scans (user_id, barcode, product_name, brand, risk_level, risk_score, ai_explanation, ingredients, allergens, image_url, suspect_ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        barcode,
        productName,
        brand,
        analysis.risk_level,
        analysis.risk_score,
        analysis.explanation,
        ingredients.substring(0, 1000),
        allergens,
        imageUrl,
        JSON.stringify(analysis.suspect_ingredients || []),
      ]
    );

    res.json({
      product: {
        name: productName,
        brand,
        barcode,
        ingredients,
        allergens,
        image: imageUrl,
      },
      analysis: {
        risk_level: analysis.risk_level,
        risk_score: analysis.risk_score,
        explanation: analysis.explanation,
        suspect_ingredients: analysis.suspect_ingredients || [],
      },
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Erreur lors de l\'analyse IA' });
    }
    console.error('Scan error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
  }
});

module.exports = router;
