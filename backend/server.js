const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();

// Enable CORS for GitHub Pages
app.use(cors({
  origin: 'https://hgit474.github.io'
}));

// Body Parser Middleware
app.use(express.json());
app.use(bodyParser.json());

// Initialize Gemini Client
const { GoogleGenAI } = require('@google/genai');
const GEMINI_MODEL = "gemini-2.5-flash";

let ai;
try {
    ai = new GoogleGenAI({});
    console.log("Gemini client initialized successfully.");
} catch (e) {
    ai = null;
    console.warn("Warning: Gemini client failed to initialize.");
    console.error(e);
}

// Static Analysis Function
function analyzeCode(code, language) {
    const lines = code.split('\n');
    const issues = [];
    let warnings = 0;
    let suggestions = 0;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        if (trimmed.includes("TODO")) {
            issues.push({
                type: "warning",
                title: "TODO comment found",
                message: `Line ${lineNumber}: Consider resolving or removing TODOs before release.`
            });
            warnings++;
        }

        if (line.length > 100) {
            issues.push({
                type: "suggestion",
                title: "Line too long",
                message: `Line ${lineNumber}: Break this line into smaller parts for readability.`
            });
            suggestions++;
        }

        if (language === "javascript" && trimmed.includes("==") && !trimmed.includes("===")) {
            issues.push({
                type: "warning",
                title: "Loose equality operator",
                message: `Line ${lineNumber}: Use '===' instead of '==' to avoid unexpected type coercion.`
            });
            warnings++;
        }

        if (trimmed.startsWith("print(") || trimmed.includes("console.log")) {
            issues.push({
                type: "suggestion",
                title: "Debug statement",
                message: `Line ${lineNumber}: Remove debug prints/logs in production code.`
            });
            suggestions++;
        }
    });

    return { warnings, suggestions, total: issues.length, issues };
}

// AI Code Generation Function
async function generateAIFixedCode(code, language) {
    if (!ai) return null;

    const prompt = `
You are an expert ${language} developer.

Your task is to review the following code snippet and return a **corrected, more idiomatic, and concise** version of the code.

**Important rules:**
1. Only return the corrected code block.
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
            contents: prompt,
            config: {
                systemInstruction: `You are an expert ${language} developer who follows instructions precisely and only returns code in a markdown block.`,
                temperature: 0.3,
            },
        });

        const aiResponseText = response.text;

        const extractCodeBlock = (text) => {
            const lines = text.split('\n');
            let codeLines = [];
            let inCodeBlock = false;
            
            for (const line of lines) {
                if (line.trim().startsWith('```
                    if (inCodeBlock) break;
                    inCodeBlock = true;
                    continue;
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

// API Routes
app.post('/analyze', async (req, res) => {
    const { code, language } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: "Missing 'code' or 'language' in request body." });
    }

    const analysisResponse = analyzeCode(code, language);
    const suggestedCode = await generateAIFixedCode(code, language);

    const finalResponse = {
        ...analysisResponse,
        suggested_code: suggestedCode,
    };

    res.json(finalResponse);
});

app.get('/', (req, res) => {
    res.json({ message: "Code Quality Assistant is running!" });
});

// Start server with dynamic PORT for Render
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
