import path = require("path")
import { Readable, Stream } from "stream"
import { v4 as uuidv4 } from 'uuid';
import { p2pNode } from './libp2p'
const net = require('net')
const fs = require('fs')

const IPCPATH = path.join('/tmp/shared/', 'shared.sock') 

//Verwaltet die Subscriptions eines Ecco Box Clients
class Subscription {
    eccoBoxName: String;
    sensors: Array<String> = new Array<String>()

    constructor(name: String){
        this.eccoBoxName = name
    }

    addSensor(sensor: String){
        this.sensors.push(sensor)
    }
    removeSensor(sensor: String){
        for(var i = 0; i < sensor.length; i++){                 
            if (this.sensors[i] == sensor) { 
                this.sensors.splice(i, 1); 
                i--; 
            }
        }
    }

    containsSensor(sensor: String){
        return this.sensors.includes(sensor)
    }

}
//Verbindung eines Clients mit Verwaltung der Subscriptions
class EccoBoxClient {
    readonly connection: any;
    readonly id: String;

    subscriptions: Array<Subscription>;

    constructor(connect: any) {
        this.connection = connect;
        this.subscriptions = new Array<Subscription>();
        this.id = uuidv4();
    }

    addSubscriptions(eccoBoxName: String, sensor: String): String {
        if (!this.isSubscribed(eccoBoxName, sensor)) {
            if(this.subscriptions.some(element => {return element.eccoBoxName == eccoBoxName}))
                this.subscriptions.find(element => {return element.eccoBoxName == eccoBoxName}).addSensor(sensor)
            else{
                const newSubscription = new Subscription(eccoBoxName)
                newSubscription.addSensor(sensor)
                this.subscriptions.push(newSubscription)
            }
            return "SUB SUCCESS";
        }
        return "ALREADY SUB";
    }

    removeSensor(eccoBoxName: String, sensor: String): String {
        this.subscriptions.forEach((element, index) => {
            if (element.eccoBoxName == eccoBoxName && element.containsSensor(sensor)) {
                element.removeSensor(sensor)
                return "REMOVE SUCCESS";
            }
        })
        return "REMOVE UNSUCCESSFUL";
    }
    
    isSubscribed(eccoBoxName: String, sensor: String): Boolean {
        let found = false
        this.subscriptions.forEach(element => {
            if (element.eccoBoxName == eccoBoxName && element.containsSensor(sensor)) {
                found = true
            }
        })
        return found;
    }
}

//Interface, welches der udsServer implementiert. Dient der Kommunikation einer libp2p Instanz mit dem udsServer
export interface SubListener {
    subscribeMessage(eccoBoxName: String, sensor: String, msg: String),
    respond(msg: String)
}

//Schnittstelle zu Clients
export class udsServer implements SubListener{


    p2p: p2pNode

    eccoBoxClients: Array<EccoBoxClient>  = new Array<EccoBoxClient>()

    errors = 0

    constructor(p2p: p2pNode) { 
        this.p2p = p2p


        this.setUpServer()
    }

    setUpServer(){
        this.p2p.setListener(this)

        this.deleteSocketFile()

        const server = net.createServer()

        server.on('connection', (socket) => {

            let newEccoBoxClient = new EccoBoxClient(socket);

            let index = this.eccoBoxClients.push(newEccoBoxClient) - 1

            let chunks = []
            socket.on('data', (chunk) => {
                console.log(`Length of query: ${chunk.toString().length}`)

                let chunkArr = chunk.toString().split('End\n')
                if (chunk.toString == 'End\n') {
                    this.processQuery(Buffer.concat(chunks).toString(), newEccoBoxClient.id)
                    chunks = []
                } else if (chunkArr.length > 1) {
                    chunkArr.forEach((element, index) => {
                        if(element.length > 0){
                            if(index != chunkArr.length - 1){
                                chunks.push(Buffer.from(element))
                                this.processQuery(Buffer.concat(chunks).toString(), newEccoBoxClient.id)
                            }
                            else{
                                if(chunk.toString().endsWith('End\n')){
                                    chunks.push(Buffer.from(element))
                                    this.processQuery(Buffer.concat(chunks).toString(), newEccoBoxClient.id) 
                                }
                                else{
                                    chunks.push(Buffer.from(element))
                                }
                            }
                        }
                        chunks = []
                    })
                } else { 
                    chunks.push(chunk)
                }
            })

            socket.on('end', () => console.log('end'))
            socket.on('close', hadError => {
                 this.eccoBoxClients.slice(index, 1)
                 console.log('close hadError: ' + hadError.toString())})
            socket.on('connect', () => console.log('connect'))
            socket.on('drain', () => console.log('drain'))
            
        })
        server.on('error', (err) => {
            throw err;
        })
        server.listen({ path: IPCPATH}, () => {
            console.log('server bound')
        })
    }

