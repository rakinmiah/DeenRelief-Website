"use client";

/**
 * Hero pilot fidelity preview. Builds each of the five faithful Hero
 * presets and renders it through the production Satori export route, so
 * what shows here is exactly what a published slide PNG would look like
 * (and any Satori error surfaces inline for debugging).
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  presetForTemplate,
  type BrandLogo,
  type SlideContent,
} from "@/lib/social-editor/presets";
import type { EditorSlide } from "@/lib/social-editor/types";

const SAMPLE_IMG = "https://picsum.photos/id/1015/1080/1080";

type Variant = { id: string; label: string; c: SlideContent };

export default function HeroLab({ logo }: { logo: BrandLogo | null }) {
  const variants = useMemo<Variant[]>(
    () => [
      {
        id: "hero-a",
        label: "A · Photo-led full-bleed",
        c: {
          primary: "881 killed since the\nceasefire.",
          secondary:
            "Gaza's Health Ministry reports strikes have continued across the Strip since the January truce.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-b",
        label: "B · Typography-only cover",
        c: {
          primary: "Gaza, after",
          accent: "the ceasefire.",
          secondary:
            "Four months after the truce, the bombardment has not stopped.",
          imageUrl: null,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "hero-c",
        label: "C · Top photo / bottom panel",
        c: {
          primary: "A winter without\nshelter.",
          secondary:
            "Tens of thousands of families face the cold months in tents and the rubble of their homes.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-d",
        label: "D · Centered crest",
        c: {
          primary: "The need has\nnot eased.",
          secondary: null,
          imageUrl: null,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "hero-e",
        label: "E · Documentary caption bar",
        c: {
          primary: "Families return to rubble.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Rafah · 24 May 2026",
          logo,
        },
      },
      {
        id: "hero-f",
        label: "F · Brand cover",
        c: {
          primary: "Stand with",
          accent: "Gaza.",
          secondary: null,
          imageUrl: null,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "hero-g",
        label: "G · Editorial dispatch",
        c: {
          primary: "No safe place",
          accent: "to shelter.",
          secondary:
            "Across the Strip, families are sleeping in tents as winter sets in.",
          imageUrl: null,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-h",
        label: "H · Stat-led",
        c: {
          primary: "2.1m",
          accent: "in need.",
          // Short stat descriptor — the design wants a punchy label, not a
          // full sentence (a long one wraps to 4 lines and overwhelms).
          secondary: "Now depend on humanitarian aid.",
          imageUrl: null,
          eyebrow: "By the numbers · Gaza",
          logo,
        },
      },
      {
        id: "hero-i",
        label: "I · Quote-led",
        c: {
          primary:
            "We rebuild what we can with our hands, and we wait for the world to remember us.",
          secondary: "Aid worker, Khan Younis",
          imageUrl: null,
          eyebrow: "In their words",
          logo,
        },
      },
      {
        id: "hero-j",
        label: "J · Framed two-tone",
        c: {
          primary: "A winter without\nshelter.",
          secondary:
            "Tens of thousands face the cold in tents and the rubble of their homes.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-k",
        label: "K · Split diptych",
        c: {
          primary: "Aid is running out.",
          secondary:
            "Stocks of food, fuel and clean water are nearly gone across the Strip.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-l",
        label: "L · Lower-third broadcast",
        c: {
          primary: "No safe place",
          accent: "to shelter.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Gaza City · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-m",
        label: "M · Inset card",
        c: {
          primary: "Aid is running out.",
          secondary:
            "Stocks of food, fuel and clean water are nearly gone across the Strip.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-n",
        label: "N · Window crop",
        c: {
          primary: "One family among millions.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Rafah · 24 May 2026",
          logo,
        },
      },
      {
        id: "hero-o",
        label: "O · Duotone poster",
        c: {
          primary: "Stand with",
          accent: "Gaza.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "tiers-a",
        label: "Donation tiers · Impact ladder",
        c: {
          primary: "Where your gift goes",
          secondary: null,
          imageUrl: null,
          eyebrow: "Palestine Appeal",
          logo,
        },
      },
      {
        id: "beforeafter-a",
        label: "Before / After · Then & now",
        c: {
          primary: "Healthcare in collapse",
          secondary: "Source: WHO · May 2026",
          imageUrl: null,
          eyebrow: "Palestine Appeal",
          logo,
        },
      },
      {
        id: "multistat-a",
        label: "Multi-stat · By the numbers",
        c: {
          primary: "Gaza today",
          secondary: null,
          imageUrl: null,
          eyebrow: "By the numbers",
          logo,
        },
      },
      {
        id: "tiers-b",
        label: "Tiers B · Over photo",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-c",
        label: "Tiers C · Gold inverted",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-d",
        label: "Tiers D · Single hero tier",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-e",
        label: "Tiers E · Split",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-f",
        label: "Tiers F · With total ask",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-g",
        label: "Tiers G · Zakat-framed",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-h",
        label: "Tiers H · Two-tone",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-i",
        label: "Tiers I · Keyline card",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "tiers-j",
        label: "Tiers J · Scan to give",
        c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "beforeafter-b",
        label: "Before/After B · Vertical stack",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-c",
        label: "Before/After C · Two photos",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-d",
        label: "Before/After D · Connecting arrow",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-e",
        label: "Before/After E · Small then, big now",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-f",
        label: "Before/After F · Two-tone",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-g",
        label: "Before/After G · Over photo",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-h",
        label: "Before/After H · Timeline",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-i",
        label: "Before/After I · Card-framed",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "beforeafter-j",
        label: "Before/After J · % change",
        c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "multistat-b",
        label: "Multi-stat B · Single row",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-c",
        label: "Multi-stat C · Hero + supporting",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-d",
        label: "Multi-stat D · Grid",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-e",
        label: "Multi-stat E · Over photo",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-f",
        label: "Multi-stat F · Two-tone",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-g",
        label: "Multi-stat G · Gold-ruled beats",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-h",
        label: "Multi-stat H · Centred crest",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-i",
        label: "Multi-stat I · Connecting timeline",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "multistat-j",
        label: "Multi-stat J · Ledger",
        c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG, logo },
      },
      {
        id: "cta-a",
        label: "CTA A · Type-led",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-b",
        label: "CTA B · Gold inverted",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-c",
        label: "CTA C · Photo lower-third",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-d",
        label: "CTA D · Crest",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-e",
        label: "CTA E · Split",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-f",
        label: "CTA F · Stat-led",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-g",
        label: "CTA G · Quote-led",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-h",
        label: "CTA H · Urgency",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-i",
        label: "CTA I · Scan to give",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-j",
        label: "CTA J · Wordmark card",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "stat-a",
        label: "Stat A · Colossal",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-b",
        label: "Stat B · With context",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-c",
        label: "Stat C · Bleeding numeral",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-d",
        label: "Stat D · Over photo",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-e",
        label: "Stat E · With unit",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-f",
        label: "Stat F · Gold inverted",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-g",
        label: "Stat G · Split",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-h",
        label: "Stat H · Crest",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-i",
        label: "Stat I · Comparison",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "stat-j",
        label: "Stat J · With beat",
        c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza", logo },
      },
      {
        id: "fact-a",
        label: "Fact A · Photo lower-third",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-b",
        label: "Fact B · Type-led",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-c",
        label: "Fact C · Top photo + panel",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-d",
        label: "Fact D · Split",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-e",
        label: "Fact E · Keyline card",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-f",
        label: "Fact F · Lead-in detail",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-g",
        label: "Fact G · Caption bar",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-h",
        label: "Fact H · Inset card",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-i",
        label: "Fact I · Crest",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "fact-j",
        label: "Fact J · Two-tone",
        c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza", logo },
      },
      {
        id: "testimony-a",
        label: "Testimony A · Open-quote",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-b",
        label: "Testimony B · Portrait lower-third",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-c",
        label: "Testimony C · Split",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-d",
        label: "Testimony D · Portrait chip",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-e",
        label: "Testimony E · Crest",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-f",
        label: "Testimony F · Gold emphasis",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-g",
        label: "Testimony G · Top portrait",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-h",
        label: "Testimony H · Two-tone",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-i",
        label: "Testimony I · Keyline card",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "testimony-j",
        label: "Testimony J · Caption bar",
        c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words", logo },
      },
      {
        id: "response-a",
        label: "Response A · Photo lower-third",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-b",
        label: "Response B · Top photo + panel",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-c",
        label: "Response C · Split",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-d",
        label: "Response D · Inset card",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-e",
        label: "Response E · Stat-backed",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-f",
        label: "Response F · Window crop",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-g",
        label: "Response G · Checklist",
        c: { primary: "What we're delivering", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-h",
        label: "Response H · Two-tone",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-i",
        label: "Response I · Caption bar",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
      {
        id: "response-j",
        label: "Response J · How your gift helps",
        c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response", logo },
      },
    ],
    [logo]
  );

  // Categories in review order; cards group by their id prefix (hero-, fact-…).
  const CATS: { key: string; title: string; sub: string }[] = [
    { key: "hero", title: "Hero", sub: "Opening / cover slides — 15 directions" },
    { key: "fact", title: "Key Fact", sub: "A single sourced fact" },
    { key: "stat", title: "Big Stat", sub: "One giant figure + label" },
    { key: "multistat", title: "Multi-stat", sub: "Three figures — by the numbers" },
    { key: "beforeafter", title: "Before / After", sub: "A then-and-now contrast" },
    { key: "tiers", title: "Donation Tiers", sub: "The impact ladder — what each gift gives" },
    { key: "testimony", title: "Testimony", sub: "An attributed quote" },
    { key: "response", title: "Our Response", sub: "What Deen Relief is doing on the ground" },
    { key: "cta", title: "Call to Action", sub: "The closing donate ask" },
  ];
  const byCat = (key: string) => variants.filter((v) => v.id.split("-")[0] === key);
  const total = variants.length;
  const chip: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#163827",
    background: "#fff",
    border: "1px solid #d9d6cc",
    borderRadius: 999,
    padding: "6px 12px",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4F4F2",
        padding: "32px 28px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
          Template Lab — Slide library
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14, lineHeight: 1.5, maxWidth: 820 }}>
          {total} templates across {CATS.length} slide types, each rendered through the
          real Satori export pipeline with sample copy + photo — exactly what a published
          PNG looks like. Use the nav to jump between sections; cards lazy-render as you
          scroll.
        </p>
        {/* Sticky category nav — flick between sections. */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "12px 0",
            marginTop: 14,
            background: "#F4F4F2",
            borderBottom: "1px solid #e3e1da",
          }}
        >
          {CATS.map((c) => {
            const n = byCat(c.key).length;
            if (!n) return null;
            return (
              <a key={c.key} href={`#cat-${c.key}`} style={chip}>
                {c.title}{" "}
                <span style={{ color: "#A9842B", fontWeight: 700 }}>{n}</span>
              </a>
            );
          })}
        </nav>
        {CATS.map((c) => {
          const items = byCat(c.key);
          if (!items.length) return null;
          return (
            <section
              key={c.key}
              id={`cat-${c.key}`}
              style={{ marginTop: 40, scrollMarginTop: 72 }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1A1A2E",
                  margin: 0,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                {c.title}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#A9842B" }}>
                  {items.length}
                </span>
              </h2>
              <p style={{ color: "#777", margin: "2px 0 0", fontSize: 13 }}>{c.sub}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 18 }}>
                {items.map((v) => (
                  <HeroCard key={v.id} variant={v} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function HeroCard({ variant }: { variant: Variant }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [state, setState] = useState<{
    status: "loading" | "ok" | "error";
    url?: string;
    msg?: string;
  }>({ status: "loading" });

  // Lazy: only render when the card nears the viewport, so we don't fire all
  // ~95 Satori renders on load.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    (async () => {
      try {
        const slide: EditorSlide = presetForTemplate(variant.id, variant.c);
        const res = await fetch("/api/admin/social-editor/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide }),
        });
        if (!res.ok) {
          const txt = await res.text();
          if (!cancelled) setState({ status: "error", msg: txt.slice(0, 500) });
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "ok", url: objectUrl });
      } catch (e) {
        if (!cancelled)
          setState({ status: "error", msg: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [variant, inView]);

  return (
    <div ref={ref} style={{ width: 380 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#1A1A2E",
          marginBottom: 8,
          letterSpacing: 0.4,
        }}
      >
        {variant.label}
      </div>
      <div
        style={{
          width: 380,
          height: 380,
          borderRadius: 10,
          overflow: "hidden",
          background: "#163827",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {state.status === "loading" && (
          <span style={{ color: "#cbbf9e", fontSize: 12 }}>Rendering…</span>
        )}
        {state.status === "ok" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.url}
            alt={variant.label}
            width={380}
            height={380}
            style={{ display: "block" }}
          />
        )}
        {state.status === "error" && (
          <pre
            style={{
              color: "#fff",
              fontSize: 10,
              padding: 12,
              whiteSpace: "pre-wrap",
              margin: 0,
              overflow: "auto",
              maxHeight: "100%",
            }}
          >
            {state.msg}
          </pre>
        )}
      </div>
    </div>
  );
}
