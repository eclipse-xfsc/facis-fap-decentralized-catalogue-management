const fs = require('fs');
const flow = JSON.parse(fs.readFileSync('backend/src/M3_DCM-Harvester_flow.json', 'utf8'));

// 1. Update switch wiring: output 1 (startHarvest) -> bb03000000000024
const switchNode = flow.find(n => n.id === 'bb03000000000003');
if (switchNode && switchNode.wires && switchNode.wires[1]) {
    switchNode.wires[1] = ['bb03000000000024'];
    console.log('Updated switch wiring: startHarvest -> bb03000000000024');
}

// 2. Add "Resolve API sources" function node (2 outputs)
const resolveFunc = {
    id: "bb03000000000024",
    type: "function",
    z: "bb03000000000000",
    name: "Resolve API sources",
    func: "var catalogues = (msg.data && msg.data.catalogues) ? msg.data.catalogues : [];\nvar queue = [];\n\nfor (var i = 0; i < catalogues.length; i++) {\n    var cat = catalogues[i];\n    if (cat.sourceData) continue;\n\n    var endpoint = cat.baseEndpoint || '';\n    if (!endpoint) continue;\n\n    var authType = cat.auth || 'none';\n\n    if (authType === 'token-login' && cat.authLoginEndpoint) {\n        var body = (cat.authPayloadTemplate || '{\"email\":\"{{username}}\",\"password\":\"{{password}}\"}').replace('{{username}}', cat.authUsername || '').replace('{{password}}', cat.authPassword || '');\n        queue.push({ step: 'login', catIdx: i, url: cat.authLoginEndpoint, hdrs: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: body, tokenPath: cat.authTokenPath || 'token', tokenPrefix: cat.authTokenPrefix || 'Bearer' });\n    }\n\n    var hdrs = { 'Accept': 'application/json', 'Content-Type': 'application/json' };\n    if (authType === 'static-token' && cat.authStaticToken) {\n        hdrs['Authorization'] = (cat.authTokenPrefix || 'Bearer') + ' ' + cat.authStaticToken;\n    } else if (authType === 'api-key' && cat.authApiKey) {\n        hdrs[cat.authApiKeyHeader || 'X-API-Key'] = cat.authApiKey;\n    }\n    queue.push({ step: 'data', catIdx: i, url: endpoint, hdrs: hdrs, body: '', catName: cat.catalogName || '' });\n}\n\nif (queue.length === 0) {\n    return [null, msg];\n}\n\nmsg._fetchQueue = queue;\nmsg._fetchIdx = 0;\nvar first = queue[0];\nmsg.url = first.url;\nmsg.method = 'POST';\nmsg.headers = first.hdrs;\nmsg.payload = first.body || '';\nnode.warn('[harvest] Fetching API: ' + first.url);\nreturn [msg, null];",
    outputs: 2,
    timeout: 0,
    noerr: 0,
    initialize: "",
    finalize: "",
    libs: [],
    x: 680,
    y: 150,
    wires: [["bb03000000000025"], ["bb03000000000020"]]
};

// 3. Add HTTP request node
const httpNode = {
    id: "bb03000000000025",
    type: "http request",
    z: "bb03000000000000",
    name: "Fetch Catalogue API",
    method: "POST",
    ret: "obj",
    paytoqs: "ignore",
    url: "",
    tls: "",
    persist: false,
    proxy: "",
    insecureHTTPParser: false,
    authType: "",
    senderr: false,
    headers: [],
    x: 940,
    y: 120,
    wires: [["bb03000000000028"]]
};

// 4. Add "Handle API response + loop" function node (2 outputs)
const responseFunc = {
    id: "bb03000000000028",
    type: "function",
    z: "bb03000000000000",
    name: "Handle API response + loop",
    func: "var queue = msg._fetchQueue || [];\nvar idx = msg._fetchIdx || 0;\nvar current = queue[idx];\nvar catalogues = (msg.data && msg.data.catalogues) ? msg.data.catalogues : [];\n\nfunction resolvePath(obj, path) {\n    if (!path || !obj) return obj;\n    var parts = path.split('.');\n    var cur = obj;\n    for (var pi = 0; pi < parts.length; pi++) {\n        if (cur == null || typeof cur !== 'object') return undefined;\n        cur = cur[parts[pi]];\n    }\n    return cur;\n}\n\nif (current) {\n    var status = msg.statusCode || 0;\n    var data = msg.payload;\n    if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { data = null; } }\n\n    if (current.step === 'login') {\n        if (data && typeof data === 'object' && status >= 200 && status < 300) {\n            var token = resolvePath(data, current.tokenPath || 'token');\n            if (token) {\n                for (var j = idx + 1; j < queue.length; j++) {\n                    if (queue[j].catIdx === current.catIdx && queue[j].step === 'data') {\n                        queue[j].hdrs['Authorization'] = (current.tokenPrefix || 'Bearer') + ' ' + String(token);\n                        break;\n                    }\n                }\n            }\n        }\n        node.warn('[harvest] Login ' + (status >= 200 && status < 300 ? 'OK' : 'failed HTTP ' + status) + ' for catalogue idx ' + current.catIdx);\n    } else if (current.step === 'data') {\n        if (data && typeof data === 'object' && status >= 200 && status < 300) {\n            catalogues[current.catIdx].sourceData = data;\n            node.warn('[harvest] Fetched API data for ' + (current.catName || 'catalogue') + ' (HTTP ' + status + ')');\n        } else {\n            node.warn('[harvest] API fetch failed for ' + (current.catName || 'catalogue') + ' (HTTP ' + status + ')');\n        }\n    }\n}\n\nvar nextIdx = idx + 1;\nmsg._fetchIdx = nextIdx;\n\nif (nextIdx < queue.length) {\n    var next = queue[nextIdx];\n    msg.url = next.url;\n    msg.method = 'POST';\n    msg.headers = next.hdrs;\n    msg.payload = next.body || '';\n    node.warn('[harvest] Next fetch: ' + next.url);\n    return [msg, null];\n}\n\ndelete msg._fetchQueue;\ndelete msg._fetchIdx;\nmsg.payload = '';\nreturn [null, msg];",
    outputs: 2,
    timeout: 0,
    noerr: 0,
    initialize: "",
    finalize: "",
    libs: [],
    x: 1180,
    y: 120,
    wires: [["bb03000000000025"], ["bb03000000000020"]]
};

// 5. Add a comment node
const commentNode = {
    id: "bb03000000000029",
    type: "comment",
    z: "bb03000000000000",
    name: "API Fetch Loop: resolve remote API sources before harvest",
    info: "When a catalogue has baseEndpoint but no sourceData,\nfetches data via HTTP POST before harvesting.\nSupports auth: none, static-token, api-key, token-login.",
    x: 960,
    y: 80,
    wires: []
};

flow.push(resolveFunc, httpNode, responseFunc, commentNode);

fs.writeFileSync('backend/src/M3_DCM-Harvester_flow.json', JSON.stringify(flow, null, 4));
console.log('Flow updated successfully. Added 4 new nodes.');
