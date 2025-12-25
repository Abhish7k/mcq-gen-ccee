const fs = require('fs');
const pdfLib = require('pdf-parse');

// --- MOCK FUNCTION (Copy of src/lib/gemini.ts logic) ---
function extractExistingQuestions(text) {
  const questions = [];
  let currentTopic = "General";
  const lines = text.split('\n');
  let currentBlock = "";
  let hasFoundLectureHeaders = false;

  for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const lectureRegex = /^(?:(?:\d+\.|[\*\-])\s*)?((?:Lecture|Session|Unit|Chapter|Topic)\s*(?:\d+)?[:\.-]?\s+.+)$/i;
      const numberRegex = /^(?:\\*\\*)?\\d+(?:\.\d+)*\.?\s+(.*?)(?:\\*\\*|$)/;

      const lectureMatch = line.match(lectureRegex);
      const numberMatch = line.match(numberRegex);
      
      let newTopicName = "";
      let isLectureHeader = false;
      
      if (lectureMatch) {
          newTopicName = lectureMatch[1].trim();
          isLectureHeader = true;
      } else if (numberMatch && !hasFoundLectureHeaders) {
          const candidate = numberMatch[1].trim();
          if (candidate.length > 3 && /^[A-Z]/.test(candidate)) {
             newTopicName = candidate;
          }
      }

      if (newTopicName) {
          let isCandidateQuestion = false;
          let peekIndex = 1;
          while (i + peekIndex < lines.length && peekIndex < 4) {
             const nextLine = lines[i + peekIndex].trim();
             if (nextLine.match(/^[a-d][\.\)]/i)) { // Fixed regex for JS
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
  return questions;
}

function parseBlockForQuestions(text, topic) {
  const questions = [];
  const lines = text.split('\n');

  let currentQuestion = {};
  let currentOptions = [];
  let buffer = [];
  let state = 'READING_TEXT'; // 'READING_TEXT' | 'READING_OPTIONS'

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

  const optionRegex = /^[a-d][\)\.]\s+(.+)/i;
  const answerFullRegex = /^Answer:\s*([a-d]?)(?:[\)\.]\s*)?(.+)/i; 

  for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      const answerMatch = line.match(answerFullRegex);
      if (answerMatch) {
          const ansId = answerMatch[1] ? answerMatch[1].toLowerCase() : '';
          let ansText = answerMatch[2].trim();
          if (ansId) {
             const idx = ansId.charCodeAt(0) - 97; 
             if (idx >= 0 && idx < currentOptions.length) {
                 ansText = currentOptions[idx];
             }
          }
          currentQuestion.answer = ansText;
          pushQuestion();
          continue;
      }

      const optionMatch = line.match(optionRegex);
      if (optionMatch) {
          if (state === 'READING_TEXT') {
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

// --- MAIN EXECUTION ---
let PDFParseClass = pdfLib;
if (pdfLib.PDFParse) PDFParseClass = pdfLib.PDFParse;
else if (pdfLib.default) PDFParseClass = pdfLib.default;

const dataBuffer = fs.readFileSync('pdfs/5.WBT MCQ bank.pdf');
const parser = new PDFParseClass({ data: dataBuffer });

parser.getText().then(data => {
    console.log("Extracted Length:", data.text.length);
    const questions = extractExistingQuestions(data.text);
    console.log("Questions Found:", questions.length);
    if (questions.length > 0) {
        console.log("First Question:", JSON.stringify(questions[0], null, 2));
    }
});
