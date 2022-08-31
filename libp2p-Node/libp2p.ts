const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')
const MDNS = require('libp2p-mdns')
const Gossipsub = require("libp2p-gossipsub")
const { multiaddr } = require('multiaddr');
const { fromString } = require('uint8arrays/from-string')
const { toString } = require('uint8arrays/to-string')


//https://github.com/libp2p/js-libp2p/blob/master/examples/chat/src/stream.js
const pipe = require('it-pipe')
const map = require('it-map')

import { Readable } from 'stream'
import { lookupService } from './lookup'
import { redisClient } from './redisClient'
import { SubListener } from './udsServer'

const DELETION_TIMER = 1000 * 60 * 60 //milliseconds

export class p2pNode {

    redis: redisClient

    myEccoBoxName: String

    lookupService: lookupService = new lookupService()

    node: any

    myAddr: String

    isReady: Boolean = false

    listener: SubListener

    bulkPublish: any = {}

    constructor(myEccoBoxName: String) {
        if (myEccoBoxName != null) {
            this.myEccoBoxName = myEccoBoxName
            console.log("Now starting EccoBox! Name: " + this.myEccoBoxName)
            this.redis = new redisClient()
            this.init();
        }else{
            console.error("Please provide a name to this EccoBox")
        }
    }

    public async init() {

        let root = this

        //Einstellungen P2P
        this.node = await Libp2p.create({
            addresses: {
                listen: ['/ip4/0.0.0.0/tcp/0']
            },
            modules: {
                transport: [TCP],
                connEncryption: [NOISE],
                streamMuxer: [MPLEX],
                peerDiscovery: [MDNS],
                pubsub: Gossipsub
            }, config: {
                peerDiscovery: {
                    autoDial: true,
                    mdns: {
                        enabled: true
                      }
                },
                pubsub: {
                    enabled: true,
                    emitSelf: true
                }, dialer: {
                    dialTimeout: 3000
                }
            }
        })

        // start libp2p
        await this.node.start()
        console.log('libp2p has started')
        this.isReady = true


        this.node.on('error', (err) => {
            console.log('ERROR: '+ err)
        })

        this.node.on('peer:discovery', (peerData) => {
            console.log('Found a peer in the local network', peerData.id.toB58String(), peerData.multiaddrs)
        })

        this.node.connectionManager.on('peer:connect', (connection) => {
            console.log('Connected to %s', connection.remotePeer.toB58String()) // Log connected peer
            this.announceMyself()
        })

        this.node.connectionManager.on('peer:disconnect', (connection) => {
            console.log("Disconnecting: " + connection.remotePeer.toB58String())
            this.lookupService.unregister(connection.remotePeer.toB58String())
            this.publish("ORGA_DISCON", connection.remotePeer.toB58String())
        })
            
        //Organisation des Lookup-Service
        this.node.pubsub.subscribe("ORGA_ANNOUNCE")
        this.node.pubsub.on("ORGA_ANNOUNCE", (msg) => {
            try {
                const splitMessage = (msg.data).toString().split(" ", 2)

                if (splitMessage[0] != root.myAddr && root.lookupService.register(multiaddr(splitMessage[0]), splitMessage[1])) { // if  we see a new addr
                    root.announceMyself() //announce myself again
                }
            }
            catch (e) {
                console.error(e)
            }
        })

        //Abmelden von Peers vom Lookup-Service
        this.node.pubsub.subscribe("ORGA_DISCON")
        this.node.pubsub.on("ORGA_DISCON", (msg) => {
            try {
                console.log("Got Discon %s", toString(msg.data))
                this.lookupService.unregister((toString(msg.data)))
                console.log("lookupService:" + JSON.stringify(root.lookupService.peerRefrences))
            } catch (e) {
                console.error(e)
            }
        })

        //Empfangen einer Query aus dem Netz
        this.node.handle(`/query/1.0.0`, async ({ connection, stream, protocol }) => {
            let resp = this.response
            let n = this.node

            pipe(
                // Read from the stream (the source)
                stream.source,

                (source) => map(source, (buf) => toString(buf.slice())),
                // Sink function
                async function (source) {
                    let allData = ""
                    // For each chunk of data
                    for await (let chunk of source) {
                        allData += chunk.toString()
                    }

                    let commands = JSON.parse(allData.toString())

                    root.get(commands.eccoBoxName, JSON.stringify(commands.query), commands.eccoBoxClientId, commands.msgId).then(function (value) {
 
                        resp(commands.addr, `{"type": "Command", 
                                            "msgId" : "${commands.msgId}",
                                            "eccoBoxName": "${root.myEccoBoxName}", 
                                            "data": ${JSON.stringify(value)}, 
                                            "eccoBoxClientId" : "${commands.eccoBoxClientId}"}`, 
                                            n)
                    }, function (err) {
                        resp(commands.addr, `{"type": "ERROR",
                                            "msgId" : "${commands.msgId}", 
                                            "eccoBoxClientId": "${commands.eccoBoxClientId}"}`, 
                                            n)
                    })
                    }
            )
        })

        this.node.multiaddrs.forEach(addr => {
            if (!addr.toString().includes("127.0.0.1"))
                this.myAddr = `${addr.toString()}/p2p/${this.node.peerId.toB58String()}`
            console.log(`${addr.toString()}/p2p/${this.node.peerId.toB58String()}`)
        })

        process.on('SIGTERM', this.stop)
        process.on('SIGINT', this.stop)

        this.publishLoop()
        this.delLoop()

        //Antwort an udsServer weiterleiten
        await this.listener
        this.node.handle(`/response/1.0.0`, async ({ connection, stream, protocol }) => {
            pipe(
                // Read from the stream (the source)
                stream.source,

                (source) => map(source, (buf) => toString(buf.slice())),
                // Sink function
                async function (source) {
                    //console.log("start receiving")
                    let allData = ""
                    // For each chunk of data
                    for await (let chunk of source) {
                        allData += chunk.toString()
                        //console.log("Received chunk: " + chunk)
                    }
                    root.listener.respond(allData.toString())
                }
            )
            //this.unlisten(`/response:${responseId}/1.0.0`)
        })
    }

