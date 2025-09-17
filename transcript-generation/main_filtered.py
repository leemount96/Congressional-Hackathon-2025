"""
Poll the five most recent videos (20+ minutes) from U.S. House Committee YouTube channels.

This script reads committee YouTube channel data from committee_transcripts.json
and fetches the 5 most recent videos that are at least 20 minutes long from each channel.
"""

import json
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import track
import pandas as pd

# Load environment variables
load_dotenv()

# Initialize Rich console for beautiful output
console = Console()

# Minimum video duration in minutes
MIN_DURATION_MINUTES = 20


def parse_iso8601_duration(duration_str: str) -> int:
    """
    Parse ISO 8601 duration format to total minutes.
    
    Examples:
    - PT3M48S -> 3 minutes
    - PT1H55M30S -> 115 minutes
    - PT2H26S -> 120 minutes
    - P0D -> 0 minutes (live streams or no duration)
    
    Args:
        duration_str: ISO 8601 duration string
        
    Returns:
        Total duration in minutes
    """
    if not duration_str or duration_str == 'P0D':
        return 0
    
    # Pattern to match ISO 8601 duration
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?')
    match = pattern.match(duration_str)
    
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = float(match.group(3) or 0)
    
    # Convert to total minutes
    total_minutes = hours * 60 + minutes + (seconds / 60)
    
    return int(total_minutes)


def format_duration(minutes: int) -> str:
    """
    Format minutes into a readable string.
    
    Args:
        minutes: Duration in minutes
        
    Returns:
        Formatted duration string (e.g., "1h 30m")
    """
    if minutes == 0:
        return "N/A"
    
    hours = minutes // 60
    mins = minutes % 60
    
    if hours > 0:
        return f"{hours}h {mins}m"
    else:
        return f"{mins}m"


def load_committee_channels(file_path: str = "committee_transcripts.json") -> List[Dict]:
    """
    Load committee channel data from JSON file.
    
    Args:
        file_path: Path to the JSON file containing committee data
        
    Returns:
        List of committee channel dictionaries
    """
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
            return data['data']
    except FileNotFoundError:
        console.print(f"[red]Error: File '{file_path}' not found[/red]")
        return []
    except json.JSONDecodeError:
        console.print(f"[red]Error: Invalid JSON in '{file_path}'[/red]")
        return []


def initialize_youtube_api(api_key: Optional[str] = None) -> Any:
    """
    Initialize YouTube Data API client.
    
    Args:
        api_key: YouTube Data API key (if not provided, reads from environment)
        
    Returns:
        YouTube API service object
    """
    if api_key is None:
        api_key = os.getenv('YOUTUBE_API_KEY')
    
    if not api_key:
        raise ValueError("YouTube API key not found. Please set YOUTUBE_API_KEY in .env file or pass it as parameter.")
    
    return build('youtube', 'v3', developerKey=api_key)


def get_channel_id_from_username(youtube, username: str) -> Optional[str]:
    """
    Get channel ID from username/channel name.
    
    Args:
        youtube: YouTube API service object
        username: YouTube username or channel name
        
    Returns:
        Channel ID if found, None otherwise
    """
    try:
        # First try to search by username
        request = youtube.channels().list(
            part='id',
            forUsername=username.replace('@', '')
        )
        response = request.execute()
        
        if response.get('items'):
            return response['items'][0]['id']
        
        # If not found, try searching
        search_request = youtube.search().list(
            part='id',
            q=username,
            type='channel',
            maxResults=1
        )
        search_response = search_request.execute()
        
        if search_response.get('items'):
            return search_response['items'][0]['id']['channelId']
            
    except HttpError as e:
        console.print(f"[yellow]Warning: Could not get channel ID for {username}: {e}[/yellow]")
    
    return None


