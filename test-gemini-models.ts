import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function testModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try a simple generation with different model names
    const modelsToTry = [
        'gemini-pro',
        'gemini-1.0-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'models/gemini-pro',
        'models/gemini-1.5-flash'
    ];

    for (const modelName of modelsToTry) {
        try {
            console.log(`\nTrying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Say hello');
            console.log(`✓ ${modelName} WORKS!`);
            console.log(`Response: ${result.response.text()}`);
            break;
        } catch (err: any) {
            console.log(`✗ ${modelName} failed: ${err.message.substring(0, 150)}`);
        }
    }
}

testModels();
