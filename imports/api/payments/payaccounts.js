import { Meteor } from 'meteor/meteor';
//import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';

export const PayAccounts = new Mongo.Collection('payaccounts');

// Physical is 'bank acount', 'cash register', 'paypal account'... must have exactly one
// Virtual is a category for mental accounting, can have many
// Locator is a type of Virtual that already has the Parcels included, plus you can define others
PayAccounts.typeValues = ['physical', 'virtual', 'locator'];

export const choosePayAccount = {
  options() {
    return PayAccounts.find(/*{ communityId: Session.get('activeCommunityId') }*/).map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
};

/*
PayAccounts.schema = new SimpleSchema({
  name: { type: String },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },

  // An account is either a root (then it has a type)...
  type: { type: String, allowedValues: PayAccounts.typeValues, optional: true },
  // or not a root (then it has a root and a parent)
  rootId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  parentId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  // TODO: Can we enforce this or-or
});
*/
/*
export const choosePayAccount = {
  options() {
    return PayAccounts.findOne(this._id).init().leafs.map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
};
*/
PayAccounts.LeafAccountSchema = new SimpleSchema({
  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  parcelNo: { type: Number, decimal: true, optional: true },
});

PayAccounts.MidAccountSchema = new SimpleSchema({
  name: { type: String, max: 100 },
  children: { type: Array },
  'children.$': { type: PayAccounts.LeafAccountSchema },
});

PayAccounts.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  type: { type: String, allowedValues: PayAccounts.typeValues },
  children: { type: Array },
  'children.$': { type: PayAccounts.MidAccountSchema },
});

PayAccounts.helpers({
  init() {
    if (!this.leafs) {
      const leafs = [];
      this.children.forEach((c) => {
        c.children.forEach((leaf) => {
          if (!leaf.name) {
            debugAssert(leaf.parcelNo);
            // const parcel = Parcels.find({ communityId: this.communityId, serial: leaf.parcelNo });
            leaf.name = `${leaf.parcelNo}. ${__('parcel')}`;
          }
          leafs.push(leaf);
        });
      });
      this.leafs = leafs;
    }
    return this;
  },
});

PayAccounts.attachSchema(PayAccounts.schema);
PayAccounts.attachSchema(Timestamps);

// Meteor.startup(function attach() {
//   PayAccounts.simpleSchema().i18n('schemaPayAccounts');
// });

// Setting up collection permissions
const hasPermission = function hasPermission(userId, doc) {
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('payaccounts.update', doc.communityId);
};

PayAccounts.allow({
  insert(userId, doc) {
    return hasPermission(userId, doc);
  },
  update(userId, doc) {
    return hasPermission(userId, doc);
  },
  remove(userId, doc) {
    return hasPermission(userId, doc);
  },
});