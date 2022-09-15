import { error, time } from "console"
import path = require("path")
import { v4 as uuidv4 } from 'uuid';

const net = require('net')
const fs = require('fs')

const IPCPATH = path.join('/tmp/shared/', 'shared.sock') 

const LOCAL_ECCO_BOX_NAME = "pi"

const sleep = (milliseconds : number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export class clientClass {

    errors = 0

    constructor() {
            this.checkForServer(false)
    }

    //Auf Starten des P2P Moduls warten
    async checkForServer(wait){
        if(!wait && fs.existsSync(IPCPATH))
            this.setUp()
        else{
            console.log('Waiting for P2P Module')
            setTimeout(() => {this.checkForServer(false)}, 3000)
        }
    }

    //Verwalten der UDS Verbindung 
    setUp(){
        let chunks = []
        const client = net.createConnection(IPCPATH)

        client.on('connect', () => {
            console.log('Connected to P2P Module')     
            this.executeScript(client)
        })
        //Zusammenfügen und Aufteilen empfangener Daten
        client.on('data', (chunk) => {
            let chunkArr = chunk.toString().split('End\n')
            if (chunk.toString == 'End\n') {
                this.processData(Buffer.concat(chunks).toString())
                chunks = []
            } else if (chunkArr.length > 1) {
                chunkArr.forEach((element, index) => {
                    if(element.length > 0){
                        if(index != chunkArr.length - 1){
                        chunks.push(Buffer.from(element))
                        this.processData(Buffer.concat(chunks).toString())
                        }
                        else{
                            if(chunk.toString().endsWith('End\n')){
                                chunks.push(Buffer.from(element))
                                this.processData(Buffer.concat(chunks).toString())
                            }
                            else
                                chunks.push(Buffer.from(element))
                        }
                    }
                    chunks = []
                })
            } else { 
                chunks.push(chunk)
            }
        })
        client.on('end', () => {
            chunks = []
        })
        client.on('error', err => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT'){
                this.checkForServer(true)
            }
            else{
                error(err)
            }
        })
        client.on('close', hadError => {
            console.log('close hadError: ' + hadError.toString())
        })
        client.on('drain', () => console.log('drain'))
    }
    
    //Verarbeiten empfangener Daten
    processData(combinedData){
        let obj
        
        try{
            obj = JSON.parse(combinedData)
        }
        catch (err){
            this.errors++
            console.error("Caught JSON Parse Error. Count: " + this.errors)
            return
        }
        console.log("Nachricht------------------------:\n ")
        console.log(obj)
    }

    send(msg:String , client: any){
        client.write(msg + 'End\n')
    }
    //Wiederholt einen Command. Möglichkeit ein verhalten abhängig von interator zu definieren
    async cycle (client, sendFunction, commandFunction, interval){
        let iterator = 0
        while(true){
            await sleep(interval)
            sendFunction(commandFunction(iterator), client)
            iterator++
        }   
    }
    //Testfall auswählen
    async executeScript(connection){
        await sleep(5000)
        this.Btest5remote(connection)
    }

    //Lokale Tests---------------------------------------------
    //Speichert Datensatz und fragt diesen wieder ab
    test1local(connection){
        console.log(">>Saving temperature of 14 to TSDB")
        this.send((`
            {"type": "COMMAND", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
            "command": ${JSON.stringify(["TS.ADD", "temperatur", "\*", `14`])}}`), 
        connection)

        this.send((`
            {"type": "COMMAND", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
            "command": ${JSON.stringify(["TS.GET", "temperatur"])}}`), 
        connection)
    }
    //Speichert eine Reihe von Datensätzen und fragt diese ab
    async test2local(connection){
        for(let i = 15; i < 23; i++){
            this.send((`
                {"type": "COMMAND", 
                "msgId": "${uuidv4()}", 
                "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
                "command": ${JSON.stringify(["TS.ADD", "temperatur", `${Date.now()}`, i.toString()])}}`), 
            connection)
            await sleep(10)
        }

        this.send((`
            {"type": "COMMAND", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
            "command": ${JSON.stringify(["TS.RANGE", "temperatur", "0", "2000000000000"])}}`), 
        connection)
    }

    //Tests über mehrere Edge Nodes--------------------------------------
    //Speichert alle 3s, holt diesen Datensatz alle
    //Holt sich weiteren lokalen Datensatz, der von anderer Node gespeichert wurde
    //Ausführende Edge Node: Pi
    Atest1remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "temperatur",`${Date.now()}` ,iterator.toString()])}}`
        }, 3000)

        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "temperatur"])}}`
        }, 3000)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "distanz"])}}`
        }, 3000)
    }

    //Speichert auf Node mit Namen pi Datensatz und holt sich Datensätze von zwei keys dieser Node
    //Ausführende Edge Node Name: nicht pi
    Btest1remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator*iterator).toString()])}}`
        }, 3000)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "temperatur"])}}`
        }, 3000)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "distanz"])}}`
        }, 3000)
    }

    //-----Pub/Sub Testfall
    //Abonniert sich auf lokalen sensor
    //Ausführender Edge Node Name: pi
    Atest2remote(connection) {
        this.send((`
            {"type": "SUB",
            "eccoBoxName": "pi", 
            "sensor": "distanz"}`), 
        connection)
    }

    //Sendet auf andere Node Datensatz
    //Ausführender Edge Node Name: nicht pi
    Btest2remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator).toString()])}}`
        }, 3000)
    }

    //Alle 10ms über Pub/Sub
    //Abonniert lokalen sensor
    //Ausführender Edge Node Name: pi
    Atest3remote(connection) {
        this.send((`
            {"type": "SUB",
            "eccoBoxName": "pi", 
            "sensor": "distanz"}`), 
        connection)
    }
    //Sendet alle 10ms Datensatz auf andere Node
    //Ausführender Edge Node Name: nicht pi
    Btest3remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator).toString()])}}`
        }, 10)
    }

    //------Kontinuierlich 10ms Daten speichern und größere Menge von Daten abrufen
    //Holt Datensätze der letzten 10s eines lokalen Sensors
    //Ausführender Edge Node Name: pi
    Atest4remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `
            {"type": "COMMAND", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "pi", 
            "command": ${JSON.stringify(["TS.RANGE", "distanz", `${Date.now()-10000}`, `${Date.now()}`])}}`
        }, 
        10000);
    }
    //Sendet Daten auf entfernte Node
    //Ausführender Edge Node Name: nicht pi
    Btest4remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator).toString()])}}`
        }, 10)
    }

    //-----Status Test
    //Fragt Status des Netzes + der lokalen Node ab.
    //Ausführender Edge Node Name: Pi
    Atest5remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "STATUS", 
                    "msgId": "${uuidv4()}"}`
        }, 5000)
    }

    //Macht nichts
    //Ausführender Edge Node Name: nicht pi
    Btest5remote(connection){}

    //Tests in größeren Netzen----------------------------------
    //Test6: Speichern und abrufen von allen, einer abonniert abwechselnd

    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 50ms abrufen
    //Ausführender Edge Node Name: node1
    Atest6remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node1", 
                    "command": ${JSON.stringify(["TS.ADD", "sensorname",`${Date.now()}` ,(iterator).toString()])}}`
        }, 50)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.GET", "sensorname"])}}`
        }, 50)
        
    }
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 50ms abrufen
    //Ausführender Edge Node Name: node2
    Btest6remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.ADD", "sensorname",`${Date.now()}` ,(iterator).toString()])}}`
        }, 50)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node3", 
                    "command": ${JSON.stringify(["TS.GET", "sensorname"])}}`
        }, 50)
    }
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 50ms abrufen
    //Ausführender Edge Node Name: node3
    Ctest6remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node3", 
                    "command": ${JSON.stringify(["TS.ADD", "sensorname",`${Date.now()}` ,(iterator).toString()])}}`
        }, 50)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node4", 
                    "command": ${JSON.stringify(["TS.GET", "sensorname"])}}`
        }, 50)
    }
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 50ms abrufen
    //Ausführender Edge Node Name: node4
    Dtest6remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node4", 
                    "command": ${JSON.stringify(["TS.ADD", "sensorname",`${Date.now()}` ,(iterator).toString()])}}`
        }, 50)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node5", 
                    "command": ${JSON.stringify(["TS.GET", "sensorname"])}}`
        }, 50)
    }
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 50ms abrufen
    //Ausführender Edge Node Name: node5
    Etest6remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node5", 
                    "command": ${JSON.stringify(["TS.ADD", "sensorname",`${Date.now()}` ,(iterator).toString()])}}`
        }, 50)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node1", 
                    "command": ${JSON.stringify(["TS.GET", "sensorname"])}}`
        }, 50)
    }
    //Fragt zuerst den Status an, danach geht es die anderen Nodes durch und fragt jeweils Datensätze ab, 
    //subscribet sich kurzzeitig und unsubscribet sich danach
    //Ausführender Edge Node Name: node6
    async Ftest6remote(connection){
        this.send((`
            {"type": "STATUS",
            "msgId": "${uuidv4()}"}`), 
        connection)
        await sleep(5000)

        let currNodeNumber = 0
        while(true){
            await sleep(100)
            console.log(`Now getting the last 2s of Data at Node ${currNodeNumber%5 + 1}`)
            this.send(`
                {"type": "COMMAND", 
                "msgId": "${uuidv4()}", 
                "eccoBoxName": "node${currNodeNumber%5 + 1}", 
                "command": ${JSON.stringify(["TS.RANGE", "sensorname", `${Date.now()-2000}`, `${Date.now()}`])}}`,
            connection)
            
            await sleep(1000)

            console.log(`Now Subscribing to Node ${currNodeNumber%5}`)
            this.send((`
                {"type": "SUB",
                "eccoBoxName":"node${currNodeNumber%5 + 1}", 
                "sensor": "sensorname"}`), 
            connection)
            
            await sleep(2000)
            this.send((`
                {"type": "UNSUB",
                "eccoBoxName":"node${currNodeNumber%5 + 1}", 
                "sensor": "sensorname"}`), 
            connection)

            currNodeNumber = (currNodeNumber + 1)%5
        }
    }

    //Testfall: Komplexes Großes Netz

    //Lokal und entfernt Datensätze alle 100ms hinzufügen
    //Ausführender Edge Node Name: node1
    Atest7remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node1", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor1",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)

        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor1",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)
    }
    //Fügt lokal alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node2
    Btest7remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor2",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)
    }

    //Fügt bei Node2 alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node3
    Ctest7remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor3",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)
    }

    //Fügt bei Node1 und Node2 alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node4
    Dtest7remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor4",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)

        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node1", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor2",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)
    }

    //Fügt bei Node1 und Node2 alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node5
    Etest7remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node2", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor5",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)

        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "COMMAND", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "node1", 
                    "command": ${JSON.stringify(["TS.ADD", "sensor3",`${Date.now()}` ,(iterator).toString()])}}`
        }, 100)
    }
    //Fragt zuerst den Status ab. Danach geht in Node1 und Node2 abwechselnd alle Sensoren durch, dabei
    //werden zuerst die Sensordaten der letzten 2s abgefragt, danach kurz subscribet und danach wieder unsubscribet.
    //Ausführender Edge Node Name: node6
    async Ftest7remote(connection){
        this.send((`
            {"type": "STATUS",
            "msgId": "${uuidv4()}"}`), 
        connection)
        await sleep(5000)

        while(true){
            for(let nodeNumber = 1; nodeNumber <= 2; nodeNumber++){
                for(let sensorNumber = 1; sensorNumber <= ((nodeNumber == 0)? 3 : 5); sensorNumber++ ){
                    await sleep(100)
                    console.log(`Now getting the last 2s of Data at Node ${nodeNumber}`)
                    this.send(`
                        {"type": "COMMAND", 
                        "msgId": "${uuidv4()}", 
                        "eccoBoxName": "node${nodeNumber}", 
                        "command": ${JSON.stringify(["TS.RANGE", `sensor${sensorNumber}`, `${Date.now()-2000}`, `${Date.now()}`])}}`,
                    connection)
                    await sleep(1000)

                    console.log(`Now Subscribing to Node ${nodeNumber}, Sensor Number: ${sensorNumber}`)
                    this.send((`
                        {"type": "SUB",
                        "eccoBoxName":"node${nodeNumber}", 
                        "sensor": "sensor${sensorNumber}"}`), 
                    connection)
                    
                    await sleep(2000)
                    this.send((`
                        {"type": "UNSUB",
                        "eccoBoxName":"node${nodeNumber}", 
                        "sensor": "sensor${sensorNumber}"}`), 
                    connection)
                }
            }
        }
    }
}