'use strict'

const StellarSdk = require('stellar-sdk')
const Constants = require('./constants')
const Account = require('./account')
const server = new StellarSdk.Server(Constants.STELLAR_SERVER)
StellarSdk.Network.useTestNetwork();

const jointAccountKeys = Account.jointOffer;
const issueCoinKeys = Account.jointIssuerCandidate;
const issueVoteCoinKeys = Account.jointIssuerVote;
const voteCoin = new StellarSdk.Asset(Constants.VOTE_COIN, issueVoteCoinKeys.publicKey())
const voteACoin = new StellarSdk.Asset(Constants.VOTE_A_COIN, issueCoinKeys.publicKey())
const voteBCoin = new StellarSdk.Asset(Constants.VOTE_B_COIN, issueCoinKeys.publicKey())

const createVoteOffer = async (sourceKeys, voteToCoin) => {

    const account = await server.loadAccount(sourceKeys.publicKey())
    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.manageOffer({
            selling: voteCoin,
            buying: voteToCoin,
            amount: '1',
            price: 1
        }))
        .build();

    transaction.sign(sourceKeys);

    return server.submitTransaction(transaction);
}

const vote = async (sourceKeys, voteToCoin) => {
    await createVoteOffer(sourceKeys, voteToCoin)

    return Promise.resolve()
}

const run = async() => {
    try {
        await vote(Account.misterA, voteACoin)
        console.log("Mister A Vote >> A: Success")

        await vote(Account.misterB, voteBCoin)
        console.log("Mister B Vote >> B: Success")

        await vote(Account.misterC, voteACoin)
        console.log("Mister C Vote >> A: Success")

        await vote(Account.misterD, voteACoin)
        console.log("Mister D Vote >> A: Success")

        await vote(Account.misterE, voteBCoin)
        console.log("Mister E Vote >> B: Success")

        await vote(Account.misterF, voteACoin)
        console.log("Mister F Vote >> A: Success")

        // Mister G No Vote
        // await vote(Account.misterG, voteACoin)
        // console.log("Mister G Vote >> A: Success")

    } catch(error) {
        console.log(JSON.stringify(error))
    }
}

run()