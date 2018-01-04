
import callWithPromise from './callWithPromise'

async function faucetRequest(captchaData, account, chain) {
    return callWithPromise(
        "faucetRequest",
        captchaData,
        account,
        chain
    );
}

async function getBalance(account, chain) {
    return callWithPromise(
        "getBalance",
        account,
        chain
    )
}

export {
    faucetRequest,
    getBalance
}
