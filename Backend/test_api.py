#!/usr/bin/env python3
"""
Test script for the Text2Graph API
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_api():
    print("Testing Text2Graph API...")
    
    # Test 1: Basic health check
    try:
        response = requests.get(f"{API_BASE_URL}/")
        print(f"✅ Basic health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Basic health check failed: {e}")
        return
    
    # Test 2: Database health check
    try:
        response = requests.get(f"{API_BASE_URL}/api/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Database health check: {health_data}")
        else:
            print(f"❌ Database health check failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Database health check error: {e}")
    
    # Test 3: Process text with enhancement
    test_data = {
        "text": "I am David, I live in NYC. I work at Google as a software engineer.",
        "enhance": True
    }
    
    try:
        print("\n🔄 Testing text processing with enhancement...")
        response = requests.post(
            f"{API_BASE_URL}/api/process-text",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Text processing successful!")
            print(f"   Graph ID: {result['metadata']['id']}")
            print(f"   Nodes: {result['metadata']['nodes']}")
            print(f"   Edges: {result['metadata']['edges']}")
            print(f"   Created: {result['metadata']['created_at']}")
        else:
            print(f"❌ Text processing failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Text processing error: {e}")
    
    # Test 4: Get graphs list
    try:
        print("\n🔄 Testing graphs list...")
        response = requests.get(f"{API_BASE_URL}/api/graphs")
        
        if response.status_code == 200:
            graphs = response.json()
            print(f"✅ Found {len(graphs)} graphs")
            for graph in graphs:
                print(f"   - {graph['name']} ({graph['nodes']} nodes, {graph['edges']} edges)")
        else:
            print(f"❌ Graphs list failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Graphs list error: {e}")

if __name__ == "__main__":
    test_api()
