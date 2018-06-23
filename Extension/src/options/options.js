
document.addEventListener('DOMContentLoaded', function() {
    $('#clear-merge-commit-message-check').click(savePrefs);
    $('#set-merge-title-as-pr-title-check').click( function(e) {
      savePrefs();
    });

    window.setTimeout(function() {
        loadPrefs();
    }, 1);
});

function loadPrefs() {
  chrome.storage.sync.get(null, function(result) {
    $('#clear-merge-commit-message-check').prop('checked', result.clearMergeMessage == 1);
    $('#set-merge-title-as-pr-title-check').prop('checked', result.setMergeTitleAsPRTitle == 1);
  });
}

function savePrefs() {
  let clearMergeMessage_checked = $('#clear-merge-commit-message-check').is(":checked");
  chrome.storage.sync.set({'clearMergeMessage': clearMergeMessage_checked});

  let setMergeTitleAsPRTitle_checked = $('#set-merge-title-as-pr-title-check').is(":checked");
  chrome.storage.sync.set({'setMergeTitleAsPRTitle': setMergeTitleAsPRTitle_checked});
}
