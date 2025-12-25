import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateMCQs } from '@/lib/gemini';

// Only allow this in development or if explicitly enabled
// We use a GET request for simplicity to trigger it
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})); // Handle empty body safely
    const requestedFiles: string[] = body.files || [];

    const pdfDir = path.join(process.cwd(), 'pdfs');
    
    if (!fs.existsSync(pdfDir)) {
      return NextResponse.json({ error: 'PDF directory not found' }, { status: 404 });
    }

    let files = fs.readdirSync(pdfDir).filter(file => file.toLowerCase().endsWith('.pdf'));

    // Filter if specific files requested
    if (requestedFiles.length > 0) {
        files = files.filter(f => requestedFiles.includes(f));
    }

    const results = [];

    // Use pdf2json which is Node.js safe
    const PDFParser = require("pdf2json");

    for (const file of files) {
      const filePath = path.join(pdfDir, file);
      const fileBuffer = fs.readFileSync(filePath);

      try {
        const parser = new PDFParser(null, 1); // 1 = text only

        const text = await new Promise<string>((resolve, reject) => {
            parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
            parser.on("pdfParser_dataReady", (pdfData: any) => {
                const rawText = parser.getRawTextContent();
                resolve(rawText);
            });
            parser.parseBuffer(fileBuffer);
        });

        const questions = await generateMCQs(text); // Uses local generator fallback automatically

        results.push({
          name: file,
          questions: questions
        });
      } catch (err: any) {
        console.error(`Error processing ${file}:`, err);
        // Skip failed files but continue
      }
    }

    return NextResponse.json({ sessions: results });

  } catch (error: any) {
    console.error('Batch processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
