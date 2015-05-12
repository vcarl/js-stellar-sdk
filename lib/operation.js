"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stellarBase = require("stellar-base");

var xdr = _stellarBase.xdr;
var Keypair = _stellarBase.Keypair;
var Hyper = _stellarBase.Hyper;
var UnsignedHyper = _stellarBase.UnsignedHyper;
var hash = _stellarBase.hash;
var encodeBase58Check = _stellarBase.encodeBase58Check;

var Account = require("./account").Account;

var Currency = require("./currency").Currency;

/**
* @class Operation
*/

var Operation = exports.Operation = (function () {
    function Operation() {
        _classCallCheck(this, Operation);
    }

    _createClass(Operation, null, {
        payment: {
            /**
            * Returns a XDR PaymentOp. A "payment" operation send the specified amount to the
            * destination account, optionally through a path. XLM payments create the destination
            * account if it does not exist.
            * @param {object}   opts
            * @param {Account}  opts.destination    - The destination account for the payment.
            * @param {Currency} opts.currency       - The currency to send
            * @param {string|number} otps.amount    - The amount to send.
            * @param {Account}  [opts.source]       - The source account for the payment. Defaults to the transaction's source account.
            * @param {array}    [opts.path]         - An array of Currency objects to use as the path.
            * @param {string}   [opts.sendMax]      - The max amount of currency to send.
            * @param {string}   [opts.sourceMemo]   - The source memo.
            * @param {string}   [opts.memo]         - The memo.
            * @returns {xdr.PaymentOp}
            */

            value: function payment(opts) {
                if (!opts.destination) {
                    throw new Error("Must provide a destination for a payment operation");
                }
                if (!opts.currency) {
                    throw new Error("Must provide a currency for a payment operation");
                }
                if (!opts.amount) {
                    throw new Error("Must provide an amount for a payment operation");
                }

                var attributes = {};
                attributes.destination = Keypair.fromAddress(opts.destination).publicKey();
                attributes.currency = opts.currency.toXdrObject();
                attributes.amount = Hyper.fromString(String(opts.amount));
                attributes.sendMax = opts.sendMax ? Hyper.fromString(String(opts.sendMax)) : attributes.amount;
                attributes.path = opts.path ? opts.path : [];
                if (opts.sourceMemo) {
                    attributes.sourceMemo = opts.sourceMemo;
                } else {
                    attributes.sourceMemo = new Buffer(32);
                    attributes.sourceMemo.fill(0);
                }
                if (opts.memo) {
                    attributes.memo = opts.memo;
                } else {
                    attributes.memo = new Buffer(32);
                    attributes.memo.fill(0);
                }
                var payment = new xdr.PaymentOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.payment(payment);
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        changeTrust: {

            /**
            * Returns an XDR ChangeTrustOp. A "change trust" operation adds, removes, or updates a
            * trust line for a given currency from the source account to another. The issuer being
            * trusted and the currency code are in the given Currency object.
            * @param {object} opts
            * @param {Currency} opts.currency - The currency for the trust line.
            * @param {string} [opts.limit] - The limit for the currency, defaults to max int64.
            *                                If the limit is set to 0 it deletes the trustline.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @returns {xdr.ChangeTrustOp}
            */

            value: function changeTrust(opts) {
                var attributes = {};
                attributes.line = opts.currency.toXdrObject();
                var limit = opts.limit ? limit : "9223372036854775807";
                attributes.limit = Hyper.fromString(limit);
                if (opts.source) {
                    attributes.source = opts.source ? opts.source.masterKeypair : null;
                }
                var changeTrustOP = new xdr.ChangeTrustOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.changeTrust(changeTrustOP);
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        allowTrust: {

            /**
            * Returns an XDR AllowTrustOp. An "allow trust" operation authorizes another
            * account to hold your account's credit for a given currency.
            * @param {object} opts
            * @param {string} opts.trustor - The trusting account (the one being authorized)
            * @param {string} opts.currencyCode - The currency code being authorized.
            * @param {boolean} opts.authorize - True to authorize the line, false to deauthorize.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @returns {xdr.AllowTrustOp}
            */

            value: function allowTrust(opts) {
                var attributes = {};
                attributes.trustor = Keypair.fromAddress(opts.trustor).publicKey();
                var code = opts.currencyCode.length == 3 ? opts.currencyCode + "\u0000" : opts.currencyCode;
                attributes.currency = xdr.AllowTrustOpCurrency.iso4217(code);
                attributes.authorize = opts.authorize;
                var allowTrustOp = new xdr.AllowTrustOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.allowTrust(allowTrustOp);
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        setOptions: {

            /**
            * Returns an XDR SetOptionsOp. A "set options" operations set or clear account flags,
            * set the account's inflation destination, and/or add new signers to the account.
            * TODO: implement
            * @param {object} opts
            * @param {string} [opts.inflationDest] - Set this address as the account's inflation destination.
            * @param {number} [opts.clearFlags] - Bitmap integer for which flags to clear.
            * @param {number} [opts.setFlags] - Bitmap integer for which flags to set.
            * @param {array} [opts.thresholds] - Sets the weight of the master key and the threshold
            *                                    for each level low, medium, and high. Array of uint8.
            *                                    For now, see the stellar-core docs.
            * @param {number} [opts.thresholds.weight] - The master key weight.
            * @param {number} [opts.thresholds.low] - The sum weight for the low threshold.
            * @param {number} [opts.thresholds.medium] - The sum weight for the medium threshold.
            * @param {number} [opts.thresholds.high] - The sum weight for the high threshold.
            * @param {object} [opts.signer] - Add or remove a signer from the account. The signer is
            *                                 deleted if the weight is 0.
            * @param {string} [opts.signer.address] - The address of the new signer.
            * @param {number} [opts.signer.weight] - The weight of the new signer (0 to delete or 1-255)
            * @param {string} [opts.homeDomain] - sets the home domain used for reverse federation lookup.
            * @returns {xdr.SetOptionsOp}
            */

            value: function setOptions(opts) {
                var attributes = {};
                if (opts.inflationDest) {
                    attributes.inflationDest = Keypair.fromAddress(opts.inflationDest).publicKey();
                }
                if (opts.clearFlags) {
                    attributes.clearFlags = opts.clearFlags;
                }
                if (opts.setFlags) {
                    attributes.setFlags = opts.setFlags;
                }
                if (opts.thresholds) {
                    var thresholds = [];
                    thresholds[0] = 255 & opts.thresholds.weight;
                    thresholds[1] = 255 & opts.thresholds.low;
                    thresholds[2] = 255 & opts.thresholds.medium;
                    thresholds[3] = 255 & opts.thresholds.high;
                    attributes.thresholds = thresholds;
                }
                if (opts.signer) {
                    var signer = new xdr.Signer({
                        address: Keypair.fromAddress(opts.signer.address).publicKey(),
                        weight: opts.signer.weight
                    });
                    attributes.signer = signer;
                }
                if (opts.homeDomain) {
                    attributes.homeDomain = opts.homeDomain;
                }
                var setOptionsOp = new xdr.SetOptionsOp(attributes);
                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.setOption(setOptionsOp);
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        createOffer: {

            /**
            * Returns a XDR CreateOfferOp. A "create offer" operation creates, updates, or
            * deletes an offer for the account.
            * @param {object} opts
            * @param {Currency} takerGets - What you're selling.
            * @param {Currency} takerPays - What you're buying.
            * @param {string} amount - The total amount you're selling. If 0, deletes the offer.
            * @param {object} price - The exchange rate ratio.
            * @param {number} price.takerPaysAmount - How much the taker will pay.
            * @param {number} price.takerGetsAmount - How much the taker will get.
            * @param {string} offerID - If 0, will create a new offer. Otherwise, edits an exisiting offer.
            * @returns {xdr.CreateOfferOp}
            */

            value: function createOffer(opts) {
                var attributes = {};
                attributes.takerGets = opts.takerGets.toXdrObject();
                attributes.takerPays = opts.takerPays.toXdrObject();
                attributes.amount = Hyper.fromString(String(opts.amount));
                attributes.price = new xdr.Price({
                    n: opts.price.takerPaysAmount,
                    d: opts.price.takerGetsAmount
                });
                attributes.offerID = UnsignedHyper.fromString(String(opts.offerID));
                var createOfferOp = new xdr.CreateOfferOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.createOffer(createOfferOp);
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        accountMerge: {

            /**
            * Transfers native balance to destination account.
            * @param {object} opts
            * @param {string} opts.address - Address to merge the source account into.
             * @returns {xdr.AccountMergeOp}
            */

            value: function accountMerge(opts) {
                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.accountMerge(Keypair.fromAddress(opts.address).publicKey());
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        inflation: {

            /**
            * This operation generates the inflation.
            * @param {object} [opts]
            * @param {string} [opts.source] - The optional source account.
            * @returns {xdr.AccountMergeOp}
            */

            value: function inflation() {
                var opts = arguments[0] === undefined ? {} : arguments[0];

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.inflation();
                if (opts.source) {
                    opAttributes.sourceAccount = Keypair.fromAddress(opts.source).publicKey();
                }
                var op = new xdr.Operation(opAttributes);
                return op;
            }
        },
        operationToObject: {

            /**
            * Converts the XDR Operation object to the opts object used to create the XDR
            * operation.
            * @param {xdr.Operation} operation - An XDR Operation.
            * @return {object}
            */

            value: function operationToObject(operation) {
                var obj = {};
                var attrs = operation.body._value && operation.body._value._attributes;
                switch (operation.body._switch.name) {
                    case "payment":
                        obj.type = "payment";
                        obj.destination = encodeBase58Check("accountId", attrs.destination);
                        obj.currency = Currency.fromOperation(attrs.currency);
                        obj.path = attrs.path;
                        obj.amount = attrs.amount.toString();
                        obj.sendMax = attrs.sendMax.toString();
                        obj.sourceMemo = attrs.sourceMemo;
                        obj.memo = attrs.memo;
                        break;
                    case "changeTrust":
                        obj.type = "changeTrust";
                        obj.line = Currency.fromOperation(attrs.line);
                        break;
                    case "allowTrust":
                        obj.type = "allowTrust";
                        obj.trustor = encodeBase58Check("accountId", attrs.trustor);
                        obj.currencyCode = attrs.currency._value;
                        obj.authorize = attrs.authorize;
                        break;
                    case "setOptions":
                        obj.type = "setOptions";
                        if (attrs.inflationDest) {
                            obj.inflationDest = encodeBase58Check("accountId", attrs.inflationDest);
                        }
                        if (attrs.clearFlags) {
                            obj.clearFlags = attrs.clearFlags;
                        }
                        if (attrs.setFlags) {
                            obj.setFlags = attrs.setFlags;
                        }
                        if (attrs.thresholds) {
                            obj.thresholds = attrs.thresholds;
                        }
                        if (attrs.signer) {
                            var signer = {};
                            signer.address = encodeBase58Check("accountId", attrs.signer._attributes.pubKey);
                            signer.weight = attrs.signer._attributes.weight;
                            obj.signer = signer;
                        }
                        break;
                    case "createOffer":
                        obj.type = "createOffer";
                        obj.takerGets = Currency.fromOperation(attrs.takerGets);
                        obj.takerPays = Currency.fromOperation(attrs.takerPays);
                        obj.amount = attrs.amount.toString();
                        obj.price = {
                            n: attrs.price._attributes.n,
                            d: attrs.price._attributes.d
                        };
                        obj.offerID = attrs.offerID.toString();
                        break;
                    case "accountMerge":
                        obj.type = "accountMerge";
                        obj.destination = operation.body._value;
                        break;
                    case "inflation":
                        obj.type = "inflation";
                        break;
                    default:
                        throw new Error("Unknown operation");
                }
                return obj;
            }
        }
    });

    return Operation;
})();