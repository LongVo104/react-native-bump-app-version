const fs = require('fs');
const { exec } = require('child_process');

const APP_VERSION_FILENAME = 'app-version.json';
const PRODUCTION_KEY = 'production';
const STAGING_KEY = 'staging';
const MANOR_RELEASE = 'minor-release';
const VERSION_KEY = 'version';
const BUILD_KEY = 'build';
const ANDROID_VERSION_PROPERTIES_FILE = './android/app/app-version.properties';
const IOS_VERSION_SCRIPT_FILE = './ios/version-bump.sh';

const IOS_PRODUCTION_PLIST_PATH = './ios-product-project-name/Info.plist';
const IOS_PRODUCTION_NOTIFICATION_PLIST_PATH = './ios-product-project-NotificationServiceExtension/Info.plist';

const IOS_STAGING_PLIST_PATH = './ios-staging-project-name/POPSInfluencerStaging.plist';
const IOS_STAGING_NOTIFICATION_PLIST_PATH = './ios-staging-project-NotificationServiceExtension/InfoStaging.plist';

const args = process.argv.slice(2);
const appArg = args[0];
const minorArg = args[1];

const readFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    return jsonData;
  } catch (error) {
    console.error('[FileSystem] read file error ', error);
    throw error;
  }
};

const writeFile = (filePath, data) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, data);
    } else {
      const directoryPath = filePath.split('/').slice(0, -1).join('/');
      fs.mkdirSync(directoryPath, { recursive: true });
      fs.writeFileSync(filePath, data);
    }
  } catch (error) {
    console.error('[FileSystem] write file error ', error);
    throw error;
  }
};

const updateVersion = (version, isNewRelease) => {
  const versionSeparated = version.split('.');
  let middleValue = parseInt(versionSeparated[1], 10);
  if (isNewRelease) {
    middleValue += 1;
  }
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate() > 9 ? `${now.getDate()}` : `0${now.getDate()}`;
  const lastValue = `${month}${day}`;
  return [versionSeparated[0], middleValue, lastValue].join('.');
};

const updateBuild = (build) => {
  return build + 1;
};

const writeAndroidPropertiesFile = (versionData) => {
  let propertiesValue = '';
  Object.keys(versionData).forEach((key) => {
    let value = '';
    const environmentData = versionData[key];
    switch (key) {
      case PRODUCTION_KEY:
        value = `PRODUCTION_NAME=${environmentData[VERSION_KEY]}\nPRODUCTION_CODE=${environmentData[BUILD_KEY]}\n`;
        break;
      case STAGING_KEY:
        value = `STAGING_NAME=${environmentData[VERSION_KEY]}\nSTAGING_CODE=${environmentData[BUILD_KEY]}\n`;
        break;
    }
    propertiesValue = `${propertiesValue}${value}`;
  });
  writeFile(ANDROID_VERSION_PROPERTIES_FILE, propertiesValue);
};

const writeIOSScript = (versionApp, enviroment, successCallback) => {
  let versionValue = '';
  let buildValue = '';
  switch (enviroment) {
    case PRODUCTION_KEY:
      versionValue = `/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${versionApp[BUILD_KEY]}" "${IOS_PRODUCTION_PLIST_PATH}"\n
      /usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${versionApp[BUILD_KEY]}" "${IOS_PRODUCTION_NOTIFICATION_PLIST_PATH}"`;
      buildValue = `/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${versionApp[VERSION_KEY]}" "${IOS_PRODUCTION_PLIST_PATH}"\n
      /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${versionApp[VERSION_KEY]}" "${IOS_PRODUCTION_NOTIFICATION_PLIST_PATH}"`;
      break;
    case STAGING_KEY:
      versionValue = `/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${versionApp[BUILD_KEY]}" "${IOS_STAGING_PLIST_PATH}"\n
      /usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${versionApp[BUILD_KEY]}" "${IOS_STAGING_NOTIFICATION_PLIST_PATH}"`;
      buildValue = `/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${versionApp[VERSION_KEY]}" "${IOS_STAGING_PLIST_PATH}"\n
      /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${versionApp[VERSION_KEY]}" "${IOS_STAGING_NOTIFICATION_PLIST_PATH}"`;
      break;
  }
  const scriptValue = `${versionValue}\n${buildValue}`;
  writeFile(IOS_VERSION_SCRIPT_FILE, scriptValue);
  exec('./ios-bump-script.sh', (error, stdout, stderr) => {
    if (error) {
      console.log(`[BUMP_VERSION] ios exec ios-bump-script error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`[BUMP_VERSION] ios exec ios-bump-script std error: ${stderr}`);
      return;
    }
    stdout && console.log(`[BUMP_VERSION] ios exec ios-bump-script : ${stdout}`);
    successCallback && successCallback();
  });
};

const commitBumpVersion = (environment, version) => {
  const commitMessage = `Bump ${environment} to version ${version}`;
  exec(`./bump-git-commit.sh "${commitMessage}"`, (error, stdout, stderr) => {
    if (error) {
      console.log(`[BUMP_VERSION] exec bump-git-commit error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`[BUMP_VERSION] exec bump-git-commit std error: ${stderr}`);
      return;
    }
    stdout && console.log(`[BUMP_VERSION] exec bump-git-commit :\n ${stdout}`);
  });
};

const bumpVersion = () => {
  const appVersionData = readFile(APP_VERSION_FILENAME);
  const versionApp = appVersionData[appArg];
  if (versionApp) {
    // get current version and update new version
    const appVersion = versionApp[VERSION_KEY];
    const newVersion = updateVersion(appVersion, minorArg === MANOR_RELEASE);
    // get current build and update new build
    const build = versionApp[BUILD_KEY];
    const newBuild = updateBuild(build);
    versionApp[VERSION_KEY] = newVersion;
    versionApp[BUILD_KEY] = newBuild;
    // update app version file with new version
    writeFile(APP_VERSION_FILENAME, JSON.stringify(appVersionData, null, 4));
    writeAndroidPropertiesFile(appVersionData);
    writeIOSScript(versionApp, appArg, () => {
      commitBumpVersion(appArg, `${newVersion}-${newBuild}`);
    });
    console.log(' <><><><> DONE <><><><> ');
  } else {
    console.log('[BUMP_VERSION] incorrect enviroment ', appArg);
  }
};

bumpVersion();
