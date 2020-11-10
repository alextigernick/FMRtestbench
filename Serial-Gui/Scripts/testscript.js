
let temps = [5,6];//2,2.2,2.4,2.6,2.8,3,4,
let botField = -7500;
let topField = 7500;
let fieldRate = 40;
let Freq = 4e9;
let dbm = 10;

for(const temp of temps){//[new TimeKeeper("tk"), new NVmeter2182A("nv"), new RF845("rf"), new Lock7270("lockin"), new DynaCool("ppms")];
	instruments[4].setTemp(temp,50,0);
	instruments[4].setField(botField,220,0);
	do{
		await instruments[0].delay(1000);
	} while((instruments[4].readout["tempCode"]!=1)||(instruments[4].readout["fieldCode"]!=4));
	instruments[2].setFreq(Freq);
	instruments[2].setdBm(dbm);
	instruments[2].turnOn();
	logs = [];
	logging = true;
	instruments[4].setField(topField,fieldRate,0);
	do{
		await instruments[0].delay(1000);
	} while(instruments[4].readout["fieldCode"]!=4);
	logging = false;
	instruments[2].turnOff();
	SaveLogs("magnonInsulatorInPlane"+freq+"_"+temp+"_"+dbm+".csv");
}
instruments[4].setField(0,220,0);