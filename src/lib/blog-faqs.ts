/**
 * FAQ data for blog posts. Each post gets 2–3 sub-questions extracted from
 * the article's H2 headings — the most "searchable" queries that trigger
 * Google's People Also Ask boxes.
 *
 * Answers are kept to 2–3 sentences max — Google FAQ rich results prefer
 * concise, direct answers. The full explanation lives in the blog post body.
 *
 * Keyed by slug so the blog template can look them up without parsing MDX.
 */

interface BlogFaq {
  question: string;
  answer: string;
}

export const blogFaqs: Record<string, BlogFaq[]> = {
  "best-time-to-give-sadaqah": [
    {
      question: "When is the best time to give Sadaqah in Islam?",
      answer: "Sadaqah can be given at any time, but certain moments carry greater reward: during Ramadan (especially the last ten nights), on Fridays, during the first ten days of Dhul Hijjah, and in times of hardship for others.",
    },
    {
      question: "Is it better to give Sadaqah on Friday?",
      answer: "Yes. Friday (Jumu'ah) is considered a blessed day in Islam, and giving charity on Friday is encouraged in the Sunnah. However, the best Sadaqah is that which is given consistently, even if small.",
    },
    {
      question: "Can you give Sadaqah during Ramadan?",
      answer: "Yes, and it is highly encouraged. The Prophet (peace be upon him) was most generous during Ramadan. Sadaqah given in Ramadan carries multiplied reward, especially during the last ten nights.",
    },
  ],

  "can-you-pay-zakat-with-a-credit-card": [
    {
      question: "Is it permissible to pay Zakat with a credit card?",
      answer: "Yes. The scholarly consensus is that the payment method does not affect the validity of Zakat. What matters is the intention and that the correct amount reaches eligible recipients.",
    },
    {
      question: "Does the charity receive less if I pay Zakat by credit card?",
      answer: "Card processing fees (typically 1.4% + 20p) are absorbed by the charity, not the donor. Your full Zakat amount is counted. Adding Gift Aid recovers 25% from HMRC, more than offsetting any fees.",
    },
    {
      question: "Can I earn reward points when paying Zakat by credit card?",
      answer: "Earning cashback or reward points on a Zakat payment is generally considered permissible by scholars, as the benefit is incidental to the payment method rather than the charity itself.",
    },
  ],

  "can-zakat-be-given-to-family-members": [
    {
      question: "Can I give Zakat to my parents?",
      answer: "No. You cannot give Zakat to your parents, grandparents, or any direct ancestors. You are already obligated to support them financially, so Zakat to them is considered supporting yourself.",
    },
    {
      question: "Can I give Zakat to my siblings?",
      answer: "Yes, if they are eligible (poor, in debt, or otherwise qualifying under the eight Zakat categories). Siblings are not in your direct line of financial obligation, so Zakat to an eligible sibling is valid and even carries extra reward.",
    },
    {
      question: "Can Zakat be given to non-Muslim family members?",
      answer: "The majority scholarly view is that Zakat should be given to Muslim recipients. However, Sadaqah (voluntary charity) can be given to anyone regardless of faith, including non-Muslim family members.",
    },
  ],

  "giving-sadaqah-for-the-deceased": [
    {
      question: "Can you give charity on behalf of someone who has died?",
      answer: "Yes. Giving Sadaqah on behalf of a deceased person is one of the most virtuous acts in Islam. The reward reaches the deceased and benefits those who receive the charity.",
    },
    {
      question: "What is the best charity for a deceased loved one?",
      answer: "Sadaqah Jariyah (ongoing charity) such as funding a water well, building a school, or sponsoring an orphan is considered the best form because the reward continues for as long as people benefit from it.",
    },
    {
      question: "Can you give Zakat on behalf of the deceased?",
      answer: "If the deceased had unpaid Zakat, it should be paid from their estate before inheritance is distributed. Voluntary Zakat payments on behalf of the deceased are a matter of scholarly discussion — Sadaqah is the safer and more widely accepted option.",
    },
  ],

  "how-to-calculate-zakat-on-gold-and-silver": [
    {
      question: "Do I pay Zakat on gold jewellery I wear?",
      answer: "This is a matter of scholarly difference. The Hanafi position (followed by many UK Muslims) is that Zakat is due on all gold, including jewellery worn regularly. The Shafi'i and Hanbali positions exempt personal-use jewellery. Consult your local scholar.",
    },
    {
      question: "What is the nisab threshold for gold and silver?",
      answer: "The nisab for gold is 87.48 grams (approximately 3 ounces). The nisab for silver is 612.36 grams. If your total gold or silver exceeds these thresholds, Zakat of 2.5% is due on the full amount.",
    },
    {
      question: "How do I calculate Zakat on gold?",
      answer: "Weigh your gold in grams, multiply by the current price per gram in GBP, then calculate 2.5% of the total value. For example: 100g of gold at £50/g = £5,000. Zakat = £125.",
    },
  ],

  "how-to-calculate-zakat-on-savings": [
    {
      question: "Do I pay Zakat on my savings account?",
      answer: "Yes. Cash savings in any account — current, savings, or fixed-term — are zakatable if your total eligible wealth exceeds the nisab threshold and has been held for one lunar year.",
    },
    {
      question: "Is Zakat due on ISAs in the UK?",
      answer: "Yes. ISAs (Individual Savings Accounts) are zakatable. The tax-free status of an ISA is a UK tax benefit and does not affect the Islamic obligation of Zakat on wealth held above the nisab.",
    },
    {
      question: "Do I pay Zakat on money I need for bills?",
      answer: "Immediate debts and bills due within the next month can be deducted from your zakatable wealth. However, future bills (rent not yet due, next year's expenses) cannot be deducted.",
    },
  ],

  "is-zakat-due-on-property": [
    {
      question: "Is Zakat due on my home?",
      answer: "No. Your primary residence is exempt from Zakat regardless of its value. Zakat is only due on property held as an investment or for resale.",
    },
    {
      question: "Do I pay Zakat on buy-to-let property?",
      answer: "If you intend to keep the property long-term and earn rental income, most scholars say Zakat is due on the net rental income (after expenses), not the property value itself. If you intend to sell, Zakat is due on the market value.",
    },
    {
      question: "Is Zakat due on land?",
      answer: "Land held for personal use or farming is generally exempt. Land purchased with the intention of resale (trading stock) is zakatable at its current market value. Your intention at the time of purchase determines the ruling.",
    },
  ],

  "is-zakat-due-on-student-loans-uk": [
    {
      question: "Can I deduct my student loan from my Zakat calculation?",
      answer: "The stronger scholarly position for UK student loans is to deduct only what is currently due (your monthly repayment), not the full loan balance. UK student loans have unique features — they're written off after 30-40 years and repayments are income-contingent.",
    },
    {
      question: "Do I pay Zakat if I have student debt?",
      answer: "In most cases, yes. UK student loans do not reduce your zakatable wealth by the full balance because they function more like a graduate tax than a conventional debt. Deduct only the amount due this month.",
    },
    {
      question: "What if I'm below the student loan repayment threshold?",
      answer: "If your income is below the repayment threshold, no payment is due and therefore nothing is deducted from your Zakat calculation. Your Zakat is calculated on your total eligible assets as normal.",
    },
  ],

  "sadaqah-for-parents-who-passed-away": [
    {
      question: "Can I give Sadaqah for my deceased parents?",
      answer: "Yes. Giving Sadaqah on behalf of deceased parents is one of the most beautiful acts in Islam. The Prophet (peace be upon him) confirmed that charity given on behalf of the dead reaches them and benefits them.",
    },
    {
      question: "What is the best Sadaqah for parents who have passed away?",
      answer: "Sadaqah Jariyah (ongoing charity) is best — funding a water well, sponsoring an orphan, or building a school. The reward continues for as long as people benefit, reaching your parents' record of deeds.",
    },
    {
      question: "Can I give Sadaqah for both parents at once?",
      answer: "Yes. You can make a single donation with the intention that the reward reaches both parents. There is no requirement to make separate donations for each parent.",
    },
  ],

  "what-is-sadaqah-jariyah": [
    {
      question: "What is Sadaqah Jariyah?",
      answer: "Sadaqah Jariyah is ongoing charity — a donation that continues to benefit people long after the initial gift. The Prophet (peace be upon him) taught that it is one of three things whose reward continues after a person dies.",
    },
    {
      question: "What are examples of Sadaqah Jariyah?",
      answer: "Common examples include building a water well, funding a school, planting trees, sponsoring an orphan's education, contributing to a mosque, and sharing beneficial knowledge. Any charity with lasting benefit qualifies.",
    },
    {
      question: "How is Sadaqah Jariyah different from regular Sadaqah?",
      answer: "Regular Sadaqah provides immediate one-time benefit (like giving food to someone hungry). Sadaqah Jariyah provides ongoing benefit over time (like building a well that serves a community for years). Both are rewarded, but Sadaqah Jariyah continues to earn reward indefinitely.",
    },
  ],

  "zakat-al-fitr-vs-zakat-al-mal": [
    {
      question: "What is the difference between Zakat al-Fitr and Zakat al-Mal?",
      answer: "Zakat al-Mal is the annual 2.5% wealth tax on savings above the nisab threshold. Zakat al-Fitr is a fixed per-person payment due before Eid al-Fitr, obligatory on every Muslim regardless of wealth. They have different amounts, timing, and purposes.",
    },
    {
      question: "Do I need to pay both Zakat al-Fitr and Zakat al-Mal?",
      answer: "Yes, if both apply to you. Zakat al-Mal is due if your wealth exceeds the nisab. Zakat al-Fitr is due from every Muslim (or paid on their behalf) before Eid al-Fitr prayer. They are separate obligations.",
    },
    {
      question: "When is Zakat al-Fitr due?",
      answer: "Zakat al-Fitr must be paid before the Eid al-Fitr prayer. It is commonly paid during the last few days of Ramadan to ensure it reaches recipients in time for Eid.",
    },
  ],

  "zakat-on-cryptocurrency-uk": [
    {
      question: "Do I pay Zakat on Bitcoin and cryptocurrency?",
      answer: "Yes. The majority of contemporary scholars consider cryptocurrency a zakatable asset. If your total crypto holdings (valued in GBP on your Zakat anniversary) exceed the nisab threshold, 2.5% Zakat is due.",
    },
    {
      question: "How do I calculate Zakat on cryptocurrency?",
      answer: "Check the GBP value of all your crypto holdings on your Zakat due date. Add this to your other zakatable assets. If the total exceeds the nisab, pay 2.5% of the total. Use the market price at the time of calculation.",
    },
    {
      question: "Is Zakat due on NFTs?",
      answer: "NFTs held for trading (buying and selling for profit) are zakatable at their current market value, similar to trade goods. NFTs held for personal use or display are generally exempt, though scholars continue to discuss this area.",
    },
  ],

  "zakat-vs-sadaqah-difference": [
    {
      question: "What is the difference between Zakat and Sadaqah?",
      answer: "Zakat is a compulsory annual payment of 2.5% on wealth above the nisab threshold, with specific eligible recipients. Sadaqah is voluntary charity with no minimum, no calculation, and can be given to anyone at any time.",
    },
    {
      question: "Is Sadaqah compulsory in Islam?",
      answer: "No. Sadaqah is voluntary charity, unlike Zakat which is obligatory. However, giving Sadaqah is highly encouraged and rewarded. The Prophet (peace be upon him) said that even a smile is Sadaqah.",
    },
    {
      question: "Can I give both Zakat and Sadaqah?",
      answer: "Yes, and it is encouraged. Zakat fulfills your obligation; Sadaqah is an additional act of worship. Many Muslims pay their Zakat first, then give Sadaqah on top for extra reward.",
    },
  ],
};
