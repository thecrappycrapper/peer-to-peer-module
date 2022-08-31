import { inherits } from "util";

var redis = require('redis');


export class redisClient{

    client

    ready : Boolean = false

    constructor(){
        this.client = redis.createClient({ socket:{
            path: '/tmp/docker/redis.sock' 
        }});
    
        this.client.on('error', (err) => console.log('Redis Client Error', err));
        this.client.on('connected', () => console.log('Redis Client connected') );
        this.client.on('ready', () => this.ready = true );
        this.client.on('end', () => this.ready = false );


        this.init()
    }

    async init(){
        await this.client.connect();
    }

    async processQuery(msg: string){
        return await this.client.sendCommand(JSON.parse(msg))
    }
}