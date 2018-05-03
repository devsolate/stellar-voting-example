'use strict'

const StellarSdk = require('stellar-sdk')
const Constants = require('./constants')
const Account = require('./account')
const server = new StellarSdk.Server(Constants.STELLAR_SERVER)
StellarSdk.Network.useTestNetwork();

// Vote Coin
const issuingKeys = Account.jointIssuerCandidate;
const voteACoin = new StellarSdk.Asset(Constants.VOTE_A_COIN, issuingKeys.publicKey())
const voteBCoin = new StellarSdk.Asset(Constants.VOTE_B_COIN, issuingKeys.publicKey())

const setJointAdminCandidateAccount = async () => {
    // Load Joint Account
    const account = await server.loadAccount(issuingKeys.publicKey())

    /*
    - Set All Admin + Candidate Account for Multi-Sig with Weight 1
    - Disable Master Key
    - Set Threshold to 4 to require all account for action
    - Set Authoirzation Not Required for CandidateCoin / User can change trust without allow
    */
    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.setOptions({
            signer: {
                ed25519PublicKey: Account.adminX.publicKey(),
                weight: 1
            }
        }))
        .addOperation(StellarSdk.Operation.setOptions({
            signer: {
                ed25519PublicKey: Account.adminY.publicKey(),
                weight: 1
            }
        }))
        .addOperation(StellarSdk.Operation.setOptions({
            signer: {
                ed25519PublicKey: Account.misterA.publicKey(),
                weight: 1
            }
        }))
        .addOperation(StellarSdk.Operation.setOptions({
            signer: {
                ed25519PublicKey: Account.misterB.publicKey(),
                weight: 1
            }
        }))
        .addOperation(StellarSdk.Operation.setOptions({
            masterWeight: 0,
            lowThreshold: 4,
            medThreshold: 4,
            highThreshold: 4
        }))
        .build()

    // Sign with master key and submit to network
    transaction.sign(issuingKeys)
    return server.submitTransaction(transaction)
}

const changeTrust = async (sourceKeys) => {
    const account = await server.loadAccount(sourceKeys.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.changeTrust({
            asset: voteACoin,
            limit: '1000'
        }))
        .addOperation(StellarSdk.Operation.changeTrust({
            asset: voteBCoin,
            limit: '1000'
        }))
        .build();
    transaction.sign(sourceKeys);

    return server.submitTransaction(transaction);
}

const setOfferAccountChangeTrust = async () => {
    // Change Trust for Joint Offer Account
    await changeTrust(Account.jointOffer)

    return Promise.resolve()
}

const issueCandidateCoin = async () => {
    const issueAccount = await server.loadAccount(issuingKeys.publicKey());

    // Sent Coin to Offer Account
    const transaction = new StellarSdk.TransactionBuilder(issueAccount)
        .addOperation(StellarSdk.Operation.payment({
            destination: Account.jointOffer.publicKey(),
            asset: voteACoin,
            amount: '1000'
        }))
        .addOperation(StellarSdk.Operation.payment({
            destination: Account.jointOffer.publicKey(),
            asset: voteBCoin,
            amount: '1000'
        }))
        .build();

    // Sign Transaction By Admin + Candidate
    transaction.sign(Account.adminX);
    transaction.sign(Account.adminY);
    transaction.sign(Account.misterA);
    transaction.sign(Account.misterB);

    return server.submitTransaction(transaction);
}

const disableIssuerAccount = async () => {
    // Load Joint Account
    const account = await server.loadAccount(issuingKeys.publicKey())

    /*
    - Set Options Threshold to 255 for no one can use this account
    */
    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.setOptions({
            lowThreshold: 255,
            medThreshold: 255,
            highThreshold: 255
        }))
        .build()

    // Sign and submit
    transaction.sign(Account.adminX);
    transaction.sign(Account.adminY);
    transaction.sign(Account.misterA);
    transaction.sign(Account.misterB);
    return server.submitTransaction(transaction)
}


const run = async () => {
    try {
        await setJointAdminCandidateAccount()
        console.log("Set Joint Account Success")

        await setOfferAccountChangeTrust()
        console.log("Offer Account Change Trust Success")

        await issueCandidateCoin()
        console.log("Issue Vote Coin and Sent to Voter Success")

        await disableIssuerAccount()
        console.log("Disable Issuer Account Success")
        // No More CandidateCoin Generated.
    } catch(error) {
        console.log(JSON.stringify(error))
    }
}

run()