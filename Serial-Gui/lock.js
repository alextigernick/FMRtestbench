const Instrument = require("./instrument.js");
const VisaSession = require("./visa.js");
const visa = require('./ni-visa/ni-visa.js');
const visacon = require('./ni-visa/ni-visa-constants');
const debug = require("debug")("lockin");
class Lock7270 extends Instrument {
  constructor(name) {
    super(name);
    this.requests = [];
    this.readout = {
      "x1": undefined,
      "y1": undefined,
      "x2": undefined,
      "y2": undefined,
      "mag1": undefined,
      "mag2": undefined,
      "status" : undefined,
      "overload" : undefined
    }
  }
  poll() {
    if (this.inst != undefined) {
      this.readout["status"] = 0;
      this.readout["overload"] = 0;
      if (this.channels.value == 2) {
          this.handleData(visa.vhQuery(this.inst, "XY1.\0"), 1);
          this.handleData(visa.vhQuery(this.inst, "XY2.\0"), 2);
      }
      else {
        this.handleData(visa.vhQuery(this.inst, "XY.\0"), 1);
      }

    }
  }
  handleData(data, req) {
    if (data.length > 3) {
      if (data.charCodeAt(data.length-3) == 0) {
        this.readout["status"] |= data.charCodeAt(data.length-2);
        this.readout["overload"] |= data.charCodeAt(data.length-1);
        var parsed = data.slice(0, data.length - 3);
        parsed = parsed.split(",");
        var x = parsed[0].replace(/(\r\n|\n|\r)/gm, "");
        var y = parsed[1].replace(/(\r\n|\n|\r)/gm, "");
        if (req == 1) {
          this.readout["x1"] = x;
          this.readout["y1"] = y;
          this.readout["mag1"] = Math.sqrt(x * x + y * y);
          this.readout["new1"] = true;
          //this.readout["phase"] = 180 * Math.atan2(y, x) / 3.1415;
        }
        else {
          this.readout["x2"] = x;
          this.readout["y2"] = y;
          this.readout["mag2"] = Math.sqrt(x * x + y * y);
          this.readout["new2"] = true;
          //this.readout["phase2"] = 180 * Math.atan2(y, x) / 3.1415;
        }
        //var status = data.slice(data.length-2,data.length-1);
        //var overload = data.slice(data.length-1,data.length);
        this.updateText();
      }
      else {
        console.log("Packet is incorrectly terminated");
      }
    }
    else console.log(data);
  }
  updateText() {
    this.readoutRow.getElementsByTagName("p").mag.textContent = this.readout["x1"] + " volts";
    this.readoutRow.getElementsByTagName("p").phase.textContent = this.readout["y1"] + " volts";
    this.readoutRow2.getElementsByTagName("p").mag.textContent = this.readout["x2"] + " volts";
    this.readoutRow2.getElementsByTagName("p").phase.textContent = this.readout["y2"] + " volts";
  }
  connect() {
    if (!this.inst) {
      let vi;
      let resp;
      let status;
      visa.vhListResources(VisaSession).some(address => {
        [status, vi] = visa.viOpen(VisaSession, address);
        resp = visa.vhQuery(vi, 'ID\0');
        debug("Address " + address + " -> " + resp.trim());
        if (resp.match(/7270/)) {
          this.inst = vi;
          debug(`Using the first 7270 found at ${address}`);
          return true;
        }
        visa.viClose(vi);
        return false;
      });
      if (!this.inst) {
        throw new Error('No device found');
      }
      this.serialRow.getElementsByTagName("button").connect.textContent = "Disconnect";
    }
    else {
      visa.viClose(this.inst);
      this.inst = undefined;
      this.serialRow.getElementsByTagName("button").connect.textContent = "Connect";
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
module.exports = Lock7270;