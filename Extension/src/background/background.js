// Auto-merge for GitHub
// Copyright 2018 Elijah Sheppard

const display_title = 'Auto-merge for GitHub';

const ON_RETRY_INTERVAL = 3000; // milliseconds
const ON_REFRESH_INTERVAL = 5000 // milliseconds
const ON_MONITOR_STATUS_INTERVAL = 20000; // milliseconds

const GITHUB_ACCESS_TOKEN_PREF = 'accessToken';
const GITHUB_INVALID_TOKEN_HASH_PREF = 'invalidTokenHash';

let jobs = null;
let timer = null;
let github = null;

const enableDebugLogging = false;
function debugLog(object) {
  if(enableDebugLogging) { console.log(object); }
}

document.addEventListener('DOMContentLoaded', function() {
  debugLog('DOMContentLoaded');

  github = new GitHub(debugLog);
  jobs = new PRJobs();

  loadGitHubAccessToken();
  reloadOpenPRs();
});

chrome.runtime.onInstalled.addListener(function(details) {
    debugLog('chrome.runtime.onInstalled: ');
    debugLog(details);

    if(details.reason == 'install') {
      chrome.tabs.create({url: '/src/options/welcome.html'});
    }
});


// TODO
// - settings page link next to auto-merge button
// - determine which merge method the button is set it

// - Main  -

const JOB_ACTION_ADD = 'addJob';
const JOB_ACTION_CANCEL = 'cancelJob';
const JOB_ACTION_CHECK_STATUS = 'hasJob';

const JOB_STATUS_ACTIVE = 'active';

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    debugLog('chrome.runtime.onMessage: ');
    debugLog(request);

    if(request.action == JOB_ACTION_ADD) {
      let hasJob = addJobForPath(request.urlPath, request.method);
      sendResponse({jobStatus: hasJob ? JOB_STATUS_ACTIVE : null});
    }
    else if(request.action == JOB_ACTION_CANCEL) {
      cancelJobForPath(request.urlPath);
      sendResponse({jobStatus: null});
    }
    else if(request.action == JOB_ACTION_CHECK_STATUS) {
      let hasJob = hasJobForPath(request.urlPath);
      sendResponse({jobStatus: hasJob ? JOB_STATUS_ACTIVE : null});
    }
});

function addJobForPath(url_path, merge_method) {
  // if there's no access token configured yet - notify the user, but still add job
  if( !hasGitHubAccessToken() ) {
    notifyNoAccessTokenConfigured();
  }

  if(url_path == null) { return false; }

  let url_details = extractPRDetails(url_path);
  if(url_details == null) { return false; }

  let key = jobs.keyFor(url_details.owner, url_details.repo, url_details.pr_number);

  // check if theres an existing job for this url - if there is don't add a new job, just update the existing data
  if(jobs.watching[key] == null) {
    key = jobs.add(url_details.owner, url_details.repo, url_details.pr_number);
  }

  let pr_data = jobs.watching[key];
  if(pr_data == null) { return false; }

  pr_data.merge_method = merge_method;
  pr_data.nextCheckAt = Date.now() + ON_MONITOR_STATUS_INTERVAL;
  configureTimer();

  check(key);
  return true;
}

function cancelJobForPath(url_path) {
  let url_details = extractPRDetails(url_path);
  if(url_details == null) { return; }

  const key = jobs.keyFor(url_details.owner, url_details.repo, url_details.pr_number);
  jobs.remove(key);
}

function hasJobForPath(url_path) {
  let url_details = extractPRDetails(url_path);
  if(url_details == null) { return false; }

  const key = jobs.keyFor(url_details.owner, url_details.repo, url_details.pr_number);
  return jobs.watching[key] != null;
}


// - PR related URL utils -

function isPRUrl(url_path) {
  let components = url_path.removingAllAfter('#')
                           .removingSuffix('/')
                           .split('/');
  return components.length == 5 && components[3] === 'pull';
}

function extractPRDetails(url_path) {
  if( !isPRUrl(url_path) ) { return null; }

  let components = url_path.split('/');
  return {
    owner: components[1],
    repo: components[2],
    pr_number: components[4]
  }
}


// - Access token management -

function loadGitHubAccessToken() {
  chrome.storage.local.get(GITHUB_ACCESS_TOKEN_PREF, function(result) {
    setGitHubAccessToken(result[GITHUB_ACCESS_TOKEN_PREF]);
  });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for(key in changes) {
    if(key == GITHUB_ACCESS_TOKEN_PREF) {
      setGitHubAccessToken(changes[key].newValue);
    }
  }
});

