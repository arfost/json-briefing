#! /usr/bin/env node

const program = require('commander');
// Require logic.js file and extract controller functions using JS destructuring assignment
const { prepareAnalysis, analysis, formatResult } = require('./scout.js');

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
  .option('-o <name>, --outname <name>', 'specify an output file name')
  .description('analyse json datas according to a given configuration')
  .action((...args)=>{
    analyseCommand(...args).catch(err=>{
        console.error(err)
    })
  });


 const analyseCommand = async (configPath, maxReject, maxExampleValues, cmd) => {
    let config = await prepareAnalysis(configPath, cmd.distant, cmd.path, cmd.url, maxReject, maxExampleValues);
    let results = await analysis(config)
    await formatResult(results, config, cmd.outname)

  }
program.parse(process.argv);