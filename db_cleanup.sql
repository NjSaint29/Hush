-- Database Cleanup Script for Hush
-- Run this in your Supabase SQL Editor to completely reset the database
-- WARNING: This will delete ALL data in your database!

-- Drop all tables in reverse order of dependencies
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS room_settings CASCADE;
DROP TABLE IF EXISTS media_files CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS chatrooms CASCADE;

-- Drop any custom types if they exist
DROP TYPE IF EXISTS message_type_enum CASCADE;
DROP TYPE IF EXISTS status_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;

-- Drop any indexes that might remain
DROP INDEX IF EXISTS idx_messages_room_created CASCADE;
DROP INDEX IF EXISTS idx_messages_user_created CASCADE;
DROP INDEX IF EXISTS idx_room_participants_room CASCADE;
DROP INDEX IF EXISTS idx_room_participants_user CASCADE;
DROP INDEX IF EXISTS idx_message_reactions_message CASCADE;
DROP INDEX IF EXISTS idx_typing_indicators_room CASCADE;

-- Drop any extensions if needed (be careful with this!)
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- Optional: Clean up any remaining sequences
-- DROP SEQUENCE IF EXISTS table_name_id_seq CASCADE;

-- Verify cleanup
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;