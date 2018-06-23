
let Button = function(options) {
  this.el = this.create(options);
}

Button.prototype.create = function(options) {
  this.el = $('<button/>', Object.assign({
    type: 'button'
  }, options));

  return this.el;
}

Button.prototype.on = function(events) {
  this.el.on(events);
}

Button.prototype.append = function(type, target) {
  if(['appendTo', 'insertBefore'].indexOf(type) === -1) { return false; }
  this.el[type](target);
}

Button.prototype.setText = function(content) {
  this.el.html(content);
}

Button.prototype.getText = function() {
  return this.el.text();
}
