---
title: Delete Already Ran Github Action Workflows
---

So you might want to delete the exisiting ran workflow for what so ever reasons, you can do it using the github cli tool, ```gh```

first you might want to export the values

```yaml
export OWNER=your org or username
export REPO=your respository
```

and run the below command to get the ID's of this workflows

```yaml
gh api -X GET /repos/$OWNER/$REPO/actions/workflows | jq '.workflows[] | .name,.id'
```

note the ID's and then run the following script

```sh
for workflow_id in "$1"
do
  echo "Listing runs for the workflow ID $workflow_id"
  run_ids=( $(gh api repos/$2/$3/actions/workflows/$workflow_id/runs --paginate | jq '.workflow_runs[].id') )
  for run_id in "${run_ids[@]}"
  do
    echo "Deleting Run ID $run_id"
    gh api repos/$2/$3/actions/runs/$run_id -X DELETE
  done
done
```

this will delete the workflows