#!/usr/bin/env python3
import json
import sys

# Read first 10000 characters to understand structure
with open('mm_instagram_archive/mm_ig_comments_JSON_files/JSON files/InsC-6.1.4-all-data.json', 'r') as f:
    sample = f.read(10000)
    
# Find where actual comment data starts
username_pos = sample.find('"username"')
if username_pos != -1:
    # Extract surrounding context
    start = max(0, username_pos - 300)
    end = min(len(sample), username_pos + 700)
    print('Context around username field:')
    print(sample[start:end])
    print('\n' + '='*80 + '\n')

# Look for text field
text_pos = sample.find('"text"')
if text_pos != -1:
    start = max(0, text_pos - 300)
    end = min(len(sample), text_pos + 700)
    print('Context around text field:')
    print(sample[start:end])
    print('\n' + '='*80 + '\n')

# Try to parse a portion to understand structure
try:
    # Find a complete JSON object by looking for matching braces
    depth = 0
    in_string = False
    escape_next = False
    
    for i, char in enumerate(sample):
        if escape_next:
            escape_next = False
            continue
            
        if char == '\\':
            escape_next = True
            continue
            
        if char == '"' and not escape_next:
            in_string = not in_string
            continue
            
        if not in_string:
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 1 and i > 1000:  # Found a complete object at top level
                    # Extract the first complete top-level value
                    first_colon = sample.find(':')
                    if first_colon != -1:
                        obj_sample = sample[first_colon+1:i+1]
                        print("Sample of first major object:")
                        print(obj_sample[:2000])
                        break
except Exception as e:
    print(f"Error parsing: {e}")