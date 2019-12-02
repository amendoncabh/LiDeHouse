import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { JournalEntries } from '/imports/api/transactions/entries.js';
import { AccountSpecification } from '/imports/api/transactions/account-specification';
import { allTransactionsActions } from '/imports/api/transactions/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import './account-history.html';

Template.Account_history.viewmodel({
  sign: +1,
  beginDate: '',
  endDate: '',
  accountSelected: '',
  accountOptions: [],
  localizerSelected: '',
  localizerOptions: [],
  status: 'Reconciled',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      instance.subscribe('transactions.byAccount', this.subscribeParams());
//    const today = moment().format('L');
//    this.endDate(today);
    });
  },
  autorun: [
    function defaultOptionSelect() {
      const instance = this.templateInstance;
      instance.autorun(() => {
        if (this.accountOptions().length && !this.accountSelected()) {
          this.accountSelected(this.accountOptions()[0].value);
        }
        if (this.localizerOptions().length && !this.localizerSelected()) {
          this.localizerSelected(this.localizerOptions()[0].value);
        }
      });
    },
  ],
  subscribeParams() {
    const communityId = Session.get('activeCommunityId');
    const selector = {
      communityId,
      begin: new Date(this.beginDate()),
      end: new Date(this.endDate()),
    };
    if (this.accountSelected()) selector.account = '\\^' + this.accountSelected() + '\\';
    if (this.localizerSelected()) selector.localizer = '\\^' + this.localizerSelected() + '\\';
    return selector;
  },
  journalEntries() {
    const selector = JournalEntries.makeFilterSelector(this.subscribeParams());
    const entries = JournalEntries.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const entriesWithRunningTotal = entries.map(e => {
      total += e.effectiveAmount(this.sign());
      return _.extend(e, { total });
    });
    return entriesWithRunningTotal;
  },
  negativeClass(entry) {
    return entry.effectiveAmount(this.sign()) < 0 ? 'negative' : '';
  },
});

Template.Account_history.events({
  ...(actionHandlers(Transactions)),
});
