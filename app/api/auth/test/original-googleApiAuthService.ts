const path = require("path");

const fs = require('fs');
const { authenticate } = require('@google-cloud/local-auth')
const { google } = require('googleapis')

const SCOPE = ['https://www.googleapis.com/auth/gmail.readonly',
     'https://www.googleapis.com/auth/gmail.send']


const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')   

async function loadSavedCredentialsIfExist() {
    try {
        const content = fs.readFileSync(TOKEN_PATH)
        const credentials = JSON.parse(content)
        return google.auth.fromJSON(credentials)
    } catch (error) {
        return null
    }
}

async function saveCredentials(client: any) {
    const content = fs.readFileSync(CREDENTIALS_PATH)
    const keys = JSON.parse(content)
    const key = keys.installed || keys.web
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    })
    fs.writeFileSync(TOKEN_PATH, payload)
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist()
    if (client) {
        return client
    }
    client = await authenticate({
        scopes: SCOPE,
        keyfilePath: CREDENTIALS_PATH,
    })
    if (client.credentials) {
        saveCredentials(client)
    }
    return client
}

authorize().then((client) => {
    console.log(client.credentials.refresh_token)
})