const Instrument = require("./instrument.js");
const VisaSession = require("./visa.js");
const visa = require('./ni-visa/ni-visa.js');
class Kieth2400 extends Instrument {
  constructor(name) {
    super(name);
    this.requests = [];
    this.readout = {
      "on" : undefined,
      "volt" : undefined,
      "curr" : undefined
    }
  }
  poll() {
    if (this.inst) {
      if(this.readout["on"])
      this.handleData(visa.vhQuery(this.inst,":MEAS?"));
    }
  }
  rawWrite(message) {
    if (this.inst) {
      visa.viWrite(this.inst,message);
    }
  }
  setVoltage(voltage,compliance){
    this.rawWrite("*RST");
    this.rawWrite(":SOUR:FUNC VOLT");
    this.rawWrite(":SOUR:VOLT:MODE FIXED");
    this.rawWrite(":SOUR:VOLT:RANG:AUTO ON");
    this.rawWrite(":SOUR:VOLT:LEV "+voltage);
    this.rawWrite(":SOUR:CLE:AUTO OFF")
    this.rawWrite(':SENS:FUNC "CURR"');
    this.rawWrite(":SENS:CURR:PROT "+compliance);
    this.rawWrite(":SENS:CURR:RANG:AUTO ON");
    this.rawWrite(":FORM:ELEM CURR");
    this.readout["volt"] = voltage;
    this.updateText();
  }
  turnOn(){
    this.rawWrite(":OUTP ON");
    this.readout["on"] = true;
    this.updateText();
  }
  turnOff(){
    this.rawWrite(":OUTP OFF");
    this.readout["on"] = false;
    this.updateText();

  }
  handleData(data) {
    this.readout["curr"] = data.trim();
    this.updateText();
  }
  updateText() {
    this.readoutRow.getElementsByTagName("p").volt.textContent = this.readout["volt"] + " volts";
    this.readoutRow.getElementsByTagName("p").curr.textContent = this.readout["curr"] + " amps";
    this.readoutRow.getElementsByTagName("p").on.textContent = this.readout["on"]?"On":"Off";
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

      this.inputRow = tbody.insertRow();
      {
        const cc = document.createElement("input");
        cc.id = "volt";
        cc.type = "number";
        cc.value = 0;
        cc.step = 0;
        const cell = this.inputRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("input");
        cc.id = "curr";
        cc.type = "number";
        cc.value = 0;
        cc.step = 0;
        const cell = this.inputRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc2 = document.createElement("button");
        cc2.textContent = "Send";
        cc2.id = "send";
        cc2.onclick = function(){
          this.setVoltage(this.inputRow.getElementsByTagName("input").volt.value,this.inputRow.getElementsByTagName("input").curr.value);
        }.bind(this);
        
        const cc = document.createElement("button");
        cc.textContent = "On/Off";
        cc.id = "on";
        const cell = this.inputRow.insertCell();
        cc.onclick = function(){
          if(this.readout["on"]){
            this.turnOff();
          }
          else{
            this.turnOn();
          }
        }.bind(this);
        cell.appendChild(cc2);
        cell.appendChild(cc);
        
      }


      this.readoutRow = tbody.insertRow();
      {
        const cc = document.createElement("p");
        cc.id = "volt";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "curr";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
      {
        const cc = document.createElement("p");
        cc.id = "on";
        const cell = this.readoutRow.insertCell();
        cell.appendChild(cc);
      }
    }
    this.container.append(orgtable);
    this.updateText();
    return this.container
  }
}
module.exports = Kieth2400;