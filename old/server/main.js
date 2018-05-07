import { Meteor } from "meteor/meteor";
import { setup, getBalance, transferTo } from "@melonproject/melon.js";
import BigNumber from "bignumber.js";
import Web3 from "web3";

const privateKey = Meteor.settings.captcha.privateKey;

const Raven = require("raven");

// Quantites to be transfered
import {ETH, MLN} from '../imports/lib/constants'
import {fromWei} from '../imports/lib/utils'

const fundingNode = "0x00590D7FBC805B7882788D71aFBE7eC2deaF03CA";
const maxRequestsPerDay = 3;
const balancePrecision  = 3;

// Only valid when used with the https proxy
// Saving requesting ethereum address and IP address to limit faucet requests
process.env.HTTP_FORWARDED_COUNT = 1;

let Requests = new Meteor.Collection("Requests");
Requests._ensureIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Configure Sentry DSN with Raven
Raven.config(
  "https://***@sentry.io/243362"
).install();

// Initialize web3 object
if (typeof web3 === "undefined") {
  web3 = new Web3(new Web3.providers.HttpProvider("http://172.17.0.1:8545"));
}

setup.init({
  web3,
  daemonAddress: fundingNode,
  defaultAccount: fundingNode,
  tracer: ({ timestamp, message, category }) => {
    console.log(timestamp.toISOString(), `[${category}]`, message);
  }
});

function getEtherBalance(account) {
  return new Promise(function(resolve,reject){
    web3.eth.getBalance(account, (err, res) => {
      if (err) reject(err)
      resolve(res)
    });
  })
}

const whiteListAddress = Meteor.settings.whitelist.address;

const whiteListIP = Meteor.settings.whitelist.ip;

console.log("-- whitelist address")
console.log(whiteListAddress)

console.log("-- whitelist ip")
console.log(whiteListIP)

async function canRequestTokens(ip, address) {
  if (whiteListIP.indexOf(ip) != -1) {
    console.log("-- whitelisted ip --")
    return true
  }

  if (whiteListAddress.indexOf(address) != -1) {
    console.log("-- whitelisted address --")
    return true
  }
  
  const count = await Requests.find({
    $or: [{ ethereumAddress: address }, { ipAddress: ip }]
  }).count();

  console.log("Count " + count)
  return count <= maxRequestsPerDay-1
}

function getTransactionReceiptMined(txnHash, interval) {
  var transactionReceiptAsync;
  interval = interval ? interval : 500;

  transactionReceiptAsync = function(txnHash, resolve, reject) {
    try {
      var receipt = web3.eth.getTransactionReceipt(txnHash);
        if (receipt == null) {
          setTimeout(function () {
              transactionReceiptAsync(txnHash, resolve, reject);
          }, interval);
        } else {
          resolve(receipt);
        }
    } catch(e) {
      reject(e);
    }
  };

  if (Array.isArray(txnHash)) {
    var promises = [];
    txnHash.forEach(function (oneTxHash) {
      promises.push(web3.eth.getTransactionReceiptMined(oneTxHash, interval));
    });

    return Promise.all(promises);
  } else {
    return new Promise(function (resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject);
    });
  }
};

Meteor.startup(function() {
  reCAPTCHA.config({
      privatekey: privateKey
  });
});

Meteor.methods({
  faucetRequest: async function(address, captchaData) {
    const clientIP = this.connection.clientAddress;

    console.log("IP:", clientIP)
    console.log("Address: " + address)

    var verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(clientIP, captchaData);

    if (!verifyCaptchaResponse.success) {
      throw new Meteor.Error(
        400,
        "reCAPTCHA Failed: " + verifyCaptchaResponse.error
      )
    }

    const isValidIP = await canRequestTokens(clientIP, address)

    console.log("Valid: ", isValidIP)
    
    // Check for Request Limits
    if (!isValidIP) {
      throw new Meteor.Error(
        400,
        `You have requested more than ${maxRequestsPerDay} times in the last 24 hours. Please try again later`
      );
    }

    let err = undefined;

    // Transfer MLN-T and K-ETH
    try {
      console.log("-- Request MLN-T --")
      console.log(MLN)

      const res = await transferTo("MLN-T", address, MLN);

      console.log("-- Request KETH --")
      console.log(ETH)

      const amount = await web3.toWei(ETH, "ether");
      
      const txReceipt = await web3.eth.sendTransaction({
        from: fundingNode,
        to: address,
        value: amount
      });
      
      // wait for the transaction to finish
      
      console.log("- wait for transaction -")
      console.log(txReceipt)

      await getTransactionReceiptMined(txReceipt)

      console.log("- done -")

    } catch (e) {
      err = e;
    }

    Requests.insert({
      createdAt: new Date(),
      ethereumAddress: address,
      ipAddress: clientIP
    });

    if (err != undefined) {
      Raven.captureException(err);
      throw new Meteor.Error(400, "Transaction Error");
    }
    
  },

  getBalance: async function(account) {
    console.log("- get balance -")

    const ethWei  = await getEtherBalance(account)
    const mln     = await getBalance('MLN-T', account);
  
    const eth = new BigNumber(fromWei(ethWei.toString()));
    
    console.log(ethWei)
    
    return {
      eth: eth.toFixed(balancePrecision).toString(),
      mln: mln.toFixed(balancePrecision).toString()
    }
  }
});
