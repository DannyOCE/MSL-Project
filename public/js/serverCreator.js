const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const pathHandlerObj = require('js/pathHandler');
const { sendToast, downloadFile } = require('js/helper');
const { writeSettings, addServerData } = require('js/settingsParser')
const { refreshServers } = require('js/serverHandler')

function clearCreatorModal() {
    $('#serverCreator-NameInputBox').val('')
    $('#serverCreator-ProgressBar').css('width', '0%')
}

function initServerCreator() {
    scrapeSpigot()

    $('#serverCreatorModal-CreateButton').on('click', async function() {
        var serverName = $('#serverCreator-NameInputBox').val()

        if (fs.existsSync(`${pathHandlerObj.currentPath}/${serverName}`)) {
            sendToast(`Server ${serverName} already exists.`)
            return
        }

        resolveLink($('input[name="serverCreator-Radios"]:checked').val()).then(async function(url) {
            downloadFile(`${pathHandlerObj.currentPath}/${serverName}`, 'spigot.jar', url, function(progress) {
                $('#serverCreator-ProgressBar').css('width', `${progress}%`)
            }).then(function() {
                console.log(`[Server Creator]: File has been downloaded.`)

                writeEula(serverName)

                addServerData({ serverName: serverName, serverFileName: 'spigot.jar' })
                writeSettings()

                refreshServers()

                sendToast(`Server has been created as: <b>${serverName}</b>.`)

                $('#serverCreatorModal').modal('hide')
            }).catch(err => console.log("Error downloading file: ", err))
        }).catch(err => console.log("Error resolving the link: ", err))
    })

    $('#serverCreatorModal').on('hidden.bs.modal', function(e) {
        clearCreatorModal()
    })
}

function writeEula(serverName) {
    try {
        fs.writeFileSync(`${pathHandlerObj.currentPath}/${serverName}/eula.txt`, 'eula=TRUE')
    } catch (err) {
        sendToast("Failed to write EULA.")
    }
}

async function scrapeSpigot() {

    axios.get('https://getbukkit.org/download/spigot')
        .then(function(response) {
            var obj = cheerio.load(response.data.trim())

            var matches = obj('.row.vdivide')

            for (var i = 0; i < matches.length; i++) {
                var obby = {
                    version: matches[i].children[1].children[3].children[0].data,
                    size: matches[i].children[3].children[3].children[0].data,
                    date: matches[i].children[5].children[3].children[0].data,
                    link: matches[i].children[7].children[3].children[1].attribs.href
                }

                $('#serverCreator-spigotDownloads').append(`<li class="list-group-item">
                    <div class="d-flex flex-row align-items-center justify-content-center">
                        <div class="fs-3">${obby.version}</div>
                        <div class="ms-auto">${obby.size}</div>
                    </div>
                    <div class="d-flex flex-row align-items-center justify-content-center">
                    <div class="me-auto">Release Date: <b>${obby.date}</b></div>
                    <input class="form-check-input ms-auto" name="serverCreator-Radios" type="radio" id="serverCreator-Radio-${obby.version}" value="${obby.link}">
                    </div>
                </li>`)
            }
        })
        .catch(function(error) {
            console.log(error);
        })
}

function resolveLink(link) {

    console.log(`Resolving spigot download for: ${link}`)

    return new Promise((resolve, reject) => {
        axios.get(link)
            .then(function(response) {

                var obj = cheerio.load(response.data.trim())

                var linkMatch = obj('.well h2')[0].children[0].attribs.href

                resolve(linkMatch)
            })
            .catch(function(error) {
                reject(error)
            })
    })
}

module.exports = { initServerCreator }