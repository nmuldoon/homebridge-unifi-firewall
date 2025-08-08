# Homebridge UniFi Firewall Plugin

[![npm](https://img.shields.io/npm/v/homebridge-unifi-firewall-toggle.svg)](https://www.npmjs.com/package/homebridge-unifi-firewall-toggle)
[![npm](https://img.shields.io/npm/dt/homebridge-unifi-firewall-toggle.svg)](https://www.npmjs.com/package/homebridge-unifi-firewall-toggle)

A Homebridge plugin to toggle UniFi firewall rules and UniFi 9 firewall policies on and off via HomeKit.

## Features

- Toggle UniFi 9 firewall policies on/off (new in v1.3.0)
- Support for inverted switch behavior
- Automatic discovery and management of accessories
- Support for UniFi Network 9 onwards

## Installation

1. Install this plugin using: `npm install -g homebridge-unifi-firewall-toggle`
2. Configure the plugin via the Homebridge Config, or manually edit your configuration file
3. Restart Homebridge

## Configuration

### Basic Configuration

```json
{
  "platform": "UnifiFirewall",
  "unifi": {
    "url": "https://192.168.1.1",
    "username": "admin",
    "password": "password",
    "site": "default",
    "strictSSL": false
  },
  "rules": [
    {
      "id": "2000",
      "name": "Block IoT Devices",
      "inverted": false
    }
  ]
}
```

### UniFi 9 Firewall Policies

For UniFi 9 users, you can also control the newer policy-based firewall system:

```json
{
  "platform": "UnifiFirewall",
  "unifi": {
    "url": "https://192.168.1.1",
    "username": "admin",
    "password": "password",
    "site": "default",
    "strictSSL": false
  },
  "rules": [
    {
      "id": "2000",
      "name": "Block IoT Devices",
      "inverted": false
    }
  ],
  "unifi9Policies": [
    {
      "id": "policy-id-or-name",
      "name": "Guest Network Policy",
      "inverted": false
    }
  ]
}
```

📋 **See [`example-config.json`](example-config.json) for a complete configuration example with both traditional rules and UniFi 9 policies.**

## Configuration Options

### UniFi Controller Settings (`unifi`)

| Field       | Description                  | Required | Default   |
| ----------- | ---------------------------- | -------- | --------- |
| `url`       | URL of your UniFi Controller | Yes      | -         |
| `username`  | UniFi Controller username    | Yes      | -         |
| `password`  | UniFi Controller password    | Yes      | -         |
| `site`      | UniFi site name              | Yes      | `default` |
| `strictSSL` | Validate SSL certificates    | No       | `false`   |

### UniFi 9 Policies (`unifi9Policies`)

| Field      | Description                    | Required | Default |
| ---------- | ------------------------------ | -------- | ------- |
| `id`       | Policy ID or name from UniFi 9 | Yes      | -       |
| `name`     | Display name in HomeKit        | Yes      | -       |
| `inverted` | Invert switch behavior         | No       | `false` |

## Finding UniFi 9 Policy IDs

1. Log into your UniFi Controller (version 9+)
2. Navigate to **Settings** → **Security** → **Firewall Policies**
3. Use either the policy name or ID as shown in the interface
4. Alternatively, use the `npm run discover-rules` command

## Inverted Behavior

Set `inverted: true` to reverse the switch behavior:

- **Normal**: Switch ON = Rule/Policy Enabled, Switch OFF = Rule/Policy Disabled
- **Inverted**: Switch ON = Rule/Policy Disabled, Switch OFF = Rule/Policy Enabled

This is useful for rules that block traffic - you might want "ON" to mean "allow traffic" (rule disabled).

## Troubleshooting

### Authentication Issues

- Ensure your credentials are correct
- Try creating a dedicated local user account for the plugin
- Verify the site name is correct (usually "default")

### SSL Certificate Issues

If you're getting SSL errors, set `strictSSL: false` in your configuration.

### Rule/Policy Not Found

- Double-check the rule index or policy ID
- Ensure the rule/policy exists and is visible in the UniFi Controller
- Check the logs for detailed error messages

## Development

This plugin uses the latest `unifi-client` library for communication with UniFi Controllers.

## Credits

Based on the original work by [jak](https://github.com/jak/homebridge-unifi-firewall).

## License

This project is licensed under the Apache License 2.0.

## Setup Development Environment

To develop Homebridge plugins you must have Node.js 12 or later installed, and a modern code editor such as [VS Code](https://code.visualstudio.com/). This plugin template uses [TypeScript](https://www.typescriptlang.org/) to make development easier and comes with pre-configured settings for [VS Code](https://code.visualstudio.com/) and ESLint. If you are using VS Code install these extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Install Development Dependencies

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```
npm install
```

## Update package.json

Open the [`package.json`](./package.json) and change the following attributes:

- `name` - this should be prefixed with `homebridge-` or `@username/homebridge-` and contain no spaces or special characters apart from a dashes
- `displayName` - this is the "nice" name displayed in the Homebridge UI
- `repository.url` - Link to your GitHub repo
- `bugs.url` - Link to your GitHub repo issues page

When you are ready to publish the plugin you should set `private` to false, or remove the attribute entirely.

## Update Plugin Defaults

Open the [`src/settings.ts`](./src/settings.ts) file and change the default values:

- `PLATFORM_NAME` - Set this to be the name of your platform. This is the name of the platform that users will use to register the plugin in the Homebridge `config.json`.
- `PLUGIN_NAME` - Set this to be the same name you set in the [`package.json`](./package.json) file.

Open the [`config.schema.json`](./config.schema.json) file and change the following attribute:

- `pluginAlias` - set this to match the `PLATFORM_NAME` you defined in the previous step.

## Build Plugin

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```
npm run build
```

## Link To Homebridge

Run this command so your global install of Homebridge can discover the plugin in your development environment:

```
npm link
```

You can now start Homebridge, use the `-D` flag so you can see debug log messages in your plugin:

```
homebridge -D
```

## Watch For Changes and Build Automatically

If you want to have your code compile automatically as you make changes, and restart Homebridge automatically between changes you can run:

```
npm run watch
```

This will launch an instance of Homebridge in debug mode which will restart every time you make a change to the source code. It will load the config stored in the default location under `~/.homebridge`. You may need to stop other running instances of Homebridge while using this command to prevent conflicts. You can adjust the Homebridge startup command in the [`nodemon.json`](./nodemon.json) file.

## Customise Plugin

You can now start customising the plugin template to suit your requirements.

- [`src/platform.ts`](./src/platform.ts) - this is where your device setup and discovery should go.
- [`src/platformAccessory.ts`](./src/platformAccessory.ts) - this is where your accessory control logic should go, you can rename or create multiple instances of this file for each accessory type you need to implement as part of your platform plugin. You can refer to the [developer documentation](https://developers.homebridge.io/) to see what characteristics you need to implement for each service type.
- [`config.schema.json`](./config.schema.json) - update the config schema to match the config you expect from the user. See the [Plugin Config Schema Documentation](https://developers.homebridge.io/#/config-schema).

## Versioning Your Plugin

Given a version number `MAJOR`.`MINOR`.`PATCH`, such as `1.4.3`, increment the:

1. **MAJOR** version when you make breaking changes to your plugin,
2. **MINOR** version when you add functionality in a backwards compatible manner, and
3. **PATCH** version when you make backwards compatible bug fixes.

You can use the `npm version` command to help you with this:

```bash
# major update / breaking changes
npm version major

# minor update / new features
npm version update

# patch / bugfixes
npm version patch
```

## Publish Package

When you are ready to publish your plugin to [npm](https://www.npmjs.com/), make sure you have removed the `private` attribute from the [`package.json`](./package.json) file then run:

```
npm publish
```

If you are publishing a scoped plugin, i.e. `@username/homebridge-xxx` you will need to add `--access=public` to command the first time you publish.

#### Publishing Beta Versions

You can publish _beta_ versions of your plugin for other users to test before you release it to everyone.

```bash
# create a new pre-release version (eg. 2.1.0-beta.1)
npm version prepatch --preid beta

# publsh to @beta
npm publish --tag=beta
```

Users can then install the _beta_ version by appending `@beta` to the install command, for example:

```
sudo npm install -g homebridge-example-plugin@beta
```
