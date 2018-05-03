'use strict'

require('dotenv').config()
const moment = require('moment')

const constants = {
    STELLAR_SERVER: process.env.STELLAR_SERVER,
    FRIEND_BOT: process.env.FRIEND_BOT_URL,
    VOTE_COIN: "VoteCoin",
    VOTE_A_COIN: "VoteACoin",
    VOTE_B_COIN: "VoteBCoin",
    END_VOTE_TIME: moment("2018-05-03 21:00:00+07").unix()
}

module.exports = constants