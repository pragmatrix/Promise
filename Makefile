id=Promise.TypeScript
version=0.2
package=${id}.${version}.nupkg

.PHONY: pushnuget
pushnuget: nuget
	nuget push ${package}

.PHONY: nuget
nuget:
	nuget pack -Properties "Name=${id};Version=${version}" Promise.nuspec
