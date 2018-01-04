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

// Set to 1 to get the IP behind an https proxy
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

async function canRequestTokens(ip, address) {
  if (whiteListIP.indexOf(ip) != -1) {
    return true
  }

  if (whiteListAddress.indexOf(address) != -1) {
    return true
  }
  
  const count = await Requests.find({
    $or: [{ ethereumAddress: address }, { ipAddress: ip }]
  }).count();

  return count <= maxRequestsPerDay
}

Meteor.startup(function() {
  reCAPTCHA.config({
      privatekey: privateKey
  });
});

Meteor.methods({
  faucetRequest: async function(address, captchaData, chain) {
    const clientIP = this.connection.clientAddress;

    console.log("IP:", clientIP)

    var verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(clientIP, captchaData);

    if (!verifyCaptchaResponse.success) {
      throw new Meteor.Error(
        400,
        "reCAPTCHA Failed: " + verifyCaptchaResponse.error
      )
    }

    const isValidIP = await canRequestTokens(clientIP)

    console.log("Valid: ", isValidIP)
    
    /*
    // Check for Request Limits
    if (!isValidIP) {
      throw new Meteor.Error(
        400,
        `You have requested more than ${maxRequestsPerDay} times in the last 24 hours. Please try again later`
      );
    }
    */
    
    // Transfer MLN-T and K-ETH
    try {
      console.log("-- Request MLN-T --")
      const res = await transferTo("MLN-T", address, MLN);

      console.log("-- Request KETH --")
      const amount = await web3.toWei(ETH, "ether");
      
      await web3.eth.sendTransaction({
        from: fundingNode,
        to: address,
        value: amount
      });

      Requests.insert({
        createdAt: new Date(),
        ethereumAddress: address,
        ipAddress: clientIP
      });
      
    } catch (e) {
      console.error(e)
      Raven.captureException(e);
      throw new Meteor.Error(400, "Transaction Error");
    }
  },

  getBalance: async function(account, chain) {
    const ethWei  = await getEtherBalance(account)
    const mln     = await getBalance('MLN-T', account);
    
    const eth = new BigNumber(fromWei(ethWei.toString()));

    return {
      eth: eth.toFixed(balancePrecision).toString(),
      mln: mln.toFixed(balancePrecision).toString()
    }
  }
});
