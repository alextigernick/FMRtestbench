let botField = -10000;
let topField = 10000;
let step = 500;

let topRot = 360;
let botRot = 0;
let stepRot = 10;

// instruments[5].setFreq(400);
// instruments[5].setAmplitude(5e-5);
// instruments[5].setOffset(0);
// instruments[5].turnOn();
logging=false;
logs = [];
let temps = [4,100,200,300];
let x;
for (temp of temps) {
	instruments[4].setTemp(temp,50,0);
	do{
		await instruments[0].delay(500);
	} while(instruments[4].readout["tempCode"]!=6);
	do{
		await instruments[0].delay(500);
	} while(instruments[4].readout["tempCode"]!=1);
	await instruments[0].delay(600000);
	let curField = botField;
	
	while(curField <= topField){
		instruments[4].setField(curField,220,0);
		do{
			await instruments[0].delay(500);
		} while(instruments[4].readout["fieldCode"]!=6);
		do{
			await instruments[0].delay(500);
		} while(instruments[4].readout["fieldCode"]!=4);
		
		let curRot = botRot;
		logs = [];
		while(curRot <= topRot){
			instruments[4].setRotator(curRot,1,0);
			await instruments[0].delay(15000);
			logging = true;
			await instruments[0].delay(10000);
			logging = false;
			curRot += stepRot;
		}
		
		SaveLogs("quasi-"+ temp + "-" + curField + ".csv");
		instruments[4].setRotator(0,1,0);
		await instruments[0].delay(600000);
		curField += step;
	}
	
}
// instruments[5].turnOff();

instruments[4].setField(0,220,0); 