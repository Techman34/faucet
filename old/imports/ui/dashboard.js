
import { Template } from "meteor/templating";
import { Session } from "meteor/session";
import "./dashboard.html";

import {faucetRequest, getBalance} from '../api/api'
import {ETH, MLN} from "../lib/constants";
import {isAddress} from '../lib/utils'

Template.dashboard.helpers({
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

async function fetchBalance(account) {
  // Get account
  try {
    const {mln, eth} = await getBalance(account)

    Session.set('ethBalance', eth);
    Session.set('mlnBalance', mln);

  } catch(err) {
    Session.set("status", `Failed to get balance for '${account}'`)
    return err
  }

  return undefined
}

Template.dashboard.rendered = async function(a) {
  const address = Session.get("address");

  if (isAddress(address)) {
    let err = await fetchBalance(address)
    if (err != undefined) {
      Session.set("status", "Failed to fetch account balance")
    }
  }
}

Template.dashboard.events({
  "change #address": async (event) => {
    let defaultAccount = event.target.value;

    if (!isAddress(defaultAccount)) {
      Session.set("status", "Address is not valid.")
      return
    }

    let err = await fetchBalance(defaultAccount)
    if (err != undefined) {
      console.error(err)
    }
  },
  "submit .form-register": async (event, instance) => {
    event.preventDefault()
    
    let defaultAccount = event.target.address.value;

    if (!isAddress(defaultAccount)) {
      Session.set("status", "Address is not valid.")
      return
    }
    
    Session.set("running", true)

    let captchaData = grecaptcha.getResponse();

    Session.set("status", "Fetching account...")

    let err = await fetchBalance(defaultAccount)
    if (err != undefined) {
      return
    }

    Session.set("status", "Transfering assets...")

    try {
      toastr.info("Please Wait");

      let res = await faucetRequest(
        defaultAccount,
        captchaData
      );
      
      toastr.success(
        `You have received ${ETH} Kovan ETH and ${MLN} Kovan MLN!`,
        "Success"
      );
      
    } catch (error) {
      console.log(error)
      toastr.error("Please try again", error.reason);
    }

    err = await fetchBalance(defaultAccount)
    if (err != undefined) {
      console.error(err)
    }

    grecaptcha.reset();

    Session.set("status", "Done")
    Session.set("running", false)

  }
});
