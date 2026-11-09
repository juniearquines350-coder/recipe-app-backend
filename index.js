require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Eksaktong _buildPrompt alinsunod sa Dart code ni Marc
function _buildPrompt(data) {
  const ingredients = Array.isArray(data.ingredients) 
    ? data.ingredients.join(', ') 
    : (data.ingredients || '');

  const dietaryNeeds = Array.isArray(data.dietaryNeeds) && data.dietaryNeeds.length > 0 
    ? data.dietaryNeeds.join(', ') 
    : 'none';

  return `
You are a friendly home-cooking assistant. Create ONE complete recipe.

Available ingredients: ${ingredients}
Meal type: ${data.mealType || 'no preference'}
Cuisine: ${data.cuisine || 'no preference'}
Servings: ${data.servings || 1}
Dietary needs: ${dietaryNeeds}
Additional notes from the user: ${data.notes || 'none'}

Rules:
- Build the recipe mainly from the available ingredients. You may also assume
  basic pantry items (salt, pepper, cooking oil, water) and add at most a few
  other common ingredients if really needed.
- Strictly follow the dietary needs and cuisine if given.
- Scale every quantity for exactly ${data.servings || 1} servings.
- Give precise quantities with units (use an empty unit for countable items
  such as "2 eggs").
- Write clear, numbered-style steps that a beginner can follow. Each step is
  one short paragraph.
- prep_time is the preparation time in minutes and cooking_time is the actual
  cooking time in minutes (both whole numbers).
- description is one friendly sentence (max 25 words) describing the dish.
- Respect the additional notes (for example allergies or spice level).

Return the output strictly in JSON format with this structure:
{
  "recipe_name": "String",
  "description": "String",
  "prep_time": 0,
  "cooking_time": 0,
  "ingredients": [
    { "ingredient_name": "String", "quantity": "String", "unit": "String" }
  ],
  "steps": ["Step 1", "Step 2"]
}
`;
}

app.post('/api/generate-recipe', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Ipasa ang req.body sa _buildPrompt
    const prompt = _buildPrompt(req.body);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const recipeData = JSON.parse(cleanJsonText);

    res.json(recipeData);

  } catch (error) {
    console.error("Error sa pag-generate ng recipe:", error);
    res.status(500).json({ error: 'Failed to generate recipe. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});