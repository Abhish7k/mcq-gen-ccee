
const text = `
cpp_mcq

Q1. What is C++?
a) Language
b) Snake
c) Coffee
d) None
Ans: a

Slide 2

Q2. Who invented C++?
A. Stroustrup
B. Gosling
C. Guido
D. Dennis
Correct Answer: A
`;

function testParser(text) {
  const lines = text.split('\n');
  let currentOptions = [];
  
  // Broader regex
  const answerFullRegex = /^(?:Answer|Ans|Correct Answer|Correct Option):\s*([a-d]?)(?:[\)\.]\s*)?(.+)?/i;
  const optionRegex = /^(?:[a-d]|[A-Z])[\)\.]\s+(.+)/i;

  lines.forEach(line => {
      line = line.trim();
      const ansMatch = line.match(answerFullRegex);
      if (ansMatch) {
          console.log("Found Answer:", ansMatch[0], "-> ID:", ansMatch[1], "Text:", ansMatch[2]);
          return;
      }
      const optMatch = line.match(optionRegex);
      if (optMatch) {
          console.log("Found Option:", optMatch[0]);
      }
  });
}

testParser(text);
