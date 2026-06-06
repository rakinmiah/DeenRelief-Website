/**
 * Test-scenario catalogue — shared between client (TestEventPanel)
 * and server (test-actions). Kept in its own file because the server
 * actions file uses "use server" and Next.js only allows async
 * function exports there — any const/type export silently
 * disappears client-side. Moved here to fix that.
 */

export const TEST_SCENARIOS = {
  "bd-earthquake": {
    label: "Bangladesh M7.0 earthquake (Sylhet)",
    description:
      "CRITICAL push — strategic field presence + 2.0× UK Bangladeshi diaspora",
    expectedTier: "CRITICAL",
  },
  "ps-gaza-escalation": {
    label: "Palestine — Gaza conflict escalation",
    description:
      "CRITICAL push — strategic Palestine campaign matched",
    expectedTier: "CRITICAL",
  },
  "bd-flood": {
    label: "Bangladesh severe monsoon flood (Sylhet)",
    description:
      "CRITICAL push — matches orphan-sponsorship + build-a-school + clean-water",
    expectedTier: "CRITICAL",
  },
  "uk-cold-snap": {
    label: "Brighton — severe cold snap warning",
    description:
      "Dashboard only — uk-homeless intensification trigger, no push",
    expectedTier: "none",
  },
  "pk-flood-eonet": {
    label: "Pakistan — Sindh flooding (NASA EONET)",
    description:
      "HIGH push — exercises NASA EONET signal + satellite imagery integration",
    expectedTier: "HIGH",
  },
  "ps-ocha-may26": {
    label: "Palestine — OCHA situation report (live data, full draft)",
    description:
      "CRITICAL · USES REAL CLAUDE (~$0.30) — sourced from a current OCHA oPt situation report on ReliefWeb. Specifically built to stress-test the new briefing register, fact specificity, and multi-image rules against substantive real-world content.",
    expectedTier: "CRITICAL",
  },
} as const;

export type TestScenarioId = keyof typeof TEST_SCENARIOS;
