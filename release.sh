#!/bin/bash

# Pastikan script berhenti jika terjadi error
set -e

echo "=== Memulai Proses Git Commit & Push ==="

# 1. Melakukan staging seluruh perubahan
echo "Staging perubahan..."
git add .

# 2. Melakukan commit jika ada perubahan
if [ -n "$(git status --porcelain)" ]; then
    echo "Melakukan commit..."
    git commit -m "feat: add flutter app, kotlin widget, and release workflow"
else
    echo "Tidak ada perubahan baru untuk di-commit."
fi

# 3. Push ke branch main di origin
echo "Pushing ke origin main..."
git push origin main

echo "=== Selesai! Silakan cek tab Actions di repo GitHub Anda. ==="
