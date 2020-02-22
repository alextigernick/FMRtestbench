// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require("fs");
const serialport = require('serialport');
const SerialPort = serialport.SerialPort;
var usb = require('usb');

const Readline = require('@serialport/parser-readline');
const ByteLength = require('@serialport/parser-byte-length');
const Plotly = require('plotly.js-dist');
const {dialog} = require('electron').remote;

var nanoConnected = false;
var nanoPort = undefined;
var nanoQueue = [];
var nanoRedi = false;

var poweConnected = false;
var powePort = undefined;
var poweQueue = [];
var powePolar = 1;
var lastVoltage = undefined;

var comQueue = [];
var comWaiting = false;

var lockConnected = false;
var lockPort = undefined;
var lockIntf = undefined;
var lockQueue = [];
var lockRequests = [];

var rfConnected = false;
var rfPort = undefined;
var rfIntf = undefined;
var rfLastBtag = 1;

var lastCurrent = undefined;
var currentPowered = false;
var lastFreq = undefined;
var lastdbm = undefined;
var rfPowered = false;

var logs = [];
var last = [];
var logging = false;
var startTime = 0;
function setupLast(){
  last = [((new Date().getTime())-startTime)/1000,"","","",currentPowered?lastCurrent:0,rfPowered?lastFreq:0,rfPowered?lastdbm:0];//time,x,y,voltage,current,freq,dbm
}
function check(){
  if (comQueue.length && !comWaiting){
    comQueue.shift()();
  }
}
function currentSet(arg){
  comQueue.push(function(){writePower('iset',arg);check();}); 
  check();
}
function voltageSet(arg){
  comQueue.push(function(){writePower('vset',arg);lastVoltage = arg;check();}); 
  check();
}
function polaritySet(arg){
  comQueue.push(function(){writePower(arg==1?"+":arg==-1?"-":"t");check();}); 
  check();
}
function powOn(){
  comQueue.push(function(){writePower('on');currentPowered=true;check();}); 
  check();
}
function powOff(){
  comQueue.push(function(){writePower('off');currentPowered=true;check();}); 
  check();
}
function freqSet(arg){
  comQueue.push(function(){writeRF(":SOUR:FREQ "+arg.toFixed(1)+"\n");lastFreq=arg;check();}); 
  check();
}
function dbmSet(arg){
  comQueue.push(function(){writeRF(":SOUR:POW "+arg.toFixed(1)+"\n");lastdbm=arg;check();});
  check();
}
function rfOn(){
  comQueue.push(function(){writeRF(":OUTP:STAT 1\n");rfPowered=true;check();});
  check();
}
function rfOff(){
  comQueue.push(function(){writeRF(":OUTP:STAT 0\n");rfPowered=false;check();});
  check();
}
function delay(arg){
  comQueue.push(function(){
    comWaiting = true;
    setTimeout(function(){ 
      comWaiting = false;
      check();
    }, arg);
  });
  
}
function startLog(){
  comQueue.push(function(){
    StartLogging();
    check();
  })
}
function endLog(arg){
  comQueue.push(function(){
    SaveLogs(arg);
    check();
  })
}
function bin2String(array) {
  return String.fromCharCode.apply(String, array);
}
function refreshPorts(){
  if (!nanoConnected)
  document.forms.serial.getElementsByTagName("select").portselect.innerHTML = '';
  if (!poweConnected)
  document.forms.serial2.getElementsByTagName("select").portselect.innerHTML = '';
  serialport.list(function (err, portl) {
    portl.forEach(function(port) {
      if (!nanoConnected){
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        document.forms.serial.getElementsByTagName("select").portselect.appendChild(opt);
      }
      if (!poweConnected){
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        document.forms.serial2.getElementsByTagName("select").portselect.appendChild(opt);
      }
    });
  });
}
function writePower(com,arg){
  if(com == "iset"){
	if(Math.sign(lastCurrent)!=Math.sign(arg)){
		writePower("t");
	}
    lastCurrent = arg;
  }
  else if(com == "vset"){
	if(Math.sign(lastVoltage)!=Math.sign(arg)){
		writePower("t");
	}
	lastVoltage = arg;
  }
  else if(com == "+"){
	powePolar = 1;
  }
  else if(com == "-"){
	powePolar = -1;
  }
  else if(com == "t"){
	powePolar *= -1;
  }
  arg = Math.abs(arg);
  var addr = 0x01;
  var codes = {
    "off": 0x20,
    "on":  0x20,
    "vset":0x21,
    "iset":0x22,
    "+":0x24,
    "-":0x24,
	"t":0x24
  };
  var lengths = {
    "off": 1,
    "on":  1,
    "vset":2,
    "iset":2,
    "+":2,
    "-":2,
	"t":2
  };
  var msg = {
    "off": 0,
    "on":  1,
    "vset":arg*100,
    "iset":arg*100,
    "+":((0&0xFF)<<8)|((0xFF&0)),
    "-":((1&0xFF)<<8)|((0xFF&1)),
    "t":((2&0xFF)<<8)|((0xFF&2)),
  };
  var hdr = new Uint8Array(lengths[com]+5);
  hdr[0] = 0xAA;
  hdr[1] = addr;
  hdr[2] = codes[com];
  hdr[3] = lengths[com];
  for(var i = 4; i< lengths[com]+4; i++){
    hdr[i] = (msg[com] >> (8*(i-4))) & 0xFF;
  }
  hdr[lengths[com]+4] = hdr.slice(1,lengths[com]+4).reduce((a, b) => a + b, 0) & 0xFF
  powePort.write(hdr,function(err){if(err){console.log(err)}})
}

