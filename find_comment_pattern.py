#!/usr/bin/env python3
import json
import re

# Read the file in chunks to find actual comment data pattern
with open('mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data.json', 'r') as f:
    chunk_size = 50000  # Read 50KB at a time
    
    while True:
        chunk = f.read(chunk_size)
        if not chunk:
            break
            
        # Look for patterns that include username and text together
        # This regex looks for username followed by text within reasonable distance
        pattern = r'"username":"([^"]+)"[^}]*"text":"([^"]+)"'
        matches = re.findall(pattern, chunk, re.DOTALL)
        
        if matches:
            print("Found comment patterns!")
            for i, (username, text) in enumerate(matches[:5]):  # Show first 5
                print(f"\nComment {i+1}:")
                print(f"  Username: {username}")
                print(f"  Text: {text[:100]}...")  # First 100 chars
            
            # Also show the raw context for the first match
            first_match_pos = chunk.find(matches[0][0])
            if first_match_pos != -1:
                start = max(0, first_match_pos - 500)
                end = min(len(chunk), first_match_pos + 1000)
                print("\n\nRaw context around first match:")
                print(chunk[start:end])
            break