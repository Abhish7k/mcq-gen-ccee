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

    // Since we can't use `pdf-parse` easily in same file without the require hack, 
    // we might need to duplicate the logic or export extraction logic.
    // However, `api/upload/route.ts` has the logic.
    // Let's copy the PDF parsing logic here for robustness.
    
    // We need to dinamically require pdf-parse
    // @ts-ignore
    const pdf = require('pdf-parse');

    for (const file of files) {
      const filePath = path.join(pdfDir, file);
      const fileBuffer = fs.readFileSync(filePath);

      try {
        // Instantiate the parser correctly (copied from upload/route.ts)
        let PDFParseClass = pdf;
        if (pdf.PDFParse) {
            PDFParseClass = pdf.PDFParse;
        } else if (pdf.default) {
            PDFParseClass = pdf.default;
        }

        const parser = new PDFParseClass({ data: fileBuffer });
        const data = await parser.getText();
        const text = data.text;
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
