// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require("fs");
const serialport = require('serialport');
const SerialPort = serialport.SerialPort;
var usb = require('usb');
var net = require('net');

const Readline = require('@serialport/parser-readline');
const ByteLength = require('@serialport/parser-byte-length');
const Plotly = require('plotly.js-dist');
const { title } = require("process");
const { throws } = require("assert");
const { dialog } = require('electron').remote;
let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
logs = [];
logging = false;

class Instrument {
  constructor(name) {
    this._name = name;
    this.connected = false;
  }
  poll() { }
}
class TimeKeeper extends Instrument {
  constructor() {
    super("tk");
    this.readout = { "time": (new Date).getTime() };
  }
  get html() {
    return document.createElement("div");
  }
  poll() {
    this.readout = { "time": (new Date).getTime() };
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
class NVmeter2182A extends Instrument {
  constructor(name) {
    super(name);
    this.readout = { "voltage": undefined };
    this.connected = false;
  }
  poll() {
    if (this.connected)
      this.port.write(":FETCH?\n");
  }
  parseLine(line) {
    //console.log(this._name + " " + line);
    this.readout = { "voltage": line };
    this.readout_element.textContent = line + " Volts";
  }
  refreshPorts() {
    serialport.list(function (err, portl) {
      portl.forEach(function (port) {
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        this.serialRow.getElementsByTagName("select").portselect.appendChild(opt);
      }.bind(this)
      );
    }.bind(this));
  }
  writeErrorHandler(err) {
    if (err) {
      console.log(err);
    }
  }
  connect() {
    if (!this.connected) {
      let select = this.serialRow.getElementsByTagName("select").portselect;
      let baud = this.serialRow.getElementsByTagName("select").portbaud;

      this.port = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
        function (err) {
          if (err) {
            return console.log('Error: ', err.message)
          }
          else {
            let parser = new Readline()
            this.port.pipe(parser)
            parser.on('data', (line => this.parseLine(line.replace(/(\r\n|\n|\r)/gm, ""))).bind(this));

            this.port.on('close', function (err) {
              this.connected = false;
              this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
              this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
              if (err) {
                console.log(err);
              }
            }.bind(this));

            this.port.write(":CONF:VOLT:DC\n", this.writeErrorHandler.bind(this));//:CONFigure:VOLTage:DC
            this.port.write(":INIT:CONT ON\n", this.writeErrorHandler.bind(this));//:INITiate:CONTinuous ON

            this.connected = true;
            this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
            this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
          }
        }.bind(this)
      );
    }
    else {
      this.port.close();
    }
  }
  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    {
      const row = thead.insertRow();
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.appendChild(nameplate);
    }
    const tbody = orgtable.createTBody();
    {
      this.serialRow = tbody.insertRow();
      {
        const cc = document.createElement("select");
        cc.id = "portselect";
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);

        const cc2 = document.createElement("button");
        cc2.textContent = "↻";
        cc2.id = "refresh";
        cc2.onclick = this.refreshPorts.bind(this);
        cell.appendChild(cc2);
      }
      {
        const cc = document.createElement("select");
        cc.id = "portbaud";
        const opts = [300, 600, 1200, 2400, 4800, 9600, 19200];
        let rate;
        for (rate of opts) {
          const option = document.createElement("option");
          option.value = rate;
          option.textContent = rate;
          if (rate == 19200) {
            option.selected = true;
          }
          cc.appendChild(option);
        }
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = this.connect.bind(this);
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      let readoutRow = tbody.insertRow();
      {
        this.readout_element = document.createElement("p");
        this.readout_element.textContent = "N\A volts";
        const cell = readoutRow.insertCell();
        cell.colSpan = 3;
        cell.appendChild(this.readout_element);
      }
    }
    this.container.append(orgtable);
    this.refreshPorts();
    return this.container
  }
}
class VSource6221A extends Instrument {
  constructor(name) {
    super(name);
    this.readout = { "amp": undefined ,
                     "freq": undefined,
					 "offs": undefined,
					 "on": false
                    };
    this.connected = false;
  }
  poll() {
    /*if (this.connected)
      this.port.write(":FETCH?\n");*/
  }
  parseLine(line) {
    console.log(this._name + " " + line);
    //this.readout = { "voltage": line };
    //this.readout_element.textContent = line + " Volts";
  }
  refreshPorts() {
    serialport.list(function (err, portl) {
      portl.forEach(function (port) {
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        this.serialRow.getElementsByTagName("select").portselect.appendChild(opt);
      }.bind(this)
      );
    }.bind(this));
  }
  writeErrorHandler(err) {
    if (err) {
      console.log(err);
    }
  }
  turnOn() {
	this.readoutRow.getElementsByTagName("button").on.textContent = "On";
	this.port.write("SOUR:WAVE:PMAR:STAT ON \n");
	this.port.write("SOUR:WAVE:PMAR 0 \n");
	this.port.write("SOUR:WAVE:PMAR:OLIN 1 \n");
	
	this.port.write("SOUR:WAVE:ARM \n");
	this.port.write("SOUR:WAVE:INIT \n");
	this.port.write("OUTP:STAT 1 \n");
	this.readout["on"] = true;
  }
  turnOff() {
	  this.readoutRow.getElementsByTagName("button").on.textContent = "Off";
	this.port.write("SOUR:WAVE:ABOR \n");
	this.port.write("OUTP:STAT 0 \n");
	this.readout["on"] = false;
  }
  setAmplitude(level){
	this.port.write("SOUR:WAVE:AMPL " + level.toString()+"\n");
	this.readout["amp"] = level;
  }
  setOffset(level){
	this.port.write("SOUR:WAVE:OFFS " + level.toString()+"\n");
	this.readout["offs"] = level;
  }
  setFreq(level){
	this.port.write("SOUR:WAVE:FREQ " + level.toString()+"\n");
	this.readout["freq"] = level;
  }

