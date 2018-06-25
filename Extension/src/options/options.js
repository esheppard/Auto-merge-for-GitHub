// Auto-merge for GitHub
// Copyright 2018 Elijah Sheppard

const GITHUB_ACCESS_TOKEN_PREF = 'accessToken';
const GITHUB_INVALID_TOKEN_HASH_PREF = 'invalidTokenHash';

document.addEventListener('DOMContentLoaded', function() {
    $('.options-form .save-button').click( function(e) {
      savePrefs();
    });

    $(document).on('keypress', 'form', function(event) {
      return event.keyCode != 13; // prevent enter key in text boxes submitting the form
    });

    window.setTimeout(function() {
        loadPrefs();
    },1);
});

function loadPrefs() {
  chrome.storage.local.get(null, function(result) {
    let tokenValue = result[GITHUB_ACCESS_TOKEN_PREF];
    let tokenHashValue = result[GITHUB_INVALID_TOKEN_HASH_PREF];
    
    $('[name=accessToken]').val(tokenValue);

    if( tokenHashValue && (tokenValue.hashCode() == tokenHashValue) ) {
      $('.invaild-token-error').show();
    }
  });
}

function savePrefs() {
  let tokenValue = $('[name=accessToken]').val();

  chrome.storage.local.set({
    [GITHUB_ACCESS_TOKEN_PREF]: tokenValue,
    [GITHUB_INVALID_TOKEN_HASH_PREF]: null
  });

  hideErrors();
  if(tokenValue == null || tokenValue.length == 0) {
    $('.no-token-error').show();
  }

  $('.options-form .success-message').show().delay(1000).fadeOut();
}

function hideErrors() {
  $('.no-token-error').hide();
  $('.invaild-token-error').hide();
}
