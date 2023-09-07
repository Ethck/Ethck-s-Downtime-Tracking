# Examples

## Clearing the Activity Log

### Entirely
```js
token.actor.setFlag("downtime-ethck", "changes", [])
```

### By Filters

#### By User
```js
let changes = token.actor.getFlag("downtime-ethck", "changes");
changes = changes.filter((change) => change.user !== "Dungeon Master");

token.actor.setFlag("downtime-ethck", "changes", changes)
```

#### By Activity Name
```js
let changes = token.actor.getFlag("downtime-ethck", "changes");
changes = changes.filter((change) => change.activityName !== "Pit Fighting");

token.actor.setFlag("downtime-ethck", "changes", changes)
```