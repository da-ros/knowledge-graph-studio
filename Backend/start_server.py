#!/usr/bin/env python3
"""
Start script for the Text2Graph FastAPI server
"""
import uvicorn
import os
from dotenv import load_dotenv, find_dotenv

# Load environment variables
load_dotenv(find_dotenv())

if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    print(f"Starting Text2Graph API server on {host}:{port}")
    print("Make sure MongoDB is running and OPENAI_API_KEY is set")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
        timeout_keep_alive=300,  # 5 minutes keep-alive timeout
        timeout_graceful_shutdown=30  # 30 seconds graceful shutdown
    )
