#!/bin/bash

# Setup script for adding YouTube monitoring to cron

echo "==================================="
echo "YouTube Monitor Cron Setup"
echo "==================================="
echo ""

# Get the full path to the run_monitor.sh script
SCRIPT_PATH="$(pwd)/run_monitor.sh"

echo "Script location: $SCRIPT_PATH"
echo ""
echo "Choose your monitoring schedule:"
echo "1) Every hour (recommended for active monitoring)"
echo "2) Every 6 hours (good balance)"
echo "3) Once daily at 9am"
echo "4) Twice daily (9am and 5pm)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        CRON_LINE="0 * * * * $SCRIPT_PATH"
        SCHEDULE="every hour"
        ;;
    2)
        CRON_LINE="0 */6 * * * $SCRIPT_PATH"
        SCHEDULE="every 6 hours"
        ;;
    3)
        CRON_LINE="0 9 * * * $SCRIPT_PATH"
        SCHEDULE="daily at 9am"
        ;;
    4)
        CRON_LINE="0 9,17 * * * $SCRIPT_PATH"
        SCHEDULE="twice daily at 9am and 5pm"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Will schedule monitoring to run: $SCHEDULE"
echo "Cron line: $CRON_LINE"
echo ""
read -p "Add this to crontab? (y/n): " confirm

if [[ $confirm == "y" || $confirm == "Y" ]]; then
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Cron job added successfully!"
    echo ""
    echo "To verify, run: crontab -l"
    echo "To remove, run: crontab -e and delete the line"
else
    echo "Cron setup cancelled."
fi
