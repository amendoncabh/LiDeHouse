import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';

import './multi-modal-handler.html';

Modal.allowMultiple = true;

Template.Multi_modal_handler.onCreated(function () {
  if (!Session.get('openedModals')) Session.set('openedModals', []);
  const openedModals = Session.get('openedModals');
  const dataId = this.parent().data.id;
  openedModals.push(dataId);
  Session.set('openedModals', openedModals);
});

Template.Multi_modal_handler.onDestroyed(function () {
  const dataId = this.parent().data.id;
  let openedModals = Session.get('openedModals');
  openedModals.forEach((modalId) => {
    if (modalId === dataId) openedModals = _.without(openedModals, modalId);
  });
  if (openedModals.length > 0) $('body').addClass('modal-open');
  Session.set('openedModals', openedModals);
  Modal.hide();
});

