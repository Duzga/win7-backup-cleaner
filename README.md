# win7-backup-cleaner
Free disk space by removing old windows backup files.

Usage:

cscript.exe win7-backup-cleaner.js
- show options.

cscript.exe win7-backup-cleaner.js d:/backup
- search and show folders with name "Backup Set ????-??-?? ??????".

cscript.exe win7-backup-cleaner.js d:/backup /d 10
- search with depth 10. Default depth 4.

cscript.exe win7-backup-cleaner.js d:/backup /f 100GB
- show folders will be deleted for free drive space to 100GB.

cscript.exe win7-backup-cleaner.js d:/backup /f 100GB /r
- actually delete files.

