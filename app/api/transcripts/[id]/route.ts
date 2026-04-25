import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// PATCH — rename transcript
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { title } = await req.json();

    const transcript = await prisma.transcript.findUnique({ where: { id } });
    if (!transcript || transcript.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.transcript.update({
        where: { id },
        data: { title },
    });

    return NextResponse.json(updated);
}

// DELETE — delete transcript
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const transcript = await prisma.transcript.findUnique({ where: { id } });
    if (!transcript || transcript.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.transcript.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
