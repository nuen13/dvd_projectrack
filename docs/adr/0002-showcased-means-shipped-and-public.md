# A disc is shown publicly only when Shipped AND Public, enforced in the database

Status (Idea → Archived) and the Public flag are deliberately separate: "finished" and "happy to show it" are different judgements — e.g. internal work for an employer may be Shipped but not cleared for display. Visitors may read a disc only when `status = 'shipped' AND is_public`. This rule lives in the RLS `SELECT` policy for the anon role, not in a frontend filter, so hidden or unfinished discs never reach a visitor's browser even via the raw API.

## Considered Options

- **Status alone** (Shipped ⇒ public): one less field, but no way to hold back finished work.
- **Flag alone** (any status can be public): would allow showing in-progress work; rejected — the public site shows finished work only, with no status filters.
