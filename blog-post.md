# GitGitGadget: make code contributions to the Git project more efficient

## What is it all about

## The inner workings

## Tricks with Azure App Services

* There is a powerful editor with Javascript highlighting and linting.
* Deployment not always necessary, do update index.js though.
* `iisnode.yml` (see https://blogs.msdn.microsoft.com/azureossds/2015/08/19/debug-node-js-web-apps-on-azure/)
* Make sure to use `PORT`!
* Use Diagnostic Logs in Azure Portal, otherwise output is not helpful (500 page)
* Uses IISNode (see https://tomasz.janczuk.org/2011/08/hosting-nodejs-applications-in-iis-on.html for a good overview)
* Might not detect the node.js project correctly (and does not handle Typescript out of the box): see http://www.codefoster.com/tscazure/