    //Publishing in Bulks
    async publishLoop(){
        const sleep = (milliseconds : number) => {
            return new Promise(resolve => setTimeout(resolve, milliseconds))
        }
        while(true){
            await sleep(1000)
            for(let topic in this.bulkPublish){
                let topicCopy = this.bulkPublish[topic]
                this.bulkPublish[topic] = ""
                this.node.pubsub.publish(this.myEccoBoxName + "." + topic, fromString(topicCopy)).catch(err => {
                    console.error(err)
                })
            }
        }
    }

    //Alle DELETION_TIMER ms zu alte Datensätze löschen
    async delLoop(){
        const sleep = (milliseconds : number) => {
            return new Promise(resolve => setTimeout(resolve, milliseconds))
        }
        while(true){
            await sleep(DELETION_TIMER) 
            let red = this.redis
            this.redis.processQuery(JSON.stringify(["KEYS", "*"])).then(function(keys){
                for(let topic of keys){
                    var date = new Date(new Date().setDate(new Date().getDate() - parseInt(process.env.DELETE_INTERVAL.replace('"','')) ))
                    red.processQuery(JSON.stringify(["TS.DEL", topic.toString(), "0", date.getTime().toString() ])).then(
                        function(msg){
                            console.log("Deleted " + msg + " expired entries")
                        })
                }

            }, function(err){
                console.error("Error occured whilst trying to get all keys")
            })
        }
    }

