# mstts.js

一个免费的微软Azure文本转语音，可直接导出mp3文件的nodejs库



## 使用方法

### 1.命令行
    ```
    npm install -g mstts-js
    mstts -i 在微信里搜索大帅老猿 -o ./test.mp3
    ```

### 2.代码中使用
    ```
    npm install mstts-js

    const mstts = require('mstts-js')

    const mp3buffer = await mstts.getTTSData(text,voice,express,role,rate,pitch);
    ```

## 关注作者

[哔哩哔哩](https://space.bilibili.com/422646817)

[稀土掘金](https://juejin.cn/user/2955079655898093)

[微信](https://open.weixin.qq.com/qr/code?username=ezfullstack)

enjoy！