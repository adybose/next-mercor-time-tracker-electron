-- Add missing columns to time_entries table safely
DO $$ 
BEGIN
    -- Add current_duration_seconds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'current_duration_seconds'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN current_duration_seconds INTEGER DEFAULT 0;
        RAISE NOTICE 'Added current_duration_seconds column';
    ELSE
        RAISE NOTICE 'current_duration_seconds column already exists';
    END IF;

    -- Add pause_start_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'pause_start_time'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN pause_start_time TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added pause_start_time column';
    ELSE
        RAISE NOTICE 'pause_start_time column already exists';
    END IF;

    -- Add last_pause_time column if it doesn't exist (legacy support)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'last_pause_time'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN last_pause_time TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_pause_time column';
    ELSE
        RAISE NOTICE 'last_pause_time column already exists';
    END IF;

    -- Add total_paused_seconds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'total_paused_seconds'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN total_paused_seconds INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_paused_seconds column';
    ELSE
        RAISE NOTICE 'total_paused_seconds column already exists';
    END IF;

    -- Add resume_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'resume_time'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN resume_time TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added resume_time column';
    ELSE
        RAISE NOTICE 'resume_time column already exists';
    END IF;

    -- Add ip_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN ip_address TEXT;
        RAISE NOTICE 'Added ip_address column';
    ELSE
        RAISE NOTICE 'ip_address column already exists';
    END IF;

    -- Add mac_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'mac_address'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN mac_address TEXT;
        RAISE NOTICE 'Added mac_address column';
    ELSE
        RAISE NOTICE 'mac_address column already exists';
    END IF;

    RAISE NOTICE 'All required columns have been checked and added if missing';
END $$;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
ORDER BY ordinal_position;
