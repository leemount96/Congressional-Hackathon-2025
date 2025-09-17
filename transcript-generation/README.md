# House Committee YouTube Video Poller

A Python tool to fetch the five most recent videos from U.S. House of Representatives Committee YouTube channels.

## Features

- 📺 Polls the 5 most recent videos from each House Committee YouTube channel
- 📊 Displays results in a beautiful table format
- 💾 Exports data to JSON and CSV formats for analysis
- 🎨 Rich terminal output with progress tracking
- 📈 Includes video statistics (views, likes, duration)

## Installation

1. Install dependencies using `uv`:
```bash
uv sync
```

Or using pip:
```bash
pip install -r requirements.txt
```

2. Set up YouTube Data API key:

### Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### Setting the API Key

Create a `.env` file in the project directory:
```bash
echo "YOUTUBE_API_KEY=your_api_key_here" > .env
```

## Usage

Run the script to fetch recent videos from all committees:

```bash
python main.py
```

The script will:
1. Load committee channel data from `committee_transcripts.json`
2. Connect to the YouTube API using your API key
3. Fetch the 5 most recent videos from each channel
4. Display results in a formatted table
5. Save results to `recent_videos.json` and `recent_videos.csv`

## Output Formats

### Terminal Table
Beautiful formatted tables showing:
- Published date
- Video title
- View count  
- Video URL

### JSON Export (`recent_videos.json`)
Structured JSON with full video details including:
- Video ID and URL
- Title and description
- Published date
- View and like counts
- Video duration
- Thumbnail URL

### CSV Export (`recent_videos.csv`)
Spreadsheet-friendly format for data analysis with columns:
- Committee name
- Video ID
- Title
- Published date
- View count
- Like count
- URL

## Data Source

The committee channel list is sourced from `committee_transcripts.json`, which contains official U.S. House Committee YouTube channel information provided by the House Digital Service.

## Requirements

- Python 3.11+
- YouTube Data API v3 key
- Internet connection

## API Quotas

The YouTube Data API has daily quota limits. This script uses approximately:
- 3 quota units per channel for fetching videos
- 1 quota unit per video for statistics

With 21 committees and 5 videos each, expect to use ~150 quota units per run.

## Troubleshooting

### "YouTube API key not found"
Make sure you've created a `.env` file with your API key:
```bash
YOUTUBE_API_KEY=AIza...your_key_here
```

### "Could not fetch videos for channel"
Some channels may be private or have restricted access. The script will skip these and continue with others.

### Rate Limiting
If you hit API quotas, wait until the next day (quotas reset at midnight Pacific Time) or use a different API key.

## License

This project uses public domain data from the U.S. House of Representatives (CC0 1.0).
