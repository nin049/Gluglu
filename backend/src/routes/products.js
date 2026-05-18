const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Tableaux officiels français (source : HAS / AFDIAG) ─────────────────────
// Ingrédients INTERDITS – contiennent du gluten
const GLUTEN_FORBIDDEN = [
  'amidon de blé', 'amidon transformé de blé', 'amidon modifié de blé',
  'amidon issu des céréales interdites',
  'acides aminés végétaux',
  'assaisonnement',           // "sans autre précision" → risque
  'avoine',
  'blé', 'froment',
  'épeautre', 'engrain',
  'kamut',
  'fécule de blé',
  'fécule',                   // "sans autre précision"
  'gélifiants non précisés',
  'malt',                     // (sauf "extrait de malt" qui est autorisé)
  'extrait de malt d\'orge',
  'matières amylacées',
  'orge',
  'pain azyme',
  'polypeptides',
  'protéines végétales',
  'seigle',
  'triticale',
  'gruau',
  'liant protéinique',
  'gluten',
  'farine de blé', 'farine d\'orge', 'farine de seigle', 'farine d\'épeautre',
  'son de blé', 'son d\'orge', 'son de seigle',
  'germe de blé',
  'amidon de seigle', 'amidon d\'orge',
].sort((a, b) => b.length - a.length); // les plus spécifiques en premier

// Ingrédients AUTORISÉS malgré un nom trompeur (officiellement sans gluten)
const GLUTEN_AUTHORIZED = [
  'amidon modifié', 'amidon transformé', 'amidon',
  'dextrose de blé', 'dextrose',
  'glucose de blé', 'sirop de glucose de blé', 'glucose', 'sirop de glucose',
  'maltodextrine de blé', 'maltodextrine',
  'colorant caramel',
  'sorbitol de blé', 'sorbitol',
  'polyols de blé', 'polyols',
  'extrait de malt',           // ≠ "extrait de malt d'orge" (interdit)
  'arôme de malt d\'orge', 'arôme de malt', 'arômes',
  'ferment',
  'quinoa', 'sarrasin', 'blé noir',
  'fécule de pommes de terre', 'fécule de maïs', 'fécule de riz',
  'avoine non contaminée',
].sort((a, b) => b.length - a.length);

// Mentions "À ÉVITER" (risque de contamination croisée)
const GLUTEN_TO_AVOID_PHRASES = [
  'peut contenir du gluten',
  'peut contenir des traces de blé',
  'peut contenir des traces de seigle',
  'peut contenir des traces d\'orge',
  'peut contenir',
  'traces de blé', 'traces de seigle', 'traces d\'orge',
  'fabriqué dans un atelier travaillant du gluten',
  'fabriqué dans un atelier qui utilise du gluten',
  'fabriqué dans un atelier travaillant avec du gluten',
  'fabriqué dans un atelier travaillant également du blé',
];

/**
 * Analyse déterministe basée sur les tableaux officiels HAS/AFDIAG.
 * Retourne :
 *  - forbiddenFound  : ingrédients interdits détectés
 *  - toAvoidFound    : mentions "à éviter" détectées
 *  - deterministicScore : score 0-100 calculé par règles
 */
