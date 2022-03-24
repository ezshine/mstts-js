const axios = require("axios");
const cheerio = require("cheerio");
const { v4: uuidv4 } = require('uuid');
const ws = require("nodejs-websocket");
const fs = require("fs");

async function getAuthToken(){
    //https://azure.microsoft.com/en-gb/services/cognitive-services/text-to-speech/

    const res = await axios.get("https://azure.microsoft.com/en-gb/services/cognitive-services/text-to-speech/");

    const reg = RegExp('token: \"(.*?)\"');

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
    const SSML = `
    <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">
        <voice name="zh-${voice}Neural">
            <mstts:express-as style="${express}">
                <prosody rate="${rate}%" pitch="${pitch}%">
                ${text}
                </prosody>
            </mstts:express-as>
        </voice>
    </speak>
    `

    const auth_token = await getAuthToken();
    const req_id = uuidv4().toUpperCase();

    const connect = await wssConnect(`wss://eastus.tts.speech.microsoft.com/cognitiveservices/websocket/v1?Authorization=${auth_token}&X-ConnectionId=${req_id}`);

    const payload_1 = '{"context":{"system":{"name":"SpeechSDK","version":"1.12.1-rc.1","build":"JavaScript","lang":"JavaScript","os":{"platform":"Browser/Linux x86_64","name":"Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0","version":"5.0 (X11)"}}}}'
    const message_1 = 'Path : speech.config\r\nX-RequestId: ' + req_id + '\r\nX-Timestamp: ' + 
            getXTime() + '\r\nContent-Type: application/json\r\n\r\n' + payload_1;
    await wssSend(connect,message_1);

    const payload_2 = '{"synthesis":{"audio":{"metadataOptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"audio-16khz-32kbitrate-mono-mp3"}}}'
    const message_2 = 'Path : synthesis.context\r\nX-RequestId: ' + req_id + '\r\nX-Timestamp: ' + 
            getXTime() + '\r\nContent-Type: application/json\r\n\r\n' + payload_2;

    await wssSend(connect,message_2);

    const message_3 = 'Path: ssml\r\nX-RequestId: ' + req_id + '\r\nX-Timestamp: ' + 
            getXTime() + '\r\nContent-Type: application/ssml+xml\r\n\r\n' + SSML
    await wssSend(connect,message_3);

    let final_data=Buffer.alloc(0);
    connect.on("text", (data) => {
        if(data.indexOf("Path:turn.end")>=0){
            fs.writeFileSync("test.mp3",final_data);
            connect.close();
        }
    })
    connect.on("binary", function (response) {
        let data = Buffer.alloc(0);
		response.on("readable", function () {
		    const newData = response.read()
		    if (newData)data = Buffer.concat([data, newData], data.length+newData.length);
		})
		response.on("end", function () {
            const index = data.toString().indexOf("Path:audio")+10;
            final_data = Buffer.concat([final_data,data.slice(index)]);
		})
	});
	connect.on("close", function (code, reason) {
		
	})
}

const voices = {
    "CN":[
        "Xiaoxiao",
        "Xiaochen",
        "Xiaohan",
        "Xiaomo",
        "Xiaoqiu",
        "Xiaorui",
        "Xiaoshuang",
        "Xiaoxuan",
        "Xiaoyan",
        "Xiaoyou",
        "Yunyang",
        "Yunxi",
        "Yunye"
    ],
    "TW":[
        "Hsiaochen",
        "Hsiaoyu",
        "Yunjhe"
    ],
    "HK":[
        "Hiumaan",
        "Hiugaai",
        "Wanlung"
    ]
}

const emotions=[
    "general",
    "calm",
    "fearful",
    "cheerful",
    "disgruntled",
    "serious",
    "angry",
    "sad",
    "gentle",
    "affectinate",
    "embarrassed"
]

getTTSData("猿创营的兄弟们早上好！","HK-"+voices["HK"][2],"sad");

