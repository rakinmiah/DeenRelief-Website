-- Phase 5d — surgical fix for the Palestine packet the user is showing
-- the client (event 153b893d-1feb-4681-8a06-575bb26cb263).
--
-- Three edits to draft_packet_json.carousel_slides:
--   1. slides[0].logo_position → "top_right"
--      The hero photo has a "Palestine Relief Campaign" sign on the
--      man's back; top-right keeps the DR brand chip out of the same
--      visual zone.
--   2. slides[5].title → "440,000 PARCELS."
--      Replaces "STILL DISTRIBUTING WHERE WE CAN." which repeated
--      "STILL DISTRIBUTING" from the slide-1 hero ("STILL HERE. STILL
--      DISTRIBUTING."). 440K is the specific number from the body so
--      title + body now reinforce instead of repeat.
--   3. slides[5].logo_position → "top_right"
--      Slide 6's photo has a DR campaign banner in the upper-LEFT of
--      the frame. Top-right placement avoids the double-logo stack the
--      user flagged in review.
--
-- Plus bump draft_packet_generated_at to NOW so the page's draftStamp
-- cache-buster fires and the lightbox re-fetches the regenerated PNGs.
--
-- Run this in the Supabase SQL editor. Then refresh the packet page —
-- changes take effect immediately (Vercel slide route has Cache-Control
-- 'private, no-store', so it always re-renders).

UPDATE emergency_events
SET
  draft_packet_json = jsonb_set(
    jsonb_set(
      jsonb_set(
        draft_packet_json,
        '{carousel_slides,0,logo_position}',
        '"top_right"'::jsonb
      ),
      '{carousel_slides,5,title}',
      '"440,000 PARCELS."'::jsonb
    ),
    '{carousel_slides,5,logo_position}',
    '"top_right"'::jsonb
  ),
  draft_packet_generated_at = NOW()
WHERE id = '153b893d-1feb-4681-8a06-575bb26cb263';

-- Verify the edits landed:
SELECT
  id,
  draft_packet_json -> 'carousel_slides' -> 0 ->> 'logo_position'    AS hero_logo_pos,
  draft_packet_json -> 'carousel_slides' -> 5 ->> 'title'            AS slide6_title,
  draft_packet_json -> 'carousel_slides' -> 5 ->> 'logo_position'    AS slide6_logo_pos,
  draft_packet_generated_at
FROM emergency_events
WHERE id = '153b893d-1feb-4681-8a06-575bb26cb263';
