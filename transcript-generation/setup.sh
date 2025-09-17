#!/bin/bash

# House Committee YouTube Video Poller - Setup Script

echo "================================"
echo "House Committee Video Poller Setup"
echo "================================"
echo ""

# Check if Python 3.11+ is installed
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo "✓ Python $python_version found"
else
    echo "❌ Python 3.11+ is required but not found"
    echo "Please install Python from https://www.python.org/"
    exit 1
fi

# Check if uv is installed, otherwise use pip
if command -v uv &> /dev/null; then
    echo "✓ Using uv package manager"
    echo "Installing dependencies..."
    uv sync
else
    echo "⚠ uv not found, using pip instead"
    echo "Installing dependencies..."
    python3 -m pip install google-api-python-client python-dotenv pandas rich
fi

echo ""
echo "✓ Dependencies installed"
echo ""

# Check for .env file
if [ -f ".env" ]; then
    echo "✓ .env file found"
else
    echo "⚠ No .env file found"
    echo ""
    echo "Please create a .env file with your YouTube API key:"
    echo "  1. Get an API key from https://console.cloud.google.com/"
    echo "  2. Create .env file: echo 'YOUTUBE_API_KEY=your_key_here' > .env"
    echo ""
    read -p "Do you have a YouTube API key? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your YouTube API key: " api_key
        echo "YOUTUBE_API_KEY=$api_key" > .env
        echo "✓ .env file created"
    else
        echo "Please get an API key and add it to .env file before running"
    fi
fi

echo ""
echo "================================"
echo "Setup complete!"
echo ""
echo "To run the video poller:"
echo "  python3 main.py"
echo "================================"
