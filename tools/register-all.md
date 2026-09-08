# Backfilling every existing game

`npm run backfill` writes a `cart.json` per game under `out/`, filled from
GitHub (first commit, top committer) and the ledger (tags, titles). Review,
then for each repo: copy the file to the repo root, add the tag to its page,
commit, push. The webhook does the rest.
