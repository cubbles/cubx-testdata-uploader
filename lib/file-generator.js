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

/**
 * Crate the Upload structure.
 * The structure is created in the working directory
 * @returns {Promise<any>}
 */
FileGenerator.prototype.createUploadStructure = function () {
  var dbPath = path.join(this.destPath, this.store);
  var me = this;
  // Clean the working directory, delete structures created before
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
  // create basic directory (temp) if not exists
  var createBasePathPromise = new Promise((resolve, reject) => {
    cleanPromise.then(
      (value) => {
        fs.mkdir(this.destPath + path.sep, (err) => {
          if (err) {
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
  // create the directory for the store
  var createDBPromise = new Promise((resolve, reject) => {
    createBasePathPromise.then(
      (value) => {
        fs.mkdir(dbPath + path.sep, (err) => {
          if (err) {
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
  // generate all files
  var promise = new Promise((resolve, reject) => {
    createDBPromise.then(
      (value) => {
        this.generateAllUpdateFiles(dbPath, this.sourcePath).then(
          (value) => {
            resolve(value);
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
/**
 * Generate the webpacakgestructure and all files
 * @param destFolder
 * @param sourceFolder
 * @returns {Promise<any>}
 */
FileGenerator.prototype.generateAllUpdateFiles = function (destFolder, sourceFolder) {
  var me = this;

  // get all filenames in the source directory
  var filesPromise = new Promise((resolve, reject) => {
    fs.readdir(sourceFolder, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

  // read the source files
  var readFilesPromise = new Promise((resolve, reject) => {
    filesPromise.then(
      (files) => {
        me.readSourceFiles(sourceFolder, files).then(
          (objList) => {
            let jsonFileList = objList.filter(o => typeof o !== 'boolean');
            resolve(jsonFileList);
          },
          (err) => {
            throw new Error(err);
          });
      },
      (err) => {
        reject(err);
      });
  });
  // Generate the webpackage structure
  var writeFilesPromise = new Promise((resolve, reject) => {
    readFilesPromise.then(
      (objList) => {
        var writePromises = [];
        objList.forEach((obj) => {
          writePromises.push(me.generateDocumentFiles(destFolder, obj));
        });
        Promise.all(writePromises).then(
          (values) => {
            resolve(values);
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

/**
 * Read the files of the source folder
 * @param sourceFolder
 * @param files
 * @returns {Promise<[any , any , any , any , any , any , any , any , any , any]>}
 */
FileGenerator.prototype.readSourceFiles = function (sourceFolder, files) {
  var readPromises = [];
  files.forEach(
    (file) => {
      readPromises.push(new Promise((resolve, reject) => {
        var filePath = path.join(sourceFolder, file);
        fs.readJson(filePath, (err, obj) => {
          if (err) {
            console.log('File ' + filePath + ' is not a json file. It can not be a manifest. No further treatment of this file.');
            resolve(false);
          } else {
            resolve(obj);
          }
        });
      }));
    });
  return Promise.all(readPromises);
};
/**
 * Generate the webpackage structure and files
 * @param folder destination folder
 * @param obj manifest object
 * @returns {*}
 */
FileGenerator.prototype.generateDocumentFiles = function (folder, manifest) {
  let webpackageId;
  let webpackagePromise;
  try {
    webpackageId = this.getWebpackageId(manifest.groupId, manifest.name, manifest.version);
    var docPath = path.join(folder, webpackageId);

    webpackagePromise = fs.ensureDir(docPath).then(() => {
      return new Promise((resolve, reject) => {
        // TODO Create files for elmentary components
        let promises = [];
        if (manifest && manifest.artifacts && manifest.artifacts.elementaryComponents &&
              Array.isArray(manifest.artifacts.elementaryComponents) && manifest.artifacts.elementaryComponents.length > 0) {
          manifest.artifacts.elementaryComponents.forEach(elementaryConfig => {
            elementaryConfig.resources = [elementaryConfig.artifactId + '.html'];
            if (!elementaryConfig.dependencies) {
              elementaryConfig.dependencies = [];
            }
            if (!elementaryConfig.dependencies.find(dep => dep.artifactId === 'cubxpolymer')) {
              elementaryConfig.dependencies.push(
                {
                  webpackageId: 'cubx.core.rte@2.4.0',
                  artifactId: 'cubxpolymer'
                }
              );
            }

            promises.push(this.createElementaryFiles(docPath, elementaryConfig));
          });
        }
        promises.push(this.generateWebpackageManifest(docPath, manifest, webpackageId));

        // if all files generated, resolve the promise with the webpacakge directory
        Promise.all(promises).then(values => {
          console.log('Webpackage structure in ' + docPath + ' is created.');
          resolve(docPath);
        }).catch(err => {
          reject(err);
        });
      });
    }).catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
  } catch (err) {
    return Promise.reject(Error(err.message + ' ' + JSON.stringify(manifest)));
  }
  return webpackagePromise;
};

/**
 * Create the artifact structure for the elementaryConfig in <i>docPath</i>.
 * @param docPath
 * @param elementaryConfig
 * @returns {Promise<any>}
 */
FileGenerator.prototype.createElementaryFiles = function (docPath, elementaryConfig) {
  return new Promise((resolve, reject) => {
    if (!elementaryConfig.artifactId) {
      reject(new Error('Not valid elementary config ' + JSON.stringify(elementaryConfig)));
    }

    var artifactPath = path.join(docPath, elementaryConfig.artifactId);

    // create the artifact directory
    fs.ensureDir(artifactPath).then(() => {
      // and then create the html file
      this.createElementaryHtml(artifactPath, elementaryConfig.artifactId, resolve, reject);
    });
  });
};
/**
 * Create the HTML file for one elementary config.
 * @param artifactPath
 * @param elementaryConfig
 * @param resolveGenerateArtifact
 * @param rejectGenerateArtifact
 */
FileGenerator.prototype.createElementaryHtml = function (artifactPath, artifactId, resolveGenerateArtifact, rejectGenerateArtifact) {
  var artifactHtmlPath = path.join(artifactPath, artifactId + '.html');
  var content = '<dom-module id="' + artifactId + '">\n';
  content += '<template>';
  content += '<style>:host {margin:10px; padding:10px; border: solid thin black;}</style>';
  content += '<h3>' + artifactId + '</h3>';
  content += '</template>\n';
  content += '<script>CubxPolymer({is: \'' + artifactId + '\'});</script>\n';
  content += '</dom-module>';

  fs.writeFile(artifactHtmlPath, content, function (err) {
    if (err) {
      rejectGenerateArtifact(err);
    }

    resolveGenerateArtifact(true);
  });
};
/**
 * Generate the manifest file in docPath with the content of manifest.
 * @param docPath
 * @param manifest
 * @returns {Promise<any>}
 */
FileGenerator.prototype.generateWebpackageManifest = function (docPath, manifest, webpackageId) {
  return new Promise((resolve, reject) => {
    var manifestPath = path.join(docPath, 'manifest.webpackage');
    fs.writeJson(manifestPath, manifest, (err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};
/**
 * compose and get the webpackage id from groupid, name and version
 * @param groupId
 * @param name
 * @param version
 * @returns {string}
 */
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
