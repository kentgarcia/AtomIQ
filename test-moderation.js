// Quick test script to verify Gemini moderation API
// Run with: node test-moderation.js

const API_KEY = 'AIzaSyAWAdg2mf5G2rCYjOEQSYe5_WrGM-QJMYg';
const MODEL = 'gemini-2.5-flash'; // Stable version with better quota
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const testPrompt = `You are an AI moderator. Analyze this comment and respond with JSON only:

Comment: "This is a test comment about nuclear power"

Respond in this format:
{
  "status": "approved" | "hidden" | "incorrect",
  "reason": "brief explanation (only for hidden)",
  "correction": "educational correction (only for incorrect)"
}`;

async function testModeration() {
  console.log('Testing Gemini Moderation API...\n');
  console.log('API URL:', API_URL);
  console.log('API Key:', API_KEY.substring(0, 10) + '...');
  
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: testPrompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 512,
        }
      })
    });

    console.log('\nResponse Status:', response.status);
    console.log('Response OK:', response.ok);

    const data = await response.json();
    console.log('\nFull Response:', JSON.stringify(data, null, 2));

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('\n✅ API is working!');
      console.log('Response Text:', data.candidates[0].content.parts[0].text);
    } else {
      console.log('\n❌ Unexpected response structure');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testModeration();
