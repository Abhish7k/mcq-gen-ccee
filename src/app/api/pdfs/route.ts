import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const pdfDir = path.join(process.cwd(), 'pdfs');
    
    if (!fs.existsSync(pdfDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(pdfDir).filter(file => file.toLowerCase().endsWith('.pdf'));
    return NextResponse.json({ files });

  } catch (error: any) {
    console.error('Failed to list PDFs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
