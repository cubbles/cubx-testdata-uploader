var fs = require('fs');
var path = require('path');
var inquirer = require('inquirer');
var FileGenerator = require('./lib/file-generator.js');
// var CouchUploader = require('./lib/couch-uploader.js');
var Uploader = require('cubx-webpackage-uploader');

var argv = require('yargs')
  .usage('Usage: $0 -u,--storeUrl <storeUrl> -s,--sourcePath <sourcePath> [-p, --proxy <proxyUrl>]')
  .demandOption([ 'u', 's' ])
  .alias('u', 'storeUrl')
  .alias('s', 'sourcePath')
  .alias('p', 'proxy')
  .locale('en')
  .argv;

var storeUrl = argv.storeUrl;
var proxy = argv.proxy;
// TODO check storeUrl
var regex = /^https?:\/\/[a-z-.]*(:\d{1,4})?\/[a-z0-9-]*$/i;
if (!storeUrl.match(regex)) {
  console.error('Not a valid store url. The store url must match ' + regex);
}
var sp = storeUrl.split('/');
// var basicUrl = sp[ 0 ] + '//' + sp[ 2 ];
var store = sp[ 3 ];

var source = argv.sourcePath;
var couchDocsPath = path.join(process.cwd(), 'temp');
var sourcePath = path.normalize(source);
fs.stat(sourcePath, (error, stats) => {
  if (error) {
    console.error(error, sourcePath);
  } else if (stats.isDirectory()) {
    // var couchUploader = new CouchUploader(basicUrl, couchDocsPath);
    var uploader = new Uploader();
    var fileGenerator = new FileGenerator(sourcePath, couchDocsPath, store);

    var promise = fileGenerator.createUploadStructure();
    promise.then(
      (values) => {
        // upload all webpackges
        console.log('Please log in for upload to CubblesBase:');
        inquirer.prompt([
          {
            name: 'user',
            type: 'input',
            message: 'username:',
            validate: function (input) {
              return (typeof input !== 'undefined' && input.length > 0);
            }
          },
          {
            name: 'password',
            type: 'password',
            message: 'password:',
            validate: function (input) {
              return (typeof input !== 'undefined' && input.length > 0);
            }
          }
        ]).then(function (response) {
          let i = 0;
          // values.forEach(path => {
          let credentialConfig = {
            user: response.user,
            password: response.password
          };
          doUpload(values, i, credentialConfig);
        });
      }).catch(err => {
        console.error(err);
      });
  } else {
    console.error('The sourcePath not a directory.', sourcePath);
  }

  function doUpload (pathArray, i, credentialConfig) {
    var uploadConfig = {
      source: '',
      target: {
        url: storeUrl,
        path: '_api/upload',
        proxy: ''
      }
    };
    // If the argument -p or --proxy exists use proxy
    if (proxy && proxy.length > 0) {
      uploadConfig.target.proxy = proxy;
    }
    uploadConfig.source = pathArray[i];
    uploadConfig.access_credentials = credentialConfig;
    uploader.uploadSingleWebpackage(uploadConfig, function (err, success) {
      if (err) {
        console.error(err);
      } else {
        console.log('Uploaded successed webpackage from ' + pathArray[i]);
        i++;
        if (pathArray[i]) {
          doUpload(pathArray, i, credentialConfig);
        }
      }
    });
  }
});
