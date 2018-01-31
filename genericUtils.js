const {promisify} = require('util')
const { ui } = require('inquirer');
const fs = require('fs')
const https = require('https');


const returnFile = (path, encoding='utf8') =>{
    return new Promise((res, rej)=>{
        fs.readFile(path , encoding, (err, data) => {
            //Handle Error
           if(!err) {
             //Send back as Response
              res(JSON.parse(data));
            }else {
               rej(err)
            }
       });
    })
}

const returnNode = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
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

const writeFile = (path, data) =>{
    return new Promise((res, rej)=>{
        fs.writeFile(path , data, (err) => {
            //Handle Error
           if(!err) {
              res(path);
            }else {
               rej(err)
            }
       });
    })
}


let loader = false;
let oldMessage = false;

const messager = (message, mode='default') => {
    
    if(loader)
        loader()
    
    
    switch(mode){
        case 'loader':
            let bar = new ui.BottomBar();
            let steps = '|/-\\'
            let animStep = 0;
            oldMessage = message+" - finished";
            bar.updateBottomBar(message + " " + steps[animStep]);
            let inter = setInterval(() => {
                animStep++;
                if (animStep === steps.length)
                    animStep = 0;
        
                bar.updateBottomBar(message + " " + steps[animStep]);
            }, 300)
            loader = ()=>{
                clearInterval(inter);
                loader = false;
                bar.updateBottomBar("\n"+oldMessage+"\n")
            }
        break;
        case 'step':
            //oldMessage = "\t * "+message.toUpperCase()+ " * ";
            console.log("\t * "+message.toUpperCase()+ " * \n");
        break;
        default:
            //oldMessage = message;
            console.log(message+"\n")
    }
}

module.exports = { returnFile, returnNode, writeFile, messager }