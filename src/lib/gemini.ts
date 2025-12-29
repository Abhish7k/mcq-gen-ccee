import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface Question {
  question: string;
  options: string[];
  answer: string;
  topic?: string;
}

export async function generateMCQs(text: string): Promise<Question[]> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PLACEHOLDER_KEY_HERE') {
    console.warn("GEMINI_API_KEY not found or is placeholder, using local generator");
    return generateQuestionsLocally(text);
  }

  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-pro"];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting to generate MCQs using model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
        You are an expert educational content generator.
        Analyze the following text and generate 25 multiple-choice questions (MCQs) based on it.
        Return the output ONLY as a valid JSON array of objects.
        Each object must have the following structure:
        {
          "question": "The question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "The correct option text (must match one of the options exactly)"
        }

        Text to analyze:
        ${text.substring(0, 30000)} // Limit text length to avoid token limits
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Clean up markdown code blocks if present
      const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      return JSON.parse(jsonString);
// ... imports
// import { GoogleGenerativeAI, ModelParams } from "@google/generative-ai";

// ... inside generateMCQs function

    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error.message);
      // Continue to next model
    }
  }

  console.warn("All models failed. Falling back to local keyword generation.");
  return generateQuestionsLocally(text);
}

// Helper to extract existing questions if the PDF is an exam paper
function extractExistingQuestions(text: string): Question[] {
  console.log("extractExistingQuestions called. Text length:", text.length);
  const questions: Question[] = [];
  let currentTopic = "General";
  const lines = text.split('\n');
  console.log("Total lines:", lines.length);
  let currentBlock = "";
  let hasFoundLectureHeaders = false;

  for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const lectureRegex = /^(?:(?:\d+\.|[\*\-])\s*)?((?:Lecture|Session|Unit|Chapter|Topic)\s*(?:\d+)?[:\.-]?\s+.+)$/i;
      const numberRegex = /^(?:\\*\\*)?\d+(?:\.\d+)*\.?\s+(.*?)(?:\\*\\*|$)/;

      const lectureMatch = line.match(lectureRegex);
      const numberMatch = line.match(numberRegex);
      
      let newTopicName = "";
      let isLectureHeader = false;
      
      if (lectureMatch) {
          newTopicName = lectureMatch[1].trim();
          isLectureHeader = true;
      } else if (numberMatch && !hasFoundLectureHeaders) {
          const candidate = numberMatch[1].trim();
          // Heuristic: Topic headers usually start with Capital and are substantial
          if (candidate.length > 3 && /^[A-Z]/.test(candidate)) {
             newTopicName = candidate;
          }
      }

      if (newTopicName) {
          let isCandidateQuestion = false;
          let peekIndex = 1;
          
          while (i + peekIndex < lines.length && peekIndex < 4) {
             const nextLine = lines[i + peekIndex].trim();
             // Robust option check: a) a. A) A. (a) 1. 1)
             if (nextLine.match(/^(?:[a-e]|[A-E]|[1-5])[\.\)]/)) {
                 isCandidateQuestion = true;
                 break;
             }
             if (nextLine) break; 
             peekIndex++;
          }
          
          if (newTopicName.endsWith('?')) isCandidateQuestion = true;

          if (!isCandidateQuestion) {
              if (isLectureHeader) hasFoundLectureHeaders = true;

              if (currentBlock) {
                  questions.push(...parseBlockForQuestions(currentBlock, currentTopic));
                  currentBlock = "";
              }
              
              currentTopic = newTopicName.replace(/^\**|[:\.]\s*$/g, "").trim(); 
              continue; 
          }
      }
      
      currentBlock += line + "\n";
  }
  
  if (currentBlock) {
      questions.push(...parseBlockForQuestions(currentBlock, currentTopic));
  }

  return consolidateTopics(questions);
}

