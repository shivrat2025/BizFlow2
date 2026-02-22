#!/bin/bash
# Move to the project directory
cd "/Users/shivangkoshia/Downloads/bizflow"

# Run the backup node script
node scripts/backup.js >> backup/backup_log.txt 2>&1
