class PRJobs {
  constructor() {
    this.watching = {};
  }

  keyFor(owner, repo, pr_number) {
    return (owner + '_' + repo + '_' + pr_number).replace("-", "_");
  }

  add(owner, repo, pr_number) {
    const key = this.keyFor(owner, repo, pr_number);
    if(key in this.watching) { return null; }

    this.watching[key] = {
      'owner': owner,
      'repo': repo,
      'pr_number': pr_number
    };

    return key;
  }

  remove(key) {
    delete this.watching[key];
  }

  setLastStatus(key, status) {
    this.watching[key].lastStatus = status;
  }
}
