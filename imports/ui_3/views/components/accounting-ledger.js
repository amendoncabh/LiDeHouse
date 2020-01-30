import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';

import '/imports/ui_3/views/modals/modal.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Period, PeriodBreakdown } from '/imports/api/transactions/breakdowns/period';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import '/imports/ui_3/views/components/ledger-report.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/journals-table.js';
import './accounting-ledger.html';

Template.Accounting_ledger.viewmodel({
  periodSelected: PeriodBreakdown.lastYearTag(),
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('breakdowns.inCommunity', { communityId: this.communityId() });
      instance.subscribe('balances.ofAccounts', { communityId: this.communityId() });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  breakdown(name) {
    return Breakdowns.findOneByName(name, Session.get('activeCommunityId'));
  },
  totalTag() {
    return ['T'];
  },
  yearMonthTag() {
    return this.periodSelected();
  },
  yearMonthTags() {
//    return PeriodBreakdown.currentYearMonths().concat('T');
    return PeriodBreakdown.nodesOf(this.periodSelected()).map(l => l.code);
  },
  accountOptions() {
    const brk = ChartOfAccounts.get();
    if (brk) return brk.nodeOptions(false);
    return [];
  },
  periodOptions() {
    return PeriodBreakdown.nodeOptions(false);
  },
});

Template.Accounting_ledger.events({
  'click .cell,.row-header'(event, instance) {
    if (!Meteor.user().hasPermission('transactions.inCommunity')) return;
    const accountCode = $(event.target).closest('[data-account]').data('account');
    const periodTag = $(event.target).closest('[data-tag]').data('tag');
    const period = Period.fromTag(periodTag);
    Modal.show('Modal', {
      title: __('Account history'),
      body: 'Account_history',
      bodyContext: {
        beginDate: period.begin(),
        endDate: period.end(),
        accountOptions: instance.viewmodel.accountOptions(),
        accountSelected: '' + accountCode,
      },
      size: 'lg',
    });
  },
  'click .js-journals'(event, instance) {
      //    Session.update('modalContext', 'parcelId', doc._id);
    Modal.show('Modal', {
      title: 'Teljes journal lista',
      body: 'Journals_table',
      bodyContext: {
        communityId: getActiveCommunityId(),
      },
      size: 'lg',
    });
  },
});
