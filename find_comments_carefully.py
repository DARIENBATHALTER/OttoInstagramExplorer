#!/usr/bin/env python3
import json
import re

print("Searching for comment patterns in JSON files...")

# Search each JSON file for comment data
json_files = [
    'mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data.json',
    'mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data (1).json',
    'mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data (2).json',
    'mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data (3).json',
    'mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data (4).json'
]

for json_file in json_files:
    print(f"\nSearching in {json_file}...")
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            # Read file in chunks to avoid memory issues
            chunk_size = 100000  # 100KB chunks
            found_count = 0
            
            while found_count < 5:  # Find up to 5 examples per file
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                
                # Look for username followed by text pattern
                # This regex is more flexible to handle various spacing
                pattern = r'"username"\s*:\s*"([^"]+)"[^}]*?"text"\s*:\s*"([^"]+)"'
                matches = re.findall(pattern, chunk, re.DOTALL)
                
                if matches:
                    for username, text in matches[:5]:
                        found_count += 1
                        print(f"\nFound comment #{found_count}:")
                        print(f"  Username: {username}")
                        print(f"  Text: {text[:200]}..." if len(text) > 200 else f"  Text: {text}")
                        
                        # Try to find the surrounding context to understand structure
                        username_pos = chunk.find(f'"username":"{username}"')
                        if username_pos != -1:
                            start = max(0, username_pos - 200)
                            end = min(len(chunk), username_pos + 500)
                            print(f"  Context: {chunk[start:start+100]}...")
                            
                if found_count >= 5:
                    break
                    
    except Exception as e:
        print(f"  Error reading file: {e}")
        
print("\nSearch complete!")