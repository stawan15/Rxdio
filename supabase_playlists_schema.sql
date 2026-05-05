-- Run these queries in your Supabase SQL Editor to create the required tables

-- 1. Create Playlists Table
CREATE TABLE public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Playlist Stations Table (maps stations to playlists)
CREATE TABLE public.playlist_stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    station_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Set up Row Level Security (RLS)
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own playlists" ON public.playlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlist stations" ON public.playlist_stations
    FOR ALL USING (auth.uid() = user_id);