function writeRF(message){
  if(!rfConnected){
    connectRF();
    if(!rfConnected){
      return;
    }
  }
  var hdr = new Uint8Array(12+message.length+((4 - (message.length % 4)) % 4));
  hdr[0] = 1;
  hdr[1] = rfLastBtag;
  hdr[2] = ~(rfLastBtag & 0xFF);
  rfLastBtag = (rfLastBtag%255)+1;
  hdr[3] = 0;
  hdr[4] = message.length&0xFF;
  hdr[5] = (message.length&0xFF00)>>4;
  hdr[6] = (message.length&0xFF0000)>>8;
  hdr[7] = (message.length&0xFF000000)>>12;
  hdr[8] = 1;
  hdr[9] = 0;
  hdr[10] = 0;
  hdr[11] = 0;
  for (var i = 0; i < message.length; i++) {
    hdr[i+12] = message.charCodeAt(i);
  }
  rfIntf.endpoints[1].transfer(hdr,function(er,data){if(er)console.log(er);console.log("out transfer complete")})

}
function readRF(){
  if(!rfConnected){
    connectRF();
    if(!rfConnected){
      return;
    }
  }
  rfIntf.endpoints[0].transfer(1024*1024,function(er,data){if(er)console.log(er);if(data)console.log("in transfer complete: "+data)})
}
function askRF(message){
  writeRF(message);
  readRF();
}
function connectRF(){
  
  if (!rfConnected){//
    rfPort = usb.findByIds(0x03eb,0xafff);
    if (rfPort == undefined){
      alert("Could not find RF source");
      return;
    }
    else{
      rfPort.open();
      rfConnected = true;

      rfIntf = rfPort.interface(0);
	  if(!navigator["userAgent"].toLowerCase().includes("windows")){
		  if (rfIntf.isKernelDriverActive()){
			rfIntf.detachKernelDriver()
			console.log("Detached kernel driver for RF source")
		  }
	  }
      rfIntf.claim();
      askRF("*IDN?\n");
      document.getElementById("connectRF").innerHTML = "Disconnect";
    }
  }
  else{
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
function connectLock(){
  if (!lockConnected){//
    lockPort = usb.findByIds(0x0a2d, 0x001b)
    if (lockPort == undefined){
      alert("Could not find lock-in");
    }
    else{
      lockPort.open();
      lockConnected = true;
      lockIntf = lockPort.interface(0);
      lockIntf.claim();
      lockIntf.endpoints[1].on('data', function (data) {
          lockQueue.push(data);
      });
      lockIntf.endpoints[1].on('error', function (error) {
        alert(error);
      });
      lockIntf.endpoints[1].startPoll();
      document.getElementById("connectLock").innerHTML = "Disconnect";
    }
  }
  else{
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
function connectVolt(){
    if (!nanoConnected){
      var select = document.forms["serial"].getElementsByTagName("select").portselect;
      var baud = document.forms["serial"].getElementsByTagName("select").baudrate;
      nanoPort = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
        function (err) {
          if (err) {
            return console.log('Error: ', err.message)
          }
          else{
            parser = new Readline()
            nanoPort.pipe(parser)
            parser.on('data', line => nanoQueue.push(line.replace(/(\r\n|\n|\r)/gm,"")));
            nanoPort.on('close',function(err){
              nanoConnected = false;
              document.forms["serial"].getElementsByTagName("input")[0].value = "Connect";
              if(err){
                console.log(err);
              }
            });
            nanoRedi = false;
            nanoConnected = true;
            document.forms["serial"].getElementsByTagName("input")[0].value = "Disconnect";
          }
        }
      );
    }
    else{
      nanoPort.close();
    }
}
function connectPower(){
  if (!poweConnected){
    var select = document.forms["serial2"].getElementsByTagName("select").portselect;
    var baud = document.forms["serial2"].getElementsByTagName("select").baudrate;
    powePort = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
      function (err) {
        if (err) {
          return console.log('Error: ', err.message)
        }
        else{
          parser = new ByteLength({length: 1})
          powePort.pipe(parser)
          parser.on('data', line => poweQueue.push(line));
          powePort.on('close',function(err){
            poweConnected = false;
            document.forms["serial2"].getElementsByTagName("input")[0].value = "Connect";
            if(err){
              console.log(err);
            }
          });
          poweRedi = false;
          poweConnected = true;
          document.forms["serial2"].getElementsByTagName("input")[0].value = "Disconnect";
        }
      }
    );
  }
  else{
    powePort.close();
  }
}
function parseQueues(){ 
  while(nanoQueue.length){
    incomingVolt(nanoQueue.shift());
  }
  while(lockQueue.length){
    //console.log(lockQueue.shift());
    var data = lockQueue.shift();
    var req = lockRequests.shift();
    if(req == "XY"){
      if (data[data.length-3]== 0){
        var parsed = bin2String(data.slice(0,data.length-3));
        parsed = parsed.split(",");
        last[1] = parsed[0].replace(/(\r\n|\n|\r)/gm,"");
        last[2] = parsed[1].replace(/(\r\n|\n|\r)/gm,"");
        document.getElementById("magX").innerHTML = parsed[0];
        document.getElementById("magY").innerHTML = parsed[1];
        console.log("Status Bit is " + data[data.length-2])
        console.log("Overload Bit is " + data[data.length-1])
      }
      else {
        console.log("Packet is incorrectly terminated");
      }
    }
    else{
      console.log("Unknown request type "+req);
      console.log(data)
    }
  }
  setTimeout(parseQueues,20);
}
setTimeout(parseQueues, 20);

function StartLogging(){
	logging = true;
	logs = [];
	startTime = new Date().getTime();
	setupLast();
	
}
function StopLogging(){
	logging = false;
}

function SaveLogs(fname){
	console.log(logs);
	fs.open(fname, 'w', (err, fd) => {
	  if (err) throw err;
	  for (const log of logs){
		 fs.writeFileSync(fd,log+"\n"); 
	  }
	  fs.close(fd, (err) => {
		if (err) throw err;
	  });
	});
}
function poll(){
  if(logging){
    logs.push(last);
    setupLast();
  }
  if(nanoConnected){
    if(!nanoRedi){
      nanoPort.write(":CONFigure:VOLTage:DC\n",function(err){if (err){console.log(err)}});
      nanoPort.write(":INITiate:CONTinuous ON\n",function(err){if (err){console.log(err)}});
      nanoRedi = true;
    }
    else{
      nanoPort.write(":FETCH?\n");
    }
  }
  if(lockConnected){
    lockRequests.push("XY")
    lockIntf.endpoints[0].transfer("XY.\0",function(er){if(er)console.log(er)})
  }
  setTimeout(poll, parseFloat(document.getElementById("poll").value)*1000);
}
setTimeout(poll, parseFloat(document.getElementById("poll").value)*1000);
function plotLogs(){
	var labels = ["t","x","y","NVM","i","freq","dbm"];
	var plotX = parseInt(document.forms.plotsettings.xselect.value);
	if (plotX >= 0) {
		plotX = logs.map(function(datum){return datum[plotX];});
	}
	else if(plotX == -1) {
		plotX = logs.map(function(datum){return Math.sqrt(Math.pow(datum[2],2)+Math.pow(datum[1],2))});
	}
	else {
		plotX = logs.map(function(datum){return Math.atan2(datum[2],datum[1])});
	}
	var yPlotFields = [];
	for (const ele in document.forms.plotsettings.yselect){
		if (document.forms.plotsettings.yselect[ele].checked){
			yPlotFields.push([parseInt(document.forms.plotsettings.yselect[ele].value),parseFloat(document.forms.plotsettings.yscale[ele].value)]);
		}
	}
	
	var data = [];
	for (const ele in yPlotFields){
		if (yPlotFields[ele][0] > -1) {
			data.push(
			{
				x: plotX,
				y: logs.map(function(datum){return yPlotFields[ele][1]*datum[yPlotFields[ele][0]];}),
				type: 'scatter',//time,x,y,voltage,current,freq,dbm
				//mode: 'markers',
				name: labels[yPlotFields[ele][0]]
		    });
		}
		else if(yPlotFields[ele][1] == -1) {
			data.push(
			{
				x: plotX,
				y: logs.map(function(datum){return yPlotFields[ele][1]*Math.sqrt(Math.pow(datum[2],2)+Math.pow(datum[1],2))}),
				type: 'scatter',//time,x,y,voltage,current,freq,dbm
				//mode: 'markers',
				name: "mag"
		    });
		}
		else {
			data.push(
			{
				x: plotX,
				y: logs.map(function(datum){return yPlotFields[ele][1]*Math.atan2(datum[2],datum[1])}),
				type: 'scatter',//time,x,y,voltage,current,freq,dbm
				//mode: 'markers',
				name: "phase"
		    });
		}
	}
	Plotly.newPlot('PlotDiv', data);
	setTimeout(plotLogs, 5000);
}
setTimeout(plotLogs, 5000);
function incomingVolt(line){
  document.getElementById("voltage").innerHTML = line;
  last[3] = line;
}
refreshPorts();
function addToQueue(){
  comWaiting=true;
  eval(document.forms["program"].program.value);
  comWaiting=false;
  check();
}
/*
*STB? //check the status register
:CONFigure:VOLTage:DC
:INITiate:CONTinuous ON
:fetch?
*/