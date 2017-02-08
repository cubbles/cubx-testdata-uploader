var fs = require('fs');
var path = require('path');
var FileGenerator = require('./lib/file-generator.js');
var CouchUploader = require('./lib/couch-uploader.js');

var argv = require('yargs')
  .usage('Usage: Usage: $0 -u,--storeUrl [storeUrl] -s,--sourcePath [sourcePath]')
  .demandOption([ 'u', 's' ])
  .alias('u', 'storeUrl')
  .alias('s', 'sourcePath')
  .locale('en')
  .argv;

var storeUrl = argv.storeUrl;
// TODO check storeUrl
var regex = /^https?:\/\/[a-z-.]*:\d{4}\/webpackage-store-[a-z0-9-]*$/gi;
if (!storeUrl.match(regex)) {
  console.error('Not a valid store url. The store url must match ' + regex);
}
var sp = storeUrl.split('/');
var basicUrl = sp[ 0 ] + '//' + sp[ 2 ];
var store = sp[ 3 ];

var source = argv.sourcePath;
var couchDocsPath = path.join(process.cwd(), 'temp');
var sourcePath = path.normalize(source);
fs.stat(sourcePath, (error, stats) => {
  if (error) {
    console.error(error, sourcePath);
  } else if (stats.isDirectory()) {
    var couchUploader = new CouchUploader(basicUrl, couchDocsPath);
    var fileGenerator = new FileGenerator(sourcePath, couchDocsPath, store);
    var promise = fileGenerator.createUploadStructure();
    promise.then(
      (value) => {
        couchUploader.upload();
      },
      (err) => {
        console.error(err);
      });
  } else {
    console.error('The sourcePath not a directory.', sourcePath);
  }
});