  connect() {
    if (!this.connected) {
      let select = this.serialRow.getElementsByTagName("select").portselect;
      let baud = this.serialRow.getElementsByTagName("select").portbaud;

      this.port = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
        function (err) {
          if (err) {
            return console.log('Error: ', err.message)
          }
          else {
            let parser = new Readline()
            this.port.pipe(parser)
            parser.on('data', (line => this.parseLine(line.replace(/(\r\n|\n|\r)/gm, ""))).bind(this));

            this.port.on('close', function (err) {
              this.connected = false;
              this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
              this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
              if (err) {
                console.log(err);
              }
            }.bind(this));

            //this.port.write(":CONF:VOLT:DC\n", this.writeErrorHandler.bind(this));//:CONFigure:VOLTage:DC
            //this.port.write(":INIT:CONT ON\n", this.writeErrorHandler.bind(this));//:INITiate:CONTinuous ON
            this.connected = true;
            this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
            this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
          }
        }.bind(this)
      );
    }
    else {
      this.port.close();
    }
  }
  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    {
      const row = thead.insertRow();
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.appendChild(nameplate);
    }
    const tbody = orgtable.createTBody();
    {
      this.serialRow = tbody.insertRow();
      {
        const cc = document.createElement("select");
        cc.id = "portselect";
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);

        const cc2 = document.createElement("button");
        cc2.textContent = "↻";
        cc2.id = "refresh";
        cc2.onclick = this.refreshPorts.bind(this);
        cell.appendChild(cc2);
      }
      {
        const cc = document.createElement("select");
        cc.id = "portbaud";
        const opts = [300, 600, 1200, 2400, 4800, 9600, 19200,38400,57600,115200];
        let rate;
        for (rate of opts) {
          const option = document.createElement("option");
          option.value = rate;
          option.textContent = rate;
          if (rate == 19200) {
            option.selected = true;
          }
          cc.appendChild(option);
        }
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = this.connect.bind(this);
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("div");
        cc.textContent = "Freq(Hz)";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "freq"
        cc2.max = 1e5;
        cc2.min = 1e-3;
        cc2.step = 1e-3;
        cc2.addEventListener("change", function () { this.setFreq(this.readoutRow.getElementsByTagName("input").freq.value); }.bind(this));

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("div");
        cc.textContent = "Offset(A)";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "offset"
        cc2.max = 0.105;
        cc2.min = -0.105;
        cc2.step = 100e-15;
        cc2.addEventListener("change", function () { this.setOffset(this.readoutRow.getElementsByTagName("input").offset.value); }.bind(this));

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
	  {
        const cc = document.createElement("div");
        cc.textContent = "Amplitude(A)";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "amp"
        cc2.max = 0.105;
        cc2.min = -0.105;
        cc2.step = 100e-15;
        cc2.addEventListener("change", function () { this.setAmplitude(this.readoutRow.getElementsByTagName("input").amp.value); }.bind(this));

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "On";
        cc.id = "on";
        cc.onclick = function () { if (this.readout["on"]) { this.turnOff(); } else { this.turnOn(); } }.bind(this);
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
    }
    this.container.append(orgtable);
    this.refreshPorts();
    return this.container
  }
}
class PowerHAP03_30D extends Instrument {
  constructor(name) {
    super(name);
    this.connected = false;
    this.readout = {
      "voltage": 0,
      "current": 0,
      "polarity": 1,
      "on": false
    };
  }