function setGitHubAccessToken(token) {
  if(github != null) {
    github.accessToken = token;
  }
}

function hasGitHubAccessToken() {
  return github.accessToken != null && github.accessToken.length > 0;
}

function setGitHubInvalidTokenHash(hashCode) {
  chrome.storage.local.set({ [GITHUB_INVALID_TOKEN_HASH_PREF]: hashCode });
}


// - Polling -

function checkAll() {
  const timestamp = Date.now();

  for(var key in jobs.watching) {
    let pr_data = jobs.watching[key];
    if(pr_data == null) { continue; }

    if(timestamp >= pr_data.nextCheckAt) {
      pr_data.nextCheckAt = Date.now() + ON_MONITOR_STATUS_INTERVAL;
      configureTimer();

      check(key);
    }
  }
}

function configureTimer() {
  if(jobs.watching.length == 0) {
    clearTimeout(timer);
    timer = null;
    return;
  }

  let now = Date.now();
  let nextCheck = now + ON_MONITOR_STATUS_INTERVAL;

  for(var key in jobs.watching) {
    let pr_data = jobs.watching[key];
    if(pr_data == null) { continue; }

    if(pr_data.nextCheckAt < nextCheck) {
      nextCheck = pr_data.nextCheckAt;
    }
  }

  clearTimeout(timer);
  timer = setTimeout(checkAll, nextCheck - now);
}


// - GitHub interaction -

function check(key) {
  if(!hasGitHubAccessToken()) { return; }

  let pr_data = jobs.watching[key];
  if(pr_data == null) { return; }

  let request = github.requestForPRStatus(pr_data.owner, pr_data.repo, pr_data.pr_number);

  request.done(function(status) {
    jobs.setLastStatus(key, status);

    debugLog(`Status of '${key}': `);
    debugLog(status);

    if(status.merged == true) {
      jobs.remove(key);
    }
    else if(!status.mergeable_state || status.mergeable_state == 'unknown') {
      pr_data.nextCheckAt = Date.now() + ON_REFRESH_INTERVAL;
      configureTimer();
    }
    else if(status.mergeable == true && status.mergeable_state == 'clean') {
      mergePR(key);
    }
    else if(status.mergeable == true && status.mergeable_state == 'behind') {
      updateBranch(key);
    }
    else if(status.mergeable_state == 'dirty') {
      notifyUserResolveConflicts(key, pr_data);
    }
  });

  request.fail(function(jqXHR, textStatus) {
    notifyGitHubAPIFailure(key, pr_data, jqXHR);
  });
}

function updateBranch(key) {
  if(!hasGitHubAccessToken()) { return; }

  let pr_data = jobs.watching[key];
  let request = github.requestForUpdateBranch(pr_data.owner,
                                              pr_data.repo,
                                              pr_data.lastStatus.head.ref,
                                              pr_data.lastStatus.base.ref);
  request.done(function(result, textStatus, jqXHR) {
    pr_data.nextCheckAt = Date.now() + ON_REFRESH_INTERVAL;
    configureTimer();

    debugLog(`Updated '${key}': ${jqXHR.status} (${textStatus})`);
    debugLog(result);

    notifyBranchUpdated(key, pr_data);
  });

  request.fail(function(jqXHR, textStatus) {
    if(jqXHR.status == 409) { // Conflict
      notifyUserResolveConflicts(key, pr_data);
    }
    else {
      notifyGitHubAPIFailure(key, pr_data, jqXHR);
    }
  });
}

function mergePR(key) {
  if(!hasGitHubAccessToken()) { return; }

  let pr_data = jobs.watching[key];

  const pr_title = `${pr_data.lastStatus.title} (#${pr_data.pr_number})`;
  const pr_message = '';
  const merge_method = pr_data.merge_method || 'squash';

  let request = github.requestForMergePR(pr_data.owner, pr_data.repo, pr_data.pr_number,
                                         pr_title, pr_message, pr_data.lastStatus.head.sha, merge_method);

  request.done(function(result) {
    pr_data.nextCheckAt = Date.now() + ON_REFRESH_INTERVAL;
    configureTimer();

    // force a reload of the tab for this PR as it won't update to reflect the new merged state automatically
    reloadTabForPR(pr_data.owner, pr_data.repo, pr_data.pr_number);

    notify(key, 'Merged', pr_title, function() {
      openPRUrl(pr_data.owner, pr_data.repo, pr_data.pr_number);
    });
  });

  request.fail(function(jqXHR, textStatus) {
    if(jqXHR.status == 409) { // Conflict (sha out of date - retry)
      pr_data.nextCheckAt = Date.now() + ON_RETRY_INTERVAL;
      configureTimer();
    }
    else {
      notifyGitHubAPIFailure(key, pr_data, jqXHR);
    }
  });
}