function deterministicGlutenAnalysis(ingredients, allergens) {
  if (!ingredients) return { forbiddenFound: [], toAvoidFound: [], deterministicScore: null };

  const text = (ingredients + ' ' + (allergens || '')).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sans accents pour matching robuste

  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Chercher les ingrédients interdits (en évitant les faux positifs avec les autorisés)
  const forbiddenFound = [];
  for (const forbidden of GLUTEN_FORBIDDEN) {
    const nForbidden = normalize(forbidden);
    if (!text.includes(nForbidden)) continue;

    // Vérifier que ce n'est pas une version autorisée plus longue
    const isActuallyAuthorized = GLUTEN_AUTHORIZED.some((auth) => {
      const nAuth = normalize(auth);
      return nAuth.includes(nForbidden) && text.includes(nAuth);
    });
    if (!isActuallyAuthorized) {
      forbiddenFound.push(forbidden);
    }
  }

  // 2. Chercher les mentions "à éviter"
  const toAvoidFound = GLUTEN_TO_AVOID_PHRASES.filter((phrase) =>
    text.includes(normalize(phrase))
  );

  // 3. Calculer le score déterministe
  let deterministicScore = null;
  if (forbiddenFound.length > 0) {
    // Ingrédients interdits confirmés → risque élevé
    deterministicScore = Math.min(100, 75 + forbiddenFound.length * 5);
  } else if (toAvoidFound.length > 0) {
    // Seulement des mentions "à éviter" → risque moyen-bas
    deterministicScore = 35 + toAvoidFound.length * 5;
  } else if (ingredients.trim().length > 0) {
    // Liste d'ingrédients présente, rien de suspect trouvé → bas
    deterministicScore = 5;
  }

  return { forbiddenFound, toAvoidFound, deterministicScore };
}

// Analyse IA enrichie avec le contexte des tableaux officiels
async function analyzeGluten(productName, ingredients, allergens, intoleranceLevel = 'sensitive', deterministicResult) {
  const intoleranceContext = {
    strict: 'L\'utilisateur est cœliaque strict : même des traces infimes de gluten sont dangereuses. Sois très conservateur dans ton évaluation.',
    sensitive: 'L\'utilisateur a une sensibilité au gluten : les traces peuvent causer des symptômes. Sois modérément strict.',
    avoiding: 'L\'utilisateur évite le gluten par choix mais n\'est pas cœliaque. Signale les ingrédients évidents mais reste pragmatique.',
  };

  const officialContext = deterministicResult.forbiddenFound.length > 0
    ? `⚠️ ANALYSE OFFICIELLE (tableaux HAS/AFDIAG) : ingrédients INTERDITS détectés → ${deterministicResult.forbiddenFound.join(', ')}. Le score DOIT être ≥ 75.`
    : deterministicResult.toAvoidFound.length > 0
    ? `⚠️ ANALYSE OFFICIELLE : mentions "à éviter" détectées → ${deterministicResult.toAvoidFound.join(', ')}. Le score doit être entre 30 et 60.`
    : `✅ ANALYSE OFFICIELLE : aucun ingrédient interdit détecté dans les tableaux officiels français.`;

  const prompt = `Tu es un expert en alimentation sans gluten. Analyse ce produit alimentaire et retourne UNIQUEMENT un JSON valide.

Profil utilisateur : ${intoleranceContext[intoleranceLevel] || intoleranceContext.sensitive}

${officialContext}

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

Règles officielles françaises (HAS/AFDIAG) :
- INTERDITS (gluten certain) : blé/froment, seigle, orge, épeautre, kamut, avoine, malt, amidon de blé, fécule de blé, farine de blé, gluten, son de blé, gruau, triticale → score ≥ 75
- AUTORISÉS malgré nom trompeur : amidon modifié/transformé (sans précision de céréale), dextrose (même de blé), glucose (même de blé), maltodextrine (même de blé), extrait de malt, arôme de malt, sarrasin, quinoa → ne pas pénaliser
- À ÉVITER (contamination) : "peut contenir", "traces de blé/seigle/orge" → score 30-55
- safe (0-10) : aucun ingrédient suspect
- low (11-30) : risque faible, fabrication partagée possible
- unknown : ingrédients non renseignés`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
  });

  const aiResult = JSON.parse(response.choices[0].message.content.trim());

  // Fusion score IA + déterministe (le déterministe prime si ingrédients interdits détectés)
  if (deterministicResult.forbiddenFound.length > 0) {
    aiResult.risk_score = Math.max(aiResult.risk_score, deterministicResult.deterministicScore);
  } else if (deterministicResult.deterministicScore !== null) {
    // Moyenne pondérée : 60% déterministe, 40% IA quand pas d'interdit confirmé
    aiResult.risk_score = Math.round(
      deterministicResult.deterministicScore * 0.6 + aiResult.risk_score * 0.4
    );
  }

  // Re-calculer le risk_level selon le score final
  if (aiResult.risk_score <= 10) aiResult.risk_level = 'safe';
  else if (aiResult.risk_score <= 30) aiResult.risk_level = 'low';
  else if (aiResult.risk_score <= 60) aiResult.risk_level = 'medium';
  else if (aiResult.risk_score !== null) aiResult.risk_level = 'high';

  // Ajouter les ingrédients interdits trouvés aux suspects
  if (deterministicResult.forbiddenFound.length > 0) {
    aiResult.suspect_ingredients = [
      ...new Set([...deterministicResult.forbiddenFound, ...(aiResult.suspect_ingredients || [])]),
    ];
  }

  return aiResult;
}

