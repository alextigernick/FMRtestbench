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
      if (this.channels.value != 0) {
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
      }
      var parsed = data;
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
    else console.log(data);
  }
  rawWrite(message){
    if (this.inst != undefined) {
      visa.viWrite(this.inst,message +"\0");
    }
    else{
      console.log(message);
    }
  }
  setSens(chan, value){
    console.log(chan);
    console.log(value);
    if (this.channels.value == 0){
      if (chan == 1){
        if (value == "AUTO"){
          this.rawWrite("AS");
        }
        else{
          this.rawWrite("SEN "+value);
        }
      }
    }
    else{
      if (value == "AUTO"){
        this.rawWrite("AS"+chan);
      }
      else{
        this.rawWrite("SEN"+chan+" "+value);
      }
    }
  }
  setRef(chan, value){
    console.log(chan);
    console.log(value);
    if (this.channels.value != 2){
      if (chan == 1){
          this.rawWrite("IE "+value);
      }
    }
    else{
        this.rawWrite("IE"+chan +" "+value);
    }
  }
  updateText() {
    this.readoutRow.getElementsByTagName("p").mag.textContent = this.readout["x1"] + " volts";
    this.readoutRow.getElementsByTagName("p").phase.textContent = this.readout["y1"] + " volts";
    this.readoutRow2.getElementsByTagName("p").mag.textContent = this.readout["x2"] + " volts";
    this.readoutRow2.getElementsByTagName("p").phase.textContent = this.readout["y2"] + " volts";
  }
  refresh() {
    visa.vhListResources(VisaSession).some(address => {
      var opt = document.createElement('option');
      opt.value = address;
      opt.innerHTML = address;
      this.serialRow.getElementsByTagName("select").portselect.appendChild(opt);
    })
  }
  connect() {
    if (!this.inst) {
      let status;
      [status,this.inst] = visa.viOpen(VisaSession,this.serialRow.getElementsByTagName("select").portselect.value);
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


      
      this.channels = document.createElement("select");
      var opts = {
        "0":"Single/Virtual Reference",
        "1":"Dual Harmonic mode",
        "2":"Dual Reference mode"
      }
      for (var option in opts){
        var opt = document.createElement('option');
        opt.value = option;
        opt.innerHTML = opts[option];
        this.channels.appendChild(opt);
      }
      const cell2 = row.insertCell();
      this.channels.onchange = function(){this.rawWrite("REFMODE "+this.channels.value)}.bind(this);
      cell2.appendChild(this.channels);
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
        cc2.onclick = this.refresh.bind(this);
        cell.appendChild(cc2);
      }
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
      {
        var cc = document.createElement("select");
        cc.id = "sens";
        var opts = {
          "1":"2 nV",
          "2":"5 nV",
          "3":"10 nV",
          "4":"20 nV",
          "5":"50 nV",
          "6":"100 nV",
          "7":"200 nV",
          "8":"500 nV",
          "9":"1 uV",
          "10":"2 uV",
          "11":"5 uV",
          "12":"10 uV",
          "13":"20 uV",
          "14":"50 uV",
          "15":"100u V",
          "16":"200 uV",
          "17":"500 uV",
          "18":"1 mV",
          "19":"2 mV",
          "20":"5 mV",
          "21":"10 mV",
          "22":"20 mV",
          "23":"50 mV",
          "24":"100 mV",
          "25":"200 mV",
          "26":"500 mV",
          "27":"1 V",
          "AUTO":"AUTO"
        }
        for (var option in opts){
          var opt = document.createElement('option');
          opt.value = option;
          opt.innerHTML = opts[option];
          cc.appendChild(opt);
        }
        const cell = this.readoutRow.insertCell();
        cc.onchange = function(){this.setSens(1,this.readoutRow.getElementsByTagName("select").sens.options[this.readoutRow.getElementsByTagName("select").sens.selectedIndex].value)}.bind(this);
        cell.appendChild(cc);
      }
      {
        var cc = document.createElement("select");
        cc.id = "ref";
        var opts = {
          "0":"Internal",
          "1":"External Rear Panel",
          "2":"External Front Panel"
        }
        for (var option in opts){
          var opt = document.createElement('option');
          opt.value = option;
          opt.innerHTML = opts[option];
          cc.appendChild(opt);
        }
        const cell = this.readoutRow.insertCell();
        cc.onchange = function(){this.setRef(1,this.readoutRow.getElementsByTagName("select").ref.options[this.readoutRow.getElementsByTagName("select").ref.selectedIndex].value)}.bind(this);
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
      {
        var cc = document.createElement("select");
        cc.id = "sens";
        var opts = {
          "1":"2 nV",
          "2":"5 nV",
          "3":"10 nV",
          "4":"20 nV",
          "5":"50 nV",
          "6":"100 nV",
          "7":"200 nV",
          "8":"500 nV",
          "9":"1 uV",
          "10":"2 uV",
          "11":"5 uV",
          "12":"10 uV",
          "13":"20 uV",
          "14":"50 uV",
          "15":"100u V",
          "16":"200 uV",
          "17":"500 uV",
          "18":"1 mV",
          "19":"2 mV",
          "20":"5 mV",
          "21":"10 mV",
          "22":"20 mV",
          "23":"50 mV",
          "24":"100 mV",
          "25":"200 mV",
          "26":"500 mV",
          "27":"1 V",
          "AUTO":"AUTO"
        }
        for (var option in opts){
          var opt = document.createElement('option');
          opt.value = option;
          opt.innerHTML = opts[option];
          cc.appendChild(opt);
        }
        const cell = this.readoutRow2.insertCell();
        cc.onchange = function(){this.setSens(2,this.readoutRow.getElementsByTagName("select").sens.options[this.readoutRow.getElementsByTagName("select").sens.selectedIndex].value)}.bind(this);
        cell.appendChild(cc);
      }
      {
        var cc = document.createElement("select");
        cc.id = "ref";
        var opts = {
          "0":"Internal",
          "1":"External Rear Panel",
          "2":"External Front Panel"
        }
        for (var option in opts){
          var opt = document.createElement('option');
          opt.value = option;
          opt.innerHTML = opts[option];
          cc.appendChild(opt);
        }
        const cell = this.readoutRow2.insertCell();
        cc.onchange = function(){this.setRef(2,this.readoutRow2.getElementsByTagName("select").ref.options[this.readoutRow2.getElementsByTagName("select").ref.selectedIndex].value)}.bind(this);
        cell.appendChild(cc);
      }

    }
    this.container.append(orgtable);
    this.updateText();
    return this.container
  }
}
module.exports = Lock7270;