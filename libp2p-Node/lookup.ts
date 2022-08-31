import { Multiaddr } from "multiaddr";

class peerRefrence {
    maddr: Multiaddr
    eccoBoxName: String
    constructor(maddr, name) {
        this.maddr = maddr
        this.eccoBoxName = name
    }
}
export class lookupService {
    peerRefrences: Array<peerRefrence> = new Array()

    find(eccoBoxName: String): Array<peerRefrence> {
        return this.peerRefrences.filter(element => {
            return element.eccoBoxName == eccoBoxName
        })
    }

    register(maddr: Multiaddr, eccoBoxName: String): Boolean {
        let register = true

        if (this.peerRefrences.some(element => { return element.maddr.equals(maddr) })) //if see new maddr return true => send all my metadata
            register = false

        if (!this.peerRefrences.some(element => { return element.maddr.equals(maddr)})) {
            this.unregister(maddr.toString().substring(maddr.toString().lastIndexOf('/') + 1 , maddr.toString().length))
            this.peerRefrences.push(new peerRefrence(maddr, eccoBoxName))
        }
        return register
    }

    unregister(peerId: String) {
        const INDEX = this.peerRefrences.findIndex(element => {
            return element.maddr.toString().substring(element.maddr.toString().lastIndexOf('/') + 1, element.maddr.toString().length) == peerId
        })
        if (INDEX > -1)
            this.peerRefrences.splice(INDEX, 1)
    }

    getAllNames(): Array<String> {
        let eccoBoxNames: Array<String> = new Array()

        this.peerRefrences.forEach(element => {
            eccoBoxNames.push(element.eccoBoxName)
        })
        return eccoBoxNames
    }
}