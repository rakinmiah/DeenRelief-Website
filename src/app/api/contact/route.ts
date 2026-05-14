import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  createInquiry,
  findOrderIdByReceipt,
} from "@/lib/bazaar-inquiries";
import { enqueueNotification } from "@/lib/admin-notifications";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

const TO_EMAIL = process.env.CONTACT_EMAIL ?? "info@deenrelief.org";

/**
 * Contact form receiver.
 *
 * Two entry points share this route:
 *   1. /contact         — main charity contact page (no source flag)
 *   2. /bazaar/contact  — shop contact page (source: "bazaar")
 *
 * The shop variant prefixes the subject with `[Bazaar]` so the
 * shared info@ inbox can triage commerce questions at a glance.
 * Both write to the same inbox today — splitting is a one-line
 * change to TO_EMAIL when volume justifies it.
 *
 * The optional `orderNumber` field is rendered into the body when
 * present (the bazaar form auto-prefills it from the
 * ?order=DRB-… URL param on links from the order confirmation
 * email).
 */
export async function POST(req: Request) {
  try {
    const resend = getResend();

    const {
      name,
      email,
      subject,
      message,
      source,
      orderNumber,
    } = (await req.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      source?: "bazaar";
      orderNumber?: string;
    };

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const isBazaar = source === "bazaar";
    const prefix = isBazaar ? "[Bazaar] " : "";
    const subjectLine = `${prefix}Contact: ${subject || "General enquiry"} — ${name}`;

    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      subject ? `Subject: ${subject}` : "",
      isBazaar && orderNumber ? `Order: ${orderNumber}` : "",
      isBazaar ? `Source: Deen Relief Bazaar (/bazaar/contact)` : "",
      "",
      "Message:",
      message,
    ].filter(Boolean);

    const fromName = isBazaar ? "Deen Relief Bazaar" : "Deen Relief Website";

    await resend.emails.send({
      from: `${fromName} <noreply@deenrelief.org>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: subjectLine,
      text: bodyLines.join("\n"),
    });

    // Bazaar-only: also create the in-admin inquiry record so
    // trustees can reply from DR Admin. Fire-and-forget — if any
    // of these writes fail, the customer's email has already gone
    // through, so we return success either way. Logged so we can
    // notice systemic failures via the platform logs.
    if (isBazaar) {
      try {
        const orderId = await findOrderIdByReceipt(orderNumber);
        const created = await createInquiry({
          customerName: name,
          customerEmail: email,
          subject: subject || "General enquiry",
          initialMessage: message,
          orderNumberRaw: orderNumber ?? null,
          orderId,
        });
        if (created) {
          await enqueueNotification({
            type: "bazaar_inquiry_new",
            severity: "warning",
            title: `New inquiry — ${name}`,
            // Body line surfaces enough context for the trustee to
            // decide whether to act now: subject + order reference
            // (if any). Full message body is on the detail page.
            body: orderId
              ? `${subject || "General enquiry"} · order linked`
              : (subject || "General enquiry"),
            targetUrl: `/admin/bazaar/inquiries/${created.inquiry.id}`,
            targetId: created.inquiry.id,
          });
        }
      } catch (err) {
        // Don't surface — the customer's email landed in the
        // inbox regardless, and a missed inquiry row will only
        // delay the in-admin workflow, not break it.
        console.error("[contact] bazaar inquiry capture failed:", err);
      }
    }

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
