# FMR TESTBENCH

This is a a GUI used to interface with a number of instruments for the SQUID lab in the Auburn Elecetrical Engineering department.


The code is in various states of disrepair due to how it was built one experiment at a time and frequently patched in time constrained circumstances. The core code is [here](./renderer.js)

## Initial setup

Install Node.js and run "npm install". You will likely have to use [electron-rebuild](https://github.com/electron/electron-rebuild) to recompile quite a few node modules to get electron(the embedded chrom instance) to launch. The serial module is particularlly troublesome in this regard but google has your answers.

## Instrument dependent drivers

Some instruments need [VISA](https://www.ni.com/en-us/support/downloads/drivers/download.ni-visa.html#409839). Some of those will also need additional drivers from the manufacturer websites.

In some rare cases where you need RAW usb read/write we've used [Zadig](https://zadig.akeo.ie/) to install those drivers

The PPMS is unique in that it is controlled via python [server](../QD_Socket_Server).

## Running it

```
npm start
```
## Deploying

Deployed instances are packaged with [electron-packager](https://github.com/electron/electron-packager). This makes sure that all the dependencies are packaged up and means the host computers doesn't need Node.

