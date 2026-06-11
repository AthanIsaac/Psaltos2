#!/usr/bin/env python3
"""
Script to merge copticName data from old JSON format to new JSON format.

This script:
1. Reads an old JSON file with cantors containing files with copticName fields
2. Reads a new JSON file with scannedData containing folders and files
3. Finds matching files by path and merges copticName from old to new
4. Handles conflicts by logging when both have different copticName values
5. Saves the merged result to a new file
"""

import json
import sys
import os
from typing import Dict, List, Any, Optional


def load_json_file(file_path: str) -> Dict[str, Any]:
    """Load and parse a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{file_path}': {e}")
        sys.exit(1)


def save_json_file(data: Dict[str, Any], file_path: str) -> None:
    """Save data to a JSON file with proper formatting."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Merged data saved to '{file_path}'")
    except Exception as e:
        print(f"Error saving file '{file_path}': {e}")
        sys.exit(1)


def extract_old_files_with_coptic_names(old_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract files with copticName from old JSON format.
    Returns a dictionary mapping file paths to copticName values.
    """
    path_to_coptic_name = {}
    
    if 'cantors' not in old_data:
        print("Warning: No 'cantors' field found in old JSON")
        return path_to_coptic_name
    
    for cantor in old_data['cantors']:
        if 'files' not in cantor:
            continue
            
        for file_info in cantor['files']:
            if 'path' in file_info and 'copticName' in file_info:
                coptic_name = file_info['copticName'].strip()
                if coptic_name:  # Only include non-empty copticName values
                    path_to_coptic_name[file_info['path']] = coptic_name
    
    print(f"Found {len(path_to_coptic_name)} files with copticName in old JSON")
    return path_to_coptic_name


def merge_coptic_names_to_new_data(new_data: Dict[str, Any], path_to_coptic_name: Dict[str, str]) -> int:
    """
    Merge copticName data into new JSON format.
    Returns the number of files that were updated.
    """
    updated_count = 0
    conflicts = []
    
    if 'scannedData' not in new_data or 'folders' not in new_data['scannedData']:
        print("Warning: No 'scannedData.folders' field found in new JSON")
        return updated_count
    
    for folder in new_data['scannedData']['folders']:
        if 'files' not in folder:
            continue
            
        for file_info in folder['files']:
            if 'path' not in file_info:
                continue
                
            file_path = file_info['path']
            
            # Check if this file path exists in our old data
            if file_path in path_to_coptic_name:
                old_coptic_name = path_to_coptic_name[file_path]
                
                # Check if new file already has copticName
                if 'copticName' in file_info and file_info['copticName'].strip():
                    new_coptic_name = file_info['copticName'].strip()
                    if new_coptic_name != old_coptic_name:
                        # Conflict: both have different copticName values
                        conflicts.append({
                            'path': file_path,
                            'old_coptic_name': old_coptic_name,
                            'new_coptic_name': new_coptic_name
                        })
                        print(f"CONFLICT - File: {file_path}")
                        print(f"  Old copticName: '{old_coptic_name}'")
                        print(f"  New copticName: '{new_coptic_name}'")
                        print()
                else:
                    # New file doesn't have copticName, so we can merge
                    file_info['copticName'] = old_coptic_name
                    updated_count += 1
    
    print(f"Updated {updated_count} files with copticName from old JSON")
    if conflicts:
        print(f"Found {len(conflicts)} conflicts where both files had different copticName values")
    
    return updated_count


def main():
    """Main function to handle command line arguments and orchestrate the merge process."""
    if len(sys.argv) != 4:
        print("Usage: python merge_coptic_names.py <old_json_file> <new_json_file> <output_file>")
        print()
        print("Example:")
        print("  python merge_coptic_names.py old_data.json new_data.json merged_output.json")
        sys.exit(1)
    
    old_json_file = sys.argv[1]
    new_json_file = sys.argv[2]
    output_file = sys.argv[3]
    
    # Validate input files exist
    if not os.path.exists(old_json_file):
        print(f"Error: Old JSON file '{old_json_file}' does not exist.")
        sys.exit(1)
    
    if not os.path.exists(new_json_file):
        print(f"Error: New JSON file '{new_json_file}' does not exist.")
        sys.exit(1)
    
    print(f"Loading old JSON from: {old_json_file}")
    old_data = load_json_file(old_json_file)
    
    print(f"Loading new JSON from: {new_json_file}")
    new_data = load_json_file(new_json_file)
    
    print("Extracting copticName data from old JSON...")
    path_to_coptic_name = extract_old_files_with_coptic_names(old_data)
    
    if not path_to_coptic_name:
        print("No files with copticName found in old JSON. Nothing to merge.")
        sys.exit(0)
    
    print("Merging copticName data into new JSON...")
    updated_count = merge_coptic_names_to_new_data(new_data, path_to_coptic_name)
    
    if updated_count > 0:
        print(f"Saving merged data to: {output_file}")
        save_json_file(new_data, output_file)
    else:
        print("No files were updated. Output file not created.")


if __name__ == "__main__":
    main()