def fetch_recent_videos(youtube, channel_id: str, max_results: int = 50, min_duration_minutes: int = 20) -> List[Dict]:
    """
    Fetch recent videos from a YouTube channel that meet minimum duration requirement.
    
    Args:
        youtube: YouTube API service object
        channel_id: YouTube channel ID
        max_results: Maximum number of videos to check (will fetch up to 5 that meet duration requirement)
        min_duration_minutes: Minimum video duration in minutes
        
    Returns:
        List of video dictionaries with details (up to 5 videos >= min_duration)
    """
    videos = []
    filtered_videos = []
    
    try:
        # Get the uploads playlist ID
        channels_response = youtube.channels().list(
            part='contentDetails',
            id=channel_id
        ).execute()
        
        if not channels_response.get('items'):
            return videos
        
        uploads_playlist_id = channels_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # Get recent videos from uploads playlist (fetch more to account for filtering)
        playlist_response = youtube.playlistItems().list(
            part='snippet,contentDetails',
            playlistId=uploads_playlist_id,
            maxResults=max_results  # Fetch more videos to find 5 that meet criteria
        ).execute()
        
        for item in playlist_response.get('items', []):
            video_id = item['contentDetails']['videoId']
            snippet = item['snippet']
            
            # Get additional video statistics including duration
            video_response = youtube.videos().list(
                part='statistics,contentDetails',
                id=video_id
            ).execute()
            
            video_stats = video_response['items'][0] if video_response.get('items') else {}
            
            # Parse duration
            duration_str = video_stats.get('contentDetails', {}).get('duration', 'P0D')
            duration_minutes = parse_iso8601_duration(duration_str)
            
            video_data = {
                'video_id': video_id,
                'title': snippet['title'],
                'description': snippet.get('description', '')[:200] + '...' if len(snippet.get('description', '')) > 200 else snippet.get('description', ''),
                'published_at': snippet['publishedAt'],
                'url': f"https://www.youtube.com/watch?v={video_id}",
                'thumbnail': snippet['thumbnails']['default']['url'] if 'thumbnails' in snippet else '',
                'view_count': video_stats.get('statistics', {}).get('viewCount', 'N/A'),
                'like_count': video_stats.get('statistics', {}).get('likeCount', 'N/A'),
                'duration': duration_str,
                'duration_minutes': duration_minutes,
                'duration_formatted': format_duration(duration_minutes)
            }
            
            # Only include videos that meet minimum duration requirement
            if duration_minutes >= min_duration_minutes:
                filtered_videos.append(video_data)
                
                # Stop when we have 5 videos that meet the criteria
                if len(filtered_videos) >= 5:
                    break
            
    except HttpError as e:
        console.print(f"[yellow]Warning: Could not fetch videos for channel {channel_id}: {e}[/yellow]")
    
    return filtered_videos


def poll_all_committees(committees: List[Dict], api_key: Optional[str] = None, min_duration: int = 20) -> Dict[str, List[Dict]]:
    """
    Poll recent videos from all committee channels, filtering by duration.
    
    Args:
        committees: List of committee channel dictionaries
        api_key: YouTube Data API key
        min_duration: Minimum video duration in minutes
        
    Returns:
        Dictionary mapping committee names to their recent videos (20+ minutes)
    """
    youtube = initialize_youtube_api(api_key)
    all_videos = {}
    
    console.print(f"\n[bold green]Polling YouTube channels for videos ≥ {min_duration} minutes...[/bold green]\n")
    
    total_videos_found = 0
    total_videos_filtered = 0
    
    for committee in track(committees, description="Fetching videos..."):
        channel_id = committee.get('channelId')
        channel_name = committee.get('channelName')
        short_name = committee.get('shortName')
        
        # Try using channel ID first
        if channel_id and channel_id.startswith('UC'):
            videos = fetch_recent_videos(youtube, channel_id, max_results=50, min_duration_minutes=min_duration)
        elif channel_name:
            # Try to get channel ID from username
            resolved_id = get_channel_id_from_username(youtube, channel_name)
            if resolved_id:
                videos = fetch_recent_videos(youtube, resolved_id, max_results=50, min_duration_minutes=min_duration)
            else:
                videos = []
        else:
            videos = []
        
        if videos:
            all_videos[short_name] = videos
            total_videos_found += len(videos)
            console.print(f"✓ {short_name}: Found {len(videos)} videos ≥ {min_duration} minutes")
        else:
            console.print(f"[yellow]⚠ {short_name}: No videos ≥ {min_duration} minutes found[/yellow]")
    
    console.print(f"\n[bold cyan]Total videos found: {total_videos_found} videos ≥ {min_duration} minutes[/bold cyan]")
    
    return all_videos


def display_results(all_videos: Dict[str, List[Dict]], output_format: str = "table"):
    """
    Display the fetched videos in a formatted way.
    
    Args:
        all_videos: Dictionary of committee names to video lists
        output_format: Output format ('table', 'json', or 'csv')
    """
    if output_format == "table":
        for committee_name, videos in all_videos.items():
            console.print(f"\n[bold cyan]── {committee_name} ──[/bold cyan]")
            
            if not videos:
                console.print("[yellow]No videos found[/yellow]")
                continue
            
            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Published", style="dim", width=12)
            table.add_column("Title", style="white", width=40)
            table.add_column("Duration", justify="center", style="cyan")
            table.add_column("Views", justify="right", style="green")
            table.add_column("URL", style="blue", width=25)
            
            for video in videos:
                published = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                published_str = published.strftime('%Y-%m-%d')
                
                table.add_row(
                    published_str,
                    video['title'][:40] + ('...' if len(video['title']) > 40 else ''),
                    video['duration_formatted'],
                    video['view_count'],
                    f"...watch?v={video['video_id']}"
                )
            
            console.print(table)
    
    elif output_format == "json":
        output_file = "recent_videos_filtered.json"
        with open(output_file, 'w') as f:
            json.dump(all_videos, f, indent=2)
        console.print(f"\n[green]Results saved to {output_file}[/green]")
    
    elif output_format == "csv":
        # Flatten the data for CSV
        rows = []
        for committee_name, videos in all_videos.items():
            for video in videos:
                row = {
                    'committee': committee_name,
                    'video_id': video['video_id'],
                    'title': video['title'],
                    'published_at': video['published_at'],
                    'duration_minutes': video['duration_minutes'],
                    'duration_formatted': video['duration_formatted'],
                    'view_count': video['view_count'],
                    'like_count': video['like_count'],
                    'url': video['url']
                }
                rows.append(row)
        
        if rows:
            df = pd.DataFrame(rows)
            output_file = "recent_videos_filtered.csv"
            df.to_csv(output_file, index=False)
            console.print(f"\n[green]Results saved to {output_file}[/green]")


