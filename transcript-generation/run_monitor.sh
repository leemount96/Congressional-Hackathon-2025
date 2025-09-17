#!/bin/bash

# House Committee YouTube Video Monitor - Automated Runner
# This script can be scheduled via cron to run periodically

# Navigate to the project directory
cd "$(dirname "$0")"

# Log file location
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log"

echo "========================================" >> "$LOG_FILE"
echo "YouTube Video Monitor Run Started" >> "$LOG_FILE"
echo "Time: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found" >> "$LOG_FILE"
    exit 1
fi

# Run the video monitor
python3 video_monitor.py >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "Monitor run completed successfully" >> "$LOG_FILE"
else
    echo "Monitor run failed with error code: $?" >> "$LOG_FILE"
fi

echo "Run completed at: $(date)" >> "$LOG_FILE"

# Optional: Keep only last 30 log files
find "$LOG_DIR" -name "monitor_*.log" -type f -mtime +30 -delete

# Optional: Send notification if new videos were found
if grep -q "NEW videos found!" "$LOG_FILE"; then
    # You can add notification commands here
    # Example: send email, post to Slack, etc.
    echo "New videos detected - notification would be sent here" >> "$LOG_FILE"
fi
