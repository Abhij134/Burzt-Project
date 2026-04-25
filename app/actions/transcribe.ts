"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { revalidatePath } from "next/cache";

// Initialize Gemini and File Manager with API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

export async function transcribeAudio(formData: FormData) {
    let tempFilePath: string | null = null;
    let uploadResult: any = null;

    try {
        // 1. Authentication Check
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            throw new Error("Unauthorized access. Please log in.");
        }

        // 2. Extract File from FormData
        const file = formData.get("audio") as File;
        if (!file) {
            throw new Error("No media file provided.");
        }

        // 3. Write to Local Temporary File
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        tempFilePath = path.join(os.tmpdir(), fileName);
        await writeFile(tempFilePath, buffer);

        console.log(`[Transcribe] Local temp file created: ${tempFilePath}`);

        // 4. Determine Exact MIME Type (Enforce audio-only to skip Gemini video processing)
        let exactMimeType = file.type;
        if (file.name.toLowerCase().endsWith('.mp4')) exactMimeType = "audio/mp4";
        else if (file.name.toLowerCase().endsWith('.mp3')) exactMimeType = "audio/mp3";
        else if (file.name.toLowerCase().endsWith('.wav')) exactMimeType = "audio/wav";
        else if (file.name.toLowerCase().endsWith('.m4a')) exactMimeType = "audio/mp4";
        else if (!exactMimeType || exactMimeType === "application/octet-stream") exactMimeType = "audio/mp3"; // Safe audio fallback

        console.log(`[Transcribe] Detected MIME (Forced Audio): ${exactMimeType}`);

        // 5. Upload to Google AI File Manager
        uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: exactMimeType,
            displayName: file.name,
        });

        console.log(`[Transcribe] File uploaded to Gemini: ${uploadResult.file.name}`);

        // 6. Poll for ACTIVE state (needed for video/large files)
        let remoteFile = await fileManager.getFile(uploadResult.file.name);
        while (remoteFile.state === "PROCESSING") {
            console.log(`[Transcribe] File still processing... path: ${uploadResult.file.name}`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            remoteFile = await fileManager.getFile(uploadResult.file.name);
        }

        if (remoteFile.state === "FAILED") {
            throw new Error("Gemini file processing failed.");
        }

        console.log(`[Transcribe] File is ACTIVE: ${uploadResult.file.name}`);

        // 7. Generate Content using the Uploaded File URI
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri,
                },
            },
            { text: "Please generate a highly accurate and precise transcript of the following media. Return ONLY the transcribed text." }
        ]);

        const transcriptText = result.response.text();

        return {
            success: true,
            transcript: transcriptText
        };

    } catch (error: any) {
        console.error("Transcription Error:", error);
        return {
            success: false,
            error: error.message || "An unexpected error occurred during transcription."
        };

    } finally {
        // 9. Strict Cleanup
        // Delete Local Temp File
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
                console.log(`[Transcribe] Local cleanup successful: ${tempFilePath}`);
            } catch (e) {
                console.error("[Transcribe] Local cleanup failed:", e);
            }
        }

        // Delete Remote File from Google Servers
        if (uploadResult?.file?.name) {
            try {
                await fileManager.deleteFile(uploadResult.file.name);
                console.log(`[Transcribe] Remote cleanup successful: ${uploadResult.file.name}`);
            } catch (e) {
                console.error("[Transcribe] Remote cleanup failed:", e);
            }
        }
    }
}

export async function saveTranscript(text: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            throw new Error("Unauthorized access. Please log in.");
        }

        const transcript = await prisma.transcript.create({
            data: {
                text,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard");
        return { success: true, id: transcript.id };
    } catch (error: any) {
        console.error("Save Error:", error);
        return { success: false, error: error.message };
    }
}
