'use strict'

const StellarSdk = require('stellar-sdk')
const Constants = require('./constants')
const Account = require('./account')
const server = new StellarSdk.Server(Constants.STELLAR_SERVER)
StellarSdk.Network.useTestNetwork();

const issueCandidateCoinKeys = Account.jointIssuerCandidate;
const offerKeys = Account.jointOffer;
const voteACoin = new StellarSdk.Asset(Constants.VOTE_A_COIN, issueCandidateCoinKeys.publicKey())
const voteBCoin = new StellarSdk.Asset(Constants.VOTE_B_COIN, issueCandidateCoinKeys.publicKey())

const getResult = async () => {

    const account = await server.accounts()
        .accountId(offerKeys.publicKey())
        .call()

    const balances = account.balances;
    let voteA, voteB
    for(let i = 0; i < balances.length; i++) {
        const vote = balances[i]
        // Get VoteA Offer
        if(vote.asset_code == voteACoin.code && vote.asset_issuer == voteACoin.issuer) {
            voteA = vote;
            continue;
        }

        // Get VoteB Offer
        if(vote.asset_code == voteBCoin.code && vote.asset_issuer == voteBCoin.issuer) {
            voteB = vote;
            continue;
        }
    }

    return Promise.resolve({
        voteA: {
            ...voteA,
            count: parseInt(voteA.limit) - parseInt(voteA.balance)
        },
        voteB: {
            ...voteB,
            count: parseInt(voteB.limit) - parseInt(voteB.balance)
        }
    })
}

const run = async () => {
    const result = await getResult()

    console.log(`Candidate A: ${result.voteA.count} vote`)
    console.log(`Candidate B: ${result.voteB.count} vote`)
}

run()