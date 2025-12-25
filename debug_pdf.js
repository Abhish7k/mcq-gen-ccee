const fs = require('fs');
const pdfLib = require('pdf-parse');

let PDFParseClass = pdfLib;
if (pdfLib.PDFParse) {
    PDFParseClass = pdfLib.PDFParse;
} else if (pdfLib.default) {
    PDFParseClass = pdfLib.default;
}

const dataBuffer = fs.readFileSync('pdfs/5.WBT MCQ bank.pdf');

// Robust usage
async function run() {
    try {
        // Try constructor approach first
        const parser = new PDFParseClass({ data: dataBuffer });
        const data = await parser.getText();
        console.log(data.text.substring(0, 3000));
    } catch (e) {
        console.log("Constructor failed, trying function call...");
        // Fallback or debug
        console.error(e);
    }
}

run();
