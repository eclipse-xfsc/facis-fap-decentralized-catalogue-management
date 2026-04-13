const fs = require('fs');

const tlsId = 'bb03000000000100';

const files = [
    'backend/src/M3_DCM-Harvester_flow.json',
    'backend/src/full_assembled_out_flow.json'
];

for (const file of files) {
    const flow = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Remove any wrongly-added tls-config if exists
    const badIdx = flow.findIndex(n => n.type === 'tls-config' && n.id === 'bb03000000000030');
    if (badIdx !== -1) flow.splice(badIdx, 1);

    // Add TLS config node with unique ID
    if (!flow.find(n => n.id === tlsId)) {
        flow.push({
            id: tlsId,
            type: "tls-config",
            name: "Allow self-signed certs",
            cert: "",
            key: "",
            ca: "",
            certname: "",
            keyname: "",
            caname: "",
            servername: "",
            verifyservercert: false,
            alpnprotocol: ""
        });
        console.log(file + ': Added TLS config node ' + tlsId);
    }

    // Update http request node to use the TLS config
    const httpNode = flow.find(n => n.id === 'bb03000000000025');
    if (httpNode) {
        httpNode.tls = tlsId;
        console.log(file + ': Set HTTP node tls = ' + tlsId);
    }

    fs.writeFileSync(file, JSON.stringify(flow, null, 4));
}

console.log('Done');
