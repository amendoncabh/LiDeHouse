import { Template } from 'meteor/templating';
import { numeral } from 'meteor/numeral:numeral';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

Template.registerHelper('equals', function equals(a, b) {
    return a == b;
});

Template.registerHelper('percentage', function percentage(number) {
    return (Math.floor(number * 100)).toString() + '%';
});

Template.registerHelper('displayMoney', function displayMoney(number) {
    return numeral(number).format();
});

Template.registerHelper('currentTime', function currentTime() {
    return moment().format('L LT');
});

Template.registerHelper('currentDate', function currentDate() {
    return moment().format('L');
});

Template.registerHelper('displayTime', function displayTime(time) {
    return moment(time).format('L LT');
});

Template.registerHelper('displayDate', function displayDate(time) {
    return moment(time).format('L');
});

Template.registerHelper('displayTimeFrom', function displayTimeFrom(time) {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(time).from(serverTimeNow);
});

// Takes any number of arguments and returns them concatenated.
Template.registerHelper('concat', function concat() {
    return Array.prototype.slice.call(arguments, 0, -1).join('');
});

Template.registerHelper('log', function log(stuff) {
    console.log(stuff);
});
