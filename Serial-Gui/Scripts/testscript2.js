let botField = 0;
let topField = 10000;
let fieldRate = 100;
instruments[5].setFreq(91);
instruments[5].setAmplitude(5e-5);
instruments[5].setOffset(0);
instruments[5].turnOn();
instruments[4].setField(botField,220,0);
do{
	await instruments[0].delay(5000);
} while((instruments[4].readout["tempCode"]!=1)||(instruments[4].readout["fieldCode"]!=4));
logs = [];
logging = true;
instruments[4].setField(topField,fieldRate,0);
do{
	await instruments[0].delay(5000);
} while(instruments[4].readout["fieldCode"]!=4);
logging = false;
SaveLogs("test.csv");
instruments[4].setField(0,220,0);