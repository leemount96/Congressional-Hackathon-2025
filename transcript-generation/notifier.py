"""
Notification system for new YouTube videos from House Committees

Supports multiple notification methods:
- Webhook (Discord, Slack, etc.)
- Email
- Local desktop notifications
- Custom webhooks
"""

import json
import os
from typing import Dict, List, Optional
from datetime import datetime
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class VideoNotifier:
    """Handles notifications for new videos."""
    
    def __init__(self):
        """Initialize notifier with configuration from environment."""
        self.webhook_url = os.getenv('WEBHOOK_URL')
        self.slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        self.discord_webhook = os.getenv('DISCORD_WEBHOOK_URL')
        self.notification_email = os.getenv('NOTIFICATION_EMAIL')
        self.smtp_server = os.getenv('SMTP_SERVER')
        self.smtp_port = os.getenv('SMTP_PORT', 587)
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
    
    def send_webhook(self, url: str, payload: Dict) -> bool:
        """Send a webhook notification."""
        try:
            response = requests.post(url, json=payload, timeout=10)
            return response.status_code in [200, 201, 204]
        except Exception as e:
            print(f"Webhook failed: {e}")
            return False
    
    def notify_discord(self, new_videos: Dict[str, List[Dict]]):
        """Send notification to Discord."""
        if not self.discord_webhook:
            return
        
        total_videos = sum(len(videos) for videos in new_videos.values())
        
        # Create Discord embed
        embeds = []
        for committee, videos in list(new_videos.items())[:5]:  # Limit to 5 committees
            fields = []
            for video in videos[:3]:  # Limit to 3 videos per committee
                fields.append({
                    "name": video['title'][:100],
                    "value": f"[Watch Video]({video['url']})\n{video['view_count']} views",
                    "inline": False
                })
            
            embeds.append({
                "title": f"📺 New Videos: {committee}",
                "color": 0x0099ff,
                "fields": fields,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        payload = {
            "content": f"🎥 **{total_videos} New House Committee Videos Found!**",
            "embeds": embeds[:10]  # Discord limit
        }
        
        if self.send_webhook(self.discord_webhook, payload):
            print("✓ Discord notification sent")
        else:
            print("✗ Discord notification failed")
    
    def notify_slack(self, new_videos: Dict[str, List[Dict]]):
        """Send notification to Slack."""
        if not self.slack_webhook:
            return
        
        total_videos = sum(len(videos) for videos in new_videos.values())
        
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🎥 {total_videos} New House Committee Videos"
                }
            }
        ]
        
        for committee, videos in list(new_videos.items())[:5]:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{committee}* - {len(videos)} new videos"
                }
            })
            
            for video in videos[:2]:
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"• <{video['url']}|{video['title'][:100]}>\n  _{video['view_count']} views_"
                    }
                })
        
        payload = {"blocks": blocks}
        
        if self.send_webhook(self.slack_webhook, payload):
            print("✓ Slack notification sent")
        else:
            print("✗ Slack notification failed")
    
    def notify_custom_webhook(self, new_videos: Dict[str, List[Dict]]):
        """Send to a custom webhook endpoint."""
        if not self.webhook_url:
            return
        
        # Prepare simplified payload
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_new_videos": sum(len(videos) for videos in new_videos.values()),
            "committees": {}
        }
        
        for committee, videos in new_videos.items():
            payload["committees"][committee] = [
                {
                    "video_id": v['video_id'],
                    "title": v['title'],
                    "url": v['url'],
                    "published_at": v['published_at'],
                    "view_count": v['view_count']
                }
                for v in videos
            ]
        
        if self.send_webhook(self.webhook_url, payload):
            print("✓ Custom webhook notification sent")
        else:
            print("✗ Custom webhook notification failed")
    
    def notify_email(self, new_videos: Dict[str, List[Dict]]):
        """Send email notification (requires SMTP configuration)."""
        if not all([self.notification_email, self.smtp_server, self.smtp_username, self.smtp_password]):
            return
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            total_videos = sum(len(videos) for videos in new_videos.values())
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🎥 {total_videos} New House Committee Videos"
            msg['From'] = self.smtp_username
            msg['To'] = self.notification_email
            
            # Create HTML email body
            html_content = f"""
            <html>
            <head></head>
            <body>
                <h2>New House Committee Videos</h2>
                <p>{total_videos} new videos have been posted!</p>
            """
            
            for committee, videos in new_videos.items():
                html_content += f"<h3>{committee}</h3><ul>"
                for video in videos:
                    html_content += f"""
                    <li>
                        <a href="{video['url']}">{video['title']}</a><br>
                        Published: {video['published_at']}<br>
                        Views: {video['view_count']}
                    </li>
                    """
                html_content += "</ul>"
            
            html_content += """
            </body>
            </html>
            """
            
            part = MIMEText(html_content, 'html')
            msg.attach(part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            print("✓ Email notification sent")
            
        except Exception as e:
            print(f"✗ Email notification failed: {e}")
    
    def send_all_notifications(self, new_videos: Dict[str, List[Dict]]):
        """Send notifications through all configured channels."""
        if not new_videos:
            return
        
        print("\nSending notifications...")
        
        # Send to all configured channels
        self.notify_discord(new_videos)
        self.notify_slack(new_videos)
        self.notify_custom_webhook(new_videos)
        self.notify_email(new_videos)


def load_new_videos_from_log() -> Dict[str, List[Dict]]:
    """Load recently found new videos from the log."""
    log_file = "new_videos_log.json"
    
    if not Path(log_file).exists():
        return {}
    
    try:
        with open(log_file, 'r') as f:
            log_data = json.load(f)
        
        # Group by committee
        videos_by_committee = {}
        for entry in log_data:
            committee = entry.get('committee')
            if committee not in videos_by_committee:
                videos_by_committee[committee] = []
            videos_by_committee[committee].append(entry)
        
        return videos_by_committee
    except:
        return {}


def main():
    """Main function to test notifications."""
    print("Testing Video Notification System")
    print("=" * 50)
    
    # Load recent new videos
    new_videos = load_new_videos_from_log()
    
    if not new_videos:
        print("No new videos found in log to test with")
        return
    
    # Initialize and send notifications
    notifier = VideoNotifier()
    notifier.send_all_notifications(new_videos)
    
    print("\nNotification test complete!")


if __name__ == "__main__":
    main()
