const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ModrinthAPI {
    constructor(modsDataFile = './mods.json') {
        this.modsDataFile = modsDataFile;
    }

    static async getinfo(modName) {
        try {
            const response = await axios.get(`https://api.modrinth.com/v2/search`, {
                params: { query: modName, limit: 10 },
            });
            const mods = response.data.hits;
            if (mods.length === 0) {
                throw new Error(`Mod ${modName} no encontrado.`);
            }
            const modInfo = mods[0];
            console.log('Información del mod:', modInfo);
            return modInfo;
        } catch (error) {
            throw error;
        }
    }

    setModFile(modsDataFile) {
        this.modsDataFile = modsDataFile;
    }

    async getmod(modName, gameVersionOrModVersion, loader) {
        try {
            const mods = await this.searchMods(modName);
            if (mods.length === 0) {
                throw new Error(`Mod ${modName} no encontrado.`);
            }

            const mod = mods[0];
            const versions = await this.getModVersions(mod.project_id);

            let compatibleVersions;
            if (this.isSpecificModVersion(gameVersionOrModVersion)) {
                compatibleVersions = versions.filter(version => version.version_number === gameVersionOrModVersion);
            } else {
                compatibleVersions = versions.filter(version => 
                    version.game_versions.includes(gameVersionOrModVersion) &&
                    version.loaders.includes(loader) // Filtra por el cargador
                );
            }

            if (compatibleVersions.length === 0) {
                throw new Error(`No hay versiones compatibles de ${modName} con ${gameVersionOrModVersion} y cargador ${loader}.`);
            }

            return compatibleVersions;
        } catch (error) {
            throw error;
        }
    }

    async download(modName, gameVersionOrModVersion, loader, minecraftModsFolder = './mods') {
        try {
            const versions = await this.getmod(modName, gameVersionOrModVersion, loader);
            const latestVersion = versions[0];

            await this.installMod(latestVersion.id, minecraftModsFolder);
            this.saveModInfo(modName, latestVersion.version_number);
        } catch (error) {
            throw error;
        }
    }

    deleteOldMod(modName, minecraftModsFolder) {
        const modsData = this.loadModsData();
        const oldModFileName = Object.keys(modsData).find(key => key === modName);
        
        if (oldModFileName) {
            const oldModPath = path.join(minecraftModsFolder, oldModFileName);
            if (fs.existsSync(oldModPath)) {
                fs.unlinkSync(oldModPath);
            }
        }
    }

    async update(minecraftModsFolder = './mods', gameVersion) {
        try {
            const modsData = this.loadModsData();
            if (Object.keys(modsData).length === 0) {
                return;
            }

            for (const modName in modsData) {
                const installedVersion = modsData[modName];
                const versions = await this.getmod(modName, gameVersion, 'forge'); // Cambia el loader según sea necesario
                const latestVersion = versions[0];

                if (latestVersion.version_number !== installedVersion) {
                    this.deleteOldMod(modName, minecraftModsFolder);
                    await this.installMod(latestVersion.id, minecraftModsFolder);
                    this.saveModInfo(modName, latestVersion.version_number);
                }
            }
        } catch (error) {
            throw error;
        }
    }

    saveModInfo(modName, version) {
        const modsData = this.loadModsData();
        modsData[modName] = version;
        fs.writeFileSync(this.modsDataFile, JSON.stringify(modsData, null, 2));
    }

    loadModsData() {
        if (fs.existsSync(this.modsDataFile)) {
            const data = fs.readFileSync(this.modsDataFile);
            return JSON.parse(data);
        }
        return {};
    }

    isSpecificModVersion(version) {
        return version.includes('-');
    }

    async searchMods(query) {
        try {
            const response = await axios.get(`https://api.modrinth.com/v2/search`, {
                params: {
                    query,
                    limit: 10,
                }
            });
            return response.data.hits;
        } catch (error) {
            throw error;
        }
    }

    async getModVersions(modId) {
        try {
            const response = await axios.get(`https://api.modrinth.com/v2/project/${modId}/version`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async installMod(versionId, minecraftModsFolder) {
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        await this.downloadMod(versionId, downloadDir);
        
        const files = fs.readdirSync(downloadDir);
        files.forEach(file => {
            const modPath = path.join(downloadDir, file);
            const destinationPath = path.join(minecraftModsFolder, file);
            fs.renameSync(modPath, destinationPath);
        });
    }

    async downloadMod(versionId, downloadDir) {
        try {
            const versionData = await axios.get(`https://api.modrinth.com/v2/version/${versionId}`);
            const downloadUrl = versionData.data.files[0].url;
            const fileName = versionData.data.files[0].filename;
            const filePath = path.join(downloadDir, fileName);
            
            const writer = fs.createWriteStream(filePath);
            const response = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'stream'
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ModrinthAPI;
