'use strict'

const StellarSdk = require('stellar-sdk')
const Constants = require('./constants')
const Account = require('./account')
const server = new StellarSdk.Server(Constants.STELLAR_SERVER)
StellarSdk.Network.useTestNetwork();

// Vote Coin
const issuingKeys = Account.jointIssuerVote;
const voteCoin = new StellarSdk.Asset(Constants.VOTE_COIN, issuingKeys.publicKey())

const setJointAdminCandidateAccount = async () => {
    // Load Joint Account
    const account = await server.loadAccount(issuingKeys.publicKey())

    /*
    - Set All Admin + Candidate Account for Multi-Sig with Weight 1
    - Disable Master Key
    - Set Threshold to 4 to require all account for action
    - Set Authorization Required / Voter should be approved by Issuer Account before there can hold VoteCoin
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
            highThreshold: 4,
            setFlags: StellarSdk.AuthRevocableFlag | StellarSdk.AuthRequiredFlag
        }))
        .build()

    // Sign with master key and submit to network
    transaction.sign(issuingKeys)
    return server.submitTransaction(transaction)
}

const changeTrust = async (sourceKeys, limit = '1') => {
    const account = await server.loadAccount(sourceKeys.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.changeTrust({
            asset: voteCoin,
            limit: limit
        }))
        .build();
    transaction.sign(sourceKeys);

    return server.submitTransaction(transaction);
}

const setVoterChangeTrust = async () => {
    // Change Trust for All Voter account can hold vote coin
    await changeTrust(Account.misterA)
    await changeTrust(Account.misterB)
    await changeTrust(Account.misterC)
    await changeTrust(Account.misterD)
    await changeTrust(Account.misterE)
    await changeTrust(Account.misterF)
    await changeTrust(Account.misterG)

    // Change Trust for Offer Account can receive vote coin
    await changeTrust(Account.jointOffer, '100000')

    return Promise.resolve()
}

const setAllowTrustAndSentVoteCoin = async (accounts) => {

    const issueAccount = await server.loadAccount(issuingKeys.publicKey());
    let transaction = new StellarSdk.TransactionBuilder(issueAccount)

    accounts.map((account) => {
        transaction = transaction.addOperation(StellarSdk.Operation.allowTrust({
            trustor: account.publicKey(),
            assetCode: Constants.VOTE_COIN,
            authorize: true
        }))
        .addOperation(StellarSdk.Operation.payment({
            destination: account.publicKey(),
            asset: voteCoin,
            amount: '1'
        }))
    })
        
    transaction = transaction.build();

    // Sign Transaction By Admin + Candidate
    transaction.sign(Account.adminX);
    transaction.sign(Account.adminY);
    transaction.sign(Account.misterA);
    transaction.sign(Account.misterB);

    return server.submitTransaction(transaction);
}

const setJointAccountAllowTrustVoteCoin = async () => {

    const issueAccount = await server.loadAccount(issuingKeys.publicKey());
    let transaction = new StellarSdk.TransactionBuilder(issueAccount)
        .addOperation(StellarSdk.Operation.allowTrust({
            trustor: Account.jointOffer.publicKey(),
            assetCode: Constants.VOTE_COIN,
            authorize: true
        }))
        .build();

    // Sign Transaction By Admin + Candidate
    transaction.sign(Account.adminX);
    transaction.sign(Account.adminY);
    transaction.sign(Account.misterA);
    transaction.sign(Account.misterB);

    return server.submitTransaction(transaction);
}

const issueVoteCoin = async () => {
    await setAllowTrustAndSentVoteCoin([Account.misterA, Account.misterB, Account.misterC, Account.misterD, Account.misterE, Account.misterF, Account.misterG])
    return Promise.resolve()
}

const disableIssueVoteCoinAccount = async () => {
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

        await setVoterChangeTrust()
        console.log("All Voter Change Trust Success")

        await issueVoteCoin()
        console.log("Issue Vote Coin and Sent to Voter Success")

        await setJointAccountAllowTrustVoteCoin()
        console.log("Allow Joint Account to Receive Vote Coin")

        await disableIssueVoteCoinAccount()
        console.log("Disable Issuer Account Success")
        // Now Every Voter has VoteCoin and No More VoteCoin Generated.
    } catch(error) {
        console.log(JSON.stringify(error))
    }
}

run()