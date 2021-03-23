# The PrimeDAO’s Home for Network Members

This is the [PrimeDAO](primedao.eth.link) web interface enabling interaction with PrimeDAO liquidity pool contracts.

## Technical Description

This project is bootstrapped by [aurelia-cli](https://github.com/aurelia/cli).

It is written mostly in Typescript, HTML and SCSS, and is bundled using Webpack.

For more information about bundling, go to https://aurelia.io/docs/cli/webpack

## Install
Install dependencies with the following command:
```
npm ci
```

## Build
There are several ways to build and run the application.  Each of the following build commands will output to the `dist` folder. After building, run following to launch the result in the browser:

```
npm run start
```

### Build with optimized code against mainnet
`npm run build`

(This is the production build.)

### Build with optimized code against kovan

`npm run build-kovan`

### Build unoptimized code against kovan

`npm run build-dev`

### Build unoptimized code against mainnet

`npm run build-dev-mainnet`

## Build for debugging

Each of the following will serve up a site that will support Hot Module Reload (HMR).  Use your favorate debugger to launch the app at http://localhost:3300.

### Build and serve, running against kovan
To run: `npm run serve-dev`

### Build and serve, running against mainnet
`npm run serve-dev-mainnet`

## Formatting and Linting

Run `npm run lint` and confirm that lint succeeds before git commits.

You can run `npm run lint.fix` to have lint automatically fix all  fixable errors.

## Unit tests

Run `npm run test`.

To run in watch mode, `npm run test --watch`.

## Webpack Analyzer

To run the Webpack Bundle Analyzer, do `npm run analyze` (production build).

## Update the Required Contracts information

Prime Pool relies on solidity contract addresses and ABIs that it obtains from the [contracts package](https://github.com/PrimeDAO/contracts). In the case that any of these contracts change, you may clone the contracts package in a folder sibling to this one, and run a script to pull the required information from the contracts package into this one, by running the following:

```
npm run fetchContracts
```

## Deployment

Make sure you have in your environment (or in a .env file) the following:

```
IPFS_DEPLOY_PINATA__SECRET_API_KEY=
IPFS_DEPLOY_PINATA__API_KEY=
RIVET_ID=
INFURA_ID=
ETHPLORER_KEY=
ETHERSCAN_KEY=
```

### IPFS

We host the dApp in IPFS.

You must first create your build in the `dist` folder (using one of the "build" commands above).

Then the fastest way to deploy the site on ipfs is using Pinata. Make sure you added your Pinata `IPFS_DEPLOY_PINATA__API_KEY` and `IPFS_DEPLOY_PINATA__SECRET_API_KEY` in a .env file and run the following command:

```
npm run ipfs-deploy
```

You can also use the Pinata website to upload the `dist` folder.

Or you can follow the installation instructions here https://docs-beta.ipfs.io/how-to/command-line-quick-start/#install-ipfs.

Executables for ipfs-update can be downloaded from https://dist.ipfs.io/#ipfs-update.

Or you can be upload to ipfs using the following command:

```
ipfs add dist -r dist
```

### Verification Instructions

To calculate the same ipfs hash used for the application deployed you will need the ENV variables that were used for build.

Once you have your ENV variables set you should delete the `node_modules` and `dist` folders, run `npm ci` to install fresh dependencies, then run `npm run build` to generate a clean build.

Now with the build at your disposal you can calculate the hash of the folder by running `ipfs add dist -r -n dist`.
