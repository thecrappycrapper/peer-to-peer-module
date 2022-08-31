import { error, time } from "console"
import path = require("path")
import { Readable } from "stream"
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

    setUp(){
        let chunks = []
        const client = net.createConnection(IPCPATH)

        client.on('connect', () => {
            console.log('Connected to P2P Module')     
            this.executeScript(client)
        })
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

        if(obj.type == "Command"){ // &&  parseInt(obj.data) % 1000 == 0){
            console.log("Combined------------------------\n: ")
            console.log(obj)
        }else if(obj.type == "SUB"){// &&  parseInt(obj.data.split(',')[0]) % 1000 == 0){
            console.log("Combined------------------------\n: ")
            console.log(obj)
        }else if(obj.type == "STATUS"){
            console.log("Combined------------------------\n: ")
            console.log(obj)
        }
    }
    send(msg:String , client: any){
        //const readable = Readable.from(msg + 'End\n')
        //readable.pipe(client, { end: false })
        client.write(msg + 'End\n')
    }

    async cycle (client, sendFunction, commandFunction, interval){
        let iterator = 0
        while(true){
            await sleep(interval)
            sendFunction(commandFunction(iterator), client)
            iterator++
        }   
    }

    //s((`{"type": "Command", "msgId": "${uuidv4()}", "eccoBoxName": "debian", "command": ${JSON.stringify(["TS.ADD", "temperatur", "\*", `${iterator.toString()}`])}}`), client)
    //s((`{"type": "Command", "msgId": "${uuidv4()}", "eccoBoxName": "debian", "command": ${JSON.stringify(["TS.ADD", "humidity", "\*", `${iterator.toString()}`])}}`), client)

    async executeScript(connection){
        await sleep(5000)
        this.Btest4remote(connection)
    }

    test1local(connection){
        console.log(">>Saving temperature of 14 to TSDB")
        this.send((`
            {"type": "Command", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
            "command": ${JSON.stringify(["TS.ADD", "temperatur", "\*", `14`])}}`), 
        connection)

        this.send((`
            {"type": "Command", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
            "command": ${JSON.stringify(["TS.GET", "temperatur"])}}`), 
        connection)
    }

    async test2local(connection){
        for(let i = 15; i < 23; i++){
            this.send((`
                {"type": "Command", 
                "msgId": "${uuidv4()}", 
                "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
                "command": ${JSON.stringify(["TS.ADD", "temperatur", `${Date.now()}`, i.toString()])}}`), 
            connection)
            await sleep(10)
        }

        this.send((`
            {"type": "Command", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "${LOCAL_ECCO_BOX_NAME}", 
            "command": ${JSON.stringify(["TS.RANGE", "temperatur", "0", "2000000000000"])}}`), 
        connection)
    }

    //--------Remote speichern Testfall
    //Speichern auf Pi, ausführen Debian
    Atest1remote(connection){

        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "temperatur",`${Date.now()}` ,iterator.toString()])}}`
        }, 3000)

        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "temperatur"])}}`
        }, 3000)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "distanz"])}}`
        }, 3000)
    }

    //Speichern und abrufen Pi, ausführen Pi
    Btest1remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator*iterator).toString()])}}`
        }, 3000)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "temperatur"])}}`
        }, 3000)
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.GET", "distanz"])}}`
        }, 3000)
    }

    //-----Pub/Sub Testfall
    //Ausführen Debian
    Atest2remote(connection) {
        this.send((`
            {"type": "SUB",
            "eccoBoxName": "pi", 
            "sensor": "distanz"}`), 
        connection)
    }

    //Ausführen Pi
    Btest2remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator).toString()])}}`
        }, 3000)
    }

    //Alle 10ms über Pub/Sub
    //Ausführen Debian
    Atest3remote(connection) {
        this.send((`
            {"type": "SUB",
            "eccoBoxName": "pi", 
            "sensor": "distanz"}`), 
        connection)
    }

    //Ausführen Pi
    Btest3remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator).toString()])}}`
        }, 10)
    }

    //------Kontinuierlich 10ms Daten speichern und größere Menge von Daten abrufen
    //Ausführen Debian
    Atest4remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `
            {"type": "Command", 
            "msgId": "${uuidv4()}", 
            "eccoBoxName": "pi", 
            "command": ${JSON.stringify(["TS.RANGE", "distanz", `${Date.now()-10000}`, `${Date.now()}`])}}`
        }, 
        10000);
    }

    //Ausführen Pi
    Btest4remote(connection) {
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Command", 
                    "msgId": "${uuidv4()}", 
                    "eccoBoxName": "pi", 
                    "command": ${JSON.stringify(["TS.ADD", "distanz",`${Date.now()}` ,(iterator).toString()])}}`
        }, 10)
    }

    Atest5remote(connection){
        this.cycle(connection, this.send, (iterator) => {
            return `{"type": "Status", 
                    "msgId": "${uuidv4()}"}`
        }, 5000)
    }

    Btest5remote(connection){}
}