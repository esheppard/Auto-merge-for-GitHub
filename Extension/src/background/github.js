function GitHub(logger) {
  this.logger = logger;
  this.accessToken = null;
  this.baseUrl = 'https://api.github.com';
}

GitHub.prototype.requestForPRStatus = function(owner, repo, pr_number) {
  if(owner === undefined || repo === undefined || pr_number === undefined) {
    this.logger("GitHubAPI::getPRStatus missing parameter");
    return undefined;
  }

  let url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}?access_token=${this.accessToken}`;
  return $.ajax(url, { cache: false });
}

GitHub.prototype.requestForMergePR = function(owner, repo, pr_number, title, message, sha, merge_method) {
  if(owner === undefined || repo === undefined || pr_number === undefined ||
     title === undefined || message === undefined || sha == undefined || merge_method === undefined) {
    this.logger("GitHubAPI::merge missing parameter");
    return false;
  }

  let url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}/merge?access_token=${this.accessToken}`;

  const data = {
    'commit_title': title,
    'commit_message': message,
    'sha': sha,
    'merge_method': merge_method // one of 'merge', 'squash' or 'rebase'
  }

  return $.ajax(url, {
    method: 'PUT',
    data: JSON.stringify(data),
    contentType: "application/json"
  });
}

GitHub.prototype.requestForUpdateBranch = function(owner, repo, base, head) {
  if(owner === undefined || repo === undefined || base === undefined || head === undefined) {
    this.logger("GitHubAPI::merges missing parameter");
    return false;
  }

  let url = `${this.baseUrl}/repos/${owner}/${repo}/merges?access_token=${this.accessToken}`;

  const data = {
    'base': base,
    'head': head,
    'commit_message': `Merge branch '${head}' into ${base}`
  }

  return $.ajax(url, {
    method: 'POST',
    data: JSON.stringify(data),
    contentType: "application/json"
  });
}
