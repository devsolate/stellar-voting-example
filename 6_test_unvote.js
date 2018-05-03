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

const createPayment = async (sourceKeys, voteToCoin, destinationId) => {
    const account = await server.loadAccount(sourceKeys.publicKey())
    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.payment({
            destination: destinationId,
            asset: voteToCoin,
            amount: '1'
        }))
        .build();

    transaction.sign(sourceKeys);

    return server.submitTransaction(transaction);
}

const run = async() => {
    try {
        await createPayment(Account.misterA, voteACoin, jointAccountKeys.publicKey())

    } catch(error) {
        console.log(JSON.stringify(error))
    }
}

run()