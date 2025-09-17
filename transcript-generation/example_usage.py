"""
Example usage of the Congress scraper module.

This script demonstrates how to use the congress_scraper module to extract
witness information from Congress.gov hearing pages.
"""

import asyncio
from congress_scraper import fetch_congress_witnesses, format_witnesses_output, save_witnesses_to_jsonl


async def example_usage():
    """Example of how to use the Congress scraper."""
    
    # Example Congress.gov hearing page URL
    url = "https://www.congress.gov/event/119th-congress/house-event/118601"
    
    print(f"Fetching witness information from: {url}")
    print("=" * 60)
    
    try:
        # Fetch witnesses from the page
        witnesses = await fetch_congress_witnesses(url)
        
        # Display the results
        print(format_witnesses_output(witnesses))
        
        # Save witnesses to JSONL file
        jsonl_file = save_witnesses_to_jsonl(witnesses, url, "example_witnesses.jsonl")
        print(f"Data saved to: {jsonl_file}")
        
        # You can also access individual witness data
        print("\nIndividual witness data:")
        for witness in witnesses:
            print(f"- {witness.name}")
            print(f"  Position: {witness.position}")
            if witness.organization:
                print(f"  Organization: {witness.organization}")
            print()
            
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(example_usage())
