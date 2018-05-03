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
            asset: voteACoin,
            limit: limit
        }))
        .addOperation(StellarSdk.Operation.changeTrust({
            asset: voteBCoin,
            limit: limit
        }))
        .build();
    transaction.sign(sourceKeys);

    return server.submitTransaction(transaction);
}

const setOfferAccountChangeTrust = async () => {
    await changeTrust(Account.misterA)
    await changeTrust(Account.misterB)
    await changeTrust(Account.misterC)
    await changeTrust(Account.misterD)
    await changeTrust(Account.misterE)
    await changeTrust(Account.misterF)
    await changeTrust(Account.misterG)

    // Change Trust for Joint Offer Account
    await changeTrust(Account.jointOffer, '1000')

    return Promise.resolve()
}

const setAllowTrustCandidateCoin = async (accounts) => {

    const issueAccount = await server.loadAccount(issuingKeys.publicKey());
    let transaction = new StellarSdk.TransactionBuilder(issueAccount)

    accounts.map((account) => {
        transaction = transaction.addOperation(StellarSdk.Operation.allowTrust({
            trustor: account.publicKey(),
            assetCode: Constants.VOTE_A_COIN,
            authorize: true
        }))
        .addOperation(StellarSdk.Operation.allowTrust({
            trustor: account.publicKey(),
            assetCode: Constants.VOTE_B_COIN,
            authorize: true
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

const createDisableCandidateCoinContract = async (accounts) => {

    const jointAccount = await server.loadAccount(issuingKeys.publicKey());

    jointAccount.incrementSequenceNumber()
    // Create Pre-Authorization Transaction
    let transaction = new StellarSdk.TransactionBuilder(jointAccount, {
        timebounds: {
            minTime: Constants.END_VOTE_TIME,
            maxTime: 0
        }
    })
    
    accounts.map((account) => {
        // Revoked Voter for Holding Candidate Coin
        transaction = transaction.addOperation(StellarSdk.Operation.allowTrust({
            trustor: account.publicKey(),
            assetCode: Constants.VOTE_A_COIN,
            authorize: false
        }))
        .addOperation(StellarSdk.Operation.allowTrust({
            trustor: account.publicKey(),
            assetCode: Constants.VOTE_B_COIN,
            authorize: false
        }))
    })

    transaction = transaction.build();

    return Promise.resolve(transaction)
}

const createPreAuthorizationTransaction = async (endVoteTransaction) => {
    // Add End Vote Transaction  Hash to PreAuth Transaction
    const jointAccount = await server.loadAccount(issuingKeys.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(jointAccount)
        .addOperation(StellarSdk.Operation.setOptions({
            signer: {
                preAuthTx: endVoteTransaction.hash(),
                weight: '255'
            }
        }))
        // Disable this account ( Now we can end vote only because pre transaction weight hit 255 )
        .addOperation(StellarSdk.Operation.setOptions({
            lowThreshold: 255,
            medThreshold: 255,
            highThreshold: 255
        }))
        .build()

    // Sign Transaction By Admin + Candidate
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

        await setAllowTrustCandidateCoin([Account.misterA, Account.misterB, Account.misterC, Account.misterD, Account.misterE, Account.misterF, Account.misterG, Account.jointOffer])

        await issueCandidateCoin()
        console.log("Issue Candidate Coin and Sent Joint Offer Account")

        const contract = await createDisableCandidateCoinContract([Account.misterA, Account.misterB, Account.misterC, Account.misterD, Account.misterE, Account.misterF, Account.misterG])
        console.log("XDR:", decodeURIComponent(contract.toEnvelope().toXDR().toString('base64')))
        await createPreAuthorizationTransaction(contract)
        console.log("Get Revoked Candidate Coin Transaction When End Vote Contract And Disable Joint Account")
        // No More CandidateCoin Generated.

    } catch(error) {
        console.log(JSON.stringify(error))
    }
}

run()