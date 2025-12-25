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

    // @ts-ignore
    let pdf = require("pdf-parse");
    let PDFParseClass = pdf;

    // Handle package export structure
    if (pdf.PDFParse) {
        PDFParseClass = pdf.PDFParse;
    } else if (pdf.default) {
        PDFParseClass = pdf.default;
    }
    
    // Instantiate the parser class
    const parser = new PDFParseClass({ data: buffer });
    // Extract text
    const data = await parser.getText();
    const text = data.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
    }

    // Generate questions
    const questions = await generateMCQs(text);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
