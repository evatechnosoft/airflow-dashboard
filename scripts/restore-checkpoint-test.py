#!/usr/bin/env python3
import zipfile
import json
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path

repo_root = Path(__file__).parent.parent
backup_root = repo_root / 'output' / 'shared' / 'checkpoints'

if not backup_root.exists():
    print(f'[restore-checkpoint-test] Backup folder not found: {backup_root}')
    sys.exit(1)

# Find latest checkpoint
checkpoints = sorted(backup_root.glob('checkpoint-*.zip'), key=lambda p: p.stat().st_mtime, reverse=True)
if not checkpoints:
    print(f'[restore-checkpoint-test] No checkpoint zip found')
    print(f'Folder contents: {list(backup_root.iterdir())}')
    sys.exit(1)

checkpoint_file = checkpoints[0]
print(f'[ops:restore-test] using {checkpoint_file}')

# Extract to temp dir
extract_dir = Path(os.environ['TMP']) / f'checkpoint-restore-test-{datetime.now().strftime("%Y%m%d-%H%M%S")}'
extract_dir.mkdir(parents=True, exist_ok=True)
print(f'[ops:restore-test] extracting to {extract_dir}')

try:
    with zipfile.ZipFile(checkpoint_file, 'r') as z:
        z.extractall(extract_dir)
except Exception as e:
    print(f'[restore-checkpoint-test] Extraction failed: {e}')
    sys.exit(1)

# Validate manifest
manifest_path = extract_dir / 'manifest.json'
if not manifest_path.exists():
    print(f'[restore-checkpoint-test] manifest.json not found in checkpoint')
    sys.exit(1)

try:
    manifest = json.load(open(manifest_path))
    entries = len(manifest.get('included', []))
    print(f'[ops:restore-test] manifest has {entries} entries')
except Exception as e:
    print(f'[restore-checkpoint-test] Failed to read manifest: {e}')
    sys.exit(1)

# Check optional files
optional_files = ['settings.json', 'targets.json', '.gitignore']
missing = [f for f in optional_files if not (extract_dir / f).exists()]
if missing:
    print(f'[ops:restore-test] optional files missing: {", ".join(missing)}')

print(f'[ops:restore-test] ✓ PASS')

# Cleanup
shutil.rmtree(extract_dir)
print(f'Temporary extraction cleaned up.')
