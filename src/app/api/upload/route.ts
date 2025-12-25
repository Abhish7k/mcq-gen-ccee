import { NextRequest, NextResponse } from "next/server";

import { generateMCQs } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use pdf2json which is Node.js safe
    const PDFParser = require("pdf2json");
    const parser = new PDFParser(null, 1); // 1 = text only

    const text = await new Promise<string>((resolve, reject) => {
        parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
        parser.on("pdfParser_dataReady", (pdfData: any) => {
            // Extract text from the raw data
            const rawText = parser.getRawTextContent();
            resolve(rawText);
        });
        
        parser.parseBuffer(buffer);
    });

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
    }

    // Generate questions
    const questions = await generateMCQs(text);

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
