/**
 * The shared DR Admin component kit. Import from one place:
 *
 *   import { Button, PageHeader, StatusBadge, EmptyState,
 *            StatCard, StatStrip, ResponsiveTable } from "@/components/admin/ui";
 *
 * Every piece is server-component safe (no "use client"), so admin
 * pages stay server components and only opt into client islands where
 * they genuinely need interactivity.
 */
export { default as Button } from "./Button";
export type { ButtonProps } from "./Button";
export { default as PageHeader } from "./PageHeader";
export { default as StatusBadge } from "./StatusBadge";
export { default as EmptyState } from "./EmptyState";
export { StatCard, StatStrip } from "./StatCard";
export { default as ResponsiveTable } from "./ResponsiveTable";
export type { Column } from "./ResponsiveTable";
