export default async function handler(req, res) {
  // Set CORS headers if necessary (Vercel routes usually sit on same origin, but just in case)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

    const prompt = `Translate this Thai food menu item to concise English. Return ONLY a valid JSON object without markdown formatting like this: {"name_en": "Stir-fried Chicken", "description_en": "With basil.", "category_en": "Main Dish"}.
Thai Name: ${name}
${description ? `Thai Description: ${description}\n` : ''}${category ? `Thai Category: ${category}` : ''}`;

    const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      throw new Error(`API Error ${googleRes.status}: ${errorText}`);
    }

    const responseData = await googleRes.json();
    const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed = { name_en: "", description_en: "", category_en: "" };
    try { parsed = JSON.parse(cleanJson); } catch (e) {}

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Translation ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
