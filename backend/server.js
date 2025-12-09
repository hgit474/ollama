const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initialize Gemini Client
const { GoogleGenAI } = require('@google/genai');
const GEMINI_MODEL = "gemini-2.5-flash";

let ai;
try {
    // The SDK automatically looks for the GEMINI_API_KEY environment variable.
    ai = new GoogleGenAI({});
    console.log("Gemini client initialized successfully.");
} catch (e) {
    ai = null;
    console.warn("Warning: Gemini client failed to initialize. AI suggestions will be skipped.");
    console.error(e);
}


// ---------- Express App Setup ----------

const app = express();
const PORT = 8000;

// CORS Middleware (Matches your Python setup)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware for JSON requests
app.use(bodyParser.json());


// ---------- Core Logic: Static Analysis (analyzeCode) ----------

/**
 * Performs simple static code checks (equivalent to Python's analyze_code).
 * @param {string} code
 * @param {string} language
 * @returns {object} AnalysisResponse structure
 */
function analyzeCode(code, language) {
    const lines = code.split('\n');
    const issues = [];
    let warnings = 0;
    let suggestions = 0;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        // 1. TODO comments (Warning)
        if (trimmed.includes("TODO")) {
            issues.push({
                type: "warning",
                title: "TODO comment found",
                message: `Line ${lineNumber}: Consider resolving or removing TODOs before release.`
            });
            warnings++;
        }

        // 2. Long line (> 100 chars) (Suggestion)
        if (line.length > 100) {
            issues.push({
                type: "suggestion",
                title: "Line too long",
                message: `Line ${lineNumber}: Break this line into smaller parts for readability.`
            });
            suggestions++;
        }

        // 3. JavaScript: '==' instead of '===' (Warning)
        if (language === "javascript" && trimmed.includes("==") && !trimmed.includes("===")) {
            issues.push({
                type: "warning",
                title: "Loose equality operator",
                message: `Line ${lineNumber}: Use '===' instead of '==' to avoid unexpected type coercion.`
            });
            warnings++;
        }

        // 4. Debug prints (Suggestion)
        if (trimmed.startsWith("print(") || trimmed.includes("console.log")) {
            issues.push({
                type: "suggestion",
                title: "Debug statement",
                message: `Line ${lineNumber}: Remove debug prints/logs in production code.`
            });
            suggestions++;
        }
    });

    return {
        warnings,
        suggestions,
        total: issues.length,
        issues,
    };
}


// ---------- Core Logic: AI Code Generation (generateAIFixedCode) ----------

/**
 * Asks a Gemini model to return a corrected, concise version of the code.
 * @param {string} code
 * @param {string} language
 * @returns {Promise<string|null>} Suggested code or null on failure.
 */
async function generateAIFixedCode(code, language) {
    if (!ai) return null;

    // --- COMPLETE AND CORRECT PROMPT DEFINITION ---
    const prompt = `
You are an expert ${language} developer.

Your task is to review the following code snippet and return a **corrected, more idiomatic, and concise** version of the code.

**Important rules:**
1. Only return the corrected code block. Do not include any explanation or extra text outside the code block.
2. The code must be enclosed in a single markdown block for the specified language.
3. Fix any simple bugs, improve readability, and adhere to best practices for ${language}.

**Code to review:**
\`\`\`
${code}
\`\`\`
`;
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt, // Pass the prompt string directly
            config: {
                systemInstruction: `You are an expert ${language} developer who follows instructions precisely and only returns code in a markdown block.`,
                temperature: 0.3, // Low temperature for deterministic code
            },
        });

        const aiResponseText = response.text;

        // Helper to extract the code block from the markdown response
        const extractCodeBlock = (text) => {
            const lines = text.split('\n');
            let codeLines = [];
            let inCodeBlock = false;
            
            for (const line of lines) {
                if (line.trim().startsWith('```')) {
                    if (inCodeBlock) {
                        break; // End of code block
                    }
                    inCodeBlock = true;
                    continue; // Skip the ``` line
                }
                if (inCodeBlock) {
                    codeLines.push(line);
                }
            }
            return codeLines.join('\n').trim();
        };

        return extractCodeBlock(aiResponseText);

    } catch (e) {
        console.error("AI code generation failed:", e);
        return null;
    }
}


// ---------- API Endpoints (Routes) ----------

// Main analysis route (POST /analyze)
app.post('/analyze', async (req, res) => {
    const { code, language } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: "Missing 'code' or 'language' in request body." });
    }

    // 1. Run static analysis
    const analysisResponse = analyzeCode(code, language);

    // 2. Run optional AI fix concurrently
    const suggestedCode = await generateAIFixedCode(code, language);

    // 3. Combine results
    const finalResponse = {
        ...analysisResponse, // Spread all static analysis fields
        suggested_code: suggestedCode,
    };

    res.json(finalResponse);
});

// Simple health check route (GET /)
app.get('/', (req, res) => {
    res.json({ message: "Code Quality Assistant is running!" });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});