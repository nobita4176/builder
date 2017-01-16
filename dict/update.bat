@echo off

for %%n in (BFZ OGW SOI W16 EMN KLD AER) do (
	curl "https://mtgjson.com/json/%%n.json" > "%%n.json"
)
