-- Run in the Supabase SQL Editor. Safe to re-run on an existing database.

-- 1. Tables
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlist_stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    station_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. No duplicates: drop existing duplicate rows first, then enforce uniqueness
DELETE FROM public.favorites a USING public.favorites b
    WHERE a.ctid > b.ctid AND a.user_id = b.user_id AND a.station_id = b.station_id;
DELETE FROM public.playlist_stations a USING public.playlist_stations b
    WHERE a.ctid > b.ctid AND a.playlist_id = b.playlist_id AND a.station_id = b.station_id;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_station_key ON public.favorites (user_id, station_id);
CREATE UNIQUE INDEX IF NOT EXISTS playlist_stations_playlist_station_key ON public.playlist_stations (playlist_id, station_id);
CREATE INDEX IF NOT EXISTS playlists_user_idx ON public.playlists (user_id);

-- 3. Row Level Security
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can manage their own playlist stations" ON public.playlist_stations;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;

CREATE POLICY "Users can manage their own playlists" ON public.playlists
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlist stations" ON public.playlist_stations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