function consolidateTopics(questions: Question[]): Question[] {
    const topicCounts: Record<string, number> = {};
    questions.forEach(q => {
        const t = q.topic || "General";
        topicCounts[t] = (topicCounts[t] || 0) + 1;
    });

    const uniqueTopics = Object.keys(topicCounts);
    if (uniqueTopics.length <= 25) return questions;

    console.log(`Consolidating ${uniqueTopics.length} topics...`);

    const groups: { name: string; keywords: string[] }[] = [
        { name: "HTTP Protocols & History", keywords: ["history", "internet protocol", "http", "stateless", "https", "protocol", "status code", "methods"] },
        { name: "Web Servers & Architecture", keywords: ["architecture", "web server", "iis", "apache"] },
        { name: "HTML5 Basics (Tags & Validation)", keywords: ["basic html", "tags", "html5", "validation", "forms"] },
        { name: "HTML5 Advanced (Multimedia & APIs)", keywords: ["audio", "video", "geo-location", "new features", "api"] },
        { name: "CSS Styling (Basics & Box Model)", keywords: ["css", "styling", "font", "box model", "attribute", "style tags"] },
        { name: "CSS Advanced (Layout & Linking)", keywords: ["structure", "layout", "inline", "internal", "external", "linking"] },
        { name: "JS Fundamentals (Variables & Ops)", keywords: ["javascript", "variable", "statement", "operator", "comment", "expression", "control structure", "scope"] },
        { name: "JS Data Types (Strings, Numbers, Dates)", keywords: ["string", "number", "boolean", "date"] },
        { name: "JS Collections (Arrays & Objects)", keywords: ["array", "object"] },
        { name: "JS Functions & OOP", keywords: ["function", "oop", "object oriented"] },
        { name: "Document Object Model (DOM)", keywords: ["dom", "document object model", "hierarchy", "element", "event", "manipulation", "traversal"] },
        { name: "Form Interaction & Regex", keywords: ["form", "input", "regular expression", "regex"] },
        { name: "Error Handling & Debugging", keywords: ["error", "debugging", "jslint", "quality", "browser dev tool"] },
        { name: "jQuery Basics & Selection", keywords: ["jquery", "selector", "event"] },
        { name: "jQuery Manipulation & Animation", keywords: ["animation", "effect", "traverse", "manipulation", "utility"] },
        { name: "jQuery Plugins & Templates", keywords: ["plugin", "template", "data attribute"] },
        { name: "JSON Data Handling", keywords: ["json"] },
        { name: "Ajax & Web Services", keywords: ["ajax", "web service", "framework"] },
        { name: "Asynchronous JS (Promises & Event Loop)", keywords: ["promise", "async", "await", "event loop", "timer"] },
        { name: "Node.js Fundamentals", keywords: ["node.js", "node js", "fs", "file i/o", "request"] },
        { name: "Node.js Web Server & Apps", keywords: ["http module", "developing", "node web"] },
        { name: "Express.js Framework", keywords: ["express", "route", "middleware", "view", "rendering"] },
        { name: "React Core (Components & Props)", keywords: ["react", "element", "component", "props", "compose", "render"] },
        { name: "React State & Lifecycle", keywords: ["state", "lifecycle", "context", "handle event", "conditional rendering", "list", "key", "ref"] },
        { name: "Advanced React & Redux", keywords: ["lift state", "error boundary", "composition", "inheritance", "containment", "specialization", "redux", "thinking in react"] }
    ];

    const topicMap: Record<string, string> = {};
    
    uniqueTopics.forEach(topic => {
        const lowerTopic = topic.toLowerCase();
        
        // Try to find a matching group
        let matchedGroupName = "";
        for (const group of groups) {
            if (group.keywords.some(kw => lowerTopic.includes(kw.toLowerCase()))) {
                matchedGroupName = group.name;
                break;
            }
        }

        if (matchedGroupName) {
            topicMap[topic] = matchedGroupName;
        } else {
            // Strategy 1: Group by Major Number (e.g., "1.2 Intro" -> "Unit 1")
            const match = topic.match(/^((?:Unit|Chapter|Module)?\s*\d+)/i);
            if (match) {
                topicMap[topic] = match[1] + " - General Concepts";
            } else {
                // Strategy 2: Group by First Significant Word(s) if plenty
                const words = topic.split(/\s+/).filter(w => w.length > 2);
                if (words.length > 2) {
                    topicMap[topic] = words.slice(0, 2).join(" ") + " (Misc)";
                } else {
                    topicMap[topic] = "Other Subjects";
                }
            }
        }
    });

    // Apply mapping
    return questions.map(q => ({
        ...q,
        topic: topicMap[q.topic || ""] || q.topic || "General"
    }));
}

