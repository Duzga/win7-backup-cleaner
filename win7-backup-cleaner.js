/* MIT License

Copyright (c) 2016 Duzga

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

See https://github.com/Duzga/win7-backup-cleaner/ for more info

*/

var myApp = (function() {

	// private
	
	var fso;
	var depth;
	var backupFolders;
	var driveFreeSpace;
	var argSearchPath;
	var argFreeSpace;
	var argActuallyDelete;
	var argDepth = 4;
	
	var saveBackupFolder = function (folderObj) {
		var elem;
		
		for (key in backupFolders) {
			if (backupFolders[key].name == folderObj.ParentFolder) {
				elem = backupFolders[key];
				break;
			}
		}
		if (elem == null) {
			backupFolders.push({name: "" + folderObj.ParentFolder, size: 0, subFolders: []});
			elem = backupFolders[backupFolders.length - 1];
		}
		elem.size += folderObj.size;
		elem.subFolders.push({name: "" + folderObj, size: folderObj.size});
	};
	
	var sortBySize = function () {
		backupFolders.sort(function (a, b) {
			return ((a.size > b.size) ? -1 : ((a.size < b.size) ? 1 : 0));
		});
	};
	
	var sortSubFoldersByName = function () {
		for (key in backupFolders) {
			backupFolders[key].subFolders.sort(function (a, b) {
				return ((a.name > b.name) ? -1 : ((a.name < b.name) ? 1 : 0));
			});
		}
	};
	
	var walkFolders = function (folder) {
		var f, fc, str;
		
		f = fso.GetFolder(folder);
			fc = new Enumerator(f.SubFolders);
			for (; !fc.atEnd(); fc.moveNext())
			{
				str = "" + fc.item();
				if (str.indexOf("\\Backup Set") >= 0) {
					//WScript.echo(str + " " + fc.item().size / 1024 / 1024);
					//WScript.echo(fc.item().ParentFolder);
					saveBackupFolder(fc.item());
				} else {
					if (depth < argDepth) {
						depth++;
						walkFolders(fc.item());
						depth--;
					}
				}
			}
	};
	
	var getFolderForDelete = function () {
		sortBySize();
		var str = null;
		for (key in backupFolders) {
			if (backupFolders[key].subFolders.length > 1) {
				elem = backupFolders[key].subFolders.pop();
				backupFolders[key].size -= elem.size;
				driveFreeSpace += elem.size;
				str = elem.name;
				return str;
			}
		}
		return str;
	};
	
	var sizeToString = function (size) {
		var sf;
		var mul = 1024;
		if (size < mul) sf = ""; else {
			mul *= 1024;
			if (size < mul) {
				sf = "KB";
			} else {
				mul *= 1024;
				if (size < mul) {
					sf = "MB";
				} else {
					mul *= 1024;
					if (size < mul) {
						sf = "GB";
					} else {
						mul *= 1024;
						sf = "TB";
					}
				}
			}
		}
		
		return Math.round((size / (mul / 1024)) * 10) / 10 + sf;
	};
	
	var stringToSize = function (str) {
		var size;
		var len = str.length;
		var mul = 1;
		
		if (len > 2) {
			if (str.charAt(len - 2) === 'K') mul = 1024;
			if (str.charAt(len - 2) === 'M') mul = 1024 * 1024;
			if (str.charAt(len - 2) === 'G') mul = 1024 * 1024 * 1024;
			if (str.charAt(len - 2) === 'T') mul = 1024 * 1024 * 1024 * 1024;
		}
		if (mul > 1) {
			size = str.substr(0, len - 2);
		} else {
			size = str;
		}
		return size * mul;
	}
	
	var totalBackupSize = function () {
		var size = 0;
		
		for (key in backupFolders)
			size += backupFolders[key].size;
		return size;
	}
	
	var parseCommandLine = function () {
		var objArgs = WScript.Arguments;
		if (objArgs.length < 1) {
			WScript.echo(WScript.ScriptName + " path [/f size[KB|MB|GB|TB] [/r]] [/d depth]\n");
			WScript.echo("path     - Path for search backup sets.");
			WScript.echo("/f size  - Free space needed on backup drive.");
			WScript.echo("/r       - Actually delete old backup sets.");
			WScript.echo("/d depth - Depth of search backup folders. Default 4.");
			WScript.Quit(1);
		}
		argSearchPath = objArgs(0);
		argFreeSpace = null;
		argActuallyDelete = false;
		for (i = 1; i < objArgs.length; i++)
		{
		   if (objArgs(i) == "/f") {
			   argFreeSpace = stringToSize(objArgs(i + 1));
		   } else {
			   if (objArgs(i) == "/r") {
				   argActuallyDelete = true;
			   } else {
				   if (objArgs(i) == "/d") {
					   argDepth = objArgs(i + 1);
				   }
			   }
		   }
		}		
	};
	
	// public
	
	var init = function() {
		fso = new ActiveXObject("Scripting.FileSystemObject");
	};

	var searchOldFiles = function () {
		var delFolder;

		var drive = fso.GetDrive(fso.GetDriveName(argSearchPath));
		
		driveFreeSpace = drive.FreeSpace;
		if (argFreeSpace !== null) {
			if (argFreeSpace <= driveFreeSpace) {
				WScript.echo("Free space needed " + sizeToString(argFreeSpace));
				WScript.echo("Drive " + drive + " free space " + sizeToString(driveFreeSpace) + ". Nothing to do.");
				WScript.Quit(1);
			} else {
				WScript.echo("Free space needed " + sizeToString(argFreeSpace));
				WScript.echo("Drive " + drive + " free space " + sizeToString(driveFreeSpace));
			}
		}
		backupFolders = new Array();
		depth = 0;
		allSize = 0;
		walkFolders(argSearchPath);
		if (backupFolders.length == 0) {
			WScript.echo("Backup sets not found.");
			WScript.Quit(1);
		}
		sortSubFoldersByName();
		if (argFreeSpace === null) {
			sortBySize();
			for (key in backupFolders) {
				WScript.echo(backupFolders[key].name + ", (size: " + sizeToString(backupFolders[key].size) + ")");
				for (subKey in backupFolders[key].subFolders) {
					WScript.echo(backupFolders[key].subFolders[subKey].name + ", (size: " + sizeToString(backupFolders[key].subFolders[subKey].size) + ")");
				}
			}
			WScript.echo("Total backup size " + sizeToString(totalBackupSize()));
			WScript.echo("Drive " + drive + " free space " + sizeToString(driveFreeSpace));
		} else {
			delFolder = getFolderForDelete();
			while (delFolder != null) {
				if (argActuallyDelete) {
					WScript.echo("Delete " + delFolder);
					fso.GetFolder(delFolder).Delete();
				} else {
					WScript.echo("Will be deleted " + delFolder);
				}
				if (driveFreeSpace > argFreeSpace) break;
				delFolder = getFolderForDelete();
			}
			if (!argActuallyDelete) {
				WScript.echo("For delete add /r option");
			}
		}
	};
	
    return {
        parseCommandLine: parseCommandLine,
		init: init,
        searchOldFiles: searchOldFiles
    };	
	
})();

myApp.init();
myApp.parseCommandLine();
myApp.searchOldFiles();
