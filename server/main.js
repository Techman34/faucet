
import { Meteor } from "meteor/meteor";
import { getChain } from './melon'
import { canRequestTokens, logRequest } from './rate_limit'

import { ETH, MLN } from '../lib/constants'

const maxRequestsPerDay = Meteor.settings.whitelist.maxRequestsPerDay;
const captchaPrivateKey = Meteor.settings.captcha.privateKey;

const Raven = require("raven");

// Set to 1 to get the IP behind an https proxy
process.env.HTTP_FORWARDED_COUNT = 1;

// Configure Sentry DSN with Raven
Raven.config(
  "https://***@sentry.io/243362"
).install();

Meteor.startup(function() {
  reCAPTCHA.config({
      privatekey: captchaPrivateKey
  });
});

function error(msg) {
  throw new Meteor.Error(400, msg)
}

function internalError(err) {
  Raven.captureException(err)
  error("Transaction Error")
}

Meteor.methods({
  faucetRequest: async function(address, captchaData, chainName) {
    const clientIP = this.connection.clientAddress;

    // CAPTCHA

    var verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(clientIP, captchaData);
    if (!verifyCaptchaResponse.success) {
      error("reCAPTCHA Failed: " + verifyCaptchaResponse.error)
    }

    // RATE LIMIT

    const isValidIP = await canRequestTokens(clientIP)
    if (!isValidIP) {
      error(`You have requested more than ${maxRequestsPerDay} times in the last 24 hours. Please try again later`);
    }

    // CHAIN

    const chain = getChain(chainName)
    if (chain == undefined) {
      error(`Chain with name ${chainName} not found on server`)
    }

    // BALANCE

    try {
      const {eth, mln} = await chain.getBalance(account)

      // Check ether
      if (eth.lessThan(ETH)) {
        internalError(`Not enough eth on account ${account}. Current balance: ${eth.toString()}`)
      }

      // Check melon
      if (mln.lessThan(MLN)) {
        internalError(`Not enough mln on account ${account}. Current balance: ${mln.toString()}`)
      }
    } catch(err) {
      internalError(err)
    }
    
    // TRANSFER

    try {
      await chain.transfer(account, ETH, MLN)
    } catch(err) {
      internalError(err)
    }

    logRequest(account, clientIP)
  },

  getBalance: async function(account, chainName) {
    const chain = getChain(chainName)
    if (chain == undefined) {
      error(`Chain with name ${chainName} not found on server`)
    }

    try {
      const {eth, mln} = await chain.getBalance(account)

      return {
        eth: eth.toString(),
        mln: mln.toString()
      }
    } catch(err) {
      internalError(err)
    }
  }
});
