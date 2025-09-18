-- Hush Enhancement Migration
-- Adds advanced features: message status, typing indicators, view-once media

-- Add message status to messages table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'status') THEN
        ALTER TABLE messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'viewed'));
    END IF;
END $$;

-- Add message read tracking (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'read_by') THEN
        ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- Create typing indicators table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, participant_id)
);

-- Create message views table for view-once media (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS message_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, participant_id)
);

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_read_by ON messages USING GIN(read_by);
CREATE INDEX IF NOT EXISTS idx_typing_room ON typing_indicators(room_id);
CREATE INDEX IF NOT EXISTS idx_typing_participant ON typing_indicators(participant_id);
CREATE INDEX IF NOT EXISTS idx_message_views_message ON message_views(message_id);
CREATE INDEX IF NOT EXISTS idx_message_views_participant ON message_views(participant_id);

-- Function to update message status
CREATE OR REPLACE FUNCTION update_message_status(msg_id UUID, new_status VARCHAR(20))
RETURNS VOID AS $$
BEGIN
    UPDATE messages SET status = new_status WHERE id = msg_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as read by participant
CREATE OR REPLACE FUNCTION mark_message_read(msg_id UUID, participant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Add participant to read_by array if not already there
    UPDATE messages
    SET read_by = array_append(read_by, participant_uuid)
    WHERE id = msg_id AND NOT (read_by @> ARRAY[participant_uuid]);

    -- Insert into message_views for view-once tracking
    INSERT INTO message_views (message_id, participant_id)
    VALUES (msg_id, participant_uuid)
    ON CONFLICT (message_id, participant_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to set typing status
CREATE OR REPLACE FUNCTION set_typing_status(room_uuid UUID, participant_uuid UUID, typing BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO typing_indicators (room_id, participant_id, is_typing, last_updated)
    VALUES (room_uuid, participant_uuid, typing, CURRENT_TIMESTAMP)
    ON CONFLICT (room_id, participant_id)
    DO UPDATE SET
        is_typing = EXCLUDED.is_typing,
        last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old typing indicators (older than 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM typing_indicators
    WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '30 seconds';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active typing indicators for a room
CREATE OR REPLACE FUNCTION get_active_typing(room_uuid UUID)
RETURNS TABLE(participant_id UUID, nickname VARCHAR(50), avatar VARCHAR(10)) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.nickname,
        p.avatar
    FROM typing_indicators t
    JOIN participants p ON t.participant_id = p.id
    WHERE t.room_id = room_uuid
      AND t.is_typing = true
      AND t.last_updated > CURRENT_TIMESTAMP - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c
                   JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE c.relname = 'typing_indicators'
                   AND n.nspname = 'public'
                   AND c.relrowsecurity = true) THEN
        ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c
                   JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE c.relname = 'message_views'
                   AND n.nspname = 'public'
                   AND c.relrowsecurity = true) THEN
        ALTER TABLE message_views ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- RLS Policies for new tables (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE tablename = 'typing_indicators'
                   AND policyname = 'Allow all on typing_indicators') THEN
        CREATE POLICY "Allow all on typing_indicators" ON typing_indicators FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE tablename = 'message_views'
                   AND policyname = 'Allow all on message_views') THEN
        CREATE POLICY "Allow all on message_views" ON message_views FOR ALL USING (true);
    END IF;
END $$;

-- Update existing messages to have 'sent' status
UPDATE messages SET status = 'sent' WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN messages.status IS 'Message delivery status: pending, sent, delivered, viewed';
COMMENT ON COLUMN messages.read_by IS 'Array of participant IDs who have read this message';
COMMENT ON TABLE typing_indicators IS 'Tracks which participants are currently typing in each room';
COMMENT ON TABLE message_views IS 'Tracks views of messages, especially for view-once media';