import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
//  import { TxDefs } from '/imports/api/transactions/tx-defs.js';
import { insert as insertTx } from '/imports/api/transactions/methods.js';
import { Bills } from '../bills/bills';

export const BILLING_DAY_OF_THE_MONTH = 10;
export const BILLING_MONTH_OF_THE_YEAR = 3;
export const BILLING_DUE_DAYS = 8;

export const apply = new ValidatedMethod({
  name: 'parcelBillings.apply',
  validate: ParcelBillings.applySchema.validator(),

  run({ communityId, ids, valueDate }) {
    checkPermissions(this.userId, 'parcelBillings.apply', communityId);
    const bills = {}; // parcelId => his bill
    ids.forEach(parcelBillingId => {
      const parcelBilling = ParcelBillings.findOne(parcelBillingId);
      if (!parcelBilling || parcelBilling.communityId !== communityId) return;  // should throw error?
      const parcels = parcelBilling.parcels();
      parcels.forEach((parcel) => {
        const line = {};
        line.title = parcelBilling.title;
        line.unitPrice = parcelBilling.amount;
        switch (parcelBilling.projection) {
          case 'absolute':
            line.uom = '1';
            line.quantity = 1;
            break;
          case 'perArea':
            line.uom = 'm2';
            line.quantity = (parcel.area || 0);
            break;
          case 'perVolume':
            line.uom = 'm3';
            line.quantity = (parcel.volume || 0);
            break;
          case 'perHabitant':
            line.uom = 'p';
            line.quantity = (parcel.habitants || 0);
            break;
          default: debugAssert(false);
        }
//        line.amount = line.quantity * line.unitPrice;
        line.account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.payinType;
        line.localizer = Localizer.parcelRef2code(parcel.ref);
        
        bills[parcel._id] = bills[parcel._id] || {
          communityId: parcelBilling.communityId,
          category: 'parcel',
//          amount: Math.round(totalAmount), // Not dealing with fractions of a dollar or forint
          partner: parcel.ref,
          valueDate,
          issueDate: moment().toDate(),
          dueDate: moment().add(BILLING_DUE_DAYS, 'days').toDate(),
          lines: [],
        };
        bills[parcel._id].lines.push(line);
      });
    });

    _.each(bills, (bill, parcelId) => {
      Bills.methods.insert._execute({ userId: this.userId }, bill);
    });
  },
});

export const revert = new ValidatedMethod({
  name: 'parcelBillings.revert',
  validate: new SimpleSchema({
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
    valueDate: { type: Date },
  }).validator(),

  run({ id, valueDate }) {
    throw new Meteor.Error('err_NotImplemented', 'TODO');
  },
});

export const remove = new ValidatedMethod({
  name: 'parcelBillings.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(ParcelBillings, _id);
    checkPermissions(this.userId, 'parcelBillings.remove', doc.communityId);
    return ParcelBillings.remove(_id);
  },
});

export const insert = new ValidatedMethod({
  name: 'parcelBillings.insert',
  validate: ParcelBillings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'parcelBillings.insert', doc.communityId);
    const valueDate = doc.valueDate;
    delete doc.valueDate;
    const id = ParcelBillings.insert(doc);
    if (Meteor.isServer) {
      if (valueDate) { // new parcel billings are automatically applied, if valueDate is given
        apply._execute({ userId: this.userId }, { communityId: doc.communityId, ids: [id], valueDate });
        remove._execute({ userId: this.userId }, { _id: id });
      }
    }
    return id;
  },
});

export const update = new ValidatedMethod({
  name: 'parcelBillings.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(ParcelBillings, _id);
//    checkModifier(doc, modifier, );
    checkPermissions(this.userId, 'parcelBillings.update', doc.communityId);

    return ParcelBillings.update({ _id }, { $set: modifier });
  },
});

ParcelBillings.methods = ParcelBillings.methods || {};
_.extend(ParcelBillings.methods, { insert, update, remove, apply, revert });
