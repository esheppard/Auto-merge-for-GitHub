function observeDOM(el, callback) {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    if( MutationObserver ) {
        var obs = new MutationObserver(function(mutations, observer){
            callback(mutations);
        });
        obs.observe( el, { childList: true, subtree: true });
    }
    else {
        console.error('MutationObserver is not supported.');
    }
}

if(typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
}

String.prototype.removingPrefix = function(prefix) {
    const hasPrefix = this.indexOf(prefix) === 0;
    return hasPrefix ? this.substr(prefix.length) : this.toString();
};

String.prototype.removingSuffix = function(suffix) {
    const position = this.lastIndexOf(suffix);
    const hasSuffix = position === (this.length - suffix.length);
    return hasSuffix ? this.substr(0, position) : this.toString();
};

String.prototype.removingAllAfter = function(needle) {
    const position = this.indexOf(needle);
    return position >= 0 ? this.substr(0, position) : this.toString();
};

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
