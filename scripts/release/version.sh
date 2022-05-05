#!/usr/bin/env bash

set -o errexit

node scripts/release/update-changelog-release-date.js
node scripts/release/synchronize-versions.js
node scripts/release/update-comment.js

oz-docs update-version
