const fs = require('fs');
let pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('public/os-mcq-bank-topicwise.pdf');

// Logic to handle different export types
let parseFunc = pdf;

// Try to determine the correct function/class to use
if (typeof pdf !== 'function') {
    if (pdf.PDFParse) {
        // It's a class in .PDFParse
        parseFunc = function(buffer) { return new pdf.PDFParse({ data: buffer }).getText(); }
    } else if (pdf.default) {
         // It might be default export
         if (typeof pdf.default === 'function') {
             // Check if it's a class or function
             try {
                // heuristic: if it has prototype methods it might be a class
                const isClass = pdf.default.toString().startsWith('class');
                if (isClass) {
                     parseFunc = function(buffer) { return new pdf.default({ data: buffer }).getText(); }
                } else {
                     parseFunc = pdf.default;
                }
             } catch(e) {
                 parseFunc = pdf.default;
             }
         } else {
             // Fallback
             parseFunc = pdf.default;
         }
    }
}

// Ensure parseFunc is callable
if (typeof parseFunc !== 'function') {
    // If it's still an object, assume the object ITSELF is the class constructor (common in some CJS/ESM interop)
    // But we need to use 'new'
    const ClassRef = pdf;
    parseFunc = function(buffer) { return new ClassRef({ data: buffer }).getText(); }
}

async function run() {
    try {
        const data = await parseFunc(dataBuffer);
        // Log the first 5000 chars to see structure
        console.log(data.text.substring(0, 5000));
    } catch (err) {
        console.error("Parsing error:", err);
        console.log("Export type:", typeof pdf);
        console.log("Export keys:", Object.keys(pdf));
    }
}

run();
