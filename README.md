# -Synchronous-API-mashup
Queried two API synchronously, requiring clint authentication via Three-legged OAuth. Used several http requests and modified the response to be displayed on the server and the authenticated account.



- API Keys are typically the easiest as you get them when registering your application.  
- OAuth 2.0 Client Credential requires your application to dynamically trade Client ID and Client secret for an access token, before being able to interact with the API. 
- A three-legged OAuth request is the most complex as it involves explicitly getting permissions from a third entity, the end user.
