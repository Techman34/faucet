
import { setup, getBalance, transferTo } from "@melonproject/melon.js";

var Api     = require("@parity/api");
var Wallet  = require('ethers-wallet').Wallet;

// Quantites to be transfered
import {fromWei} from '../imports/lib/utils'

const balancePrecision = Meteor.settings.balancePrecision;

setup.init({})

// TODO. Replace with parity js-api
async function sendEther(from, to, quantity) {
    const amount = await web3.toWei(quantity, "ether");
    
    return web3.eth.sendTransaction({
      from:     from,
      to:       to,
      value:    amount
    });
}

class Chain {
    constructor(name, endpoint, wallet, password) {
        this.name       = name;

        this.provider   = new Api.Provider.Http(endpoint);
        this.api        = new Api(provider);

        this.walletJSON = JSON.parse(wallet);
        this.wallet     = await Wallet.fromEncryptedWallet(wallet, password);
        
        this.funding    = this.walletJSON.address;
    }
    
    enable() {
        setup.wallet            = this.wallet;
        setup.provider          = this.provider;
        setup.defaultAccount    = this.funding
    }

    async getBalance(address=undefined) {
        this.enable();

        address = (address == undefined) ? this.funding : address;

        const ethWei    = await this._getBalance(address, 'ETH')
        const mln       = await this._getBalance(address, 'MLN-T');
        
        const eth = new BigNumber(fromWei(ethWei.toString()));

        return {
            eth: eth.toFixed(balancePrecision),
            mln: mln.toFixed(balancePrecision)
        }
    }

    async transfer(destiny, ethQuantity, mlnQuantity) {
        this.enable();

        await this._transfer(destiny, ethQuantity, 'ETH')
        await this._transfer(destiny, mlnQuantity, 'MLN-T')
    }

    async _getBalance(account, asset='ETH') {
        try {
            return asset == 'ETH' ? this.api.eth.getBalance(account) : getBalance(asset, account)
        } catch(err) {
            throw Error(`Failed to get ${asset} balance from ${account}: ${err}`)
        }
    }

    async _transfer(destiny, quantity, asset='ETH') {
        try {
            return asset == 'ETH' ? sendEther(this.funding, destiny, quantity) : transferTo(this.wallet, asset, destiny, quantity)
        } catch(err) {
            throw Error(`Failed to transfer ${asset} from ${account}: ${err}`)
        }
    }
}

const chains = {}

for (const name of Meteor.settings.chains) {
    const {endpoint, wallet, password} = Meteor.settings.chains[name]

    const chain = new Chain(name, endpoint, wallet, password)
    chains[name] = chain
}

function getChain(name) {
    return chains[name]
}

export default getChain
