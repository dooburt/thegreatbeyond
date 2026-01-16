# Developer Build Steps

You can ignore this unless you are building the pack from a local source.

- Copy the instance.json file from within ATLauncher into this folder - replace anything here.
- Edit `generate-manifest.js` and update the version number - this is important because it has to match CF and GH
- Run `generate-manifest.js` with `node generate-manifest.js`
- Run `build-pack.js` to generate the CF Zip
- Upload said CF Zip
