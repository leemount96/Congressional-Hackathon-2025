# Automated YouTube Video Monitoring Setup Guide

This guide will help you set up automated monitoring of House Committee YouTube channels to detect and track new videos as they're posted.

## 📋 Components

1. **`video_monitor.py`** - Main monitoring script that checks for new videos
2. **`video_database.json`** - Persistent storage of all videos seen
3. **`notifier.py`** - Notification system for alerts
4. **`run_monitor.sh`** - Shell script for automated execution

## 🚀 Quick Start

### 1. Initial Setup

First, run the monitor manually to build the initial database:

```bash
python3 video_monitor.py
```

This will create `video_database.json` with all existing videos from the committees.

### 2. Configure Notifications (Optional)

Create or update your `.env` file with notification settings:

```bash
# Discord Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE

# Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WEBHOOK_HERE

# Custom Webhook
WEBHOOK_URL=https://your-server.com/webhook

# Email Notifications
NOTIFICATION_EMAIL=your-email@example.com
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Test the Monitor

Run a test to ensure everything works:

```bash
python3 video_monitor.py
```

## ⏰ Setting Up Automated Monitoring

### Option 1: Using Cron (Linux/Mac)

1. Make the run script executable:
```bash
chmod +x run_monitor.sh
```

2. Open your crontab:
```bash
crontab -e
```

3. Add one of these schedules:

```bash
# Run every hour
0 * * * * /path/to/transcript-generation/run_monitor.sh

# Run every 30 minutes
*/30 * * * * /path/to/transcript-generation/run_monitor.sh

# Run every 6 hours
0 */6 * * * /path/to/transcript-generation/run_monitor.sh

# Run twice daily (9am and 5pm)
0 9,17 * * * /path/to/transcript-generation/run_monitor.sh

# Run once daily at midnight
0 0 * * * /path/to/transcript-generation/run_monitor.sh
```

### Option 2: Using Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, hourly, etc.)
4. Action: Start a program
5. Program: `python.exe`
6. Arguments: `C:\path\to\video_monitor.py`
7. Start in: `C:\path\to\transcript-generation`

### Option 3: Using systemd Timer (Linux)

Create `/etc/systemd/system/youtube-monitor.service`:

```ini
[Unit]
Description=YouTube Committee Video Monitor

[Service]
Type=oneshot
WorkingDirectory=/path/to/transcript-generation
ExecStart=/usr/bin/python3 /path/to/transcript-generation/video_monitor.py
User=your-username
```

Create `/etc/systemd/system/youtube-monitor.timer`:

```ini
[Unit]
Description=Run YouTube Monitor every hour

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable youtube-monitor.timer
sudo systemctl start youtube-monitor.timer
```

### Option 4: Using GitHub Actions (Cloud)

Create `.github/workflows/monitor.yml`:

```yaml
name: Monitor YouTube Videos

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install google-api-python-client python-dotenv pandas rich requests
    
    - name: Run monitor
      env:
        YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
        DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
      run: python video_monitor.py
    
    - name: Commit database updates
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add video_database.json new_videos_log.json
        git diff --quiet && git diff --staged --quiet || git commit -m "Update video database"
        git push
```

## 📊 Monitoring Features

### What Gets Tracked

- **Video ID** - Unique identifier
- **Title** - Video title
- **Published Date** - When posted to YouTube
- **View Count** - Current views
- **Like Count** - Current likes
- **Description** - First 500 characters
- **Duration** - Video length
- **Tags** - Associated tags
- **Found Date** - When first detected by monitor

### Database Structure

```json
{
  "last_updated": "2024-09-17T10:00:00Z",
  "total_videos": 1234,
  "committees": {
    "Rules": {
      "video_ids": ["abc123", "def456"],
      "last_checked": "2024-09-17T10:00:00Z",
      "total_videos": 45
    }
  },
  "videos": {
    "abc123": {
      "video_id": "abc123",
      "title": "Committee Hearing",
      "published_at": "2024-09-17T09:00:00Z",
      ...
    }
  }
}
```

## 🔔 Notification Channels

### Discord Setup

1. Go to Server Settings → Integrations → Webhooks
2. Create New Webhook
3. Copy webhook URL
4. Add to `.env` as `DISCORD_WEBHOOK_URL`

### Slack Setup

1. Go to your Slack workspace
2. Apps → Incoming Webhooks
3. Add to Channel
4. Copy webhook URL
5. Add to `.env` as `SLACK_WEBHOOK_URL`

### Email Setup (Gmail example)

1. Enable 2-factor authentication
2. Generate app-specific password
3. Add credentials to `.env`:
   - `SMTP_SERVER=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USERNAME=your-email@gmail.com`
   - `SMTP_PASSWORD=app-specific-password`

## 📈 Monitoring Dashboard

View statistics anytime:

```bash
# Check database statistics
python3 -c "from video_monitor import VideoMonitor; m = VideoMonitor(); m.generate_statistics()"

# View recent new videos
cat new_videos_log.json | python -m json.tool | tail -50

# Check last run
ls -la logs/ | tail -5
```

## 🔧 Troubleshooting

### No New Videos Detected

- Check API quota hasn't been exceeded
- Verify channels are still active
- Review logs in `logs/` directory

### Notifications Not Working

- Test webhook URLs are valid
- Check `.env` file has correct credentials
- Run `python3 notifier.py` to test

### Database Issues

- Backup: `cp video_database.json video_database.backup.json`
- Reset: `rm video_database.json` (will rebuild on next run)

## 🎯 Best Practices

1. **API Quotas**: Don't run more than once per hour to conserve quota
2. **Backups**: Regularly backup `video_database.json`
3. **Monitoring**: Check logs weekly for any issues
4. **Updates**: Keep dependencies updated

## 📊 Advanced Usage

### Custom Filters

Edit `video_monitor.py` to add filters:

```python
# Only track videos with certain keywords
if "hearing" in video['title'].lower():
    # Process video
```

### Export Options

```python
# Export all videos to CSV
from video_monitor import VideoMonitor
monitor = VideoMonitor()
# ... export logic
```

### Integration with Other Systems

The `video_database.json` can be read by other applications for:
- Building websites
- Data analysis
- Transcript generation
- Archive systems

## 🤝 Contributing

To improve the monitoring system:
1. Add new notification channels in `notifier.py`
2. Enhance video metadata collection
3. Add data visualization features
4. Implement transcript fetching

## 📝 License

Public domain (same as source data from House Digital Service)
