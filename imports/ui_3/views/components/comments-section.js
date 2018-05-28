/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { __ } from '/imports/localization/i18n.js';
import { onSuccess, handleError } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { insert as insertComment, update as updateComment, remove as removeComment } from '/imports/api/comments/methods.js';
import { like } from '/imports/api/topics/likes.js';
import './comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data._id });
  });
});

Template.Comments_section.helpers({
  isVote() {
    const topic = this;
    return topic.category === 'vote';
  },
  comments() {
    return Comments.find({ topicId: this._id });
  },
});

Template.Comments_section.events({
  'keydown .js-send-enter'(event) {
    if (event.keyCode === 13 && !event.shiftKey) {
      const textarea = event.target;
      insertComment.call({
        topicId: this._id,
        userId: Meteor.userId(),
        text: textarea.value,
      }, onSuccess(res => textarea.value = '')
      );
    }
  },
});

//------------------------------------

Template.Comment.helpers({
});

Template.Comment.events({
  'click .js-like'(event) {
    like.call({
      coll: 'comments',
      id: this._id,
    }, handleError);
  },
  'click .js-edit'(event, instance) {
    const commentSpan = $('span[data-id="' + instance.data._id + '"]');
    $(commentSpan).replaceWith('<span data-id="' + instance.data._id + '"><textarea class="form-control js-send-edited">' + commentSpan.text() + '</textarea>' +
     `<small class="text-muted">${__('commentEditInstruction')} </small></span>`);
    $('span[data-id="' + instance.data._id + '"] textarea').focus();
  },
  'keydown .js-send-edited'(event, instance) {
    const editCommentSpan = $('span[data-id="' + instance.data._id + '"]');
    const editCommentTextarea = editCommentSpan.find('textarea');
    // pressing escape key
    if (event.keyCode === 27) { 
      event.preventDefault();
      const originalText = Comments.findOne({ _id: instance.data._id }).text;
      $(editCommentSpan).replaceWith('<span class="newlines" data-id="' + instance.data._id + '">' + originalText + '</span>');
    }
    // pressing enter key
    if (event.keyCode === 13) {
      event.preventDefault();
      const editedText = editCommentTextarea.val();
      updateComment.call({
        commentId: instance.data._id,
        modifier: { $set: { text: editedText } },
      });
      $(editCommentSpan).replaceWith('<span class="newlines" data-id="' + instance.data._id + '">' + editedText + '</span>');
    }
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeComment, { commentId: this._id }, {
      action: 'delete comment',
      message: 'It will disappear forever',
    });
  },
});
