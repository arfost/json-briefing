const {messager, returnNode, returnFile, writeFile} = require('./genericUtils.js')

const prepareAnalysis = async (confPath, isUrl = false, basePath, baseUrl, maxReject = 20, maxExampleValues = 20) => {
    let preparedConf = {}
    messager("Checking and preparing options", 'step')
    messager('retrieving config ', 'loader')
    let baseConf = isUrl ? await returnNode(confPath) : await returnFile(confPath);
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
    messager('base location is present in config : '+(preparedConf.basePath ? preparedConf.basePath : preparedConf.baseUrl))

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
    messager('pathParts found, minimal config OK, checking additional infos')

    preparedConf.constructedId = {}
    if(baseConf.idToConstruct){
        for (let itc of baseConf.idToConstruct) {
            if (itc.url) {
                let ids = await returnNode(itc.url);
                preparedConf.constructedId[itc.name] = Object.keys(ids)
            } else {
                let ids = require(itc.path);
                preparedConf.constructedId[itc.name] = Object.keys(ids)
            }
        }
        messager('ids reference constructed')
    }
    

    preparedConf.badPaths = {}
    if(baseConf.badPaths){
        for (let path of baseConf.badPaths) {
            preparedConf.badPaths[path] = {
                reject: [],
                rejectCount: 0
            };
        }
        messager('badPaths constructed')
    }
    
    

    preparedConf.nodeOnlyPaths = {}
    if(baseConf.nodeOnlyPaths){
        for (let path of baseConf.nodeOnlyPaths) {
            preparedConf.nodeOnlyPaths[path] = {
                reject: [],
                rejectCount: 0
            };
        }
        messager('nodeOnlyPaths constructed')
    }
    

    preparedConf.rules = {}
    if(baseConf.nodeOnlyPaths){
        for (let rule of baseConf.rules) {
            preparedConf.rules[rule.path] = {
                rule: rule.rule,
                reject: [],
                rejectCount: 0
            };
        }
        messager('rules constructed')
    }
    
    preparedConf.maxReject = maxReject;
    preparedConf.maxExampleValues = maxExampleValues;

    return preparedConf
}

const analysis = async (config) => {
    messager("beginning analysis", 'step')
    let base
    messager("retrieving json datas", 'loader')
    if (config.basePath) {
        base = require(config.basePath);
    } else if (config.baseUrl) {
        base = await returnNode(config.baseUrl);
    }

    messager("analysing", 'loader')
    let results = {};
    analyseNode(base, '', results, '', config);
    return results;
}

const fanalysis = async (path, mode, discardLower, outname="fanalysis-"+new Date().getTime()+".json") => {
    
    messager("Beginning frequency analysis", 'step');
    messager("Retrieving datas", 'loader');
    let base
    try{
        if (mode === "local") {
            base = await returnFile(path);
        } else {
            base = await returnNode(path);
        }
    }catch(err){
        messager("An error occured retrieving the file, the process will now exit : "+err, 'error');
        return
    }
    messager("base retrieved, analysing", 'loader');
    messager("that's some beautifuls datas sir");
    let frequencies = {};
    countNodeFrequency(base, frequencies, []);
    messager("frequencies counted, cleaning lower than "+discardLower+" and exporting results", 'loader');
    try{
        let file = await writeFile(outname, JSON.stringify(cleanFrequencies(frequencies, discardLower), null, 4));
        messager("frequencies analysis file available at : "+file, 'step');
        return 'ok';
    }catch(err){
        messager("An error occured writing the result file, the process will now exit : "+err, 'error');
        throw new Error('frequency analysis failed...')
    }
}

const formatResult = async (results, config, outName="brief-"+new Date().getTime()+".json") => {
    messager("formating results",'loader')
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

    try{
        let file = await writeFile(outName, JSON.stringify(results, null, 4));
        messager("json analysis file available at : "+file, 'step');
        return 'ok';
    }catch(err){
        messager("An error occured writing the result file, the process will now exit : "+err, 'error');
        throw new Error('frequency analysis failed...')
    }
}

module.exports = { prepareAnalysis, analysis, formatResult, fanalysis }


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
                value = "raw img"
            }
            if (results[nodeName] && results[nodeName].props[subNodeName]) {
                results[nodeName].props[subNodeName].count++;
                if (!results[nodeName].props[subNodeName].values.includes(value) && results[nodeName].props[subNodeName].values.length < config.maxReject)
                    results[nodeName].props[subNodeName].values.push(value);
            } else {
                if(!results[nodeName]){
                    results[nodeName] = {}
                    results[nodeName].props = {}
                }
                
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
            messager("Unexcepted node type " + typeof node[subNodeName] + "for " + subNodeName)
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

//frequency analysis support functions
const countNodeFrequency = (node, frequencies, parentsNodes)=>{
    for (let subNodeName in node){
        if(typeof node[subNodeName] === 'object'){
            for(let oldNode of parentsNodes){
                frequencies[oldNode] ? frequencies[oldNode] += 1 : frequencies[oldNode] = 1;
            }
            countNodeFrequency(node[subNodeName], frequencies, [...parentsNodes, subNodeName]);
        }
    }
}

// //frequency analysis support functions
// const countNodeFrequency = (node, frequencies, parentsNodes)=>{
//     for (let subNodeName in node){
//         if(typeof node[subNodeName] === 'object'){
//             frequencies[parentsNodes] ? frequencies[parentsNodes] += 1 : frequencies[oldNode] = 1;
//             countNodeFrequency(node[subNodeName], frequencies, subNodeName);
//         }
//     }
// }

const cleanFrequencies = (frequencies, min)=>{
    let results = {}
    for (let node in frequencies){
        if(frequencies[node] >= min){
            results[frequencies[node]] ? results[frequencies[node]].push(node) : results[frequencies[node]] = [node]
        }
    }
    return results;
}