  parseLine(line) {
    console.log(this._name + " " + line);
  }
  refreshPorts() {
    serialport.list(function (err, portl) {
      portl.forEach(function (port) {
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        this.serialRow.getElementsByTagName("select").portselect.appendChild(opt);
      }.bind(this)
      );
    }.bind(this));
  }
  writeErrorHandler(err) {
    if (err) {
      console.log(err);
    }
  }
  connect() {
    if (!this.connected) {
      let select = this.serialRow.getElementsByTagName("select").portselect;
      let baud = this.serialRow.getElementsByTagName("select").portbaud;

      this.port = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
        function (err) {
          if (err) {
            return console.log('Error: ', err.message)
          }
          else {
            let parser = new ByteLength({ length: 1 })
            this.port.pipe(parser)
            parser.on('data', (line => this.parseLine(line).bind(this)));

            this.port.on('close', function (err) {
              this.connected = false;
              this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
              this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
              if (err) {
                console.log(err);
              }
            }.bind(this));
            this.rawWrite("off", 0);
            this.rawWrite("iset", 0);
            this.rawWrite("vset", 0);

            this.connected = true;
            this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
            this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
          }
        }.bind(this)
      );
    }
    else {
      this.port.close();
    }
  }
  updateText() {
    this.readoutRow.getElementsByTagName("input").amps.value = this.readout["current"];
    this.readoutRow.getElementsByTagName("input").volts.value = this.readout["voltage"];
    this.readoutRow.getElementsByTagName("button").on.textContent = this.readout["on"] ? "On" : "Off";
    if (this.readout["on"]) {
      this.readoutRow.getElementsByTagName("button").on.style.backgroundColor = "green";
    }
    else {
      this.readoutRow.getElementsByTagName("button").on.style.backgroundColor = "transparent";
    }
  }
  rawWrite(com, arg) {
    if (com == "iset") {
      if (Math.sign(this.readout["current"]) != Math.sign(arg)) {
        this.rawWrite("t");
      }
      this.readout["current"] = arg;
    }
    else if (com == "vset") {
      if (Math.sign(this.readout["voltage"]) != Math.sign(arg)) {
        this.rawWrite("t");
      }
      this.readout["voltage"] = arg;
    }
    else if (com == "+") {
      this.readout["polarity"] = 1;
    }
    else if (com == "-") {
      this.readout["polarity"] = -1;
    }
    else if (com == "t") {
      this.readout["polarity"] *= -1;
    }
    else if (com == "on") {
      this.readout["on"] = true;
    }
    else if (com == "off") {
      this.readout["on"] = false;
    }
    arg = Math.abs(arg);
    var addr = 0x01;
    var codes = {
      "off": 0x20,
      "on": 0x20,
      "vset": 0x21,
      "iset": 0x22,
      "+": 0x24,
      "-": 0x24,
      "t": 0x24
    };
    var lengths = {
      "off": 1,
      "on": 1,
      "vset": 2,
      "iset": 2,
      "+": 2,
      "-": 2,
      "t": 2
    };
    var msg = {
      "off": 0,
      "on": 1,
      "vset": arg * 100,
      "iset": arg * 100,
      "+": ((0 & 0xFF) << 8) | ((0xFF & 0)),
      "-": ((1 & 0xFF) << 8) | ((0xFF & 1)),
      "t": ((2 & 0xFF) << 8) | ((0xFF & 2)),
    };
    var hdr = new Uint8Array(lengths[com] + 5);
    hdr[0] = 0xAA;
    hdr[1] = addr;
    hdr[2] = codes[com];
    hdr[3] = lengths[com];
    for (var i = 4; i < lengths[com] + 4; i++) {
      hdr[i] = (msg[com] >> (8 * (i - 4))) & 0xFF;
    }
    hdr[lengths[com] + 4] = hdr.slice(1, lengths[com] + 4).reduce((a, b) => a + b, 0) & 0xFF
    this.port.write(hdr, this.writeErrorHandler.bind(this));
    updateText();
  }
  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    {
      const row = thead.insertRow();
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.appendChild(nameplate);
    }
    const tbody = orgtable.createTBody();
    {
      this.serialRow = tbody.insertRow();
      {
        const cc = document.createElement("select");
        cc.id = "portselect";
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);

        const cc2 = document.createElement("button");
        cc2.textContent = "↻";
        cc2.id = "refresh";
        cc2.onclick = this.refreshPorts.bind(this);
        cell.appendChild(cc2);
      }
      {
        const cc = document.createElement("select");
        cc.id = "portbaud";
        const opts = [300, 600, 1200, 2400, 4800, 9600, 19200];
        let rate;
        for (rate of opts) {
          const option = document.createElement("option");
          option.value = rate;
          option.textContent = rate;
          if (rate == 19200) {
            option.selected = true;
          }
          cc.appendChild(option);
        }
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = this.connect.bind(this);
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("div");
        cc.textContent = "volts";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "volts"
        cc2.max = 48;
        cc2.min = -48;
        cc2.step = 0.01;
        cc2.value = 0;
        cc2.addEventListener("change", function () { this.rawWrite("vset", this.readoutRow.getElementsByTagName("input").volts.value) }.bind(this));

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("div");
        cc.textContent = "amps";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "amps"
        cc2.max = 10;
        cc2.min = 0;
        cc2.step = 0.01;
        cc2.addEventListener("change", function () { this.rawWrite("iset", this.readoutRow.getElementsByTagName("input").amps.value) }.bind(this));

        cc2.value = 0;
        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "On";
        cc.id = "on";
        cc.onclick = function () { this.rawWrite(this.on ? "off" : "on") }.bind(this);
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
    }
    this.container.append(orgtable);
    this.refreshPorts();
    this.updateText();
    return this.container
  }
}
class RF845 extends Instrument {
  constructor(name) {
    super(name);
    this.readout = {
      "on": false,
      "freq": 5000000000,
      "power": 0
    };
    this.lastBtag = 1;
    this.connected = false;
  }

  connect() {
    if (!this.connected) {
      this.port = usb.findByIds(0x03eb, 0xafff);
      if (this.port == undefined) {
        alert("Could not find RF source");
        return;
      }
      else {
        this.port.open();
        this.connected = true;
        this.interface = this.port.interface(0);
        if (!navigator["userAgent"].toLowerCase().includes("windows")) {
          if (this.interface.isKernelDriverActive()) {
            this.interface.detachKernelDriver()
            console.log("Detached kernel driver for RF source")
          }
        }
        this.interface.claim();
        this.ask("*IDN?\n");
        this.serialRow.getElementsByTagName("Button").connect.textContent = "Disconnect";
      }
    }
    else {
      alert("Not implemented, close the program to disconnect");
      /*if (lockIntf.endpoints[1].pollActive)
        lockIntf.endpoints[1].stopPoll()
      lockIntf.release(true,function(err){console.log(err)});
      lockPort.close();
      lockPort = undefined;
      lockConnected = false;
      document.getElementById("connectLock").innerHTML = "Connect";*/
    }
  }
  
  ask(message){
	this.rawWrite(message);
	this.rawRead();
  }
  updateText() {
    this.readoutRow.getElementsByTagName("input").freq.value = this.readout["freq"];
    this.readoutRow.getElementsByTagName("input").power.value = this.readout["power"];
    this.readoutRow.getElementsByTagName("button").on.textContent = this.readout["on"] ? "On" : "Off";
    if (this.readout["on"]) {
      this.readoutRow.getElementsByTagName("button").on.style.backgroundColor = "green";
    }
    else {
      this.readoutRow.getElementsByTagName("button").on.style.backgroundColor = "transparent";
    }
  }
  rawRead() {
    if (!this.connected) {
      connectRF();
      if (!this.connected) {
        return;
      }
    }
    this.interface.endpoints[0].transfer(1024 * 1024, function (er, data) { if (er) console.log(er); if (data) console.log("in transfer complete: " + data) })
  }

