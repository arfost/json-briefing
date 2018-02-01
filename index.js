#! /usr/bin/env node

const program = require('commander');
// Require logic.js file and extract controller functions using JS destructuring assignment
const { prepareAnalysis, analysis, formatResult, fanalysis } = require('./scout.js');
const { configFromFrequencies } = require('./analyst.js');

const packageInfo = require('./package.json')

program
    .version(packageInfo.version)
    .description('Json analyse and briefing tool');

program
    .command('analyse <configPath> [maxReject] [maxExampleValues]')
    .alias('a')
    .option('-d, --distant', 'get config from a url instead of local file')
    .option('-u, --url <url>', 'an url to retrieve the json')
    .option('-l, --local <path>', 'a local path to retrieve the json')
    .option('-o, --outname <name>', 'specify an output file name')
    .description('analyse json datas according to a given configuration')
    .action((...args) => {
        callAsPromise(analyseCommand, args);
    });

    program
    .command('f_analyse <path>')
    .alias('fa')
    .option('-m --mode <mode>', 'Using a local file or a url as source', /^(local|url)$/i, 'url')
    .option('-o, --outname <name>', 'specify an output file name')
    .option('-d, --discardLower <discardLower>', 'All nodes with lower frequency than that won\'t be in final result', 10)
    .description('run a frenquency analysis to try to find the nodes wich are part of a path, and one which are ids, and determine json structure.')
    .action((...args) => {
        callAsPromise(frenquencyCommand, args);
    });


    program
    .command('create_config [pathToFrequenciesFile]')
    .alias('cc')
    .option('-o, --outname <name>', 'specify an output file name')
    .description('Ask a suite of questions to help generate a config file, either form scratch or from a frequecy analysis result file.')
    .action((...args) => {
        callAsPromise(confFromFrequencies, args);
    });


const callAsPromise = (toCall, args) => {
    toCall(...args).then(()=>{process.exit()}).catch(err => {
        console.error(err)
        process.exit()
    })
}

const analyseCommand = async (configPath, maxReject, maxExampleValues, cmd) => {
    let config = await prepareAnalysis(configPath, cmd.distant, cmd.local, cmd.url, maxReject, maxExampleValues);
    let results = await analysis(config)
    await formatResult(results, config, cmd.outname)

}

const frenquencyCommand = async (path, cmd) => {
    await fanalysis(path, cmd.mode, cmd.discardLower, cmd.outname)
}

const confFromFrequencies = async (path, cmd) => {
    await configFromFrequencies(path, cmd.outname)
}
program.parse(process.argv);