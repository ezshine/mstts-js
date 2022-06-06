#!/usr/bin/env node

/*
作者：大帅老猿
微信：dashuailaoyuan
github：https://github.com/ezshine

使用方法

1. 命令行
npm install -g mstts-js
mstts -i 请在微信里搜索大帅老猿 -o ./test.mp3

2. require
npm install mstts-js
const mstts = require('mstts-js')

const mp3buffer = await mstts.getTTSData(text,voice,express,role,rate,pitch);
*/

const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const ws = require("nodejs-websocket");

async function getAuthToken(){
    //https://azure.microsoft.com/en-gb/services/cognitive-services/text-to-speech/

    const res = await axios.get("https://azure.microsoft.com/en-gb/services/cognitive-services/text-to-speech/");

    const reg = /token: \"(.*?)\"/;

    if(reg.test(res.data)){
        const token = RegExp.$1;

        return token;
    }
}

function getXTime(){
    return new Date().toISOString();
}

function wssSend(connect,msg){
    return new Promise((resolve,reject)=>{
        connect.send(msg,resolve);
    })
}

function wssConnect(url){
    return new Promise((resolve,reject)=>{
        const connect = ws.connect(url,function(){
            resolve(connect);
        });
    });
}

async function getTTSData(text,voice='CN-Yunxi',express='general',role='',rate=0,pitch=0){
    if(!express)express='general';
    const SSML = `
    <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">
        <voice name="zh-${voice}Neural">
            <mstts:express-as style="${express}" ${role!=''?('role=\"'+role+'\"'):''}>
                <prosody rate="${rate}%" pitch="${pitch}%">
                ${text}
                </prosody>
            </mstts:express-as>
        </voice>
    </speak>
    `
    console.log(SSML);

    console.log("获取Token...");
    const Authorization = await getAuthToken();
    const XConnectionId = uuidv4().toUpperCase();

    console.log("创建webscoket连接...");
    const connect = await wssConnect(`wss://eastus.tts.speech.microsoft.com/cognitiveservices/websocket/v1?Authorization=${Authorization}&X-ConnectionId=${XConnectionId}`);

    console.log("第1次上报...");
    const message_1 = `Path: speech.config\r\nX-RequestId: ${XConnectionId}\r\nX-Timestamp: ${getXTime()}\r\nContent-Type: application/json\r\n\r\n{"context":{"system":{"name":"SpeechSDK","version":"1.19.0","build":"JavaScript","lang":"JavaScript","os":{"platform":"Browser/Linux x86_64","name":"Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0","version":"5.0 (X11)"}}}}`;
    await wssSend(connect,message_1);

    console.log("第2次上报...");
    const message_2 = `Path: synthesis.context\r\nX-RequestId: ${XConnectionId}\r\nX-Timestamp: ${getXTime()}\r\nContent-Type: application/json\r\n\r\n{"synthesis":{"audio":{"metadataOptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"audio-24khz-160kbitrate-mono-mp3"}}}`;
    await wssSend(connect,message_2);

    console.log("第3次上报...");
    const message_3 = `Path: ssml\r\nX-RequestId: ${XConnectionId}\r\nX-Timestamp: ${getXTime()}\r\nContent-Type: application/ssml+xml\r\n\r\n${SSML}`
    await wssSend(connect,message_3);

    return new Promise((resolve,reject)=>{
        let final_data=Buffer.alloc(0);
        connect.on("text", (data) => {
            if(data.indexOf("Path:turn.end")>=0){
                console.log("已完成");
                connect.close();
                resolve(final_data);
            }
        })
        connect.on("binary", function (response) {
            console.log("正在接收数据...");
            let data = Buffer.alloc(0);
            response.on("readable", function () {
                const newData = response.read()
                if (newData)data = Buffer.concat([data, newData], data.length+newData.length);
            })
            response.on("end", function () {
                const index = data.toString().indexOf("Path:audio")+10;
                const cmbData = data.slice(index+2);
                final_data = Buffer.concat([final_data,cmbData]);
            })
        });
        connect.on("close", function (code, reason) {
            
        })
    })
}

async function getVoiceList(){
    //https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list?Authorization=token
    //todo
}

const voices = {
    "CN":{
        "晓晓":"Xiaoxiao",
        "晓辰":"Xiaochen",
        "晓涵":"Xiaohan",
        "晓墨":"Xiaomo",
        "晓秋":"Xiaoqiu",
        "晓睿":"Xiaorui",
        "晓双":"Xiaoshuang",
        "晓萱":"Xiaoxuan",
        "晓颜":"Xiaoyan",
        "晓悠":"Xiaoyou",
        "云扬":"Yunyang",
        "云希":"Yunxi",
        "云野":"Yunye",
        "辽宁晓北":"LN-Xiaobei",
        "四川云希":"SC-Yunxi",
        "云皓":"Yunhao",
        "云健":"Yunjian"
    },
    "TW":{
        "曉臻":"HsiaoChen",
        "曉雨":"HsiaoYu",
        "雲哲":"YunJhe"
    },
    "HK":{
        "曉曼":"HiuMaan",
        "曉佳":"HiuGaai",
        "雲龍":"WanLung"
    }
}

async function showMenu(){
    const fs = require("fs");
    const inquirer = require('inquirer');
    const argv = require('minimist')(process.argv.slice(2));

    let text = argv.i||'请在微信里搜索大帅老猿';

    let langChoices = {
        "中文普通话":"CN",
        "中国台湾-国语":"TW",
        "中国香港-粤语":"HK"
    };
    res = await inquirer.prompt([
        {
          name:"请选择语言",
          type:"list",
          choices:Object.keys(langChoices),
          required:true,
        }
    ])
    let lang = langChoices[res['请选择语言']];

    res = await inquirer.prompt([
        {
          name:"请选择语音",
          type:"list",
          choices:Object.keys(voices[lang]),
          required:true,
        }
    ])

    let voice = voices[lang][res['请选择语音']];

    const mp3buffer = await getTTSData(text,lang+"-"+voice);

    let output = argv.o||"./"+lang+"-"+voice+"-"+(new Date().getTime())+".mp3"

    fs.writeFileSync(output,mp3buffer);
}

exports.getTTSData = getTTSData;

if(require.main === module) {
    showMenu();
}