def filter_existing_json(input_file: str = "recent_videos.json", min_duration: int = 20):
    """
    Filter an existing JSON file to remove videos under specified duration.
    
    Args:
        input_file: Path to existing JSON file with video data
        min_duration: Minimum duration in minutes
    """
    console.print(f"\n[bold blue]Filtering existing videos to ≥ {min_duration} minutes[/bold blue]\n")
    
    try:
        with open(input_file, 'r') as f:
            all_videos = json.load(f)
        
        filtered_videos = {}
        total_original = 0
        total_filtered = 0
        
        for committee_name, videos in all_videos.items():
            filtered_committee_videos = []
            
            for video in videos:
                total_original += 1
                duration_str = video.get('duration', 'P0D')
                duration_minutes = parse_iso8601_duration(duration_str)
                
                if duration_minutes >= min_duration:
                    video['duration_minutes'] = duration_minutes
                    video['duration_formatted'] = format_duration(duration_minutes)
                    filtered_committee_videos.append(video)
                    total_filtered += 1
            
            if filtered_committee_videos:
                filtered_videos[committee_name] = filtered_committee_videos
                console.print(f"✓ {committee_name}: {len(filtered_committee_videos)}/{len(videos)} videos kept")
            else:
                console.print(f"[yellow]⚠ {committee_name}: No videos ≥ {min_duration} minutes[/yellow]")
        
        console.print(f"\n[bold]Summary:[/bold]")
        console.print(f"Original videos: {total_original}")
        console.print(f"Filtered videos (≥ {min_duration} min): {total_filtered}")
        console.print(f"Videos removed: {total_original - total_filtered}")
        
        # Save filtered results
        output_file = "recent_videos_filtered.json"
        with open(output_file, 'w') as f:
            json.dump(filtered_videos, f, indent=2)
        console.print(f"\n[green]Filtered results saved to {output_file}[/green]")
        
        return filtered_videos
        
    except FileNotFoundError:
        console.print(f"[red]Error: File '{input_file}' not found[/red]")
        return {}
    except json.JSONDecodeError:
        console.print(f"[red]Error: Invalid JSON in '{input_file}'[/red]")
        return {}


def main():
    """Main function to orchestrate the video polling process with duration filtering."""
    console.print("[bold blue]U.S. House Committee YouTube Video Poller (20+ Minutes)[/bold blue]")
    console.print("=" * 60)
    
    # Check for existing recent_videos.json to filter
    if Path("recent_videos.json").exists():
        console.print("\n[cyan]Found existing recent_videos.json[/cyan]")
        choice = input("Filter existing data (f) or fetch new data (n)? [f/n]: ").lower()
        
        if choice == 'f':
            # Filter existing data
            filtered_videos = filter_existing_json(min_duration=MIN_DURATION_MINUTES)
            if filtered_videos:
                display_results(filtered_videos, output_format="table")
                display_results(filtered_videos, output_format="csv")
            return
    
    # Check for API key
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        console.print("\n[red]Error: YouTube API key not found![/red]")
        console.print("[yellow]Please create a .env file with your YouTube Data API key:[/yellow]")
        console.print("[dim]YOUTUBE_API_KEY=your_api_key_here[/dim]")
        console.print("\n[cyan]Get your API key from: https://console.cloud.google.com/apis/credentials[/cyan]")
        return
    
    # Load committee channels
    committees = load_committee_channels()
    if not committees:
        console.print("[red]No committee data found. Exiting.[/red]")
        return
    
    console.print(f"\n[green]Loaded {len(committees)} committee channels[/green]")
    console.print(f"[cyan]Minimum video duration: {MIN_DURATION_MINUTES} minutes[/cyan]")
    
    # Poll videos from all committees with duration filter
    try:
        all_videos = poll_all_committees(committees, api_key, min_duration=MIN_DURATION_MINUTES)
        
        # Display results
        total_videos = sum(len(videos) for videos in all_videos.values())
        console.print(f"\n[bold green]Successfully found {total_videos} videos ≥ {MIN_DURATION_MINUTES} minutes from {len(all_videos)} committees[/bold green]")
        
        # Display in table format by default
        display_results(all_videos, output_format="table")
        
        # Also save as JSON for programmatic access
        display_results(all_videos, output_format="json")
        
        # Offer CSV export
        if all_videos:
            console.print("\n[cyan]Data also saved in CSV format for analysis[/cyan]")
            display_results(all_videos, output_format="csv")
        
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
    except Exception as e:
        console.print(f"[red]Unexpected error: {e}[/red]")
        raise


if __name__ == "__main__":
    main()
