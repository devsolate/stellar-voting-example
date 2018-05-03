'use strict'

require('dotenv').config()

const constants = {
    STELLAR_SERVER: process.env.STELLAR_SERVER,
    FRIEND_BOT: process.env.FRIEND_BOT_URL,
    VOTE_COIN: "VoteCoin"
}

module.exports = constants