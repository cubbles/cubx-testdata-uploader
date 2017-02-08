'strict mode';
var fs = require('fs-extra');
var path = require('path');
module.exports = FileGenerator;

function FileGenerator (sourcePath, destPath, store) {
  this.sourcePath = sourcePath;
  if (!path.isAbsolute(destPath)) {
    this.destPath = path.join(process.cwd(), destPath);
  } else {
    this.destPath = destPath;
  }
  if (this.destPath.endsWith(path.sep)) {
    this.destPath = this.destPath.substr(0, this.destPath.length - 1);
  }
  this.store = store;
}

FileGenerator.prototype.createUploadStructure = function () {
  var dbPath = path.join(this.destPath, this.store);
  var me = this;
  var cleanPromise = new Promise((resolve, reject) => {
    fs.stat(me.destPath, (err, stat) => {
      if (err) {
        resolve(true);
      } else if (stat.isDirectory()) {
        fs.remove(me.destPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      }
    });
  });
  var createBasePathPromise = new Promise((resolve, reject) => {
    cleanPromise.then(
      (value) => {
        fs.mkdir(this.destPath + path.sep, (err) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(true);
          }
        });
      },
      (err) => {
        reject(err);
      }
    );
  });
  var createDBPromise = new Promise((resolve, reject) => {
    createBasePathPromise.then(
      (value) => {
        fs.mkdir(dbPath + path.sep, (err) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(true);
          }
        });
      },
      (err) => {
        reject(err);
      }
    );
  });
  var promise = new Promise((resolve, reject) => {
    createDBPromise.then(
      (value) => {
        this.generateAllUpdateFiles(dbPath, this.sourcePath).then(
          (value) => {
            resolve(true);
          },
          (err) => {
            reject(err);
          });
      },
      (err) => {
        reject(err);
      });
  });

  return promise;
};

FileGenerator.prototype.generateAllUpdateFiles = function (destFolder, sourceFolder) {
  var me = this;

  var filesPromise = new Promise((resolve, reject) => {
    fs.readdir(sourceFolder, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

  var readFilesPromise = new Promise((resolve, reject) => {
    filesPromise.then(
      (files) => {
        me.readSourceFiles(sourceFolder, files).then(
          (objList) => {
            resolve(objList);
          },
          (err) => {
            throw new Error(err);
          });
      },
      (err) => {
        reject(err);
      });
  });
  var writeFilesPromise = new Promise((resolve, reject) => {
    readFilesPromise.then(
      (objList) => {
        var writePromises = [];
        objList.forEach((obj) => {
          writePromises.push(me.generateDocumentFiles(destFolder, obj));
        });
        Promise.all(writePromises).then(
          (values) => {
            resolve(true);
          },
          (err) => {
            reject(err);
          });
      },
      (err) => {
        reject(err);
      });
  });
  return writeFilesPromise;
};

FileGenerator.prototype.readSourceFiles = function (sourceFolder, files) {
  var readPromises = [];
  files.forEach(
    (file) => {
      readPromises.push(new Promise((resolve, reject) => {
        var filePath = path.join(sourceFolder, file);
        fs.readJson(filePath, (err, obj) => {
          if (err) {
            reject(err);
          } else {
            resolve(obj);
          }
        });
      }));
    });
  return Promise.all(readPromises);
};
FileGenerator.prototype.generateDocumentFiles = function (folder, obj) {
  var webpackageId;

  try {
    webpackageId = this.getWebpackageId(obj.groupId, obj.name, obj.version);
    var docPath = path.join(folder, webpackageId);
    var filePromises = [];
    fs.mkdir(docPath, (err) => {
      if (err) {
        console.error(err);
        filePromises.push(Promise.reject(err));
      } else {
        filePromises.push(
          new Promise((resolve, reject) => {
            Object.keys(obj).forEach((key) => {
              if (obj.hasOwnProperty(key)) {
                var value = obj[ key ];
                var filePath = path.join(folder, webpackageId, key + '.json');
                fs.writeJson(filePath, value, (err) => {
                  if (err) {
                    console.error(err);
                    reject(err);
                  } else {
                    resolve(true);
                  }
                });
              }
            });
          })
        );
        var attachmentDir = path.join(folder, webpackageId, '_attachments');
        filePromises.push(
          new Promise((resolve, reject) => {
            fs.mkdir(attachmentDir, (err) => {
              if (err) {
                console.error(err);
                reject(err);
              } else {
                var attachmentFilePath = path.join(attachmentDir, 'manifest.webpackage');
                fs.writeJson(attachmentFilePath, obj, (err) => {
                  if (err) {
                    console.error(err);
                    reject(err);
                  } else {
                    console.log(webpackageId, ' write manifest.webpackage');
                    resolve(true);
                  }
                });
              }
            });
          })
        );
      }
    });
  } catch (err) {
    return Promise.reject(Error(err.message + ' ' + JSON.stringify(obj)));
  }
  return Promise.all(filePromises);
};

FileGenerator.prototype.getWebpackageId = function (groupId, name, version) {
  if (!name || !version) {
    throw Error('Name and version is mandaory for a webpackage');
  }
  var webpackageId = name + '@' + version;
  if (groupId && groupId.length > 0) {
    webpackageId = groupId + '.' + webpackageId;
  }
  return webpackageId;
};
