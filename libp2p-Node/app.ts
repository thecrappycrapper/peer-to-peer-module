
import { p2pNode } from './libp2p'
import { udsServer } from './udsServer'

async function main() {
    const p2p = new p2pNode(process.env.NODE_NAME.replace('"',''))
    const server = new udsServer(p2p)
}
main()