// Score ajusté selon le niveau d'intolérance d'un membre
function adjustRiskForMember(baseScore, memberLevel) {
  let score = baseScore;
  if (memberLevel === 'avoiding') score = Math.max(0, score - 15);
  if (memberLevel === 'strict') score = Math.min(100, score + 10);

  let risk_level;
  if (score <= 10) risk_level = 'safe';
  else if (score <= 30) risk_level = 'low';
  else if (score <= 60) risk_level = 'medium';
  else risk_level = 'high';

  return { risk_level, risk_score: score };
}

// POST /api/products/scan
router.post('/scan', authMiddleware, async (req, res) => {
  const { barcode } = req.body;
  if (!barcode) {
    return res.status(400).json({ error: 'Code-barres requis' });
  }

  try {
    // Récupérer l'utilisateur + groupe actif en parallèle avec OpenFoodFacts
    const [[userRows], offResponse] = await Promise.all([
      db.query('SELECT intolerance_level, active_group_id FROM users WHERE id = ?', [req.userId]),
      axios.get(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, { timeout: 8000 }),
    ]);

    const intoleranceLevel = userRows[0]?.intolerance_level || 'sensitive';
    const activeGroupId = userRows[0]?.active_group_id || null;

    // Récupérer les membres du groupe actif (hors l'utilisateur lui-même)
    let groupMembers = [];
    if (activeGroupId) {
      const [memberRows] = await db.query(
        `SELECT u.id, u.name, u.intolerance_level
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = ? AND gm.status = 'accepted' AND gm.user_id != ?`,
        [activeGroupId, req.userId]
      );
      groupMembers = memberRows;
    }

    if (offResponse.data.status === 0) {
      return res.status(404).json({ error: 'Produit non trouvé dans la base OpenFoodFacts' });
    }

    const product = offResponse.data.product;
    const productName = product.product_name || product.product_name_fr || 'Produit inconnu';
    const brand = product.brands || '';
    const ingredients = product.ingredients_text || product.ingredients_text_fr || '';
    const allergens = product.allergens_tags?.join(', ') || product.allergens || '';
    const imageUrl = product.image_front_url || product.image_url || null;

    // Analyse IA avec le niveau le plus strict parmi tous les membres
    const allLevels = [intoleranceLevel, ...groupMembers.map(m => m.intolerance_level)];
    const strictestLevel = allLevels.includes('strict') ? 'strict' : allLevels.includes('sensitive') ? 'sensitive' : 'avoiding';
    const deterministicResult = deterministicGlutenAnalysis(ingredients, allergens);
    const analysis = await analyzeGluten(productName, ingredients, allergens, strictestLevel, deterministicResult);

    // Résultats par membre du groupe
    const groupAnalysis = groupMembers.map((member) => {
      const adjusted = adjustRiskForMember(analysis.risk_score, member.intolerance_level);
      return {
        member_id: member.id,
        member_name: member.name,
        intolerance_level: member.intolerance_level,
        ...adjusted,
      };
    });

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
      group_analysis: groupAnalysis,
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
