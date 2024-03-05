## Bump app version for react-native project.

`react-native-bump-app-version` is a command-line tool that uses Node.js to bump the version of a React Native app.
### Prerequisites.
This script utilizes Node.js to run, so after setting up the environment for running the React Native app, you have everything necessary to execute this script.
### Quick start
Clone this the repo then copy all files to the root React Native app.\
The app version will be formatted as follows: **Major.Minor.Patch**.\
Run script with command:
```
node ./bump-version.js production
```
**Path** will be replaced with ``` `${month}${day}` ``` and the build number will be incremented by 1.
Example:
```
Version: 1.0.0 --> 1.0.305
Build:   1         2
```
---
Run script with command:
```
node ./bump-version.js production minor-release
```
**Minor** will be incremented by 1, **Path** will be replaced with ``` `${month}${day}` ``` and the build number will be incremented by 1.
Example:
```
Version: 1.0.0 --> 1.1.305
Build:   1         2
```
---
If you want to change the **Major** number, just go to `app-version.json` file and change **Major** number in `version` field.
