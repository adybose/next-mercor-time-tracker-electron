-- Add current_duration_seconds column to time_entries table for real-time tracking
DO $$ 
BEGIN
    -- Add current_duration_seconds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'current_duration_seconds'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN current_duration_seconds INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added current_duration_seconds column to time_entries table';
    ELSE
        RAISE NOTICE 'current_duration_seconds column already exists in time_entries table';
    END IF;

    -- Update existing running entries with current duration
    UPDATE time_entries 
    SET current_duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER - COALESCE(total_paused_seconds, 0)
    WHERE status = 'running' AND is_active = true;

    RAISE NOTICE 'Updated existing running entries with current duration';

    -- Create index for better performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'time_entries' 
        AND indexname = 'idx_time_entries_status_active'
    ) THEN
        CREATE INDEX idx_time_entries_status_active ON time_entries(status, is_active);
        RAISE NOTICE 'Created index on time_entries(status, is_active)';
    END IF;

END $$;
