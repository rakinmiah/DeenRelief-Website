import { NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

const TO_EMAIL = process.env.CONTACT_EMAIL ?? "info@deenrelief.org";

export async function POST(req: Request) {
  try {
    const resend = getResend();

    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Deen Relief Website <noreply@deenrelief.org>",
      to: TO_EMAIL,
      replyTo: email,
      subject: `Contact: ${subject || "General enquiry"} — ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        subject ? `Subject: ${subject}` : "",
        "",
        "Message:",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "RESEND_API_KEY not set") {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 503 }
      );
    }
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
