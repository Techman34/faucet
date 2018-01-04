
import { Template } from "meteor/templating";
import { Session } from "meteor/session";
import "./dashboard.html";

import {faucetRequest, getBalance} from '../api/api'
import {ETH, MLN} from "../lib/constants";
import {isAddress} from '../lib/utils'

import {states, colors} from '../lib/constants'

Template.dashboard.helpers({
  chains() {
    return Meteor.settings.public.chains
  },
  kovanAddress() {
    return Session.get("address");
  },
  ethBalance() {
    return Session.get("ethBalance");
  },
  mlnBalance() {
    return Session.get("mlnBalance");
  },
  status() {
    return Session.get("status")
  },
  isRunning() {
    return Session.get('running')
  }
});

async function fetchBalance(account=undefined) {
  if (account === undefined) {
    account = $("#address").val()
  }

  if (!isAddress(account)) {
    Session.set("status", `Address ${account} is not valid.`)
    return
  }

  const chain = $("#chain").val();
  
  // Get account
  try {
    const {mln, eth} = await getBalance(account, chain)

    Session.set('ethBalance', eth);
    Session.set('mlnBalance', mln);

  } catch(err) {
    Session.set("status", `Failed to get balance for '${account}' on '${chain}'`)
    return null
  }

  return undefined
}

Template.dashboard.rendered = async function(a) {
  if ($("#address").val() !== undefined)
    await fetchBalance()
}

Template.dashboard.events({
  "change #chain": async (event) => {
    await fetchBalance()
  },
  "change #address": async (event) => {
    await fetchBalance()
  },
  "submit .form-register": async (event, instance) => {
    event.preventDefault()
    
    const account = $("#address").val();
    const chain   = $("#chain").val();

    Session.set("running", true)

    let captchaData = grecaptcha.getResponse();

    Session.set("status", "Fetching account...")

    let err = await fetchBalance();
    if (err == null) {
      // failed
      return 
    }

    Session.set("status", "Transfering assets...")

    try {
      toastr.info("Please Wait");

      let res = await faucetRequest(
        account,
        captchaData,
        chain
      );
      
      toastr.success(
        `You have received ${ETH} Kovan ETH and ${MLN} Kovan MLN!`,
        "Success"
      );
      
    } catch (error) {
      console.log(error)
      toastr.error("Please try again", error.reason);
    }

    err = await fetchBalance();
    if (err == null) {
      // failed
      return 
    }

    grecaptcha.reset();

    Session.set("status", "Done")
    Session.set("running", false)

  }
});
