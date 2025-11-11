# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## TODO

- UI
  - Error modal
  - Allow using existing playlists as destinations
  - Allow using albums or other user's playlists as sources
- Check or handle source=dest
- Check db return values
- Access token
  - Only refresh every 30m
  - Accept previous access token for a few minutes after refresh
- Save snapshot ids
  - Revert on error
- Handle deleted source/destination (or invalid on create/update)
- Handle removed auth
- Handle rate limits
- Allow specifying run frequency
- Specify time to run all jobs

## [Unreleased]

### Added

- WebUI
- API authentication
- Database
- Automatic shuffling

[unreleased]: https://github.com/non-bin/dailyShuffle