    //Im Netz anmelden
    async announceMyself() {
        if (this.myEccoBoxName != null) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            await this.myAddr

            this.node.pubsub.publish("ORGA_ANNOUNCE", this.myAddr + " " + this.myEccoBoxName).catch(err => {
                console.error(err)
            })
        }
    }

    //Auf erhaltene Query antworten
    async response(adr: String, obj: String, n: any) {
        try {
            const { stream, protocol } = await n.dialProtocol(multiaddr(adr), `/response/1.0.0`)
            pipe(
                // Read from stdin (the source)
                Readable.from(obj),

                (source) => (map(source, (string) => fromString(string))),

                //lp.encode(),

                // Write to the stream (the sink)
                stream.sink
            )
        }
        catch (e) {
            console.log(e);
        }
    }

    getStatus() {
        let eccoBoxNames = Array()

        if(this.myEccoBoxName != null)
            eccoBoxNames.push(this.myEccoBoxName)

        eccoBoxNames.push(...this.lookupService.getAllNames())

        return JSON.parse(`{"type": "STATUS", 
                "P2P-Connection": "${this.isReady}", 
                "Redis": "${this.redis.ready}", 
                "Local": "${this.myEccoBoxName}" , 
                "Nodes": [${JSON.stringify(eccoBoxNames)}]}`)
    }

    setListener(listener : SubListener){
        this.listener = listener

    }

    async get(eccoBoxName: String, query: String, eccoBoxClientId: String, messageId : String): Promise<String> {
        if(!this.isReady){
            console.log( "Can`t process request, Libp2p has not startet")
            return;
        }
            
        try {
            //wenn Command an lokale EccoBox gerichtet
            if (this.myEccoBoxName == eccoBoxName) {
                if(this.redis.ready){

                    let obj = JSON.parse(query.toString())
                    if(obj[0] == "TS.ADD"){
                        if(this.bulkPublish[obj[1]] == null){
                            this.bulkPublish[obj[1]] = `${obj[2]},${obj[3]}` + ";"
                        }
                        else{
                            this.bulkPublish[obj[1]] += `${obj[2]},${obj[3]}` + ";"
                        }
                    }  
                    return await this.redis.processQuery(query.toString())
                }
                else{
                    console.log("Redis-Client is not ready")
                }
            } 
            //wenn Command an remote EccoBox gerichtet
            else {
                if (this.listener != null) {
                    if (this.lookupService.find(eccoBoxName).length > 0){
                        this.dial( `{"eccoBoxClientId": "${eccoBoxClientId}", 
                                    "msgId" : "${messageId}",
                                    "eccoBoxName": "${eccoBoxName}", 
                                    "addr": "${this.myAddr}", 
                                    "query": ${query} }`, 
                                    eccoBoxName)
                    }
                }
                return `PLEASE WAIT`
            }
        } catch (err) {
            console.log(err)
            return `ERROR`
        }
    }

    unlisten(protocol: String) {
        this.node.unhandle(protocol)
    }


    stop = async () => {
        // stop libp2p
        await this.node.stop()
        console.log('libp2p has stopped')
        process.exit(0)
    }

    subscribe(eccoBoxName:String, sensor: String) {
        if(!this.isReady){
            console.log( "Can`t process request, Libp2p has not startet")
            return;
        }
        
        if (!this.node.pubsub.getTopics().includes(eccoBoxName + "." + sensor)) {
            this.node.pubsub.subscribe(eccoBoxName + "." + sensor)
        
            this.node.pubsub.on(eccoBoxName + "." + sensor, (msg) => {
                this.listener.subscribeMessage(eccoBoxName, sensor, toString(msg.data))
            })
        }
        console.log('I am subscribed to : %s', this.node.pubsub.getTopics())
    }

    unsubscribe(eccoBoxName:String, sensor: String) {
        this.node.pubsub.unsubscribe(eccoBoxName + "." + sensor)
        console.log('I am subscribed to : %s', this.node.pubsub.getTopics())
    }


    publish(sensor: String, msg: String) {
        this.node.pubsub.publish(this.myEccoBoxName + "." + sensor, fromString(msg)).catch(err => {
            console.error(err)
        })
    }

    //An Peer im Netz schicken
    async dial(msg: String, eccoBoxName: String ) {

        try {
            const { stream, protocol } = await this.node.dialProtocol(this.lookupService.find(eccoBoxName)[0].maddr, `/query/1.0.0`)
            pipe(
                // Read from stdin (the source)
                Readable.from(msg),

                (source) => (map(source, (string) => fromString(string))),

                // Write to the stream (the sink)
                stream.sink
            )
        } catch (e) {
            console.error("dialError " + e)
        }

    }



}