require('dotenv').config()
const StellarSdk = require('stellar-sdk')

module.exports = {
    misterA: StellarSdk.Keypair.fromSecret(process.env.MISTERA_KEY),
    misterB: StellarSdk.Keypair.fromSecret(process.env.MISTERB_KEY),
    misterC: StellarSdk.Keypair.fromSecret(process.env.MISTERC_KEY),
    misterD: StellarSdk.Keypair.fromSecret(process.env.MISTERD_KEY),
    misterE: StellarSdk.Keypair.fromSecret(process.env.MISTERE_KEY),
    misterF: StellarSdk.Keypair.fromSecret(process.env.MISTERF_KEY),
    misterG: StellarSdk.Keypair.fromSecret(process.env.MISTERG_KEY),
    adminX: StellarSdk.Keypair.fromSecret(process.env.ADMINX_KEY),
    adminY: StellarSdk.Keypair.fromSecret(process.env.ADMINY_KEY),
    jointIssuerVote: StellarSdk.Keypair.fromSecret(process.env.JOINT_ISSUER_VOTE),
    jointIssuerCandidate: StellarSdk.Keypair.fromSecret(process.env.JOINT_ISSUER_CANDIDATE),
    jointOffer: StellarSdk.Keypair.fromSecret(process.env.JOINT_OFFER)
}