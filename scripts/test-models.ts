
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error('No API Key found');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-pro',
  'gemini-pro-vision',
  'gemini-2.0-flash-exp'
];

async function test() {
  console.log('Testing models with API key starts with:', apiKey.substring(0, 5) + '...');
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello, are you there?');
      const response = await result.response;
      console.log(`✅ SUCCESS: ${modelName} responded:`, response.text().substring(0, 20) + '...');
      // If we find one, we can stop or keep going to see all available
    } catch (error) {
      console.log(`❌ FAILED: ${modelName} - ${error.message.split('\n')[0]}`);
    }
  }
}

test();
