// GENERATED CODE - DO NOT EDIT!
//
// Generated by:
//
//   go run gen_cached.go
//
// Called via:
//
//   go generate
//

package cached

import (
	"sourcegraph.com/sourcegraph/go-sourcegraph/sourcegraph"
	"src.sourcegraph.com/sourcegraph/svc"
)

// Wrap wraps services with an implementation of each service that sets grpccache trailers after each method returns.
func Wrap(s svc.Services) svc.Services {

	if s.Accounts != nil {
		s.Accounts = &sourcegraph.CachedAccountsServer{s.Accounts}
	}

	if s.Auth != nil {
		s.Auth = &sourcegraph.CachedAuthServer{s.Auth}
	}

	if s.Builds != nil {
		s.Builds = &sourcegraph.CachedBuildsServer{s.Builds}
	}

	if s.Changesets != nil {
		s.Changesets = &sourcegraph.CachedChangesetsServer{s.Changesets}
	}

	if s.Defs != nil {
		s.Defs = &sourcegraph.CachedDefsServer{s.Defs}
	}

	if s.Deltas != nil {
		s.Deltas = &sourcegraph.CachedDeltasServer{s.Deltas}
	}

	if s.Discussions != nil {
		s.Discussions = &sourcegraph.CachedDiscussionsServer{s.Discussions}
	}

	if s.GraphUplink != nil {
		s.GraphUplink = &sourcegraph.CachedGraphUplinkServer{s.GraphUplink}
	}

	if s.Markdown != nil {
		s.Markdown = &sourcegraph.CachedMarkdownServer{s.Markdown}
	}

	if s.Meta != nil {
		s.Meta = &sourcegraph.CachedMetaServer{s.Meta}
	}

	if s.MirrorRepos != nil {
		s.MirrorRepos = &sourcegraph.CachedMirrorReposServer{s.MirrorRepos}
	}

	if s.MirroredRepoSSHKeys != nil {
		s.MirroredRepoSSHKeys = &sourcegraph.CachedMirroredRepoSSHKeysServer{s.MirroredRepoSSHKeys}
	}

	if s.Orgs != nil {
		s.Orgs = &sourcegraph.CachedOrgsServer{s.Orgs}
	}

	if s.People != nil {
		s.People = &sourcegraph.CachedPeopleServer{s.People}
	}

	if s.RegisteredClients != nil {
		s.RegisteredClients = &sourcegraph.CachedRegisteredClientsServer{s.RegisteredClients}
	}

	if s.RepoBadges != nil {
		s.RepoBadges = &sourcegraph.CachedRepoBadgesServer{s.RepoBadges}
	}

	if s.RepoStatuses != nil {
		s.RepoStatuses = &sourcegraph.CachedRepoStatusesServer{s.RepoStatuses}
	}

	if s.RepoTree != nil {
		s.RepoTree = &sourcegraph.CachedRepoTreeServer{s.RepoTree}
	}

	if s.Repos != nil {
		s.Repos = &sourcegraph.CachedReposServer{s.Repos}
	}

	if s.Search != nil {
		s.Search = &sourcegraph.CachedSearchServer{s.Search}
	}

	if s.Storage != nil {
		s.Storage = &sourcegraph.CachedStorageServer{s.Storage}
	}

	if s.Units != nil {
		s.Units = &sourcegraph.CachedUnitsServer{s.Units}
	}

	if s.UserKeys != nil {
		s.UserKeys = &sourcegraph.CachedUserKeysServer{s.UserKeys}
	}

	if s.Users != nil {
		s.Users = &sourcegraph.CachedUsersServer{s.Users}
	}

	return s
}
