"""
Congress.gov scraper module for extracting witness information from hearing pages.

This module uses Playwright to fetch HTML content from Congress.gov pages and
extract witness names and positions from the event-witness list.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Browser, Page
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Witness:
    """Data class representing a witness from a congressional hearing."""
    name: str
    position: str
    organization: Optional[str] = None


class CongressScraper:
    """Scraper for Congress.gov hearing pages to extract witness information."""
    
    def __init__(self, headless: bool = True, timeout: int = 30000):
        """
        Initialize the Congress scraper.
        
        Args:
            headless: Whether to run browser in headless mode
            timeout: Timeout in milliseconds for page operations
        """
        self.headless = headless
        self.timeout = timeout
        self.browser: Optional[Browser] = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.browser:
            await self.browser.close()
        await self.playwright.stop()
    
    async def fetch_page_content(self, url: str) -> str:
        """
        Fetch the HTML content of a Congress.gov page.
        
        Args:
            url: The URL of the Congress.gov page
            
        Returns:
            The HTML content of the page
            
        Raises:
            Exception: If page cannot be loaded or times out
        """
        if not self.browser:
            raise RuntimeError("Browser not initialized. Use async context manager.")
            
        page = await self.browser.new_page()
        
        try:
            logger.info(f"Fetching page: {url}")
            
            # Set a reasonable user agent to avoid being blocked
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            
            await page.goto(url, timeout=self.timeout, wait_until='domcontentloaded')
            
            # Try multiple wait strategies
            try:
                # First try waiting for the witness list specifically
                await page.wait_for_selector('ul.event-witness', timeout=10000)
                logger.info("Witness list found")
            except:
                # If that fails, wait for network idle
                try:
                    await page.wait_for_load_state('networkidle', timeout=20000)
                    logger.info("Page loaded (networkidle)")
                except:
                    # As a last resort, just wait a bit for dynamic content
                    await page.wait_for_timeout(5000)
                    logger.info("Using timeout fallback")
            
            content = await page.content()
            logger.info("Successfully fetched page content")
            return content
            
        except Exception as e:
            logger.error(f"Error fetching page {url}: {str(e)}")
            raise
        finally:
            await page.close()
    
    def parse_witnesses(self, html_content: str) -> List[Witness]:
        """
        Parse witness information from HTML content.
        
        Args:
            html_content: The HTML content of the Congress.gov page
            
        Returns:
            List of Witness objects containing name and position information
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        witnesses = []
        
        # Find the witness list
        witness_list = soup.find('ul', class_='plain event-witness')
        
        if not witness_list:
            logger.warning("No witness list found on the page")
            return witnesses
        
        # Parse each witness
        witness_items = witness_list.find_all('li')
        logger.info(f"Found {len(witness_items)} witness entries")
        
        for item in witness_items:
            try:
                witness = self._parse_witness_item(item)
                if witness:
                    witnesses.append(witness)
                    logger.info(f"Parsed witness: {witness.name} - {witness.position}")
            except Exception as e:
                logger.error(f"Error parsing witness item: {str(e)}")
                continue
        
        return witnesses
    
    def _parse_witness_item(self, item) -> Optional[Witness]:
        """
        Parse a single witness list item.
        
        Args:
            item: BeautifulSoup element representing a witness list item
            
        Returns:
            Witness object or None if parsing fails
        """
        # Get all text content and split by lines
        all_text = item.get_text().strip()
        lines = [line.strip() for line in all_text.split('\n') if line.strip()]
        
        if not lines:
            return None
        
        # First non-empty line is the name
        name_text = lines[0]
        
        # Clean up common prefixes but keep them for display
        original_name = name_text
        prefixes = ['Mr. ', 'Mrs. ', 'Ms. ', 'Dr. ', 'Prof. ', 'The Honorable ']
        for prefix in prefixes:
            if name_text.startswith(prefix):
                # Keep the original name with prefix for display
                break
        
        if not name_text:
            return None
        
        # Find position and organization in span elements
        spans = item.find_all('span')
        position = ""
        organization = ""
        
        for span in spans:
            span_text = span.get_text().strip()
            # Skip spans that contain links (these are document links)
            if span.find('a'):
                continue
            
            # The first span without links typically contains position info
            if span_text and not position:
                # Handle multi-line position/organization text
                position_lines = [line.strip() for line in span_text.split('\n') if line.strip()]
                if position_lines:
                    if len(position_lines) == 1:
                        # Single line: might be "Position, Organization"
                        parts = position_lines[0].split(',', 1)
                        position = parts[0].strip().rstrip(',')
                        if len(parts) > 1:
                            organization = parts[1].strip()
                    else:
                        # Multiple lines: first is position, second is organization
                        position = position_lines[0].rstrip(',')
                        if len(position_lines) > 1:
                            organization = position_lines[1]
                break
        
        return Witness(
            name=original_name,
            position=position,
            organization=organization if organization else None
        )
    
    async def get_witnesses(self, url: str) -> List[Witness]:
        """
        Get witness information from a Congress.gov hearing page.
        
        Args:
            url: The URL of the Congress.gov hearing page
            
        Returns:
            List of Witness objects
        """
        html_content = await self.fetch_page_content(url)
        witnesses = self.parse_witnesses(html_content)
        
        logger.info(f"Successfully extracted {len(witnesses)} witnesses from {url}")
        return witnesses


