# Cubbles testdata uploader 

Generate a webpackage and upload this the base. The ganaration based on one or more valid manifest files.   
* Generate the directory structur for upload, 
* generate missed necessary files like sorce files for elementary components
* complete manifest with the reference of generated files  
* and upload this to the defined store url.

The source manifest files must contain a valid webpackage manifest.
 
## Install
  npm install cubx-testdata-uploader
  
## Usage: 
  cubx-testdata-uploader -u \<url\> -s \<source path\> \[-p \<proxy\>\]
    
Use the The following options:     
* -u,--storeUrl - The url of the store like https://cubbles.world/odin-test 
* -s,--sourcePath - The source path. Place the manifest files as *.json files in this folder.
* -p,--proxy - the proxy url, if use behind a proxy   

Note: The source path should contains just the manifest file(s), because all json files assumed as a manifest file. 