[![Accelerate your robotics development](https://user-images.githubusercontent.com/14011012/195918769-5aaeedf3-5de2-48fb-951e-7399f2b9e190.png)](https://foxglove.dev)

<br/>

<div align="center">
    <h1>Foxglove Studio</h1>
    <a href="https://github.com/foxglove/studio/releases"><img src="https://img.shields.io/github/v/release/foxglove/studio?label=version" /></a>
    <a href="https://github.com/foxglove/studio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/foxglove/studio" /></a>
    <a href="https://github.com/orgs/foxglove/discussions"><img src="https://img.shields.io/github/discussions/foxglove/community.svg?logo=github" /></a>
    <a href="https://foxglove.dev/join-slack"><img src="https://img.shields.io/badge/chat-slack-purple.svg?logo=slack" /></a>
    <br />
    <br />
    <a href="https://foxglove.dev/download">Download</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/docs/studio">Docs</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/blog">Blog</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/slack">Slack</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://twitter.com/foxglovedev">Twitter</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/contact">Contact Us</a>
  <br />
  <br />

[Foxglove Studio](https://foxglove.dev) is an integrated visualization and diagnosis tool for robotics, available [in your browser](https://studio.foxglove.dev/) or [as a desktop app](https://foxglove.dev/download) on Linux, Windows, and macOS.

  <p align="center">
    <a href="https://foxglove.dev"><img alt="Foxglove Studio screenshot" src="/resources/screenshot.png"></a>
  </p>
</div>

<hr />

To learn more, visit the following resources:

[About](https://foxglove.dev/about)
&nbsp;•&nbsp;
[Documentation](https://foxglove.dev/docs)
&nbsp;•&nbsp;
[Release notes](https://github.com/foxglove/studio/releases)
&nbsp;•&nbsp;
[Blog](https://foxglove.dev/blog)

You can join us on the following platforms to ask questions, share feedback, and stay up to date on what our team is working on:

[GitHub Discussions](https://github.com/orgs/foxglove/discussions)
&nbsp;•&nbsp;
[Slack](https://foxglove.dev/slack)
&nbsp;•&nbsp;
[Newsletter](https://foxglove.dev/#footer)
&nbsp;•&nbsp;
[Twitter](https://twitter.com/foxglovedev)
&nbsp;•&nbsp;
[LinkedIn](https://www.linkedin.com/company/foxglovedev/)

<br />

## Installation

Foxglove Studio is available online at [studio.foxglove.dev](https://studio.foxglove.dev/), or desktop releases can be downloaded from [foxglove.dev/download](https://foxglove.dev/download).

## Open Source

Foxglove Studio follows an open core licensing model. Most functionality is available in this repository, and can be reproduced or modified per the terms of the [Mozilla Public License v2.0](/LICENSE).

The official binary distributions available at [studio.foxglove.dev](https://studio.foxglove.dev/) or [foxglove.dev/download](https://foxglove.dev/download) incorporate some closed-source functionality, such as integration with [Foxglove Data Platform](https://foxglove.dev/data-platform), multiple layouts, private extensions, and more. For more information on free and paid features, see our [Pricing](https://foxglove.dev/pricing).

## Self-hosting

Foxglove Studio can be self-hosted using our [docker image](https://ghcr.io/foxglove/studio). Please note that this build does not contain any closed source functionality.

```sh
docker run --rm -p "8080:8080" ghcr.io/foxglove/studio:latest
```

Foxglove Studio will be accessible in your browser at [localhost:8080](http://localhost:8080/).

## Contributing

Foxglove Studio is written in TypeScript – contributions are welcome!

Note: All contributors must agree to our [Contributor License Agreement](https://github.com/foxglove/cla). See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Credits

Foxglove Studio originally began as a fork of [Webviz](https://github.com/cruise-automation/webviz), an open source project developed by [Cruise](https://getcruise.com/). Most of the Webviz code has been rewritten, but some files still carry a Cruise license header where appropriate.


## Publishing to nstrumenta project

install deps
```shell
root@f9e51f81b71a:/workspaces/studio# corepack enable
root@f9e51f81b71a:/workspaces/studio# yarn
```

build web prod
```shell
root@f9e51f81b71a:/workspaces/studio# yarn run web:build:prod
webpack 5.79.0 compiled successfully in 194 ms

main:
  assets by path *.js 23.4 MiB

...

  main (webpack 5.79.0) compiled with 2 warnings in 34207 ms
```
confirm project ID:
```shell
root@f9e51f81b71a:/workspaces/studio# nst project id
test1
```
publish
```shell
root@f9e51f81b71a:/workspaces/studio# nst module publish
cwd: /workspaces/studio
publishing: [
  {
    nstrumentaVersion: '3.1.8',
    folder: './',
    nstrumentaModuleType: 'web',
    entry: 'web/.webpack/index.html',
    includes: [ 'web/.webpack' ],
    name: 'studio',
    version: '1.0.4',
    description: 'Integrated robotics visualization and debugging.',

...

  }
]
[ 'studio-1.0.4.tar.gz' ]
```
host
```shell
root@f9e51f81b71a:/workspaces/studio# nst module host studio
Finding  studio
found moduleId:  studio
created action: df439df7-c476-45f0-84ea-da3615ff0430  {
  task: 'hostModule',
  status: 'pending',
  data: {
    module: {
      name: 'studio',
      filePath: 'studio-1.0.4.tar.gz',
      version: '1.0.4'
    },
    args: [ 'studio' ]
  }
}

```
