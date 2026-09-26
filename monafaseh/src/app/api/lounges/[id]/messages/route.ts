import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { db } from "@/lib/db";

// GET /api/lounges/[id]/messages — پیام‌های تالار
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const messages = await db.loungeMessage.findMany({
      where: { loungeId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50, // Last 50 messages
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      senderId: m.user.id,
      senderName: m.user.fullName,
      senderAvatarColor: m.user.avatarColor,
      senderAvatarUrl: m.user.avatarUrl,
      text: m.text,
      timestamp: m.createdAt.getTime(),
      type: m.type,
      voiceDuration: m.voiceDuration,
      imageUrl: m.imageUrl,
      inviteSessionId: m.inviteSessionId,
      inviteSessionTitle: m.inviteSessionTitle,
    }));

    return NextResponse.json({ ok: true, messages: formatted });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { ok: false, error: "خطا در دریافت پیام‌ها" },
      { status: 500 },
    );
  }
}

// POST /api/lounges/[id]/messages — ارسال پیام
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "ابتدا وارد شوید" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { text, type, voiceDuration, imageUrl, inviteSessionId, inviteSessionTitle } = body;

    if (!text && type === "text") {
      return NextResponse.json(
        { ok: false, error: "متن پیام الزامی است" },
        { status: 400 },
      );
    }

    // Check if user is a member
    const membership = await db.loungeMember.findUnique({
      where: {
        loungeId_userId: {
          loungeId: id,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      // Auto-join if not a member
      await db.loungeMember.create({
        data: {
          loungeId: id,
          userId: user.id,
          role: "member",
          isOnline: true,
        },
      });
    }

    const message = await db.loungeMessage.create({
      data: {
        loungeId: id,
        userId: user.id,
        text: text || "",
        type: type || "text",
        voiceDuration: voiceDuration || null,
        imageUrl: imageUrl || null,
        inviteSessionId: inviteSessionId || null,
        inviteSessionTitle: inviteSessionTitle || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        senderId: message.user.id,
        senderName: message.user.fullName,
        senderAvatarColor: message.user.avatarColor,
        senderAvatarUrl: message.user.avatarUrl,
        text: message.text,
        timestamp: message.createdAt.getTime(),
        type: message.type,
        voiceDuration: message.voiceDuration,
        imageUrl: message.imageUrl,
        inviteSessionId: message.inviteSessionId,
        inviteSessionTitle: message.inviteSessionTitle,
      },
    });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json(
      { ok: false, error: "خطا در ارسال پیام" },
      { status: 500 },
    );
  }
}
