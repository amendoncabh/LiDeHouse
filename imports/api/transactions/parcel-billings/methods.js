import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Bills } from '/imports/api/transactions/bills/bills';
import { Period } from '/imports/api/transactions/breakdowns/period.js';
import { ActiveTimeMachine } from '../../behaviours/active-time-machine';

export const BILLING_DAY_OF_THE_MONTH = 10;
export const BILLING_MONTH_OF_THE_YEAR = 3;
export const BILLING_DUE_DAYS = 8;

export const apply = new ValidatedMethod({
  name: 'parcelBillings.apply',
  validate: ParcelBillings.applySchema.validator(),

  run({ communityId, date, ids, localizer }) {
    if (Meteor.isClient) return;
    checkPermissions(this.userId, 'parcelBillings.apply', { communityId });
    ActiveTimeMachine.runAtTime(date, () => {
      const bills = {}; // parcelId => his bill
      const activeParcelBillings = ids
        ? ParcelBillings.findActive({ communityId, _id: { $in: ids } })
        : ParcelBillings.findActive({ communityId });
      const billingPeriod = Period.monthOfDate(date);
      activeParcelBillings.forEach((parcelBilling) => {
//        const alreadyAppliedAt = parcelBilling.alreadyAppliedAt(billingPeriod.label);
//        if (alreadyAppliedAt) throw new Meteor.Error('err_alreadyExists', `${parcelBilling.title} ${billingPeriod.label}`);
        const parcels = parcelBilling.parcels(localizer);
        parcels.forEach((parcel) => {
          productionAssert(parcel, 'Could not find parcel - Please check if parcel ref matches the building+floor+door exactly');
          const line = {
            billingId: parcelBilling._id,
            period: billingPeriod.label,
          };
          let activeMeter;
          if (parcelBilling.consumption) {
            activeMeter = Meters.findOneActive({ parcelId: parcel._id, service: parcelBilling.consumption.service });
            if (activeMeter) {
              line.unitPrice = parcelBilling.consumption.unitPrice;
              line.uom = parcelBilling.consumption.uom;
              // TODO: Estimation if no reading available
              line.quantity = (activeMeter.lastReading().value - activeMeter.lastBilling().value);
            }
          }
          if (!activeMeter) {
            productionAssert(parcelBilling.projection, 'Projection base is not set up in your billing');
            line.unitPrice = parcelBilling.projection.unitPrice;
            line.uom = parcelBilling.projectionUom();
            line.quantity = parcelBilling.projectionQuantityOf(parcel);
          }
          debugAssert(line.uom && _.isDefined(line.quantity), 'Billing needs consumption or projection.');
          if (line.quantity === 0) return; // Should not create bill for zero amount
          line.amount = line.quantity * line.unitPrice;
//          line.account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.digit;
          line.account = Breakdowns.name2code('Incomes', 'Owner payins', parcelBilling.communityId) + parcelBilling.digit;
          line.localizer = Localizer.parcelRef2code(parcel.ref);
          line.title = `${parcelBilling.title}`;
          // Creating the bill - adding line to the bill
          const leadParcel = parcel.leadParcel();
          bills[leadParcel._id] = bills[leadParcel._id] || {
            communityId: parcelBilling.communityId,
            category: 'bill',
            relation: 'parcel',
            defId: Txdefs.findOne({ communityId, category: 'bill', 'data.relation': 'parcel' })._id,
  //          amount: Math.round(totalAmount), // Not dealing with fractions of a dollar or forint
            partnerId: leadParcel.payerPartner()._id,
            membershipId: leadParcel.payerMembership()._id,
            valueDate: Clock.currentDate(),
            issueDate: Clock.currentDate(),
            deliveryDate: date,
            dueDate: moment(Clock.currentDate()).add(BILLING_DUE_DAYS, 'days').toDate(),
            lines: [],
          };
          bills[leadParcel._id].lines.push(line);

          // Updating the meter readings
          if (activeMeter) {
            Meters.methods.registerBilling._execute({ userId: this.userId }, {
              _id: activeMeter._id,
              billing: {
                date: new Date(),
                value: activeMeter.lastReading().value,
                type: 'reading',
    //            readingId
    //            billId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
              },
            });
          }
        });
        ParcelBillings.update(parcelBilling._id, { $push: { appliedAt: { date, period: billingPeriod.label } } });
      });

      _.each(bills, (bill, parcelId) => {
        Transactions.methods.insert._execute({ userId: this.userId }, bill);
      });
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

export const insert = new ValidatedMethod({
  name: 'parcelBillings.insert',
  validate: ParcelBillings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'parcelBillings.insert', doc);
    const id = ParcelBillings.insert(doc);
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
    checkPermissions(this.userId, 'parcelBillings.update', doc);
    return ParcelBillings.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'parcelBillings.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(ParcelBillings, _id);
    checkPermissions(this.userId, 'parcelBillings.remove', doc);
    return ParcelBillings.remove(_id);
  },
});

ParcelBillings.methods = ParcelBillings.methods || {};
_.extend(ParcelBillings.methods, { insert, update, remove, apply, revert });
