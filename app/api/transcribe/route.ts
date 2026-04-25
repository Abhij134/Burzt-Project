import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Initialize Gemini with API Key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        // Enforce Authentication
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        // Extract Form Data
        const formData = await req.formData();
        const file = formData.get("audio") as File;

        if (!file) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // Convert audio to Base64 for the API
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        // Use gemini-1.5-flash which is extremely fast and efficient for audio
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Pass inline data to Gemini
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: file.type || "audio/mp3",
                    data: base64Data
                }
            },
            { text: "Please generate a highly accurate and precise transcript of the following audio." }
        ]);

        const transcriptText = result.response.text();

        // Persist transcript into Prisma Postgres
        const transcript = await prisma.transcript.create({
            data: {
                text: transcriptText,
                userId: session.user.id
            }
        });

        return NextResponse.json({ transcript: transcriptText, id: transcript.id });
    } catch (error: any) {
        console.error("Gemini Error:", error);
        return NextResponse.json({ error: error.message || "Unknown error occurred" }, { status: 500 });
    }
}
