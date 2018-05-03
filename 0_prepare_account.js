'use strict'

const StellarSdk = require('stellar-sdk')
const axios = require('axios')
const Account = require('./account')
const Constants = require('./constants')

const PrepareAccount = async (sourceKeys) => {
    // Add initial coin from friend bot
    const publicKey = sourceKeys.publicKey();

    try {
        const fundAccount = fund(publicKey)
        console.log("Fund Success:", publicKey)
    } catch(error) {
        console.log("Fund Failed:", publicKey)
    }       
}

const fund = (publicKey) => {
    return axios.get(Constants.FRIEND_BOT, {
        params: {
            addr: publicKey
        }
    })
}

const run = () => {
    Object.keys(Account).map((key, index) => {
        PrepareAccount(Account[key])
    });
}

run()