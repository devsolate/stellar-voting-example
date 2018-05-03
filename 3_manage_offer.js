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

const setJointAdminCandidateAccount = async () => {
    // Load Joint Account
    const account = await server.loadAccount(jointAccountKeys.publicKey())

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
    transaction.sign(jointAccountKeys)
    return server.submitTransaction(transaction)
}

const createOffer = async () => {
    const issueAccount = await server.loadAccount(jointAccountKeys.publicKey());

    // Sent Coin to Offer Account
    const transaction = new StellarSdk.TransactionBuilder(issueAccount)
        .addOperation(StellarSdk.Operation.manageOffer({
            selling: voteACoin,
            buying: voteCoin,
            amount: '100',
            price: 1
        }))
        .addOperation(StellarSdk.Operation.manageOffer({
            selling: voteBCoin,
            buying: voteCoin,
            amount: '100',
            price: 1
        }))
        .build();

    // Sign Transaction By Admin + Candidate
    transaction.sign(Account.adminX);
    transaction.sign(Account.adminY);
    transaction.sign(Account.misterA);
    transaction.sign(Account.misterB);

    return server.submitTransaction(transaction);
}

const getOffers = async (account) => {
    return server.offers('accounts', account.publicKey()).call()
}

const createEndVoteContract = async () => {

    const offers = await getOffers(jointAccountKeys)
    const jointAccount = await server.loadAccount(jointAccountKeys.publicKey());

    jointAccount.incrementSequenceNumber()


    let offerVoteA, offerVoteB
    for(let i = 0; i < offers.records.length; i++) {
        const offer = offers.records[i]
        // Get VoteA Offer
        if(offer.selling.asset_code == voteACoin.code && offer.selling.asset_issuer == voteACoin.issuer) {
            offerVoteA = offer;
            continue;
        }

        // Get VoteB Offer
        if(offer.selling.asset_code == voteBCoin.code && offer.selling.asset_issuer == voteBCoin.issuer) {
            offerVoteB = offer;
            continue;
        }
    }

    // Create Pre-Authorization Transaction
    const transaction = new StellarSdk.TransactionBuilder(jointAccount, {
        timebounds: {
            minTime: Constants.END_VOTE_TIME,
            maxTime: 0
        }
    })
    .addOperation(StellarSdk.Operation.manageOffer({
        selling: voteACoin,
        buying: voteCoin,
        amount: '0',
        offerId: offerVoteA.id,
        price: 1
    }))
    .addOperation(StellarSdk.Operation.manageOffer({
        selling: voteBCoin,
        buying: voteCoin,
        amount: '0',
        offerId: offerVoteB.id,
        price: 1
    }))
    .build();

    return Promise.resolve(transaction)
}

const createPreAuthorizationTransaction = async (endVoteTransaction) => {
    // Add End Vote Transaction  Hash to PreAuth Transaction
    const jointAccount = await server.loadAccount(jointAccountKeys.publicKey());
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
        // Set Joint Account
        await setJointAdminCandidateAccount()
        console.log("Set Joint Account Success")

        // Create Offer for Candidate Coin
        await createOffer()
        console.log("Create Candidate Coin Offer Success")

        // Create Smart Contract for Close Offer ( End of Voting )
        // Disable Joint Account for Other Action
        const contract = await createEndVoteContract()
        console.log("XDR:", decodeURIComponent(contract.toEnvelope().toXDR().toString('base64')))
        await createPreAuthorizationTransaction(contract)

    } catch (error) {
        // console.log(JSON.stringify(error))
    }
}

run()