function notifyGitHubAPIFailure(key, pr_data, jqXHR) {
  if(jqXHR.status == 401) { // Unauthorized
    if( !hasGitHubAccessToken() ) {
      notifyNoAccessTokenConfigured();
    }
    else {
      notifyInvalidAccessTokenProvided();

      // store the hash of the current accessToken so we can identify it as
      // being invalid (we can display a message to the user on the configuration screen)
      setGitHubInvalidTokenHash( github.accessToken.hashCode() );

      // clear the api object's token, so we wont continue to make requests.
      // when the storage updates with a new value, we'll use that instead.
      setGitHubAccessToken(null);
    }
  }
  else {
    console.log(jqXHR.responseJSON);
    notifyRequestFailed(key, pr_data, jqXHR);
  }
}


// - Tabs and notifications -

function reloadOpenPRs() {
  const host = `github.com`;

  chrome.tabs.query({}, function(tabs) {
    for(var i = 0; i < tabs.length; i++) {
      let path = tabs[i].url.trim().removingPrefix(`https://${host}`)
                                   .removingPrefix(`https://www.${host}`)
                                   .removingAllAfter('#')
                                   .removingSuffix('/');
      if( isPRUrl(path) ) {
        chrome.tabs.reload(tabs[i].id);
      }
    }
  });
}

function reloadTabForPR(owner, repo, pr_number) {
  tabIdForPR(owner, repo, pr_number, function(tabId) {
    if(tabId != null) {
      chrome.tabs.reload(tabId);
    }
  });
}

function openPRUrl(owner, repo, pr_number) {
  tabIdForPR(owner, repo, pr_number, function(tabId) {
    if(tabId != null) {
      chrome.tabs.update(tabId, { active: true });
    }
    else {
      // no existing tab found - open a new one
      chrome.tabs.create({ url: `https://github.com/${owner}/${repo}/pull/${pr_number}` });
    }
  });
}

function tabIdForPR(owner, repo, pr_number, callback) {
  chrome.tabs.query({}, function(tabs) {
    for(var i = 0; i < tabs.length; i++) {
      let cleanedUrl = tabs[i].url.trim().removingPrefix('https://')
                                         .removingPrefix('https://www.')
                                         .removingAllAfter('#')
                                         .removingSuffix('/');
      if(cleanedUrl.startsWith(`github.com/${owner}/${repo}/pull/${pr_number}`)) {
        callback(tabs[i].id);
        return;
      }
    }
    callback(null); // not found
  });
}

function notifyRequestFailed(id, pr_data, jqXHR) {
  notify(id, display_title, jqXHR.responseJSON.message, function() {
    openPRUrl(pr_data.owner, pr_data.repo, pr_data.pr_number);
  });
}

function notifyUserResolveConflicts(id, pr_data) {
  notify(id, display_title, `Resolve conflicts on #${pr_data.pr_number}`, function() {
    openPRUrl(pr_data.owner, pr_data.repo, pr_data.pr_number);
  });
}

function notifyBranchUpdated(id, pr_data) {
  notify(id, display_title, `#${pr_data.pr_number} updated`, function() {
    openPRUrl(pr_data.owner, pr_data.repo, pr_data.pr_number);
  });
}

function notifyNoAccessTokenConfigured() {
  const msg = 'No GitHub access token configured';
  notify('needs-access-token', display_title, msg, function() {
    chrome.tabs.create({ url: 'src/options/welcome.html' });
  });
}

function notifyInvalidAccessTokenProvided() {
  const msg = 'The provided GitHub access token is invalid';
  notify('invalid-access-token', display_title, msg, function() {
    chrome.tabs.create({ url: 'src/options/welcome.html' });
  });
}

function notify(notificationid, title, message, callback) {
  const options = {
    title: title,
    message: message,
    type: 'basic',
    iconUrl: 'icons/icon48.png'
  };

  chrome.notifications.create(options);

  chrome.notifications.onClicked.addListener(function(notificationid) {
    chrome.notifications.clear(notificationid);
    callback();
  });
}
