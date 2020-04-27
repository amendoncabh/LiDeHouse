import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { $ } from 'meteor/jquery';

Template.registerHelper('print', function print() {
  return {
    visible: true,
    href: '',
    color: 'primary',
    name: 'print',
    icon: 'fa fa-print',
    label: 'print',
    run() {
      if (ModalStack.active()) {
        $('#wrapper').addClass('no-height');
        window.print();
        $('#wrapper').removeClass('no-height');
      } else window.print();
    },
  };
});

Template.registerHelper('printable', function printable() {
  const routeName = FlowRouter.getRouteName();
  if (routeName === 'Transaction show') {
    const _txid = FlowRouter.getParam('_txid');
    const tx = Transactions.findOne(_txid);
    return tx && tx.category === 'bill';
  }
  if (ModalStack.active() && this.doc) {
    const tx = Transactions.findOne(this.doc._id);
    return tx && tx.category === 'bill';
  }
  return false;
});
