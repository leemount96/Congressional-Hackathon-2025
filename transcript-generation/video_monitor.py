"""
Continuous YouTube Video Monitor for House Committee Channels

This script monitors YouTube channels and appends only NEW videos to the existing database.
It maintains a history of all videos seen and only adds new ones on each run.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
import time

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import track
import pandas as pd

# Load environment variables
load_dotenv()

# Initialize Rich console
console = Console()

# Database file paths
VIDEO_DATABASE_FILE = "video_database.json"
RECENT_VIDEOS_FILE = "recent_videos.json"
NEW_VIDEOS_LOG = "new_videos_log.json"


class VideoMonitor:
    """Monitors YouTube channels for new videos and maintains a database."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the video monitor with YouTube API."""
        self.api_key = api_key or os.getenv('YOUTUBE_API_KEY')
        if not self.api_key:
            raise ValueError("YouTube API key not found. Please set YOUTUBE_API_KEY in .env file.")
        
        self.youtube = build('youtube', 'v3', developerKey=self.api_key)
        self.video_database = self.load_database()
        self.new_videos_found = []
    
    def load_database(self) -> Dict:
        """Load the existing video database or create a new one."""
        if Path(VIDEO_DATABASE_FILE).exists():
            try:
                with open(VIDEO_DATABASE_FILE, 'r') as f:
                    database = json.load(f)
                    console.print(f"[green]Loaded existing database with {len(database.get('videos', {}))} total videos[/green]")
                    return database
            except json.JSONDecodeError:
                console.print("[yellow]Warning: Could not read database file, creating new one[/yellow]")
        
        # Create new database structure
        return {
            "last_updated": None,
            "total_videos": 0,
            "committees": {},
            "videos": {},  # video_id -> video_data mapping
            "new_videos_history": []  # Track when new videos were found
        }
    
    def save_database(self):
        """Save the video database to file."""
        self.video_database["last_updated"] = datetime.now(timezone.utc).isoformat()
        self.video_database["total_videos"] = len(self.video_database["videos"])
        
        with open(VIDEO_DATABASE_FILE, 'w') as f:
            json.dump(self.video_database, f, indent=2, default=str)
        
        console.print(f"[green]Database saved with {self.video_database['total_videos']} total videos[/green]")
    
    def get_existing_video_ids(self, committee_name: Optional[str] = None) -> Set[str]:
        """Get set of existing video IDs, optionally filtered by committee."""
        if committee_name:
            committee_videos = self.video_database.get("committees", {}).get(committee_name, {})
            return set(committee_videos.get("video_ids", []))
        return set(self.video_database.get("videos", {}).keys())
    
    def fetch_channel_videos(self, channel_id: str, max_results: int = 50) -> List[Dict]:
        """
        Fetch videos from a YouTube channel.
        
        Args:
            channel_id: YouTube channel ID
            max_results: Maximum number of videos to fetch (up to 50)
        
        Returns:
            List of video dictionaries
        """
        videos = []
        
        try:
            # Get the uploads playlist ID
            channels_response = self.youtube.channels().list(
                part='contentDetails,snippet',
                id=channel_id
            ).execute()
            
            if not channels_response.get('items'):
                return videos
            
            channel_info = channels_response['items'][0]
            uploads_playlist_id = channel_info['contentDetails']['relatedPlaylists']['uploads']
            
            # Fetch videos from uploads playlist
            playlist_response = self.youtube.playlistItems().list(
                part='snippet,contentDetails',
                playlistId=uploads_playlist_id,
                maxResults=max_results
            ).execute()
            
            video_ids = []
            for item in playlist_response.get('items', []):
                video_ids.append(item['contentDetails']['videoId'])
            
            if video_ids:
                # Get detailed video information in batch
                videos_response = self.youtube.videos().list(
                    part='snippet,statistics,contentDetails',
                    id=','.join(video_ids)
                ).execute()
                
                for video in videos_response.get('items', []):
                    video_data = {
                        'video_id': video['id'],
                        'title': video['snippet']['title'],
                        'description': video['snippet'].get('description', '')[:500],
                        'published_at': video['snippet']['publishedAt'],
                        'channel_id': video['snippet']['channelId'],
                        'channel_title': video['snippet']['channelTitle'],
                        'url': f"https://www.youtube.com/watch?v={video['id']}",
                        'thumbnail': video['snippet']['thumbnails']['high']['url'] if 'thumbnails' in video['snippet'] else '',
                        'view_count': int(video['statistics'].get('viewCount', 0)),
                        'like_count': int(video['statistics'].get('likeCount', 0)),
                        'comment_count': int(video['statistics'].get('commentCount', 0)),
                        'duration': video['contentDetails'].get('duration', ''),
                        'tags': video['snippet'].get('tags', [])[:10],  # Limit tags
                        'fetched_at': datetime.now(timezone.utc).isoformat()
                    }
                    videos.append(video_data)
                    
        except HttpError as e:
            console.print(f"[yellow]Warning: Could not fetch videos for channel {channel_id}: {e}[/yellow]")
        
        return videos
    
    def check_for_new_videos(self, committee: Dict) -> Tuple[List[Dict], List[Dict]]:
        """
        Check a committee channel for new videos.
        
        Args:
            committee: Committee dictionary with channel information
        
        Returns:
            Tuple of (new_videos, all_recent_videos)
        """
        committee_name = committee.get('shortName')
        channel_id = committee.get('channelId')
        
        # Get existing video IDs for this committee
        existing_ids = self.get_existing_video_ids(committee_name)
        
        # Fetch recent videos from the channel
        recent_videos = self.fetch_channel_videos(channel_id, max_results=20)
        
        # Identify new videos
        new_videos = []
        for video in recent_videos:
            if video['video_id'] not in existing_ids:
                video['committee'] = committee_name
                video['committee_full_name'] = committee.get('fullName')
                video['is_new'] = True
                new_videos.append(video)
        
        return new_videos, recent_videos
    
    def update_database_with_new_videos(self, committee_name: str, new_videos: List[Dict]):
        """Update the database with new videos."""
        if committee_name not in self.video_database["committees"]:
            self.video_database["committees"][committee_name] = {
                "video_ids": [],
                "last_checked": None,
                "total_videos": 0
            }
        
        committee_data = self.video_database["committees"][committee_name]
        
        for video in new_videos:
            video_id = video['video_id']
            
            # Add to main video database
            self.video_database["videos"][video_id] = video
            
            # Add to committee's video list
            if video_id not in committee_data["video_ids"]:
                committee_data["video_ids"].append(video_id)
            
            # Track this as a new video found
            self.new_videos_found.append({
                "video_id": video_id,
                "title": video['title'],
                "committee": committee_name,
                "published_at": video['published_at'],
                "found_at": datetime.now(timezone.utc).isoformat()
            })
        
        committee_data["last_checked"] = datetime.now(timezone.utc).isoformat()
        committee_data["total_videos"] = len(committee_data["video_ids"])
    
    def monitor_all_committees(self, committees: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Monitor all committee channels for new videos.
        
        Args:
            committees: List of committee dictionaries
        
        Returns:
            Dictionary of committee names to their new videos
        """
        all_new_videos = {}
        total_new = 0
        
        console.print("\n[bold cyan]Checking for new videos...[/bold cyan]\n")
        
        for committee in track(committees, description="Monitoring channels..."):
            committee_name = committee.get('shortName')
            
            new_videos, _ = self.check_for_new_videos(committee)
            
            if new_videos:
                all_new_videos[committee_name] = new_videos
                self.update_database_with_new_videos(committee_name, new_videos)
                total_new += len(new_videos)
                console.print(f"[green]✓ {committee_name}: {len(new_videos)} NEW videos found![/green]")
            else:
                # Update last checked time even if no new videos
                if committee_name in self.video_database["committees"]:
                    self.video_database["committees"][committee_name]["last_checked"] = datetime.now(timezone.utc).isoformat()
                console.print(f"[dim]  {committee_name}: No new videos[/dim]")
        
        console.print(f"\n[bold green]Total new videos found: {total_new}[/bold green]")
        
        return all_new_videos
    
    def save_new_videos_log(self):
        """Save a log of newly found videos."""
        if not self.new_videos_found:
            return
        
        # Load existing log
        log_data = []
        if Path(NEW_VIDEOS_LOG).exists():
            try:
                with open(NEW_VIDEOS_LOG, 'r') as f:
                    log_data = json.load(f)
            except:
                pass
        
        # Append new entries
        log_data.extend(self.new_videos_found)
        
        # Save updated log
        with open(NEW_VIDEOS_LOG, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        console.print(f"[green]New videos log updated with {len(self.new_videos_found)} entries[/green]")
    
    def display_new_videos(self, new_videos: Dict[str, List[Dict]]):
        """Display newly found videos in a formatted table."""
        if not new_videos:
            console.print("[yellow]No new videos to display[/yellow]")
            return
        
        for committee_name, videos in new_videos.items():
            console.print(f"\n[bold cyan]── New Videos: {committee_name} ──[/bold cyan]")
            
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
                    str(video['view_count']),
                    f"youtube.com/watch?v={video['video_id']}"
                )
            
            console.print(table)
    
    def generate_statistics(self):
        """Generate and display statistics about the video database."""
        stats = {
            "total_videos": len(self.video_database["videos"]),
            "total_committees": len(self.video_database["committees"]),
            "videos_by_committee": {}
        }
        
        for committee_name, committee_data in self.video_database["committees"].items():
            stats["videos_by_committee"][committee_name] = committee_data["total_videos"]
        
        console.print("\n[bold cyan]Database Statistics:[/bold cyan]")
        console.print(f"Total Videos Tracked: {stats['total_videos']}")
        console.print(f"Committees Monitored: {stats['total_committees']}")
        
        if stats["videos_by_committee"]:
            console.print("\n[bold]Videos per Committee:[/bold]")
            for committee, count in sorted(stats["videos_by_committee"].items(), key=lambda x: x[1], reverse=True):
                console.print(f"  {committee}: {count} videos")
        
        return stats


def load_committee_channels(file_path: str = "committee_transcripts.json") -> List[Dict]:
    """Load committee channel data from JSON file."""
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


def export_new_videos_to_csv(new_videos: Dict[str, List[Dict]]):
    """Export new videos to a CSV file with timestamp."""
    if not new_videos:
        return
    
    rows = []
    for committee_name, videos in new_videos.items():
        for video in videos:
            row = {
                'committee': committee_name,
                'video_id': video['video_id'],
                'title': video['title'],
                'published_at': video['published_at'],
                'found_at': video.get('fetched_at', ''),
                'view_count': video['view_count'],
                'like_count': video['like_count'],
                'url': video['url']
            }
            rows.append(row)
    
    if rows:
        df = pd.DataFrame(rows)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"new_videos_{timestamp}.csv"
        df.to_csv(filename, index=False)
        console.print(f"[green]New videos exported to {filename}[/green]")


def main():
    """Main function to monitor YouTube channels for new videos."""
    console.print("[bold blue]House Committee YouTube Video Monitor[/bold blue]")
    console.print("=" * 50)
    
    # Check for first run
    is_first_run = not Path(VIDEO_DATABASE_FILE).exists()
    
    if is_first_run:
        console.print("\n[yellow]First run detected - building initial video database...[/yellow]")
        console.print("[dim]This may take a few moments to fetch existing videos.[/dim]\n")
    
    # Load committee channels
    committees = load_committee_channels()
    if not committees:
        console.print("[red]No committee data found. Exiting.[/red]")
        return
    
    console.print(f"[green]Monitoring {len(committees)} committee channels[/green]")
    
    try:
        # Initialize the monitor
        monitor = VideoMonitor()
        
        # Check for new videos
        new_videos = monitor.monitor_all_committees(committees)
        
        # Save the updated database
        monitor.save_database()
        
        # Save new videos log
        monitor.save_new_videos_log()
        
        # Display new videos
        if new_videos:
            monitor.display_new_videos(new_videos)
            
            # Export new videos to CSV
            export_new_videos_to_csv(new_videos)
            
            # Send notifications (you can implement email, Slack, etc.)
            console.print("\n[cyan]💡 Tip: You can set up notifications for new videos![/cyan]")
        else:
            console.print("\n[yellow]No new videos found since last check.[/yellow]")
        
        # Display statistics
        monitor.generate_statistics()
        
        # Show last check time
        if monitor.video_database.get("last_updated"):
            console.print(f"\n[dim]Last checked: {monitor.video_database['last_updated']}[/dim]")
        
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
    except Exception as e:
        console.print(f"[red]Unexpected error: {e}[/red]")
        raise


if __name__ == "__main__":
    main()
