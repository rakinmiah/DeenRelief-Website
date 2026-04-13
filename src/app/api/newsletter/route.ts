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

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Notify the team of the new subscriber
    await resend.emails.send({
      from: "Deen Relief Website <noreply@deenrelief.org>",
      to: TO_EMAIL,
      subject: `New Newsletter Subscriber: ${email}`,
      text: `A new subscriber has signed up for the newsletter:\n\n${email}\n\nAdd them to your mailing list.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "RESEND_API_KEY not set") {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 503 }
      );
    }
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
