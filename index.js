const Discord = require('discord.js');
const config = require('./config.json');
const fs = require('fs')

const dbLocation = './db.json'

const commandInvoker = '.';

let discordClient;
let database = {
    admins: [],
    helpCommands: {}
};
let adminBotCommands = [
    ["newadmin <user>", "Add a new admin. If no admin exists the person invoking this command will become the first admin. If admins do already exists then only they can add new admins."],
    ["removeadmin <user>", "Remove admin <user>."],
    ["newhelp <command> <response>", "Add a new command that will return the `<response>` when `" + commandInvoker + "<command>` is called"],
    ["updatehelp <command> <response>", "Update existing `<command>` with new `<response>`"],
    ["removehelp <command>", "Delete existing `<command>`"],
]


loadDatabase().then(() => {
    connectBot();
}, err => {
    console.error(err);
})

/* Bot */
function bot_onReady() {
    console.log(`Logged in as ${discordClient.user.tag}!`);
}

function bot_onMessage(msg) {
    if (msg.member.user.bot) return;
    if (msg.cleanContent[0] === ".") {
        const command = msg.cleanContent.split(" ")[0].replace('.', '').toLowerCase().trim();
        // check commands
        if (command_editAdmin(command, msg)) return;
        if (command_editHelp(command, msg)) return;
        // otherwise get help topic
        command_getHelp(command, msg)
    }
}

function bot_onError(err) {
    if (err) console.error(err)
    connectBot();
}

function bot_onDisconnect() {
    connectBot();
}

async function connectBot() {
    try {
        // destroy client if it exists
        if (discordClient) await discordClient.destroy();
        // create new client
        discordClient = new Discord.Client();
        // bind events
        discordClient.on('ready', () => bot_onReady());
        discordClient.on('message', (msg) => bot_onMessage(msg));
        discordClient.on('error', (err) => bot_onError(err));
        discordClient.on('disconnect', () => bot_onDisconnect());
        // login bot
        discordClient.login(config.discord_bot_token);
    } catch (ex) {
        console.error(ex);
    }
}

/* Bot commands */
function command_editAdmin(command, msg) {
    try {
        switch (command) {
            case "adminhelp":
                let response = ''
                adminBotCommands.forEach(command => {
                    response += `**${command[0]}:** ${command[1]}\n`
                })
                msg.channel.send(response);
                return true;
            case "newadmin":
            case "addadmin":
                if (!database.admins.length) {
                    database.admins.push(msg.author.id);
                    msg.channel.send(`Added ${msg.author.username} as first admin`);
                    saveDatabase();
                } else if (database.admins.indexOf(msg.author.id) > -1) {
                    if (msg.mentions) {
                        msg.mentions.members.forEach(member => {
                            if (database.admins.indexOf(member.id) === -1) {
                                database.admins.push(member.id);
                                msg.channel.send(`Added ${member.displayName} as admin`);
                            }
                        })
                        saveDatabase();
                    }
                }
                return true;
            case "removeadmin":
            case "deleteadmin":
                if (database.admins.indexOf(msg.author.id) > -1) {
                    if (msg.mentions) {
                        msg.mentions.members.forEach(member => {
                            let memberIndex = database.admins.indexOf(member.id)
                            if (memberIndex > -1) {
                                database.admins.splice(memberIndex, 1);
                                msg.channel.send(`Removed ${member.displayName} as admin`);
                            }
                        })
                        saveDatabase();
                    }
                }
                return true;
        }
    } catch (ex) {
        console.error(ex);
    }
    return false;
}

function command_editHelp(command, msg) {
    try {
        // check admin
        if (!isAdmin(msg)) return false;
        if (msg.cleanContent.split(" ").length < 2) return false;
        // get details
        const topic = msg.cleanContent.split(" ")[1].toLowerCase().trim();
        const response = msg.content.slice(msg.content.indexOf(topic) + topic.length);
        switch (command) {
            case "newhelp":
            case "addhelp":
                if (!database.helpCommands[topic] && response) {
                    database.helpCommands[topic] = response.trim();
                    msg.channel.send(`Added help topic ${commandInvoker}${topic}`);
                    saveDatabase();
                }
                return true;
            case "updatehelp":
            case "edithelp":
                if (database.helpCommands[topic] && response) {
                    database.helpCommands[topic] = response.trim();
                    msg.channel.send(`Updated help topic ${commandInvoker}${topic}`);
                    saveDatabase();
                }
                return true;
            case "removehelp":
            case "deletehelp":
                if (database.helpCommands[topic]) {
                    delete database.helpCommands[topic];
                    msg.channel.send(`Removed help topic ${commandInvoker}${topic}`);
                    saveDatabase();
                }
                return true;
        }
    } catch (ex) {
        console.error(ex);
    }
    return false;
}

function command_getHelp(command, msg) {
    if (command === 'help') {
        let response = 'List of help commands: ';
        Object.keys(database.helpCommands).forEach(key => {
            response += '`' + commandInvoker + key + '` '
        })
        msg.channel.send(response);
    } else if (database.helpCommands[command]) {
        msg.channel.send(database.helpCommands[command]);
    } else {
        msg.channel.send(`Unknown help topic '${command}'`);
    }
}

function isAdmin(msg) {
    return database.admins.indexOf(msg.author.id) > -1
}


/* Database */
async function loadDatabase() {
    try {
        if (fs.existsSync(dbLocation)) {
            var dbTxt = fs.readFileSync(dbLocation, 'utf8');
            database = JSON.parse(dbTxt);
            console.log("Loaded database successfully!");
            //file exists
        } else {
            console.log("Database doesn't exist. Creating a new one...");
            await writeDataBase();
        }
    } catch (err) {
        console.error(err)
    }
}

function writeDataBase() {
    return new Promise((resolve, reject) => {
        fs.writeFile(dbLocation, JSON.stringify(database), (err => {
            if (err) return reject(err);
            else resolve();
        }))
    })
}

function saveDatabase() {
    try {
        writeDataBase();
    } catch (ex) {
        console.error(ex);
    }
}