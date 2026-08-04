// Load the Gemini SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');
 
// Create the Gemini client using your API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Specify which Gemini model to use
// gemini-1.5-flash is free tier and fast for us to use for this project
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

module.exports = model;