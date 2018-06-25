// Auto-merge for GitHub
const autoMergeButtonAppendTargetSelector = '.merge-message';
const hideMergeMessageSelectors = '.alt-merge-options, .merge-branch-manually';

const buttonTextForMerge = 'Auto-merge';
const buttonTextForCancel = 'Cancel Auto-merge';

const logPrefix = "Auto-merge for GitHub: ";

const JOB_ACTION_ADD = 'addJob';
const JOB_ACTION_CANCEL = 'cancelJob';
const JOB_ACTION_CHECK_STATUS = 'hasJob';

const JOB_STATUS_ACTIVE = 'active';

let autoButton = new Button({
  class: 'btn auto-merge-button',
  text: buttonTextForMerge
});

initialiseJobStatus();


let mergeContainerEl = $('.merge-message');
let branchActionContainerEl = $('.branch-action-item');

// TODO or just observe $('.branch-action-body')
// observeDOM(mergeContainerEl.get(0), onDOMChanged);
// observeDOM(branchActionContainerEl.get(0), onDOMChanged);
// observeDOM($('.branch-action-body').get(0), onDOMChanged);

// observeDOM($('.branch-action-body').get(0), onBranchActionChanged);
observeDOM($('#partial-pull-merging').get(0), onPartialPullMergingChanged);


// -- Background interaction --

function initialiseJobStatus() {
  jobAction(JOB_ACTION_CHECK_STATUS, null, function(jobStatus){
    injectAutoButton();
    updateUIForStatus(jobStatus);
  });
}

function addJob() {
  jobAction(JOB_ACTION_ADD, { method: 'squash'}, function(jobStatus){
    updateUIForStatus(jobStatus);
  });
}

function cancelJob() {
  jobAction(JOB_ACTION_CANCEL, null, function(jobStatus){
    updateUIForStatus(jobStatus);
  });
}

function jobAction(action, additional, callback) {
  let data = {
    action: action,
    urlPath: window.location.pathname
  }
  if(additional != null) {
    for(var key in additional) {
      data[key] = additional[key];
    }
  }
  chrome.runtime.sendMessage(data, function(response) {
    callback(response.jobStatus);
  });
}

function updateUIForStatus(jobStatus) {
  if(jobStatus == JOB_STATUS_ACTIVE) {
    autoButton.setText(buttonTextForCancel);
  } else {
    autoButton.setText(buttonTextForMerge);
  }
}

function autoMergeButtonClicked(e) {
  if(autoButton.getText() == buttonTextForMerge) {
    addJob();
  } else {
    cancelJob();
  }
}

function injectAutoButton() {
  $(hideMergeMessageSelectors).hide();

  autoButton.on({ click: autoMergeButtonClicked });
  autoButton.append('appendTo', autoMergeButtonAppendTargetSelector);
}

function onBranchActionChanged() {
  // console.log(logPrefix + "onBranchActionChanged");
  //
  // if($(".auto-merge-button").length == 0) {
  //   console.log(logPrefix + "button re-injected");
  // }

  // console.log(logPrefix + "testing..");
  // if($('.merge-message').length == 0) { console.log(logPrefix + "merge-message not in DOM"); }
  // if($('.branch-action-item').length == 0) { console.log(logPrefix + "branch-action-item not in DOM"); }
}

function onPartialPullMergingChanged() {
  console.log(logPrefix + "onPartialPullMergingChanged");
}

function onDOMChanged() {
  // console.log(logPrefix + "DOM changed");
  //
  //   if($('.merge-message').length == 0) { console.log(logPrefix + "merge-message not in DOM"); }
  //   if($('.branch-action-item').length == 0) { console.log(logPrefix + "branch-action-item not in DOM"); }
  //
  // // ensure the button still exists in the DOM
  // if($(".auto-merge-button").length == 0) {
  //   injectAutoButton();
  //   console.log(logPrefix + "button re-injected");
  // }
  //
  // let squashButton = $('.merge-message .btn-group-squash button');
  // let squashAvailable = squashButton.filter(":visible").filter(":not([disabled])").length;
  //
  // let confirmSquashButton = $('.merge-pr .merge-branch-form .commit-form-actions .btn-group-squash button');
  // let confirmSquashAvailable = confirmSquashButton.filter(":visible").filter(":not([disabled])").length;
  //
  // let updateBranchButton = $(".branch-action-item form[action$='update_branch'] button");
  // let updateBranchAvailable = updateBranchButton.filter(":visible").filter(":not([disabled])").length;
  //
  // console.log(logPrefix + "squashAvailable: " + squashAvailable);
  // console.log(logPrefix + "confirmSquashAvailable: " + confirmSquashAvailable);
  // console.log(logPrefix + "updateBranchAvailable: " + updateBranchAvailable);
}
