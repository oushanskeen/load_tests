// const fetch = require("node-fetch")
import fs from 'fs'

const chains = {
    "canto":7700,
    "test-canto":7701,
    "fantom":250,
    "nova":42170,
    "gnosis":100,
    "optimism":10,
    "arbitrum":42161
}
const params = ["address","block","contract","transaction"]

const txsAmount = 100

const blockTxsRequest = async (txsAmount,chainId) => {

    const response =
        await fetch("https://explorer-graph-prod.dexguru.biz/graphql", {
            "credentials": "omit",
            "headers": {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "content-type": "application/json",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site"
            },
            "referrer": "https://canto.dex.guru/",
            "body": "{\"operationName\":\"Transactions\",\"variables\":{},\"query\":\"query Transactions {\\n  transactions(first: " + txsAmount + ", chainId: " + chainId + ") {\\n    hash\\n    blockHash\\n    blockNumber\\n    blockTimestamp\\n    fromAddress\\n    toAddress\\n    value\\n    __typename\\n  }\\n}\"}",
            "method": "POST",
            "mode": "cors"
        });
        const data = await response.json()
        // console.log("/getAllAddress.js/blockTxsRequest data: ", data.data)

    return data.data
}

const f = async () => {
    let acc = {}
    for (let chain in chains){
        acc[chain] = {
            adresses:[],
            txs: [],
            blockNumbers: []
        }
        let blockNumber = null
        let txs = await blockTxsRequest(txsAmount,chains[chain])
        txs = txs.transactions
        for (let tx in txs){
            // console.log("TX: ", txs[tx])
            acc[chain].adresses.push(txs[tx].fromAddress)
            acc[chain].adresses.push(txs[tx].toAddress)
            acc[chain].txs.push(txs[tx].hash)
            blockNumber = txs[tx].blockNumber
        }

        for(let i = 1; i < txsAmount*2; i++){
          acc[chain].blockNumbers.push(blockNumber - i)
        }

        acc[chain].txs = [... new Set(acc[chain].txs)]
        acc[chain].adresses = [... new Set(acc[chain].adresses)]
        acc[chain].blockNumbers.push([... new Set(acc[chain].blockNumbers)])
        // console.log("Acc: ", acc)
    }
    return acc
}
const pool = f()

const getAddressType = async (address) => {

    const response = await fetch("https://explorer-graph-stage.dexguru.biz/graphql", {
    "credentials": "include",
    "headers": {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site"
    },
    "body": "{\"query\":\"query MyQuery {\\n  address(address: \\\"" + address + "\\\") {\\n    name\\n    address\\n    addressType\\n  }\\n}\",\"operationName\":\"MyQuery\"}",
    "method": "POST",
    "mode": "cors"
});

    const data = await response.json()
    // console.log("Address type: ", data)
    // console.log("Address type: ", data.data)
    return data.data
}

let urls = []
const makeUrls = async (p) => {
  let pool = await p
  for(let chain in chains){
    // console.log("Me pool: ", pool[chain])
    let adresses = pool[chain].adresses
    let txs = pool[chain].txs
    let blocks = pool[chain].blockNumbers

    let addressTypesPool = []
    for(let address in adresses){
      const response = await getAddressType(adresses[address])
      // const data = response
      // console.log("addressTypesPool: ", response)
      addressTypesPool.push({[response?.address.address]:response?.address.addressType})
    }
    console.log("Pool: ", addressTypesPool)

    console.log("WHOLE LENGTH: ", adresses.length + txs.length + blocks.length)
    console.log("adresses.length: ", adresses.length)
    console.log("txs.length: ", txs.length)
    console.log("blocks.length: ", blocks.length, "\n")



    // urls = [...urls,...adresses.map(e => chain + "-stage.dexguru.biz/address/" + e)]
    // urls = [...urls,...txs.map(e => chain + "-stage.dexguru.biz/tx/" + e)]
    // urls = [...urls,...blocks.map(e => chain + "-stage.dexguru.biz/block/" + e)]
    urls = [...urls,...adresses.map(e => chain + ".dex.guru/address/" + e)]
    urls = [...urls,...txs.map(e => chain + ".dex.guru/tx/" + e)]
    urls = [...urls,...blocks.map(e => chain + ".dex.guru/block/" + e)]
  }

  for(let url in urls){
    const fileAddress = './networks/' + urls[url].split(".")[0] + ".csv"
    // console.log("Url: ", urls[url].split(".")[0])
      fs.appendFile(fileAddress, "https://" + urls[url] + "\n", err => {
          if (err) {
              console.error(err);
          }
      });
  }

}
makeUrls(pool)
