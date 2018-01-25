const fs = require('fs');
const https = require('https');

const prepareAnalysis = async (confPath, isUrl = false, basePath, baseUrl, maxReject = 20, maxExampleValues = 20) => {
    let preparedConf = {}
    console.log("Verificating and preparing options : ")
    let baseConf = isUrl ? await returnNode(confPath) : require(confPath);
    console.log('\t config is retrieved, checking...')
    //verifs args and config

    if (basePath) {
        preparedConf.basePath = basePath
    } else if (baseUrl) {
        preparedConf.baseUrl = baseUrl
    } else if (baseConf.baseUrl) {
        preparedConf.baseUrl = baseConf.baseUrl
    } else if (baseConf.basePath) {
        preparedConf.basePath = baseConf.basePath
    } else {
        throw 'No source found to analyse, see commands options to give one'
    }
    console.log('\t base location is present in config')

    preparedConf.dataTypes = baseConf.dataTypes ? baseConf.dataTypes : [
        "string",
        "number",
        "boolean"
    ]

    if (baseConf.pathParts) {
        preparedConf.pathParts = baseConf.pathParts;
    } else {
        throw 'At least some pathPart must be given in the options files to generate a meaningful analyse. Soon frequency analysis will be able to generate it automatically'
    }
    console.log('\t pathParts found, minimal config OK, checking additional infos')

    preparedConf.constructedId = {}
    let itcs = []
    for (let itc of baseConf.idToConstruct) {
        if (itc.url) {
            let ids = await returnNode(itc.url);
            console.log(ids)
            preparedConf.constructedId[itc.name] = Object.keys(ids)
        } else {
            let ids = require(itc.path);
            preparedConf.constructedId[itc.name] = Object.keys(ids)
        }
    }
    console.log('\t ids reference constructed')

    preparedConf.badPaths = {}
    for (let path of baseConf.badPaths) {
        preparedConf.badPaths[path] = {
            reject: [],
            rejectCount: 0
        };
    }
    console.log('\t badPaths constructed')

    preparedConf.nodeOnlyPaths = {}
    for (let path of baseConf.nodeOnlyPaths) {
        preparedConf.nodeOnlyPaths[path] = {
            reject: [],
            rejectCount: 0
        };
    }
    console.log('\t nodeOnlyPaths constructed')

    preparedConf.rules = {}
    for (let rule of baseConf.rules) {
        preparedConf.rules[rule.path] = {
            rule: rule.rule,
            reject: [],
            rejectCount: 0
        };
    }
    console.log('\t rules constructed')
    preparedConf.maxReject = maxReject;
    preparedConf.maxExampleValues = maxExampleValues;

    return preparedConf
}

const analysis = async (config) => {
    console.log("beginning analysis")
    let base
    if (config.basePath) {
        base = require(config.basePath);
    } else if (config.baseUrl) {
        base = await returnNode(config.baseUrl);
    }

    console.log("\t base retrieved, analysing");
    let results = {};
    analyseNode(base, '', results, '', config);
    console.log("\t finished");
    return results;
}

const formatResult = (results, config, outName) => {
    if(!outName)
        outName = "brief-"+new Date().getTime()+".json"

    for (let nodeName in results) {
        let node = results[nodeName];
        if (node.props && Object.keys(node.props).length > 0) {
            for (let prop in node.props) {
                node.props[prop].percent = (node.props[prop].count / node.total) * 100;
            }
        } else {
            delete results[nodeName];
        }
    }
    results.badPaths = config.badPaths;
    results.rules = config.rules;
    results.nodeOnlyPaths = config.nodeOnlyPaths;

    fs.writeFileSync(outName, JSON.stringify(results, null, 4))
}

module.exports = { prepareAnalysis, analysis, formatResult }


//analysis support functions

const analyseNode = (node, nodeName, results, realFullPath, config) => {
    //console.log('analysing sub node ' + nodeName);
    for (let subNodeName in node) {
        if (config.dataTypes.includes(typeof node[subNodeName])) {
            if (config.nodeOnlyPaths[nodeName]) {
                let error = realFullPath + "/" + subNodeName
                if (config.nodeOnlyPaths[nodeName].reject.length < config.maxReject) {
                    config.nodeOnlyPaths[nodeName].reject.push(error);
                    config.nodeOnlyPaths[nodeName].rejectCount++;
                }
                return
            }
            let value = node[subNodeName];
            if (config.rules[nodeName + "/" + subNodeName]) {
                rule = config.rules[nodeName + "/" + subNodeName];
                if (typeof rule.rule === 'string') {
                    var re = new RegExp(rule.rule);
                    if (!re.test(value)) {
                        let error = realFullPath + "(regEx " + rule.rule + " failed for " + subNodeName + " with :" + value + ": found)"
                        if (rule.reject.length < config.maxReject) {
                            rule.reject.push(error);
                            rule.rejectCount++;
                        }
                        return
                    }
                } else if (rule.rule === true && !value) {
                    let error = realFullPath + "(no value for " + subNodeName + ")"
                    if (rule.reject.length < config.maxReject) {
                        rule.reject.push(error);
                        rule.rejectCount++;
                    }
                    return
                }
            }
            if (typeof value === 'string' && value.indexOf("data:image") !== -1) {
                value = "photo"
            }
            if (results[nodeName].props[subNodeName]) {
                results[nodeName].props[subNodeName].count++;
                if (!results[nodeName].props[subNodeName].values.includes(value) && results[nodeName].props[subNodeName].values.length < config.maxReject)
                    results[nodeName].props[subNodeName].values.push(value);
            } else {
                results[nodeName].props[subNodeName] = {
                    count: 1,
                    values: []
                }
            }
        } else if (typeof node[subNodeName] === 'object') {
            let subNode = node[subNodeName];
            let newNodeName = getNewNodePath(nodeName, subNodeName, config);
            if (config.badPaths[newNodeName]) {
                if (config.badPaths[newNodeName].reject.length < config.maxReject)
                config.badPaths[newNodeName].reject.push(realFullPath + '/' + subNodeName)
                config.badPaths[newNodeName].rejectCount++;
            } else {
                if (results[newNodeName]) {
                    results[newNodeName].total++;
                } else {
                    results[newNodeName] = {
                        props: {},
                        total: 1
                    };
                }
                analyseNode(subNode, newNodeName, results, realFullPath + '/' + subNodeName, config);
            }
        } else {
            console.log("Unexcepted node type " + typeof node[subNodeName] + "for " + subNodeName)
        }
    }
}

const getNewNodePath = (nodeName, subNodeName, config) => {
    if (config.pathParts.includes(subNodeName)) {
        return (nodeName + "/" + subNodeName)
    }
    for (let idsName in config.constructedId) {
        if (config.constructedId[idsName].includes(subNodeName)) {
            return (nodeName + "/" + idsName)
        }
    }
    return (nodeName + "/" + "*")
}


//general support function
function returnNode(url) {
    return new Promise(function (resolve, reject) {
        https.get(url, function (res) {
            var body = '';

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                var datas = JSON.parse(body);
                resolve(datas)
            });
        }).on('error', function (e) {
            reject(url, e)
        });
    })
}