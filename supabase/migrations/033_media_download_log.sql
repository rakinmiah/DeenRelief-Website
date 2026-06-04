-- Migration 033: record media DOWNLOADS in the safeguarding access log.
--
-- Sponsors can now download a child's photos/videos for personal keeping
-- (photos are watermarked "Confidential · Deen Relief"; both are logged).
-- Extend child_media_access_log.action to distinguish a download from a view.
--
-- Idempotent: safe to run more than once.

alter table child_media_access_log
  drop constraint if exists child_media_access_log_action_check;

alter table child_media_access_log
  add constraint child_media_access_log_action_check
  check (action in ('view_profile', 'signed_url_issued', 'downloaded'));

comment on column child_media_access_log.action is
  'One of ''view_profile'' (sponsor opened a child page), ''signed_url_issued'' (a media view URL was minted), or ''downloaded'' (a sponsor downloaded a photo/video for personal keeping).';
