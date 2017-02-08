'use strict';
var path = require('path');
var couchdbBootstrap = require('couchdb-bootstrap');
module.exports = CouchUploader;

function CouchUploader (basUrl, sourcePath) {
  this.basUrl = basUrl;
  if (!path.isAbsolute(sourcePath)) {
    this.sourcePath = path.join(process.cwd(), sourcePath);
  } else {
    this.sourcePath = sourcePath;
  }
};

CouchUploader.prototype.upload = function () {
  couchdbBootstrap(this.basUrl, this.sourcePath, function (err, resp) {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(resp, null, 2));
    }
  });
};