    deleteSocketFile(){
        try {
            fs.unlinkSync(IPCPATH)
            console.log("deleting "+ IPCPATH)
        } catch (err) {
            if (err.code !== 'ENOENT')
                console.error(err)
        }
    }

    //Nachricht vom Client bearbeiten
    processQuery(query: String, eccoBoxClientId: String) {
        let send = this.send
        let client = this.getEccoBoxClientFromId(eccoBoxClientId)
        let obj
        //console.log(`Length of query: ${query.length}`)
        try{
            obj = JSON.parse(query.toString())
        }
        catch (err){
            this.errors++
            console.error("Error with received command. Count: " + this.errors)
            return
        }
        
        //Bei Command an irgendeine Redis Datenbank
        if(obj.type == "COMMAND"){
            this.p2p.get(obj.eccoBoxName, JSON.stringify(obj.command), eccoBoxClientId, obj.msgId).then(function (value) {
                send(`{"type": "COMMAND", 
                    "msgId": "${obj.msgId}",
                    "eccoBoxName": "${obj.eccoBoxName}", 
                    "data": "${value}"}`, 
                    client)
            }, function (err) {
                send(`{"type": "ERROR",
                    "msgId": "${obj.msgId}" 
                    "eccoBoxName": "${obj.eccoBoxName}"}`,
                    client)
            })
        }
        //Bei subscribe
        else if (obj.type == "SUB"){
            this.p2p.subscribe(obj.eccoBoxName, obj.sensor)
            client.addSubscriptions(obj.eccoBoxName, obj.sensor)
        }
        //Bei unsubscribe
        else if (obj.type == "UNSUB"){
            client.removeSensor(obj.eccoBoxName, obj.sensor)
        }
        //Bei Anfrage von Statusnachricht
        else if (obj.type == "STATUS"){
            let tmp : any = this.p2p.getStatus()
            tmp.msgId = obj.msgId;
            send(JSON.stringify(tmp), client)
        }
    }

    //Behandeln von Antwort von Libp2p Instanz im Fall von Publish
    subscribeMessage(eccoBoxName: String, sensor: String,  msg: String){
        this.eccoBoxClients.forEach(client => {
            if (client.isSubscribed(eccoBoxName, sensor)) {
                for(let element of msg.split(";")){
                    if(element.length > 0)
                        this.send(`{"type": "SUB", 
                                    "eccoBoxName": "${eccoBoxName}", 
                                    "sensor": "${sensor}", 
                                    "data": "${element}"}`, 
                                    client)
                }
            }
        })
    }
    
    //Behandeln von Antwort von Libp2p Instanz im Fall einer Anfrage
    respond(msg: String){
        let obj = JSON.parse(msg.toString());
        const client = this.getEccoBoxClientFromId(obj.eccoBoxClientId)
        delete obj.eccoBoxClientId
        this.send(JSON.stringify(obj), client)
    }

    getEccoBoxClientFromId(Id: String): EccoBoxClient {
        let foundPeer: EccoBoxClient = null
        this.eccoBoxClients.forEach(element => {
            if (element.id == Id) {
                foundPeer = element;
            }
        })
        return foundPeer;
    }

    //An Client senden
    send(msg:String , client: any){
        client.connection.write(msg + 'End\n')
    }
}