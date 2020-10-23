let botField = -10000;
let topField = 11000;
let step = 2000;
let curField = botField;
instruments[5].setFreq(400);
instruments[5].setAmplitude(5e-5);
instruments[5].setOffset(0);
instruments[5].turnOn();
logging=false;
logs = [];
while(curField < topField){
	instruments[4].setField(curField,220,0);
	do{
		await instruments[0].delay(500);
	} while(instruments[4].readout["fieldCode"]!=6);
	do{
		await instruments[0].delay(500);
	} while(instruments[4].readout["fieldCode"]!=4);
	logging = true;
	await instruments[0].delay(5000);
	logging = false;
	curField += step;
}
instruments[5].turnOff();
SaveLogs("quasi.csv");
instruments[4].setField(0,220,0); 