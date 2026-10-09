-- Optional Hebrew / English texts for TAMAM moods and packages.
-- The app shows these when the visitor picks עברית or English, and falls back
-- to the Arabic text when they're empty. Safe to run more than once.

alter table public.tamam_moods
  add column if not exists name_he text,
  add column if not exists name_en text,
  add column if not exists description_he text,
  add column if not exists description_en text;

alter table public.tamam_suggestion_sets
  add column if not exists title_he text,
  add column if not exists title_en text,
  add column if not exists description_he text,
  add column if not exists description_en text;
