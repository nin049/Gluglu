const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache simple pour éviter de retraduire les mêmes textes
const translateCache = new Map();

async function translateIngredients(text, targetLang) {
  if (!text) return text;
  const cacheKey = `${targetLang}:${text.slice(0, 60)}`;
  if (translateCache.has(cacheKey)) return translateCache.get(cacheKey);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 5000 });
    const translated = res.data[0].map(chunk => chunk[0]).join('');
    translateCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

// ─── Tableaux officiels français (source : HAS / AFDIAG) ─────────────────────

// Marques 100% dédiées sans gluten → score forcé à 0 si aucun ingrédient interdit
const GLUTEN_FREE_DEDICATED_BRANDS = [
  'schär', 'schar', 'gerblé', 'gerble', 'ds gluten', 'glutino', 'enjoy life',
  'warburtons gluten free', 'genius', 'doves farm', 'orgran', 'bfree',
  'dietary specials', 'proceli', 'semper',
];

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
  // Farines naturellement sans gluten
  'farine de maïs', 'farine de riz', 'farine de teff', 'farine de sarrasin',
  'farine de millet', 'farine de sorgho', 'farine de châtaigne', 'farine de pois chiche',
  'farine de lupin', 'farine de coco', 'farine d\'amarante', 'farine de quinoa',
  // Fécules naturellement sans gluten
  'fécule de pommes de terre', 'fécule de maïs', 'fécule de riz', 'fécule de tapioca',
  'amidon de maïs', 'amidon de riz', 'amidon de tapioca', 'amidon de pomme de terre',
  // Autres ingrédients autorisés
  'avoine non contaminée',
  'corn', 'teff', 'rice', 'tapioca', 'maïs',  // versions anglaises (OpenFoodFacts)
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
 *  - isGlutenFreeCertified : produit portant un label "sans gluten" officiel
 */
function deterministicGlutenAnalysis(ingredients, allergenTagsRaw, labelTags, brand) {
  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Vérification du label certifié sans gluten (ex: "en:gluten-free", "fr:sans-gluten")
  const isGlutenFreeCertified = (labelTags || []).some((tag) =>
    tag.includes('gluten-free') || tag.includes('sans-gluten')
  );

  // Vérification marque 100% dédiée sans gluten
  const nBrand = normalize(brand || '');
  const isDedicatedBrand = GLUTEN_FREE_DEDICATED_BRANDS.some((b) => nBrand.includes(normalize(b)));

  if (!ingredients) return { forbiddenFound: [], toAvoidFound: [], deterministicScore: null, isGlutenFreeCertified, isDedicatedBrand };

  // NE PAS inclure les allergen_tags d'OpenFoodFacts dans la recherche textuelle :
  // leur format "en:gluten" contient le mot "gluten" sans que ce soit un ingrédient réel.
  // On cherche uniquement dans le texte des ingrédients.
  const text = normalize(ingredients);

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

  // 2. Chercher les mentions "à éviter" (dans les ingrédients uniquement)
  const toAvoidFound = GLUTEN_TO_AVOID_PHRASES.filter((phrase) =>
    text.includes(normalize(phrase))
  );

  // 3. Calculer le score déterministe
  let deterministicScore = null;
  if (isGlutenFreeCertified || isDedicatedBrand) {
    // Produit certifié ou marque 100% dédiée → score 0 systématiquement.
    // La certification garantit que même les dérivés de blé (amidon de blé déglutinisé, etc.)
    // ont été traités pour être sans gluten — la certification prime sur la liste d'ingrédients.
    deterministicScore = 0;
  } else if (forbiddenFound.length > 0) {
    deterministicScore = Math.min(100, 75 + forbiddenFound.length * 5);
  } else if (toAvoidFound.length > 0) {
    deterministicScore = 35 + toAvoidFound.length * 5;
  } else if (ingredients.trim().length > 0) {
    deterministicScore = 5;
  }

  return { forbiddenFound, toAvoidFound, deterministicScore, isGlutenFreeCertified, isDedicatedBrand };
}

