-- Add current_duration_seconds column if it doesn't exist
DO $$ 
BEGIN
    -- Check if current_duration_seconds column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'current_duration_seconds'
    ) THEN
        -- Add the column
        ALTER TABLE time_entries 
        ADD COLUMN current_duration_seconds INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added current_duration_seconds column to time_entries table';
    ELSE
        RAISE NOTICE 'current_duration_seconds column already exists in time_entries table';
    END IF;

    -- Update existing paused entries to have current_duration_seconds
    UPDATE time_entries 
    SET current_duration_seconds = COALESCE(
        EXTRACT(EPOCH FROM (
            COALESCE(pause_start_time, updated_at) - start_time
        ))::INTEGER - COALESCE(total_paused_seconds, 0),
        0
    )
    WHERE status = 'paused' 
    AND (current_duration_seconds IS NULL OR current_duration_seconds = 0);

    RAISE NOTICE 'Updated existing paused entries with current_duration_seconds';
END $$;
