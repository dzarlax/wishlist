const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config/env');

const languageNames = {
  ru: 'Russian',
  en: 'English',
  sr: 'Serbian'
};

/**
 * Translate a text from one locale to others using Gemini.
 * @param {string} text - Source text
 * @param {string} from - Source locale (ru, en, sr)
 * @param {string[]} to - Target locales
 * @returns {Object} { en: "...", sr: "..." }
 */
async function translateText(text, from, to) {
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const targets = to.filter(l => l !== from && languageNames[l]);
  if (targets.length === 0) return {};

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  const targetList = targets.map(l => `${l}: ${languageNames[l]}`).join(', ');

  const prompt = `Translate the following text from ${languageNames[from]} to these languages: ${targetList}.

Text: "${text}"

Return ONLY valid JSON without any additional text. Format:
{${targets.map(l => `"${l}": "translated text"`).join(', ')}}

Rules:
- Keep the translation natural and concise
- Preserve emoji if present
- Do not add explanations`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  return JSON.parse(cleaned);
}

module.exports = { translateText, languageNames };
