-- Fix security warnings: set search_path for functions
ALTER FUNCTION public.find_nearby_lines(TEXT, NUMERIC) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_structures_near_footprint(TEXT, NUMERIC) SET search_path = public, pg_temp;