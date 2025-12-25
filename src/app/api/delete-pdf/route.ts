
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Security: Prevent directory traversal
    const safeFilename = path.basename(filename);
    const pdfDir = path.join(process.cwd(), 'pdfs');
    const filePath = path.join(pdfDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true, message: 'File deleted' });
    } else {
       // Check if exact match failed, maybe it was renamed in UI but original file exists?
       // For now, assume session.name usually maps to filename unless heavily renamed.
       // The UI logic should pass the *original* filename if possible, but our session only has 'name'.
       // Note: Current session.name might be cleaned up (no .pdf). 
       // We should try checking with .pdf extension if missing.
       
       let retryPath = filePath;
       if (!retryPath.endsWith('.pdf')) {
           retryPath += '.pdf';
       }
       
       if (fs.existsSync(retryPath)) {
           fs.unlinkSync(retryPath);
           return NextResponse.json({ success: true, message: 'File deleted' });
       }

       return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
