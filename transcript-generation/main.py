"""
Poll the five most recent videos from U.S. House Committee YouTube channels.

This script reads committee YouTube channel data from committee_transcripts.json
and fetches the 5 most recent videos from each channel using the YouTube Data API.
"""

import json
import os
from datetime import datetime
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


def fetch_recent_videos(youtube, channel_id: str, max_results: int = 5) -> List[Dict]:
    """
    Fetch recent videos from a YouTube channel.
    
    Args:
        youtube: YouTube API service object
        channel_id: YouTube channel ID
        max_results: Maximum number of videos to fetch (default: 5)
        
    Returns:
        List of video dictionaries with details
    """
    videos = []
    
    try:
        # Get the uploads playlist ID
        channels_response = youtube.channels().list(
            part='contentDetails',
            id=channel_id
        ).execute()
        
        if not channels_response.get('items'):
            return videos
        
        uploads_playlist_id = channels_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # Get recent videos from uploads playlist
        playlist_response = youtube.playlistItems().list(
            part='snippet,contentDetails',
            playlistId=uploads_playlist_id,
            maxResults=max_results
        ).execute()
        
        for item in playlist_response.get('items', []):
            video_id = item['contentDetails']['videoId']
            snippet = item['snippet']
            
            # Get additional video statistics
            video_response = youtube.videos().list(
                part='statistics,contentDetails',
                id=video_id
            ).execute()
            
            video_stats = video_response['items'][0] if video_response.get('items') else {}
            
            videos.append({
                'video_id': video_id,
                'title': snippet['title'],
                'description': snippet.get('description', '')[:200] + '...' if len(snippet.get('description', '')) > 200 else snippet.get('description', ''),
                'published_at': snippet['publishedAt'],
                'url': f"https://www.youtube.com/watch?v={video_id}",
                'thumbnail': snippet['thumbnails']['default']['url'] if 'thumbnails' in snippet else '',
                'view_count': video_stats.get('statistics', {}).get('viewCount', 'N/A'),
                'like_count': video_stats.get('statistics', {}).get('likeCount', 'N/A'),
                'duration': video_stats.get('contentDetails', {}).get('duration', 'N/A')
            })
            
    except HttpError as e:
        console.print(f"[yellow]Warning: Could not fetch videos for channel {channel_id}: {e}[/yellow]")
    
    return videos


def poll_all_committees(committees: List[Dict], api_key: Optional[str] = None) -> Dict[str, List[Dict]]:
    """
    Poll recent videos from all committee channels.
    
    Args:
        committees: List of committee channel dictionaries
        api_key: YouTube Data API key
        
    Returns:
        Dictionary mapping committee names to their recent videos
    """
    youtube = initialize_youtube_api(api_key)
    all_videos = {}
    
    console.print("\n[bold green]Polling YouTube channels for recent videos...[/bold green]\n")
    
    for committee in track(committees, description="Fetching videos..."):
        channel_id = committee.get('channelId')
        channel_name = committee.get('channelName')
        short_name = committee.get('shortName')
        
        # Try using channel ID first
        if channel_id and channel_id.startswith('UC'):
            videos = fetch_recent_videos(youtube, channel_id)
        elif channel_name:
            # Try to get channel ID from username
            resolved_id = get_channel_id_from_username(youtube, channel_name)
            if resolved_id:
                videos = fetch_recent_videos(youtube, resolved_id)
            else:
                videos = []
        else:
            videos = []
        
        if videos:
            all_videos[short_name] = videos
            console.print(f"✓ {short_name}: Found {len(videos)} recent videos")
        else:
            console.print(f"[yellow]⚠ {short_name}: No videos found or channel not accessible[/yellow]")
    
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
            table.add_column("Title", style="white", width=50)
            table.add_column("Views", justify="right", style="green")
            table.add_column("URL", style="blue", width=30)
            
            for video in videos:
                published = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                published_str = published.strftime('%Y-%m-%d')
                
                table.add_row(
                    published_str,
                    video['title'][:50] + ('...' if len(video['title']) > 50 else ''),
                    video['view_count'],
                    f"youtube.com/watch?v={video['video_id']}"
                )
            
            console.print(table)
    
    elif output_format == "json":
        output_file = "recent_videos.json"
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
                    'view_count': video['view_count'],
                    'like_count': video['like_count'],
                    'url': video['url']
                }
                rows.append(row)
        
        if rows:
            df = pd.DataFrame(rows)
            output_file = "recent_videos.csv"
            df.to_csv(output_file, index=False)
            console.print(f"\n[green]Results saved to {output_file}[/green]")


def main():
    """Main function to orchestrate the video polling process."""
    console.print("[bold blue]U.S. House Committee YouTube Video Poller[/bold blue]")
    console.print("=" * 50)
    
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
    
    # Poll videos from all committees
    try:
        all_videos = poll_all_committees(committees, api_key)
        
        # Display results
        console.print(f"\n[bold green]Successfully polled {len(all_videos)} committees[/bold green]")
        
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