// Analyse IA enrichie avec le contexte des tableaux officiels
async function analyzeGluten(productName, ingredients, allergens, intoleranceLevel = 'sensitive', deterministicResult) {
  const intoleranceContext = {
    strict: 'L\'utilisateur est cœliaque strict : même des traces infimes de gluten sont dangereuses. Sois très conservateur dans ton évaluation.',
    sensitive: 'L\'utilisateur a une sensibilité au gluten : les traces peuvent causer des symptômes. Sois modérément strict.',
    avoiding: 'L\'utilisateur évite le gluten par choix mais n\'est pas cœliaque. Signale les ingrédients évidents mais reste pragmatique.',
  };

  const officialContext = (deterministicResult.isGlutenFreeCertified || deterministicResult.isDedicatedBrand)
    ? `✅ CE PRODUIT EST GARANTI SANS GLUTEN (${deterministicResult.isDedicatedBrand ? 'marque 100% dédiée sans gluten' : 'label certifié'}). Les dérivés de blé présents (amidon de blé, sirop de glucose de blé, etc.) sont autorisés car déglutinisés. Le score DOIT être 0.`
    : deterministicResult.forbiddenFound.length > 0
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
- INTERDITS (gluten certain) : blé/froment, seigle, orge, épeautre, kamut, avoine, malt, amidon de blé, fécule de blé, farine de blé, gluten explicite, son de blé, gruau, triticale → score ≥ 75
- NATURELLEMENT SANS GLUTEN (ne pas suspecter) : maïs/corn, riz/rice, teff, sarrasin, quinoa, millet, sorgho, tapioca, pomme de terre, farine de maïs/riz/teff, fécule de maïs/riz
- AUTORISÉS malgré nom trompeur : amidon modifié/transformé (sans précision de céréale), dextrose (même de blé), glucose (même de blé), maltodextrine (même de blé), extrait de malt, arôme de malt, sarrasin, quinoa → ne pas pénaliser
- À ÉVITER (contamination) : "peut contenir", "traces de blé/seigle/orge" → score 30-55
- safe (0-10) : aucun ingrédient suspect
- low (11-30) : risque faible, fabrication partagée possible
- unknown : ingrédients non renseignés
- IMPORTANT : "en:gluten" ou "en:soybeans" dans les allergènes sont des TAGS OpenFoodFacts, pas des ingrédients réels. Ne pas les prendre en compte directement.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
  });

  const aiResult = JSON.parse(response.choices[0].message.content.trim());

  // Fusion score IA + déterministe
  if (deterministicResult.isGlutenFreeCertified || deterministicResult.isDedicatedBrand) {
    // Marque dédiée ou label certifié → 0 fixe, la certification prime sur tout
    aiResult.risk_score = 0;
  } else if (deterministicResult.forbiddenFound.length > 0) {
    // Ingrédients interdits confirmés → le déterministe prime
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
    const productName = product.product_name_fr || product.product_name || 'Produit inconnu';
    const brand = product.brands || '';

    // Préférer la langue sélectionnée par l'utilisateur, fallback français, puis toute autre langue
    const lang = req.headers['x-app-language'] || 'fr';
    const ingredientsRaw =
      product[`ingredients_text_${lang}`] ||
      product.ingredients_text_fr ||
      product.ingredients_text ||
      '';

    // Toujours traduire vers la langue demandée (Google Translate ne modifie pas si déjà dans la bonne langue)
    const ingredients = await translateIngredients(ingredientsRaw, lang);

    const allergenTagsRaw = product.allergens_tags || [];
    // Mapping officiel des tags allergènes → noms lisibles (FR par défaut, traduit si besoin)
    const ALLERGEN_FR = {
      'en:gluten': 'Gluten', 'en:wheat': 'Blé', 'en:rye': 'Seigle',
      'en:barley': 'Orge', 'en:oats': 'Avoine', 'en:spelt': 'Épeautre',
      'en:kamut': 'Kamut', 'en:milk': 'Lait', 'en:eggs': 'Œufs',
      'en:fish': 'Poisson', 'en:crustaceans': 'Crustacés',
      'en:molluscs': 'Mollusques', 'en:soybeans': 'Soja',
      'en:peanuts': 'Arachides', 'en:nuts': 'Fruits à coque',
      'en:sesame-seeds': 'Graines de sésame', 'en:mustard': 'Moutarde',
      'en:celery': 'Céleri', 'en:lupin': 'Lupin',
      'en:sulphur-dioxide-and-sulphites': 'Sulfites',
    };
    const allergensRawFr = allergenTagsRaw.length > 0
      ? allergenTagsRaw.map(t => ALLERGEN_FR[t] || t.replace(/^[a-z]{2}:/, '')).join(', ')
      : product.allergens || '';
    // Traduire les allergènes si la langue n'est pas le français
    const allergens = await translateIngredients(allergensRawFr, lang);
    const labelTags = product.labels_tags || [];
    const imageUrl = product.image_front_url || product.image_url || null;

    // Analyse IA avec le niveau le plus strict parmi tous les membres
    const allLevels = [intoleranceLevel, ...groupMembers.map(m => m.intolerance_level)];
    const strictestLevel = allLevels.includes('strict') ? 'strict' : allLevels.includes('sensitive') ? 'sensitive' : 'avoiding';
    const deterministicResult = deterministicGlutenAnalysis(ingredients, allergenTagsRaw, labelTags, brand);
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

    // Badge "certifié sans gluten" : label officiel OpenFoodFacts OU marque 100% dédiée sans gluten
    const isCertifiedGlutenFree = labelTags.some(
      (tag) => tag === 'en:gluten-free' || tag === 'fr:sans-gluten'
    ) || deterministicResult.isDedicatedBrand;

    res.json({
      product: {
        name: productName,
        brand,
        barcode,
        ingredients,
        allergens,
        image: imageUrl,
        is_certified_gluten_free: isCertifiedGlutenFree,
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