async def fetch_congress_witnesses(url: str, headless: bool = True, timeout: int = 60000) -> List[Witness]:
    """
    Convenience function to fetch witnesses from a Congress.gov hearing page.
    
    Args:
        url: The URL of the Congress.gov hearing page
        headless: Whether to run browser in headless mode
        timeout: Timeout in milliseconds for page operations
        
    Returns:
        List of Witness objects
    """
    async with CongressScraper(headless=headless, timeout=timeout) as scraper:
        return await scraper.get_witnesses(url)


def format_witnesses_output(witnesses: List[Witness]) -> str:
    """
    Format witness information for display.
    
    Args:
        witnesses: List of Witness objects
        
    Returns:
        Formatted string representation of witnesses
    """
    if not witnesses:
        return "No witnesses found."
    
    output = f"Found {len(witnesses)} witnesses:\n\n"
    
    for i, witness in enumerate(witnesses, 1):
        output += f"{i}. {witness.name}\n"
        if witness.position:
            output += f"   Position: {witness.position}\n"
        if witness.organization:
            output += f"   Organization: {witness.organization}\n"
        output += "\n"
    
    return output


def save_witnesses_to_jsonl(witnesses: List[Witness], url: str, output_file: str = None) -> str:
    """
    Save witness information to a JSONL (JSON Lines) file.
    
    Args:
        witnesses: List of Witness objects
        url: The source URL where witnesses were extracted from
        output_file: Optional output filename. If not provided, generates one based on timestamp
        
    Returns:
        The path to the saved JSONL file
    """
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"witnesses_{timestamp}.jsonl"
    
    # Save to JSONL file
    output_path = Path(output_file)
    with open(output_path, 'w', encoding='utf-8') as f:
        # First line: metadata
        metadata = {
            "type": "metadata",
            "source_url": url,
            "extraction_timestamp": datetime.now().isoformat(),
            "total_witnesses": len(witnesses)
        }
        f.write(json.dumps(metadata, ensure_ascii=False) + '\n')
        
        # Following lines: one witness per line
        for witness in witnesses:
            witness_data = {
                "type": "witness",
                **asdict(witness)
            }
            f.write(json.dumps(witness_data, ensure_ascii=False) + '\n')
    
    logger.info(f"Saved {len(witnesses)} witnesses to {output_path}")
    return str(output_path)


# Example usage and testing
async def main():
    """Example usage of the Congress scraper."""
    test_url = "https://www.congress.gov/event/119th-congress/house-event/118601"
    
    try:
        # Use longer timeout and headless mode
        witnesses = await fetch_congress_witnesses(test_url, headless=True, timeout=90000)
        
        # Display the results
        print(format_witnesses_output(witnesses))
        
        # Save to JSONL file
        jsonl_file = save_witnesses_to_jsonl(witnesses, test_url, "congress_witnesses.jsonl")
        print(f"Witnesses saved to: {jsonl_file}")
        
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())