  setFreq(arg) {
    this.rawWrite(":SOUR:FREQ " + Number.parseFloat(arg).toFixed(1) + "\n");
    this.readout["freq"] = arg;
    this.updateText();
  }
  setdBm(arg) {
    this.rawWrite(":SOUR:POW " + Number.parseFloat(arg).toFixed(1) + "\n");
    this.readout["power"] = arg;
    this.updateText();
  }
  turnOn() {
    this.rawWrite(":OUTP:STAT 1\n");
    this.readout["on"] = true;
    this.updateText();
  }
  turnOff() {
    this.rawWrite(":OUTP:STAT 0\n");
    this.readout["on"] = false;
    this.updateText();
  }
  rawWrite(message) {
    if (!this.connected) {
      connectRF();
      if (!this.connected) {
        return;
      }
    }
    var hdr = new Uint8Array(12 + message.length + ((4 - (message.length % 4)) % 4));
    hdr[0] = 1;
    hdr[1] = this.lastBtag;
    hdr[2] = ~(this.lastBtag & 0xFF);
    this.lastBtag = (this.lastBtag % 255) + 1;
    hdr[3] = 0;
    hdr[4] = message.length & 0xFF;
    hdr[5] = (message.length & 0xFF00) >> 4;
    hdr[6] = (message.length & 0xFF0000) >> 8;
    hdr[7] = (message.length & 0xFF000000) >> 12;
    hdr[8] = 1;
    hdr[9] = 0;
    hdr[10] = 0;
    hdr[11] = 0;
    for (var i = 0; i < message.length; i++) {
      hdr[i + 12] = message.charCodeAt(i);
    }
    this.interface.endpoints[1].transfer(hdr, function (er, data) { if (er) console.log(er); console.log("out transfer complete") })
  }
  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    {
      const row = thead.insertRow();
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.appendChild(nameplate);
    }
    const tbody = orgtable.createTBody();
    {
      this.serialRow = tbody.insertRow();
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = this.connect.bind(this);
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
        cell.colSpan = 3;
      }
      this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("div");
        cc.textContent = "Hz";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "freq"
        cc2.max = 26000000000;
        cc2.min = 0;
        cc2.step = 1;
        cc2.addEventListener("change", function () { this.setFreq(this.readoutRow.getElementsByTagName("input").freq.value); }.bind(this));

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("div");
        cc.textContent = "dBm";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "power"
        cc2.max = 20;
        cc2.min = -20;
        cc2.step = 1;
        cc2.addEventListener("change", function () { this.setdBm(this.readoutRow.getElementsByTagName("input").power.value); }.bind(this));

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "On";
        cc.id = "on";
        cc.onclick = function () { if (this.readout["on"]) { this.turnOff(); } else { this.turnOn(); } }.bind(this);
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
    }
    this.container.append(orgtable);
    this.updateText();
    return this.container
  }
}
class Lock7270 extends Instrument {
  constructor(name) {
    super(name);
    this.requests = [];
    this.readout = {
      "x1": undefined,
      "y1": undefined,
      "x2": undefined,
      "y2": undefined,
	  "mag1" : undefined,
	  "mag2" : undefined
    }
  }
  poll() {
    if (this.port != undefined) {
		if (this.channels.value == 2) {
			this.interface.endpoints[0].transfer("XY1.\0", this.errorReporter.bind(this));
			this.requests.push(1);
			this.interface.endpoints[0].transfer("XY2.\0", this.errorReporter.bind(this));
			this.requests.push(2);
		}
		else{
		  this.interface.endpoints[0].transfer("XY.\0", this.errorReporter.bind(this));
		  this.requests.push(1);
		}

      }
    }
  handleData(data) {
	if(data.length > 3){
    var req = this.requests.shift();
    if (req) {
      if (data[data.length - 3] == 0) {
        var parsed = String.fromCharCode.apply(String, data.slice(0, data.length - 3));
		parsed = parsed.split(",");
		var x = parsed[0].replace(/(\r\n|\n|\r)/gm, "");
		var y = parsed[1].replace(/(\r\n|\n|\r)/gm, "");
		if (req == 1) {
	      this.readout["x1"] = x;
		  this.readout["y1"] = y;
		  this.readout["mag1"] = Math.sqrt(x * x + y * y);
		  //this.readout["phase"] = 180 * Math.atan2(y, x) / 3.1415;
		}
		else {
		  this.readout["x2"] = x;
		  this.readout["y2"] = y;
		  this.readout["mag2"] = Math.sqrt(x * x + y * y);
		  //this.readout["phase2"] = 180 * Math.atan2(y, x) / 3.1415;
		}
		this.updateText();
      }
      else {
        console.log("Packet is incorrectly terminated");
      }
    }
    else {
      console.log("Unknown request type " + req);
      console.log(data)
    }
	}
	else console.log(data);
	
  }
  updateText() {
    this.readoutRow.getElementsByTagName("p").mag.textContent = this.readout["x1"] + " volts";
    this.readoutRow.getElementsByTagName("p").phase.textContent = this.readout["y1"] + " degrees";
    this.readoutRow2.getElementsByTagName("p").mag.textContent = this.readout["x2"] + " volts";
    this.readoutRow2.getElementsByTagName("p").phase.textContent = this.readout["y2"] + " degrees";
  }
  errorReporter(error) {
    if (error)
      alert(this._name + " " + error);
  }
  connect() {
    if (!this.connected) {
      this.port = usb.findByIds(0x0a2d, 0x001b);
      if (this.port == undefined) {
        alert("Could not find lock-in");
        return;
      }
      else {
        this.port.open();
        this.connected = true;
        this.interface = this.port.interface(0);

        if (!navigator["userAgent"].toLowerCase().includes("windows")) {
          if (this.interface.isKernelDriverActive()) {
            this.interface.detachKernelDriver()
            console.log("Detached kernel driver for lock-in")
          }
        }
        this.interface.claim();
        this.interface.endpoints[1].on('data', this.handleData.bind(this));
        this.interface.endpoints[1].on('error', this.errorReporter.bind(this));
        this.interface.endpoints[1].startPoll();
        this.serialRow.getElementsByTagName("button").connect.textContent = "Disconnect";
      }
    }
    else {
      alert("Not implemented, close the program to disconnect");
      /*if (lockIntf.endpoints[1].pollActive)
        lockIntf.endpoints[1].stopPoll()
      lockIntf.release(true,function(err){console.log(err)});
      lockPort.close();
      lockPort = undefined;
      lockConnected = false;
      document.getElementById("connectLock").innerHTML = "Connect";*/
    }
  }

  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    {
      const row = thead.insertRow();
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 2;
      cell.appendChild(nameplate);

      const cc0 = document.createElement("div");
      const cc = document.createElement("div");
      cc.textContent = "channels";
      this.channels = document.createElement("input");
      this.channels.type = "number"
      this.channels.max = 2;
      this.channels.min = 1;
      this.channels.step = 1;
      this.channels.value = 1;

      this.channels.style.display = "inline-block";
      cc.style.display = "inline-block";
      const cell2 = row.insertCell();
      cell2.colSpan = 1;
      cc0.appendChild(this.channels);
      cc0.appendChild(cc);
      cell2.appendChild(cc0);
    }
    const tbody = orgtable.createTBody();
    {
      this.serialRow = tbody.insertRow();
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = this.connect.bind(this);
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
        cell.colSpan = 3;
      }      
	  this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("p");
        cc.textContent = "Channel 1";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "mag";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "phase";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      this.readoutRow2 = tbody.insertRow();
      {
        const cc = document.createElement("p");
        cc.textContent = "Channel 2";
        const cell = this.readoutRow2.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "mag";
        const cell = this.readoutRow2.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "phase";
        const cell = this.readoutRow2.insertCell();
        cell.appendChild(cc);
      }

    }
    this.container.append(orgtable);
    this.updateText();
    return this.container
  }
}
class Lock7265 extends Instrument {
  constructor(name) {
    super(name);
    this.requests = [];
    this.readout = {
      "mag": undefined,
      "phase": undefined,
      "mag2": undefined,
      "phase2": undefined
    }
  }
  poll() {
    if (this.port != undefined) {
      this.port.write("XY\n");
      this.requests.push(1);
      if (this.channels.value == 2) {
        this.port.write("XY2\n");
        this.requests.push(2);
      }
    }
  }
  updateText() {
    this.readoutRow.getElementsByTagName("p").mag.textContent = this.readout["mag"] + " volts";
    this.readoutRow.getElementsByTagName("p").phase.textContent = this.readout["phase"] + " degrees";
    this.readoutRow2.getElementsByTagName("p").mag.textContent = this.readout["mag2"] + " volts";
    this.readoutRow2.getElementsByTagName("p").phase.textContent = this.readout["phase2"] + " degrees";
  }
  parseLine(parsed) {
    var req = this.requests.shift();
    parsed = parsed.split(",");
    var x = parsed[0].replace(/(\r\n|\n|\r)/gm, "");
    var y = parsed[1].replace(/(\r\n|\n|\r)/gm, "");
    if (req == 1) {
      this.readout["mag"] = Math.sqrt(x * x + y * y);
      this.readout["phase"] = 180 * Math.atan2(y, x) / 3.1415;
    }
    else {
      this.readout["mag2"] = Math.sqrt(x * x + y * y);
      this.readout["phase2"] = 180 * Math.atan2(y, x) / 3.1415;
    }
    this.updateText();
  }
  refreshPorts() {
    serialport.list(function (err, portl) {
      portl.forEach(function (port) {
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        this.serialRow.getElementsByTagName("select").portselect.appendChild(opt);
      }.bind(this)
      );
    }.bind(this));
  }
  writeErrorHandler(err) {
    if (err) {
      console.log(err);
    }
  }
  connect() {
    if (!this.connected) {
      let select = this.serialRow.getElementsByTagName("select").portselect;
      let baud = this.serialRow.getElementsByTagName("select").portbaud;

      this.port = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
        function (err) {
          if (err) {
            return console.log('Error: ', err.message)
          }
          else {
            let parser = new Readline()
            this.port.pipe(parser)
            //parser.on('data', (line => this.parseLine(line.replace(/(\r\n|\n|\r)/gm, ""))).bind(this));
			parser.on('data', (line => console.log(line)));

            this.port.on('close', function (err) {
              this.connected = false;
              this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
              this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
              if (err) {
                console.log(err);
              }
            }.bind(this));

            this.connected = true;
            this.serialRow.getElementsByTagName("button").refresh.disabled = this.connected;
            this.serialRow.getElementsByTagName("button").connect.textContent = this.connected ? "Disconnect" : "Connect";
          }
        }.bind(this)
      );
    }
    else {
      this.port.close();
    }
  }
  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    const row = thead.insertRow();

    {
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 2;
      cell.appendChild(nameplate);

      const cc0 = document.createElement("div");
      const cc = document.createElement("div");
      cc.textContent = "channels";
      this.channels = document.createElement("input");
      this.channels.type = "number"
      this.channels.max = 2;
      this.channels.min = 1;
      this.channels.step = 1;
      this.channels.value = 1;

      this.channels.style.display = "inline-block";
      cc.style.display = "inline-block";
      const cell2 = row.insertCell();
      cell2.colSpan = 1;
      cc0.appendChild(this.channels);
      cc0.appendChild(cc);
      cell2.appendChild(cc0);
    }
    const tbody = orgtable.createTBody();
    {
      this.serialRow = tbody.insertRow();
      {
        const cc = document.createElement("select");
        cc.id = "portselect";
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);

        const cc2 = document.createElement("button");
        cc2.textContent = "↻";
        cc2.id = "refresh";
        cc2.onclick = this.refreshPorts.bind(this);
        cell.appendChild(cc2);
      }
      {
        const cc = document.createElement("select");
        cc.id = "portbaud";
        const opts = [300, 600, 1200, 2400, 4800, 9600, 19200];
        let rate;
        for (rate of opts) {
          const option = document.createElement("option");
          option.value = rate;
          option.textContent = rate;
          if (rate == 19200) {
            option.selected = true;
          }
          cc.appendChild(option);
        }
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = this.connect.bind(this);
        const cell = this.serialRow.insertCell();
        cell.appendChild(cc);
      }
      this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("p");
        cc.textContent = "Channel 1";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "mag";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "phase";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      this.readoutRow2 = tbody.insertRow();
      {
        const cc = document.createElement("p");
        cc.textContent = "Channel 2";
        const cell = this.readoutRow2.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "mag";
        const cell = this.readoutRow2.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "phase";
        const cell = this.readoutRow2.insertCell();
        cell.appendChild(cc);
      }
    }
    this.container.append(orgtable);
    this.refreshPorts();
    this.updateText();
    return this.container
  }
}
class DynaCool extends Instrument {
  static setChamberCodes = {
    255: "",
    0: "Seal",
    1: "Purge/Seal",
    2: "Vent/Seal",
    3: "Pump Continuous",
    4: "Vent Continuous",
    5: "High Vacuum"
  }
  static getChamberCodes = {
    255: "N/A",
    0: "Unknown",
    1: "Purged/Sealed",
    2: "Vented/Sealed",
    3: "Sealed(Condition Unknown)",
    4: "Purging",
    5: "Venting",
    6: "Pre-high Vacuum",
    7: "High Vacuum",
    8: "Pumping continuously",
    9: "Flooding continuously"
  }
  static getFieldCodes = {
    255: "N/A",
    0: "Unknown",
    1: "Standby",
    2: "Switch Warming",
    3: "Switch Cooling",
    4: "Holding in driven mode",
    5: "Iterating",
    6: "Charging",
    8: "Current Error",
    15: "General failure in field control"
  }
  static setFieldCodes = {
    0: "Linear",
    1: "No overshoot",
    2: "Oscillate"
  }
  static getTempCodes = {
    255: "N/A",
    0: "Unknown",
    1: "Stable",
    2: "Tracking",
    5: "Near",
    6: "Chasing",
    7: "Filling/emptying reservoir",
    10: "Standby",
    15: "General failure in temp control"
  }
  static setTempCodes = {
    0: "Fast settle",
    1: "No overshoot"
  }
  constructor(name) {
    super(name);

    this.readout = {
      "temp": 0,
      "tempCode": 255,
      "field": 0,
      "fieldCode": 255,
      "chamberCode": 255
    }
    this.ready = false;
  }
  connect(host, port) {
    if (!this.ready) {

      this.socket = net.createConnection(port, host, function () {
        this.ready = true;
        this.addrRow.getElementsByTagName("button").connect.textContent = "Disconnect";
      }.bind(this));
      console.log(address, port);
      this.socket.on('data', this.parse.bind(this));
      this.socket.on('end', this.socketClose);

    }
    else {
      this.addrRow.getElementsByTagName("button").connect.textContent = "Connect";
      this.socket.write("close\n");
    }
  }
  poll() {
    if (this.ready) {
	  this.socket.write("ALL?\n");
    }
  }
  parse(data) {
    data = data.toString().replace(" ","").split(",");
    /*if (req == "t?") {
      err = data[0];
      this.readout["temp"] = data[1];
      this.readout["tempCode"] = data[2];
    }
    else if (req == "f?") {
      err = data[0];
      this.readout["field"] = data[1];
      this.readout["fieldCode"] = data[2];
    }
    else if (req == "c?") {
      err = data[0];
      this.readout["chamberCode"] = data[1];
    }*/
	if (data[0] == "ALL?"){
	  if (data[1] != 0) console.log("TEMP query error");
      this.readout["temp"] = parseFloat(data[2]);
      this.readout["tempCode"] = parseInt(data[3]);
	  if (data[4] != 0) console.log("FIELD query error");
      this.readout["field"] = parseFloat(data[5]);
      this.readout["fieldCode"] = parseInt(data[6]);
	  if (data[7] != 0) console.log("CHAMBER query error");
      this.readout["chamberCode"] = parseInt(data[8]);
	}
    else if (data[0] == "TEMP") {
	  if(data[1] != "0") console.log("TEMP set error");
    }
    else if (data[0] == "FIELD") {
      if(data[1] != "0") console.log("FIELD set error");
    }
    else if (data[0] == "CHAMBER") {
      if(data[1] != "0") console.log("CHAMBER set error");
    }
    else {
      console.log("Unknown PPMS response");
      console.log(data);
    }
	this.updateText();
  }
  socketClose() {
    this.ready = false;
    this.addrRow.getElementsByTagName("button").connect.textContent = "Connect";
  }
  setField(field, rate, code) {
    if ((field.toString() != "") && (rate != "") && (code != undefined)) {
      this.socket.write("FIELD " + field + "," + rate + "," + code + ",1\n");
    }
  }
  setTemp(temp, rate, code) {
    if ((temp.toString() != "") && (rate != "") && (code != undefined)) {
      this.socket.write("TEMP " + temp + "," + rate + "," + code + "\n");
    }
  }
  setChamber(code) {
    if (code != 255) {
      this.socket.write("CHAMBER " + code + "\n");
    }
  }
  updateText() {
    this.readoutRow.getElementsByTagName("p").fieldCodeReadout.textContent = DynaCool.getFieldCodes[this.readout["fieldCode"]];
    this.readoutRow.getElementsByTagName("p").tempCodeReadout.textContent = DynaCool.getTempCodes[this.readout["tempCode"]];
    this.readoutRow.getElementsByTagName("p").chamberCodeReadout.textContent = DynaCool.getChamberCodes[this.readout["chamberCode"]];

    this.readoutRow.getElementsByTagName("p").fieldReadout.textContent = ((this.readout["field"] != undefined) ? this.readout["field"] : "N/A") + " Oe";
    this.readoutRow.getElementsByTagName("p").tempReadout.textContent = ((this.readout["temp"] != undefined) ? this.readout["temp"] : "N/A") + " K";
  }
  get html() {
    if (typeof this.container != "undefined") {
      return this.container
    }
    this.container = document.createElement("div");
    this.container.className = "instrument";

    const orgtable = document.createElement("table");
    const thead = orgtable.createTHead();
    {
      const row = thead.insertRow();
      const nameplate = document.createElement("b");
      nameplate.textContent = this._name;
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.appendChild(nameplate);
    }
    const tbody = orgtable.createTBody();
    {
      this.addrRow = tbody.insertRow();
      {
        const cc = document.createElement("input");
        cc.type = "text";
        cc.id = "address";
        cc.value = "localhost";
        const cell = this.addrRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("input");
        cc.type = "number"
        cc.min = 0;
        cc.max = 65535;
        cc.step = 1;
        cc.id = "port";
        cc.value = 5000;

        const cell = this.addrRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("button");
        cc.textContent = "Connect";
        cc.id = "connect";
        cc.onclick = function () { this.connect(this.addrRow.getElementsByTagName("input").address.value, this.addrRow.getElementsByTagName("input").port.value) }.bind(this);
        const cell = this.addrRow.insertCell();
        cell.appendChild(cc);
      }
      this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("p");
        cc.textContent = "N\A Oe";
        cc.id = "fieldReadout";
        const cc2 = document.createElement("p");
        cc2.id = "fieldCodeReadout";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc);
        cell.appendChild(cc2);
      }
      {
        const cc = document.createElement("p");
        cc.textContent = "N\A K";
        cc.id = "tempReadout";
        const cc2 = document.createElement("p");
        cc2.id = "tempCodeReadout";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc);
        cell.appendChild(cc2);

      }
      {
        const cc = document.createElement("p");
        cc.id = "chamberCodeReadout";
        const cell = this.readoutRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc);

      }
      this.controlRow = tbody.insertRow();
      {
        const cc = document.createElement("div");
        cc.textContent = " K";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "temp"
        cc2.step = 0.1;

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.controlRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);

        const cc3 = document.createElement("button");
        cc3.textContent = "Send";
        cc3.onclick = function () {
          this.setTemp(
            this.controlRow.getElementsByTagName("input").temp.value,
            this.rateRow.getElementsByTagName("input").temp.value,
            this.rateRow.getElementsByTagName("select").tempApproach.value
          )
        }.bind(this);
        cell.appendChild(cc3);
      }
      {
        const cc = document.createElement("div");
        cc.textContent = " Oe";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "field"
        cc2.step = 1;

        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.controlRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);

        const cc3 = document.createElement("button");
        cc3.textContent = "Send";
        cc3.onclick = function () {
          this.setField(
            this.controlRow.getElementsByTagName("input").field.value,
            this.rateRow.getElementsByTagName("input").field.value,
            this.rateRow.getElementsByTagName("select").fieldApproach.value
          )
        }.bind(this);
        cell.appendChild(cc3);
      }
      {
        const cc = document.createElement("select");
        cc.id = "chamberStatus";
        for (const [key, value] of Object.entries(DynaCool.setChamberCodes)) {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = value;
          if (key == 255) option.selected = true;
          cc.appendChild(option);
        }
        cc.addEventListener("change", function () { this.setChamber(this.controlRow.getElementsByTagName("select").chamberStatus.value); }.bind(this));
        const cell = this.controlRow.insertCell();
        cell.appendChild(cc);
      }
      this.rateRow = tbody.insertRow();
      {
        const cc = document.createElement("div");
        cc.textContent = " K/s";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "temp"
        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.rateRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);

        const cc3 = document.createElement("select");
        cc3.id = "tempApproach";
        for (const [key, value] of Object.entries(DynaCool.setTempCodes)) {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = value;
          cc3.appendChild(option);
        }
        cell.appendChild(cc3);
      }
      {
        const cc = document.createElement("div");
        cc.textContent = " Oe/s";
        const cc2 = document.createElement("input");
        cc2.type = "number"
        cc2.id = "field"
        cc2.style.display = "inline-block";
        cc.style.display = "inline-block";
        const cell = this.rateRow.insertCell();
        cell.colSpan = 1;
        cell.appendChild(cc2);
        cell.appendChild(cc);

        const cc3 = document.createElement("select");
        cc3.id = "fieldApproach";
        for (const [key, value] of Object.entries(DynaCool.setFieldCodes)) {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = value;
          cc3.appendChild(option);
        }
        cell.appendChild(cc3);
      }
    }
    this.container.append(orgtable);
    this.updateText();
    return this.container
  }
}
function DisableOptions() {
  for (const each of loggers.getElementsByTagName("input")) {
    if (each.checked) {
      yaxis.getElementsByTagName("input")[each.id].disabled = false;
      xaxis.getElementsByTagName("option")[each.id].disabled = false;
    }
    else {
      yaxis.getElementsByTagName("input")[each.id].disabled = true;
      xaxis.getElementsByTagName("option")[each.id].disabled = true;
      xaxis.getElementsByTagName("option")[each.id].selected = false;
    }
  }
  yaxis.getElementsByTagName("input")[xaxis.getElementsByTagName("option")[xaxis.selectedIndex].id].disabled = true;
  yaxis.getElementsByTagName("input")[xaxis.getElementsByTagName("option")[xaxis.selectedIndex].id].checked = false;
}
function UpdatePlot() {
  let logLines = [];
  let plotLines = [xaxis.selectedIndex];
  let i = 0;
  for (const each of loggers.getElementsByTagName("input")) {
    if (each.checked) {
      logLines.push(i);
    }
    i += 1;
  }
  i = 0;
  for (const each of yaxis.getElementsByTagName("input")) {
    if (each.checked) {
      plotLines.push(i);
    }
    i += 1;
  }
  let lineIndexes = [];
  for (const each of plotLines) {
    i = 0;
    for (const each2 of logLines) {
      if (each == each2) {
        lineIndexes.push(i);
        break;
      }
      i += 1;
    }
  }
  let curves = []
  for (const each of lineIndexes){
    curves.push(logs.map(
      function(datum){
        return datum[each];
      }));
  }
  let x = curves.splice(0,1)[0];
  logLines.splice(0,1);
  var data = [];
  i = 0;
  for (const each of curves) {
    data.push({
      x: x,
      y: each,
      type: 'scatter',
      name: loggers.getElementsByTagName("input")[logLines[i]].textContent
    });
    i += 1;
  }
  Plotly.newPlot('PlotDiv', data);
}
function SaveLogs(fname) {
  fs.open(fname, 'w', (err, fd) => {
    if (err) throw err;
    for (const log of logs) {
      fs.writeFileSync(fd, log + "\n");
    }
    fs.close(fd, (err) => {
      if (err) throw err;
    });
  });
}

