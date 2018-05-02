'use strict'

const StellarSdk = require('stellar-sdk')
const generateKeyPair = StellarSdk.Keypair.random();
console.log(generateKeyPair.secret())