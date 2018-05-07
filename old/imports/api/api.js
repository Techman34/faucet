
import callWithPromise from './callWithPromise'

async function faucetRequest(captchaData, account) {
    return callWithPromise(
        "faucetRequest",
        captchaData,
        account
    );
}

async function getBalance(account) {
    return callWithPromise(
        "getBalance",
        account
    )
}

export {
    faucetRequest,
    getBalance
}