let xaxis = document.createElement("select");
let yaxis = document.createElement("ul");
yaxis.style = "list-style: none; padding-inline-start:10px;"
let instruments = [new TimeKeeper("tk"), new NVmeter2182A("nv"), new RF845("rf"), new Lock7270("lockin"), new DynaCool("ppms"), new VSource6221A("6221")];
for (const each of instruments) {
  document.body.appendChild(each.html);
  for (const [key, value] of Object.entries(each.readout)) {
    const cc = document.createElement("option");
    cc.textContent = each._name + " " + key;
    cc.id = each._name + "#" + key;
    xaxis.appendChild(cc);
    xaxis.onchange = DisableOptions;
    const cc1 = document.createElement("li");
    const cc2 = document.createElement("label");
    cc2.for = each._name + "#" + key;
    cc2.textContent = each._name + " " + key;

    const cc3 = document.createElement("input");
    cc3.type = "checkbox";
    cc3.id = each._name + "#" + key;
    cc1.appendChild(cc3);
    cc1.appendChild(cc2);
    yaxis.appendChild(cc1);
  }
}
let loggers = yaxis.cloneNode(true);
for (const each of loggers.getElementsByTagName("input")) {
  each.onclick = DisableOptions;
}
const orgtable = document.createElement("table");
{
  const row = orgtable.insertRow();
  {
    const cell = row.insertCell();
    cell.textContent = "x axis";
    cell.style = "font-weight: bold;";
  }
  {
    const cell = row.insertCell();
    cell.textContent = "y axis";
    cell.style = "font-weight: bold;";
    const plot = document.createElement("button");
    plot.textContent = "Update Plot";
    plot.onclick = UpdatePlot;
    cell.appendChild(plot);
  }
  {
    const cell = row.insertCell();
    cell.textContent = "logged data";
    cell.style = "font-weight: bold;";
    const startB = document.createElement("button");
    startB.textContent = "Start logging";
    startB.id = "startloggingbutton"
    startB.onclick = function () {
      logging = !logging;
      document.getElementById('startloggingbutton').textContent = (!logging ? 'Start' : 'Stop') + ' logging';
      for (const each of loggers.getElementsByTagName("input")) {
        each.disabled = logging;
      }
    };

    const resetB = document.createElement("button");
    resetB.textContent = "Reset Logs";
    resetB.onclick = function () { logs = []; };
    const saveB = document.createElement("button");
    saveB.textContent = "Save Logs";
    saveB.onclick = function () { SaveLogs(dialog.showSaveDialogSync("Log save location")); };

    cell.appendChild(startB);
    cell.appendChild(resetB);
    cell.appendChild(saveB);
  }
}
{
  const row = orgtable.insertRow();
  {
    const cell = row.insertCell();
    cell.appendChild(xaxis);
  }
  {
    const cell = row.insertCell();
    cell.appendChild(yaxis);
  }
  {
    const cell = row.insertCell();

    cell.appendChild(loggers);
  }
}

document.body.appendChild(orgtable);
function poller() {
  if (logging) {
    lastLog = [];
    for (const each of loggers.getElementsByTagName("input")) {
      if (each.checked) {
        let [name, element] = each.id.split("#");
        for (const each of instruments) {
          if (each._name == name) {
            lastLog.push(each.readout[element]);
            break;
          }
        }
      }
    }
    logs.push(lastLog);
  }
  for (const each of instruments) {
    each.poll();
  }
  setTimeout(poller, 200);
}
{
  const plotdiv = document.createElement("div");
  plotdiv.id = "PlotDiv";
  document.body.appendChild(plotdiv);
}
const codearea = document.createElement("TEXTAREA");
{
  const codediv = document.createElement("div");
  const runButton = document.createElement("button");
  runButton.textContent = "Run code";
  runButton.onclick = function(){new AsyncFunction(codearea.value)()};
  codediv.appendChild(codearea);
  codediv.appendChild(runButton);
  document.body.appendChild(codediv);
}
poller();
DisableOptions();
