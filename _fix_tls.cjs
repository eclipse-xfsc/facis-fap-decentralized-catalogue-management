const fs = require('fs');

// Fix both M3 and assembled flow
const files = [
    'backend/src/M3_DCM-Harvester_flow.json',
    'backend/src/full_assembled_out_flow.json'
];

for (const file of files) {
    const flow = JSON.parse(fs.readFileSync(file, 'utf8'));

    // 1. Add TLS config node if not already present
    const tlsId = 'bb03000000000030';
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
        console.log(file + ': Added TLS config node');
    }

    // 2. Update the http request node to use the TLS config
    const httpNode = flow.find(n => n.id === 'bb03000000000025');
    if (httpNode) {
        httpNode.tls = tlsId;
        console.log(file + ': Updated http request node with TLS config');
    }

    fs.writeFileSync(file, JSON.stringify(flow, null, 4));
}

console.log('Done');
