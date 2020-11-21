const Instrument = require("./instrument.js");
const VisaSession = require("./visa.js");
const visa = require('./ni-visa/ni-visa.js');
const visa = require('./ni-visa/ni-visa-constants');
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
      "mag2" : undefined,
      "new1" : false,
      "new2" : false
      }
      this.count = 0;
    }
    poll() {
      if (this.connected) {
          if (this.channels.value == 2) {
        if(this.count > 10){
        console.log(this.count);
        console.log(this.interface);
        
      }
        else{
          this.rawWrite("XY1.");
          this.requests.push(1);
          this.rawWrite("XY2.");
          this.requests.push(2);
        }
          }
          else{
        this.rawWrite("XY.");
            this.requests.push(1);
          }
  
        }
      }
    rawWrite(message) {
        this.count += 1;
        this.interface.endpoints[0].transfer(Buffer.from(message+"\0"),this.errorReporter0.bind(this));    
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
        else {
          console.log("Unknown request type " + req);
          console.log(data)
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
    errorReporter0(error,buf,actual) {
      if (error)
        console.log(this._name + " OUTPUT FROM DEVICE ERROR " + error);
      this.count -= 1;
    }
    errorReporter1(error) {
      if (error)
        console.log(this._name + " INTO DEVICE ERROR " + error);
        
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
          this.count = 0;
          this.connected = true;
          this.interface = this.port.interface(0);
  
          if (!navigator["userAgent"].toLowerCase().includes("windows")) {
            if (this.interface.isKernelDriverActive()) {
              this.interface.detachKernelDriver()
              console.log("Detached kernel driver for lock-in")
            }
          }
          this.interface.claim();
          this.interface.endpoints[0].clearHalt(this.errorReporter0.bind(this));
          this.interface.endpoints[1].clearHalt(this.errorReporter1.bind(this));
          this.interface.endpoints[1].on('data', this.handleData.bind(this));
          this.interface.endpoints[1].on('error', this.errorReporter1.bind(this));
          this.interface.endpoints[1].startPoll();

          //this.interface.endpoints[0].on("error",this.errorReporter0.bind(this));
          //this.interface.endpoints[0].on("end",() => console.log("Endpoint Closed"));


          
          this.serialRow.getElementsByTagName("button").connect.textContent = "Disconnect";

        }
      }
      else {
          this.interface.endpoints[1].stopPoll(function(){
            this.interface.release(true,function(err){console.log(err)});
            this.interface.release(true);
            this.port = undefined;
            this.connected = false;
            this.serialRow.getElementsByTagName("button").connect.textContent = "Connect";
          }.bind(this));
  
  
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