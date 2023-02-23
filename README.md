# Hubspot Managed Component

## Documentation

Managed Components docs are published at **https://managedcomponents.dev** .

Find out more about Managed Components [here](https://blog.cloudflare.com/zaraz-open-source-managed-components-and-webcm/) for inspiration and motivation details.

[![Released under the Apache license.](https://img.shields.io/badge/license-apache-blue.svg)](./LICENSE)
[![PRs welcome!](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![All Contributors](https://img.shields.io/github/all-contributors/managed-components/snapchat?color=ee8449&style=flat-square)](#contributors)

## 🚀 Quickstart local dev environment

1. Make sure you're running node version >=18.
2. Install dependencies with `npm i`
3. Run unit test watcher with `npm run test:dev`

## ⚙️ Tool Settings

> Settings are used to configure the tool in a Component Manager config file

### Hub ID `string` _required_

The Hub ID identifies your account at Hubspot. [Learn more](https://knowledge.hubspot.com/account/manage-multiple-hubspot-accounts)

### Region prefix `string`

Region prefix, if any, that follows `js-` in your tracking code script src, e.g. eu1 in `<script type="text/javascript" id="hs-script-loader" async defer src="//js-eu1.hs-scripts.com/123456.js"></script>`.

### Domain Name `string` required

The domain associated with your Hubspot account.

## 🧱 Fields Description

> Fields are properties that can/must be sent with certain events

### Event ID `string` _required_

The event_id or the internal name of the event that you created in HubSpot. [Learn more](https://knowledge.hubspot.com/analytics-tools/create-codeless-custom-behavioral-events#create-the-event-in-hubspot)

### Event property name `string` _required_

The internal name of the event property you’ve created for the event. [Learn more](https://developers.hubspot.com/docs/api/events/tracking-code)

### Event property value `string` _required_

The value of the event property. [Learn more](https://developers.hubspot.com/docs/api/events/tracking-code)

### Visitor email `string`

The website visitor's email address needed for identification. [Learn more](https://developers.hubspot.com/docs/api/events/tracking-code)

### Visitor ID `string`

The website visitor's user ID needed for identification. [Learn more](https://developers.hubspot.com/docs/api/events/tracking-code)

### Path `string`

The path of the current page (for SPAs). [Learn more](https://developers.hubspot.com/docs/api/events/tracking-code)

### Form ID `string` _required_

The ID of your HTML <form> element, e.g. myId.

### Form class `string`

The classes of your HTML <form> element, space separated, e.g. `my_class other_class`.

## 📝 License

Licensed under the [Apache License](./LICENSE).

## 💜 Thanks

Thanks to everyone contributing in any manner for this repo and to everyone working on Open Source in general.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
