voltageSet(30);
dbmSet(0);
powOn();
rfOn();

startLog();
for(var i = 100000; i<125100; i += 5000){
    freqSet(i);
    for(var j = 10; j>0; j--){
        currentSet(j);
        delay(500);
    }
}
powOff();
rfOff();
endLog("test.csv")