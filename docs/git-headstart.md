# Introduction to Git

Git is easy to use. Most of us already know the basics.

- Stage for commit: `git add <files>`
- Commit: `git commit -m <message>`
- Push to tracked branch: `git push`
- See local branches: `git branch`
- See remote branches: `git branch -r`
- Pull changes in upstream: `git pull`

## Working with Branches.

Typically when working with a feature branch, you need to create a
branch locally, and either set it to track an upstream branch, or
create an upstream branch to track.

Create and switch to a new branch: `git checkout -b <branchname>`.
Push this branch to the remote: `git push -u origin <branchname`

Note that the `-u` option to git-push causes git to set the pushed-to
branch as the upstream for the pushed-from branch which, among other
things, will stop git from complaining when you issue a naked `git
pull` command without a specified ref.

Once this has been done, `git branch -vv` will show you your local
branches as well as what they track. You can also see this information
in the file `.git/config` in your root of the git directory.

Perhaps we want to checkout a remote branch, and create a local branch
that tracks it. This is simple: `git checkout --track <localbranch>
<remotebranch>`. Recall that `<remotebranch>` will look something
like `origin/other-feature-branch`. This will create a local branch
that tracks the desired remote branch.

## Merging Branches

In order to merge a branch, checkout the branch you'd like to merge
into (say, master) and type in `git merge <branch>`. For example, when
merging our commits together I ran

	$ git merge origin/winings-laverty-spiral-1

With the result
		 
	Auto-merging README.md
	CONFLICT (content): Merge conflict in README.md
	Automatic merge failed; fix conflicts and then commit the
	result.

In this case, nothing has been committed. All the merge changes that
ran without conflict are staged and waiting to be committed. All that
needs to be done is to go to the offending file (`README.md`) and fix
it. Once that is done, add and commit the file with the commit
message for the entire merge.

## Deleting Old Branches

`git push origin :<branchname>`

The colon before the branchname is a sort of kludgy syntax for
deleting branches.

## All together

The git commands for a feature branch's lifespan might look like this

	git checkout -b my-new-feature
	git push -u origin my-new-feature

Now we would commit some things and be productive.

	git checkout master
	git merge origin/my-new-feature

Now we fix our merge conflicts.

	git commit -m "I fixed some merge conflicts!"
	git push origin master
	git push origin :my-new-feature

And we're done.
	
	