function parseBlockForQuestions(text: string, topic: string): Question[] {
  const questions: Question[] = [];
  const lines = text.split('\n');

  let currentQuestion: Partial<Question> = {};
  let currentOptions: string[] = [];
  let buffer: string[] = [];
  let state: 'READING_TEXT' | 'READING_OPTIONS' = 'READING_TEXT';

  const pushQuestion = () => {
     if (currentQuestion.question && currentOptions.length >= 2 && currentQuestion.answer) {
         questions.push({
             question: currentQuestion.question,
             options: currentOptions,
             answer: currentQuestion.answer,
             topic: topic
         });
     }
     currentQuestion = {};
     currentOptions = [];
     buffer = [];
     state = 'READING_TEXT';
  };

  const optionRegex = /^(?:[a-e]|[A-E]|[1-5])[\)\.]\s+(.+)/i;
  // Matches "Answer: b", "Answer: 2", "Ans: b", "Correct Answer: B"
  const answerFullRegex = /^(?:Answer|Ans|Correct\s+Answer|Correct\s+Option|Correct):\s*([a-e1-5]?)(?:[\)\.]\s*)?(.*)/i; 

  for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Skip page markers
      if (line.includes("---Page") && line.includes("Break---")) continue;

      const answerMatch = line.match(answerFullRegex);
      if (answerMatch) {
          const ansIdRaw = answerMatch[1] ? answerMatch[1].toLowerCase() : '';
          let ansText = answerMatch[2] ? answerMatch[2].trim() : '';

          if (ansIdRaw) {
             let idx = -1;
             if (/[1-5]/.test(ansIdRaw)) {
                 idx = parseInt(ansIdRaw) - 1;
             } else {
                 idx = ansIdRaw.charCodeAt(0) - 97; // a=0
             }
             
             if (idx >= 0 && idx < currentOptions.length) {
                 ansText = currentOptions[idx];
             }
          }
          
          if (ansText || ansIdRaw) {
             currentQuestion.answer = ansText || ansIdRaw;
             pushQuestion();
          }
          continue;
      }

      const optionMatch = line.match(optionRegex);
      if (optionMatch) {
          if (state === 'READING_TEXT') {
              // Clean up question text
              let qText = buffer.join(" ").trim();
              qText = qText.replace(/^(?:Q\.?|(?:\*\*)?\d+[\.\)])\s*/i, "");
              
              if (qText) {
                  currentQuestion.question = qText;
                  state = 'READING_OPTIONS';
              } else {
                  continue;
              }
          }
          currentOptions.push(optionMatch[1].trim());
          continue;
      }
      
      if (state === 'READING_OPTIONS') {
           continue; 
      }
      
      buffer.push(line);
  }

  if (currentQuestion.question && currentQuestion.answer) {
      pushQuestion();
  }

  return questions;
}

function generateQuestionsLocally(text: string): Question[] {
  // First, try to extract existing questions
  const existingQuestions = extractExistingQuestions(text);
  if (existingQuestions.length > 0) {
    console.log(`Found ${existingQuestions.length} existing questions in text.`);
    return existingQuestions;
  }

  // Fallback to generating fill-in-the-blank questions
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  const questions: Question[] = [];
  const validSentences = sentences.filter(s => s.trim().length > 30 && s.trim().length < 200);
  
  // Get all unique words > 5 chars for distractors
  const allWords = Array.from(new Set(text.match(/\b\w{5,}\b/g) || []));

  // Generate up to 25 questions
  const numQuestions = Math.min(25, validSentences.length);
  const shuffledSentences = validSentences.sort(() => 0.5 - Math.random()).slice(0, numQuestions);

  for (const sentence of shuffledSentences) {
    const words = sentence.trim().split(/\s+/);
    // Find a suitable long word to blank out
    const targetWordIdx = words.findIndex(w => w.length > 5 && /^[a-zA-Z]+$/.test(w));
    
    if (targetWordIdx !== -1) {
      const targetWord = words[targetWordIdx].replace(/[^a-zA-Z]/g, ""); // Clean punctuation
      const originalSentence = sentence.trim();
      const questionText = originalSentence.replace(words[targetWordIdx], "_______");

      // Generate distractors
      const distractors = allWords
        .filter(w => w !== targetWord)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      if (distractors.length < 3) continue; // Skip if not enough distractors

      const options = [...distractors, targetWord].sort(() => 0.5 - Math.random());

      questions.push({
        question: `Complete the sentence: "${questionText}"`,
        options,
        answer: targetWord
      });
    }
  }

  // Fallback if we couldn't generate enough from text
  if (questions.length === 0) {
    return [
      {
        question: "We couldn't generate specific questions from this text. Ensure the PDF has clear, selectable text. Here is a sample: What is the primary topic of your document?",
        options: ["Science", "History", "Technology", "Literature"],
        answer: "Technology" 
      }
    ];
  }

  return questions;
}

function getMockQuestions(): Question[] {
  // This is now just a wrapper or legacy fallback
  return [
    {
      question: "This is a mock question because AI generation failed. What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      answer: "Paris",
    }
  ];
}
