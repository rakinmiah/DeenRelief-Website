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

    const { name, email, phone, project, message } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Deen Relief Website <noreply@deenrelief.org>",
      to: TO_EMAIL,
      replyTo: email,
      subject: `Volunteer Application — ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : "",
        project ? `Preferred Project: ${project}` : "",
        "",
        message ? `Message:\n${message}` : "",
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
    console.error("Volunteer form error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}
