/**
 * Gift Aid declaration text and helpers.
 *
 * The wording below follows HMRC Chapter 3 guidance (gov.uk/government/publications/
 * charities-detailed-guidance-notes/chapter-3-gift-aid). Both the UI and the
 * database audit trail reference this single source — if the declaration
 * changes, update it here.
 *
 * IMPORTANT: this exact text is written to gift_aid_declarations.declaration_text
 * so HMRC can verify what the donor saw when they agreed. Changing it AFTER
 * donations exist is fine (new declarations use the new text), but don't
 * retroactively edit past rows.
 *
 * Legal note: HMRC periodically updates the template. Before going live with
 * real money, review the current text at
 * https://www.gov.uk/claim-gift-aid/gift-aid-declarations
 * and have a charity-specialist accountant or trustee sign off.
 */

export const CHARITY_NAME = "Deen Relief";
export const CHARITY_NUMBER = "1158608";

/**
 * The declaration scope HMRC supports. "this-and-past-4-years-and-future" is
 * the standard option the donor sees; it covers the current donation, any
 * past donations in the previous 4 tax years, and all future donations until
 * revoked. This is what 95%+ of donors want.
 */
export type GiftAidScope =
  | "this-donation-only"
  | "this-and-past-4-years-and-future";

export const GIFT_AID_SCOPE: GiftAidScope = "this-and-past-4-years-and-future";

/**
 * Build the verbatim declaration text shown to the donor. The amount is
 * interpolated so the audit trail records "£50" not "£[AMOUNT]".
 */
export function buildDeclarationText(amountGbp: number): string {
  return [
    `Boost your donation by 25p of Gift Aid for every £1 you donate.`,
    ``,
    `Gift Aid is reclaimed by the charity from the tax you pay for the current tax year. Your address is needed to identify you as a current UK taxpayer.`,
    ``,
    `I want to Gift Aid my donation of £${amountGbp.toLocaleString("en-GB")} and any donations I make in the future or have made in the past 4 years to ${CHARITY_NAME}.`,
    ``,
    `I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.`,
  ].join("\n");
}

/** Gift Aid adds 25% to any donation from a UK taxpayer. */
export function giftAidAmountGbp(amountGbp: number): number {
  return Math.round(amountGbp * 0.25 * 100) / 100;
}

/** Total donation value including reclaimed Gift Aid. */
export function totalWithGiftAidGbp(amountGbp: number): number {
  return amountGbp + giftAidAmountGbp(amountGbp);
}
