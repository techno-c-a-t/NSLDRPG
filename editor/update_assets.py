import os
import json

ASSETS_DIR = 'assets'
OUTPUT_FILE = 'editor/assets.json'

def main():
    assets = []
    if os.path.exists(ASSETS_DIR):
        for root, dirs, files in os.walk(ASSETS_DIR):
            for f in files:
                if f.lower().endswith('.png'):
                    path ="../"
                    path = path + os.path.join(root, f)
                    # Convert to forward slashes
                    path = path.replace('\\', '/')
                    assets.append(path)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(assets, f, indent=4)
    print(f"Generated {OUTPUT_FILE} with {len(assets)} assets.")

if __name__ == '__main__':
    main()
